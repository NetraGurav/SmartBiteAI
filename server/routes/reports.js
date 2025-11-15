const express = require('express');
const auth = require('../middleware/auth');
const Food = require('../models/Food');
const User = require('../models/User');
const healthRiskService = require('../services/healthRiskService');
const nutritionService = require('../services/nutritionService');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Get comprehensive dashboard analytics
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get all food items for the user
    const allFoods = await Food.find({ userId });
    
    // Basic statistics
    const totalFoods = allFoods.length;
    const expiredFoods = allFoods.filter(food => food.isExpired()).length;
    const expiringSoon = allFoods.filter(food => food.isExpiringSoon(3)).length;
    const expiringThisWeek = allFoods.filter(food => food.isExpiringSoon(7)).length;

    // Food categories analysis
    const categoryStats = allFoods.reduce((acc, food) => {
      const category = food.category || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Monthly trends
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month').toDate();
      const monthEnd = moment().subtract(i, 'months').endOf('month').toDate();
      
      const monthFoods = allFoods.filter(food => 
        food.createdAt >= monthStart && food.createdAt <= monthEnd
      );
      
      const monthExpired = allFoods.filter(food => 
        food.expiryDate >= monthStart && food.expiryDate <= monthEnd && food.isExpired()
      );

      monthlyData.push({
        month: moment().subtract(i, 'months').format('MMM YYYY'),
        added: monthFoods.length,
        expired: monthExpired.length,
        wastePercentage: monthFoods.length > 0 ? (monthExpired.length / monthFoods.length * 100).toFixed(1) : 0
      });
    }

    // Nutrition trends (if available)
    const nutritionTrends = {
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFat: 0
    };

    const foodsWithNutrition = allFoods.filter(food => {
      const n = food.nutrition || {};
      return (
        n.calories != null ||
        n.protein != null ||
        n.carbohydrates != null ||
        n.fat != null
      );
    });
    if (foodsWithNutrition.length > 0) {
      nutritionTrends.averageCalories = (
        foodsWithNutrition.reduce((sum, food) => sum + (food.nutrition?.calories || 0), 0) /
        foodsWithNutrition.length
      ).toFixed(1);
      nutritionTrends.averageProtein = (
        foodsWithNutrition.reduce((sum, food) => sum + (food.nutrition?.protein || 0), 0) /
        foodsWithNutrition.length
      ).toFixed(1);
      nutritionTrends.averageCarbs = (
        foodsWithNutrition.reduce((sum, food) => sum + (food.nutrition?.carbohydrates || 0), 0) /
        foodsWithNutrition.length
      ).toFixed(1);
      nutritionTrends.averageFat = (
        foodsWithNutrition.reduce((sum, food) => sum + (food.nutrition?.fat || 0), 0) /
        foodsWithNutrition.length
      ).toFixed(1);
    }

    // Health risk analysis
    const riskyFoods = allFoods.filter(food => 
      food.healthRisk && food.healthRisk.overallRisk !== 'safe'
    ).length;

    // Recent activity
    const recentFoods = allFoods
      .filter(food => food.createdAt >= oneWeekAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const analytics = {
      overview: {
        totalFoods,
        expiredFoods,
        expiringSoon,
        expiringThisWeek,
        riskyFoods,
        wastePercentage: totalFoods > 0 ? ((expiredFoods / totalFoods) * 100).toFixed(1) : 0
      },
      categoryStats,
      monthlyTrends: monthlyData,
      nutritionTrends,
      recentActivity: recentFoods.map(food => ({
        name: food.name,
        brand: food.brand,
        category: food.category,
        expiryDate: food.expiryDate,
        addedDate: food.createdAt
      }))
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Dashboard analytics failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate dashboard analytics', error: error.message });
  }
});

// Get detailed food waste report
router.get('/waste-analysis', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        expiryDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const foods = await Food.find({ userId, ...dateFilter });
    const expiredFoods = foods.filter(food => food.isExpired());

    // Helper: estimate value in INR if not provided on the document
    function isCountableUnit(unit) {
      const u = String(unit || '').toLowerCase();
      return ['pieces','packets','cans','bottles','boxes','bags'].includes(u);
    }

    function getEstimatedValue(food) {
      if (typeof food.estimatedValue === 'number' && !isNaN(food.estimatedValue)) {
        // If user provided a value, treat it as per-unit price for countable units, otherwise total
        const qty = food.quantity || { amount: 1, unit: 'pieces' };
        const amount = Number(qty.amount) || 1;
        if (isCountableUnit(qty.unit)) {
          return food.estimatedValue * amount;
        }
        return food.estimatedValue;
      }
      const category = (food.category || 'other').toLowerCase();
      const qty = food.quantity || { amount: 1, unit: 'pieces' };
      const amount = Number(qty.amount) || 1;
      const unit = String(qty.unit || 'pieces').toLowerCase();
      // Baseline per-unit prices (INR)
      const perKg = {
        dairy: 300, meat: 600, fruits: 150, vegetables: 80, grains: 120, snacks: 200,
        condiments: 200, frozen: 350, canned: 180, bakery: 250, beverages: 100, other: 150
      };
      const perL = { beverages: 100, other: 120 };
      const perPiece = { bakery: 40, snacks: 30, canned: 120, other: 50 };
      const kgPrice = perKg[category] ?? perKg.other;
      const lPrice = perL[category] ?? perL.other;
      const piecePrice = perPiece[category] ?? perPiece.other;
      switch (unit) {
        case 'grams':
        case 'g':
          return (amount / 1000) * kgPrice;
        case 'kilograms':
        case 'kg':
          return amount * kgPrice;
        case 'milliliters':
        case 'ml':
          return (amount / 1000) * lPrice;
        case 'liters':
        case 'l':
          return amount * lPrice;
        case 'packets':
        case 'cans':
        case 'bottles':
        case 'pieces':
        case 'boxes':
        case 'bags':
        default:
          return amount * piecePrice;
      }
    }
    
    // Waste analysis by category
    const wasteByCategory = expiredFoods.reduce((acc, food) => {
      const category = food.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, estimatedValue: 0 };
      }
      acc[category].count++;
      acc[category].estimatedValue += getEstimatedValue(food) || 0;
      return acc;
    }, {});

    // Waste trends over time
    const wasteTrends = [];
    const monthsToAnalyze = 6;
    
    for (let i = monthsToAnalyze - 1; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month').toDate();
      const monthEnd = moment().subtract(i, 'months').endOf('month').toDate();
      
      const monthExpired = expiredFoods.filter(food => 
        food.expiryDate >= monthStart && food.expiryDate <= monthEnd
      );
      
      wasteTrends.push({
        month: moment().subtract(i, 'months').format('MMM YYYY'),
        count: monthExpired.length,
        value: monthExpired.reduce((sum, food) => sum + (getEstimatedValue(food) || 0), 0)
      });
    }

    // Top wasted items
    const wastedItems = expiredFoods
      .sort((a, b) => (getEstimatedValue(b) || 0) - (getEstimatedValue(a) || 0))
      .slice(0, 10)
      .map(food => ({
        name: food.name,
        brand: food.brand,
        category: food.category,
        expiryDate: food.expiryDate,
        estimatedValue: getEstimatedValue(food) || 0,
        daysExpired: Math.floor((new Date() - new Date(food.expiryDate)) / (1000 * 60 * 60 * 24))
      }));

    // Compute total units wasted for countable units, else count item as 1
    const totalUnits = expiredFoods.reduce((sum, food) => {
      const qty = food.quantity || { amount: 1, unit: 'pieces' };
      const amount = Number(qty.amount) || 1;
      return sum + (isCountableUnit(qty.unit) ? amount : 1);
    }, 0);

    const totalValue = expiredFoods.reduce((sum, food) => sum + (getEstimatedValue(food) || 0), 0);

    const wasteAnalysis = {
      summary: {
        totalExpired: expiredFoods.length,
        totalUnits,
        totalValue,
        averageValuePerItem: expiredFoods.length > 0 ? (totalValue / expiredFoods.length).toFixed(2) : 0,
        averageValuePerUnit: totalUnits > 0 ? (totalValue / totalUnits).toFixed(2) : 0
      },
      wasteByCategory,
      wasteTrends,
      topWastedItems: wastedItems
    };

    res.json({ success: true, data: wasteAnalysis });
  } catch (error) {
    console.error('Waste analysis failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate waste analysis', error: error.message });
  }
});

// Get nutrition report
router.get('/nutrition', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const foods = await Food.find({ userId });

    // Separate foods with existing nutrition vs missing
    const foodsWithNutrition = foods.filter(food => {
      const n = food.nutrition || {};
      return (
        n.calories != null ||
        n.protein != null ||
        n.carbohydrates != null ||
        n.fat != null ||
        n.fiber != null ||
        n.sugar != null ||
        n.sodium != null ||
        (n.vitamins && (n.vitamins.vitaminC != null || n.vitamins.vitaminA != null)) ||
        (n.minerals && (n.minerals.calcium != null || n.minerals.iron != null))
      );
    });

    const foodsMissingNutrition = foods.filter(f => !foodsWithNutrition.includes(f));

    // Optionally enrich missing nutrition (cap to avoid long requests)
    const shouldEnrich = String(req.query.enrich || 'true').toLowerCase() === 'true';
    const limitParam = parseInt(req.query.limit, 10);
    const ENRICH_LIMIT = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 10;
    const toEnrich = shouldEnrich ? foodsMissingNutrition.slice(0, ENRICH_LIMIT) : [];

    // Helper to timeout a promise
    const withTimeout = (promise, ms = 6000) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
      ]);

    // Helper to map service nutrition (macro/micro) to flat schema shape
    function mapServiceNutritionToFlat(n) {
      if (!n) return null;
      const macros = n.macronutrients || {};
      const micro = n.micronutrients || {};
      return {
        calories: macros.calories ?? null,
        protein: macros.protein ?? null,
        carbohydrates: macros.carbohydrates ?? null,
        fat: macros.fat ?? null,
        fiber: macros.fiber ?? null,
        sugar: macros.sugar ?? null,
        sodium: micro.sodium ?? null,
        cholesterol: n.cholesterol ?? null,
        vitamins: {
          vitaminA: micro.vitaminA ?? null,
          vitaminC: micro.vitaminC ?? null,
          vitaminD: null,
          vitaminE: null,
          vitaminK: null,
          vitaminB1: null,
          vitaminB2: null,
          vitaminB3: null,
          vitaminB6: null,
          vitaminB12: null,
          folate: null
        },
        minerals: {
          calcium: micro.calcium ?? null,
          iron: micro.iron ?? null,
          magnesium: micro.magnesium ?? null,
          phosphorus: micro.phosphorus ?? null,
          potassium: micro.potassium ?? null,
          zinc: micro.zinc ?? null
        }
      };
    }

    const enrichedItems = [];
    if (toEnrich.length > 0) {
      const tasks = toEnrich.map(food => (async () => {
        try {
          let n = null;
          if (food.barcode) {
            n = await withTimeout(nutritionService.getNutritionByBarcode(food.barcode));
          }
          if (!n) {
            n = await withTimeout(nutritionService.getNutritionByName(food.name));
          }
          const flat = mapServiceNutritionToFlat(n);
          if (flat) {
            return { ...food.toObject(), nutrition: flat };
          }
        } catch (e) {
          console.warn('Nutrition enrichment failed for', food.name, e.message);
        }
        return null;
      })());

      const results = await Promise.allSettled(tasks);
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) enrichedItems.push(r.value);
      });

      // Optionally persist enriched nutrition to the DB to avoid repeated lookups
      const shouldPersist = String(req.query.persist || 'false').toLowerCase() === 'true';
      if (shouldPersist && enrichedItems.length > 0) {
        try {
          const ops = enrichedItems.map(doc => ({
            updateOne: {
              filter: { _id: doc._id, userId },
              update: { $set: { nutrition: doc.nutrition } }
            }
          }));
          await Food.bulkWrite(ops, { ordered: false });
        } catch (persistErr) {
          console.warn('Nutrition persistence failed:', persistErr.message);
        }
      }
    }

    const combinedFoods = [
      ...foodsWithNutrition.map(f => f.toObject()),
      ...enrichedItems
    ];

    if (combinedFoods.length === 0) {
      const zeroSummary = {
        totalFoodsAnalyzed: 0,
        averageNutrition: {
          calories: 0, protein: 0, carbohydrates: 0, fat: 0,
          fiber: 0, sugar: 0, sodium: 0, calcium: 0, iron: 0, vitaminC: 0
        }
      };
      return res.json({
        success: true,
        data: {
          summary: zeroSummary,
          nutritionByCategory: {},
          items: [],
          recommendations: []
        }
      });
    }

    // Calculate average nutrition values (based on schema: flat nutrition with vitamins/minerals)
    const totalNutrition = combinedFoods.reduce((acc, food) => {
      const n = food.nutrition || {};
      const vit = n.vitamins || {};
      const min = n.minerals || {};

      acc.calories += n.calories || 0;
      acc.protein += n.protein || 0;
      acc.carbohydrates += n.carbohydrates || 0;
      acc.fat += n.fat || 0;
      acc.fiber += n.fiber || 0;
      acc.sugar += n.sugar || 0;
      acc.sodium += n.sodium || 0;
      acc.calcium += min.calcium || 0;
      acc.iron += min.iron || 0;
      acc.vitaminC += vit.vitaminC || 0;

      return acc;
    }, {
      calories: 0, protein: 0, carbohydrates: 0, fat: 0,
      fiber: 0, sugar: 0, sodium: 0, calcium: 0, iron: 0, vitaminC: 0
    });

    const count = combinedFoods.length;
    const averageNutrition = Object.keys(totalNutrition).reduce((acc, key) => {
      acc[key] = (totalNutrition[key] / count).toFixed(2);
      return acc;
    }, {});

    // Nutrition by category
    const nutritionByCategory = {};
    combinedFoods.forEach(food => {
      const category = food.category || 'Other';
      if (!nutritionByCategory[category]) {
        nutritionByCategory[category] = {
          count: 0,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        };
      }
      
      const n = food.nutrition || {};
      nutritionByCategory[category].count++;
      nutritionByCategory[category].totalCalories += n.calories || 0;
      nutritionByCategory[category].totalProtein += n.protein || 0;
      nutritionByCategory[category].totalCarbs += n.carbohydrates || 0;
      nutritionByCategory[category].totalFat += n.fat || 0;
    });

    // Calculate averages for each category
    Object.keys(nutritionByCategory).forEach(category => {
      const data = nutritionByCategory[category];
      data.avgCalories = (data.totalCalories / data.count).toFixed(1);
      data.avgProtein = (data.totalProtein / data.count).toFixed(1);
      data.avgCarbs = (data.totalCarbs / data.count).toFixed(1);
      data.avgFat = (data.totalFat / data.count).toFixed(1);
    });

    const nutritionReport = {
      summary: {
        totalFoodsAnalyzed: count,
        averageNutrition
      },
      nutritionByCategory,
      items: combinedFoods.map(food => ({
        id: food._id,
        name: food.name,
        brand: food.brand || '',
        category: food.category || 'other',
        quantity: food.quantity,
        nutrition: {
          calories: food.nutrition?.calories ?? null,
          protein: food.nutrition?.protein ?? null,
          carbohydrates: food.nutrition?.carbohydrates ?? null,
          fat: food.nutrition?.fat ?? null,
          fiber: food.nutrition?.fiber ?? null,
          sugar: food.nutrition?.sugar ?? null,
          sodium: food.nutrition?.sodium ?? null,
          cholesterol: food.nutrition?.cholesterol ?? null,
          vitamins: food.nutrition?.vitamins || {},
          minerals: food.nutrition?.minerals || {}
        }
      })),
      recommendations: [
        'Focus on foods with higher protein content for better satiety',
        'Consider reducing sodium intake by choosing fresh foods',
        'Increase fiber intake with more fruits and vegetables',
        'Balance macronutrients for optimal health'
      ]
    };

    res.json({ success: true, data: nutritionReport });
  } catch (error) {
    console.error('Nutrition report failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate nutrition report', error: error.message });
  }
});

// Export data as CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = 'foods' } = req.query;
    
    const foods = await Food.find({ userId }).sort({ createdAt: -1 });
    
    const csvData = foods.map(food => ({
      name: food.name,
      brand: food.brand || '',
      category: food.category || '',
      quantityAmount: food.quantity?.amount ?? '',
      unit: food.quantity?.unit ?? '',
      quantityInput: food.quantityInput || '', // manual actual weight text (e.g., 200gm)
      manufacturedDate: food.manufacturedDate ? moment(food.manufacturedDate).format('YYYY-MM-DD') : '',
      bestBeforeDate: food.bestBeforeDate ? moment(food.bestBeforeDate).format('YYYY-MM-DD') : '',
      expiryDate: food.expiryDate ? moment(food.expiryDate).format('YYYY-MM-DD') : '',
      isExpired: food.isExpired() ? 'Yes' : 'No',
      daysUntilExpiry: food.expiryDate ? Math.ceil((new Date(food.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : '',
      estimatedValueINR: typeof food.estimatedValue === 'number' ? Number(food.estimatedValue).toFixed(2) : '',
      calories: food.nutrition?.calories ?? '',
      protein_g: food.nutrition?.protein ?? '',
      carbohydrates_g: food.nutrition?.carbohydrates ?? '',
      fat_g: food.nutrition?.fat ?? '',
      fiber_g: food.nutrition?.fiber ?? '',
      sugar_g: food.nutrition?.sugar ?? '',
      sodium_mg: food.nutrition?.sodium ?? '',
      cholesterol_mg: food.nutrition?.cholesterol ?? '',
      vitaminA: food.nutrition?.vitamins?.vitaminA ?? '',
      vitaminC: food.nutrition?.vitamins?.vitaminC ?? '',
      calcium: food.nutrition?.minerals?.calcium ?? '',
      iron: food.nutrition?.minerals?.iron ?? '',
      addedDate: moment(food.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // Create CSV content
    const csvHeaders = [
      'Name', 'Brand', 'Category', 'QuantityAmount', 'Unit', 'QuantityInput',
      'Manufactured Date', 'Best Before Date', 'Expiry Date', 'Is Expired', 'Days Until Expiry',
      'Estimated Value (INR)',
      'Calories', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Sodium (mg)', 'Cholesterol (mg)',
      'Vitamin A', 'Vitamin C', 'Calcium', 'Iron',
      'Added Date'
    ];

    let csvContent = csvHeaders.join(',') + '\n';
    csvData.forEach(row => {
      const values = Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      );
      csvContent += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smartbite-foods-${moment().format('YYYY-MM-DD')}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export failed:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV', error: error.message });
  }
});

// Generate PDF report
router.get('/export/pdf', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const foods = await Food.find({ userId }).sort({ expiryDate: 1 });

    // Analyze health insights per item (bounded)
    const maxItems = 50;
    const items = foods.slice(0, maxItems);
    const analyzed = await Promise.all(items.map(async (f) => {
      try {
        const risk = await healthRiskService.analyzeHealthRisk(f, user || {});
        return { f, risk };
      } catch (_) {
        return { f, risk: null };
      }
    }));

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageMargin = 40;
    const lineHeight = 16;
    const titleSize = 18;
    const headerSize = 12;
    const textSize = 10;

    const addPageWithHeader = () => {
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      let y = page.getHeight() - pageMargin;
      page.drawText('SmartBite AI — Inventory & Health Insights Report', { x: pageMargin, y, size: titleSize, font: bold, color: rgb(0,0,0) });
      y -= 26;
      page.drawText(`User: ${user?.name || ''}  |  Email: ${user?.email || ''}`, { x: pageMargin, y, size: headerSize, font });
      y -= 18;
      page.drawText(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { x: pageMargin, y, size: headerSize, font });
      y -= 16;
      // Text-based divider for maximum compatibility
      const divider = '-'.repeat(90);
      page.drawText(divider, { x: pageMargin, y, size: 8, font, color: rgb(0.6,0.6,0.6) });
      y -= 18;
      return { page, y };
    };

    // Compute safer alternatives list (from items deemed 'safe')
    const safeFoodsForAlt = analyzed.filter(x => x.risk && x.risk.overallRisk === 'safe').map(x => x.f);
    const getAlternativesFor = (food) => {
      const cat = (food.category || 'other');
      const sameCat = safeFoodsForAlt.filter(sf => (sf.category || 'other') === cat && String(sf._id) !== String(food._id));
      const list = sameCat.length > 0 ? sameCat : safeFoodsForAlt;
      return list.slice(0, 3).map(sf => `${sf.name || 'Unnamed'}${sf.brand ? ' (' + sf.brand + ')' : ''}`);
    };

    let { page, y } = addPageWithHeader();

    const ensureSpace = (lines = 1) => {
      if (y - lines * lineHeight < pageMargin) {
        const res = addPageWithHeader();
        page = res.page; y = res.y;
      }
    };

    // Small text wrapper
    const drawWrapped = (text, x, maxWidth, color = rgb(0,0,0), size = textSize, weight = font) => {
      const words = (text || '').split(' ');
      let line = '';
      const lines = [];
      words.forEach(w => {
        const test = line ? `${line} ${w}` : w;
        const width = weight.widthOfTextAtSize(test, size);
        if (x + width > page.getWidth() - pageMargin) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      });
      if (line) lines.push(line);
      lines.forEach(l => {
        ensureSpace(1);
        page.drawText(l, { x, y, size, font: weight, color });
        y -= lineHeight;
      });
    };

    // Quantity formatter (handles singular units for amount = 1)
    const formatQuantity = (quantity, category = '', name = '') => {
      if (!quantity || quantity.amount == null || !quantity.unit) return '';
      const amount = Number(quantity.amount);
      let unit = String(quantity.unit).toLowerCase();

      // Heuristic: packaged/snack items often recorded as 1 gram/ml by mistake; show as 1 piece
      const looksPackaged = /biscuit|cookie|bar|chocolate|packet|pack|noodle|snack|chips|biscuits|kitkat|parle|marie|monaco|butter|peanut/i.test(`${category} ${name}`);
      if (amount === 1 && (unit === 'grams' || unit === 'gram' || unit === 'g' || unit === 'milliliters' || unit === 'ml') && looksPackaged) {
        return '1 piece';
      }

      if (amount === 1 && unit.endsWith('s')) unit = unit.slice(0, -1); // grams -> gram, pieces -> piece
      return `${amount} ${unit}`;
    };

    // Summary block
    const expiredCount = foods.filter(f => f.isExpired()).length;
    const expSoon = foods.filter(f => f.isExpiringSoon(3)).length;
    drawWrapped(`Summary: Total ${foods.length} | Expired ${expiredCount} | Expiring soon (3 days) ${expSoon}`, pageMargin, 515, rgb(0,0,0), headerSize, bold);
    y -= 14;

    // Per-item sections
    analyzed.forEach(({ f, risk }, idx) => {
      ensureSpace(8);
      try {
        // Title line
        const title = `${idx + 1}. ${f.name || 'Unnamed'}${f.brand ? ' (' + f.brand + ')' : ''}`;
        page.drawText(title, { x: pageMargin, y, size: headerSize, font: bold });

        // Risk badge
        const badge = risk?.overallRisk ? String(risk.overallRisk).toUpperCase() : 'SAFE';
        const badgeColor = risk?.overallRisk === 'harmful' ? rgb(0.7,0,0) : risk?.overallRisk === 'risky' ? rgb(0.9,0.5,0) : risk?.overallRisk === 'moderate' ? rgb(0.7,0.6,0) : rgb(0,0.5,0);
        const badgeX = page.getWidth() - pageMargin - bold.widthOfTextAtSize(badge, headerSize) - 6;
        page.drawText(badge, { x: badgeX, y, size: headerSize, font: bold, color: badgeColor });
        y -= lineHeight;

        // Meta row
        const qty = f.quantity ? formatQuantity(f.quantity, f.category || '', f.name || '') : '';
        drawWrapped(`• Category: ${f.category || 'N/A'}   • Quantity: ${qty || 'N/A'}`, pageMargin + 14, 501);
        y -= 6;

        // Dates
        const mfg = f.manufacturedDate ? moment(f.manufacturedDate).format('YYYY-MM-DD') : 'N/A';
        const bb = f.bestBeforeDate ? moment(f.bestBeforeDate).format('YYYY-MM-DD') : 'N/A';
        const exp = f.expiryDate ? moment(f.expiryDate).format('YYYY-MM-DD') : 'N/A';
        const status = f.isExpired() ? 'Expired' : f.isExpiringSoon(3) ? 'Expiring Soon' : 'Fresh';
        drawWrapped(`• Dates: Manufactured ${mfg} | Best Before ${bb} | Expiry ${exp} | Status ${status}`, pageMargin + 14, 501);
        y -= 4;

        // Nutrition
        const n = f.nutrition || {};
        const nutLine = `• Nutrition (per item): Cal ${n.calories ?? 'N/A'} | Prot ${n.protein ?? 'N/A'}g | Carb ${n.carbohydrates ?? 'N/A'}g | Fat ${n.fat ?? 'N/A'}g | Fiber ${n.fiber ?? 'N/A'}g | Sugar ${n.sugar ?? 'N/A'}g | Sodium ${n.sodium ?? 'N/A'}mg`;
        drawWrapped(nutLine, pageMargin + 14, 501, rgb(0,0.3,0));
        y -= 6;

        // Health Insights (organized, PDF-only)
        const r = risk || { overallRisk: 'safe', allergens: [], diseases: [], drugInteractions: [], symptoms: [], recommendations: ['No specific recommendations.'] };
        if (r) {
          ensureSpace(2);
          page.drawText('• Health Insights:', { x: pageMargin + 10, y, size: textSize, font: bold, color: rgb(0.4,0,0) });
          y -= lineHeight;
          const sections = [];
          if (Array.isArray(r.allergens) && r.allergens.length > 0) sections.push({ label: 'Allergens', arr: r.allergens.map(a => `Contains ${a.allergen} (${a.found})`) });
          if (Array.isArray(r.diseases) && r.diseases.length > 0) sections.push({ label: 'Diseases', arr: r.diseases.map(d => `${d.disease}: ${d.found} (${d.severity})`) });
          if (Array.isArray(r.drugInteractions) && r.drugInteractions.length > 0) sections.push({ label: 'Drugs', arr: r.drugInteractions.map(d => `${d.medication}: ${d.found} (${d.severity})`) });
          if (Array.isArray(r.symptoms) && r.symptoms.length > 0) sections.push({ label: 'Symptoms', arr: r.symptoms.map(s => `${s.symptom}: ${s.found} (${s.severity})`) });
          const alts = getAlternativesFor(f);
          sections.push({ label: 'Safer Alternatives', arr: (alts.length > 0 ? alts : ['No alternatives available.']) });

          sections.forEach(sec => {
            ensureSpace(1);
            page.drawText(`- ${sec.label}:`, { x: pageMargin + 16, y, size: textSize, font: bold });
            y -= lineHeight;
            sec.arr.slice(0, 4).forEach(itemText => drawWrapped(`• ${itemText}`, pageMargin + 22, 489));
          });
          y -= 6;
        }

        // Divider
        y -= 8;
        const divider = '-'.repeat(90);
        page.drawText(divider, { x: pageMargin, y, size: 8, font, color: rgb(0.85,0.85,0.85) });
        y -= 10;
      } catch (itemErr) {
        // Skip problematic item and continue
        y -= 4;
      }
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="smartbite-report-${moment().format('YYYY-MM-DD')}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('PDF export failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report', error: error.message });
  }
});

// Get health insights report
router.get('/health-insights', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const foods = await Food.find({ userId });

    // Analyze each food against the user's health profile
    const analyzed = await Promise.all(foods.map(async (food) => {
      const risk = await healthRiskService.analyzeHealthRisk(food, user);
      return { food, risk };
    }));

    const safeFoods = analyzed.filter(x => x.risk.overallRisk === 'safe').map(x => x.food);
    const riskyFoods = analyzed.filter(x => x.risk.overallRisk !== 'safe');

    // Allergen exposure summary
    const allergenExposure = {};
    (user.allergies || []).forEach(a => {
      const key = a.name ? a.name : a;
      allergenExposure[key] = riskyFoods.filter(x => (x.risk.allergens || []).length > 0 && (x.risk.allergens[0].allergen || '').toLowerCase() === String(key).toLowerCase()).length;
    });

    // Disease risk foods summary
    const diseaseRiskFoods = {};
    (user.diseases || []).forEach(d => {
      const key = d.name ? d.name : d;
      diseaseRiskFoods[key] = riskyFoods.filter(x => (x.risk.diseases || []).some(r => (r.disease || '').toLowerCase() === String(key).toLowerCase())).length;
    });

    // Build alternatives from current inventory: same category and safe
    function findAlternatives(food) {
      const category = food.category || 'other';
      const candidates = safeFoods.filter(f => (f.category || 'other') === category && String(f._id) !== String(food._id));
      // Fallback: any safe foods if none in same category
      const list = candidates.length > 0 ? candidates : safeFoods;
      return list.slice(0, 3).map(f => ({ id: f._id, name: f.name, brand: f.brand || '', category: f.category || 'other' }));
    }

    const perFood = analyzed.map(({ food, risk }) => ({
      id: food._id,
      name: food.name,
      brand: food.brand,
      category: food.category,
      overallRisk: risk.overallRisk,
      risks: {
        allergens: risk.allergens,
        diseases: risk.diseases,
        drugs: risk.drugInteractions,
        symptoms: risk.symptoms
      },
      recommendations: risk.recommendations,
      alternatives: risk.overallRisk === 'safe' ? [] : findAlternatives(food)
    }));

    const summary = {
      totalFoods: foods.length,
      safe: perFood.filter(x => x.overallRisk === 'safe').length,
      moderate: perFood.filter(x => x.overallRisk === 'moderate').length,
      risky: perFood.filter(x => x.overallRisk === 'risky').length,
      harmful: perFood.filter(x => x.overallRisk === 'harmful').length
    };

    // Aggregate high-signal recommendations
    const recommendations = [];
    if (summary.harmful > 0) recommendations.push('Avoid harmful items detected in your inventory.');
    if (Object.values(allergenExposure).some(c => c > 0)) recommendations.push('Reduce allergen exposure by substituting flagged items.');
    if (Object.values(diseaseRiskFoods).some(c => c > 0)) recommendations.push('Choose items with lower sugar/sodium/saturated fat based on your conditions.');

    const response = {
      summary,
      allergenExposure,
      diseaseRiskFoods,
      perFood,
      recommendations
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Health insights failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate health insights', error: error.message });
  }
});

module.exports = router;
