const express = require('express');
const auth = require('../middleware/auth');
const Food = require('../models/Food');
const User = require('../models/User');
const PDFDocument = require('pdf-lib').PDFDocument;
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

    const foodsWithNutrition = allFoods.filter(food => food.nutrition && food.nutrition.macronutrients);
    if (foodsWithNutrition.length > 0) {
      nutritionTrends.averageCalories = (foodsWithNutrition.reduce((sum, food) => 
        sum + (food.nutrition.macronutrients.calories || 0), 0) / foodsWithNutrition.length).toFixed(1);
      nutritionTrends.averageProtein = (foodsWithNutrition.reduce((sum, food) => 
        sum + (food.nutrition.macronutrients.protein || 0), 0) / foodsWithNutrition.length).toFixed(1);
      nutritionTrends.averageCarbs = (foodsWithNutrition.reduce((sum, food) => 
        sum + (food.nutrition.macronutrients.carbohydrates || 0), 0) / foodsWithNutrition.length).toFixed(1);
      nutritionTrends.averageFat = (foodsWithNutrition.reduce((sum, food) => 
        sum + (food.nutrition.macronutrients.fat || 0), 0) / foodsWithNutrition.length).toFixed(1);
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
    
    // Waste analysis by category
    const wasteByCategory = expiredFoods.reduce((acc, food) => {
      const category = food.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, estimatedValue: 0 };
      }
      acc[category].count++;
      acc[category].estimatedValue += food.estimatedValue || 0;
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
        value: monthExpired.reduce((sum, food) => sum + (food.estimatedValue || 0), 0)
      });
    }

    // Top wasted items
    const wastedItems = expiredFoods
      .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
      .slice(0, 10)
      .map(food => ({
        name: food.name,
        brand: food.brand,
        category: food.category,
        expiryDate: food.expiryDate,
        estimatedValue: food.estimatedValue || 0,
        daysExpired: Math.floor((new Date() - new Date(food.expiryDate)) / (1000 * 60 * 60 * 24))
      }));

    const wasteAnalysis = {
      summary: {
        totalExpired: expiredFoods.length,
        totalValue: expiredFoods.reduce((sum, food) => sum + (food.estimatedValue || 0), 0),
        averageValuePerItem: expiredFoods.length > 0 ? 
          (expiredFoods.reduce((sum, food) => sum + (food.estimatedValue || 0), 0) / expiredFoods.length).toFixed(2) : 0
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
    
    const foodsWithNutrition = foods.filter(food => 
      food.nutrition && food.nutrition.macronutrients
    );

    if (foodsWithNutrition.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No nutrition data available',
          totalFoodsAnalyzed: 0
        }
      });
    }

    // Calculate average nutrition values
    const totalNutrition = foodsWithNutrition.reduce((acc, food) => {
      const macros = food.nutrition.macronutrients;
      const micros = food.nutrition.micronutrients || {};
      
      acc.calories += macros.calories || 0;
      acc.protein += macros.protein || 0;
      acc.carbohydrates += macros.carbohydrates || 0;
      acc.fat += macros.fat || 0;
      acc.fiber += macros.fiber || 0;
      acc.sugar += macros.sugar || 0;
      acc.sodium += micros.sodium || 0;
      acc.calcium += micros.calcium || 0;
      acc.iron += micros.iron || 0;
      acc.vitaminC += micros.vitaminC || 0;
      
      return acc;
    }, {
      calories: 0, protein: 0, carbohydrates: 0, fat: 0,
      fiber: 0, sugar: 0, sodium: 0, calcium: 0, iron: 0, vitaminC: 0
    });

    const count = foodsWithNutrition.length;
    const averageNutrition = Object.keys(totalNutrition).reduce((acc, key) => {
      acc[key] = (totalNutrition[key] / count).toFixed(2);
      return acc;
    }, {});

    // Nutrition by category
    const nutritionByCategory = {};
    foodsWithNutrition.forEach(food => {
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
      
      const macros = food.nutrition.macronutrients;
      nutritionByCategory[category].count++;
      nutritionByCategory[category].totalCalories += macros.calories || 0;
      nutritionByCategory[category].totalProtein += macros.protein || 0;
      nutritionByCategory[category].totalCarbs += macros.carbohydrates || 0;
      nutritionByCategory[category].totalFat += macros.fat || 0;
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
      quantity: `${food.quantity.amount} ${food.quantity.unit}`,
      expiryDate: moment(food.expiryDate).format('YYYY-MM-DD'),
      bestBeforeDate: food.bestBeforeDate ? moment(food.bestBeforeDate).format('YYYY-MM-DD') : '',
      manufacturedDate: food.manufacturedDate ? moment(food.manufacturedDate).format('YYYY-MM-DD') : '',
      isExpired: food.isExpired() ? 'Yes' : 'No',
      daysUntilExpiry: Math.ceil((new Date(food.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
      calories: food.nutrition?.macronutrients?.calories || '',
      protein: food.nutrition?.macronutrients?.protein || '',
      carbohydrates: food.nutrition?.macronutrients?.carbohydrates || '',
      fat: food.nutrition?.macronutrients?.fat || '',
      addedDate: moment(food.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // Create CSV content
    const csvHeaders = [
      'Name', 'Brand', 'Category', 'Quantity', 'Expiry Date', 'Best Before Date',
      'Manufactured Date', 'Is Expired', 'Days Until Expiry', 'Calories',
      'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Added Date'
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
    const foods = await Food.find({ userId });

    // This is a simplified PDF generation - in production, you'd use a proper PDF library
    const reportData = {
      user: {
        name: user.name,
        email: user.email
      },
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      summary: {
        totalFoods: foods.length,
        expiredFoods: foods.filter(food => food.isExpired()).length,
        expiringSoon: foods.filter(food => food.isExpiringSoon(3)).length
      },
      foods: foods.slice(0, 20).map(food => ({
        name: food.name,
        brand: food.brand,
        category: food.category,
        expiryDate: moment(food.expiryDate).format('YYYY-MM-DD'),
        status: food.isExpired() ? 'Expired' : food.isExpiringSoon(3) ? 'Expiring Soon' : 'Fresh'
      }))
    };

    // For now, return JSON data that can be used to generate PDF on frontend
    res.json({
      success: true,
      message: 'PDF report data generated',
      data: reportData,
      downloadUrl: `/api/reports/download/pdf/${userId}` // Future implementation
    });
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

    const healthInsights = {
      allergenExposure: {},
      diseaseRiskFoods: {},
      nutritionalGaps: [],
      recommendations: []
    };

    // Analyze allergen exposure
    if (user.allergies && user.allergies.length > 0) {
      user.allergies.forEach(allergen => {
        const exposedFoods = foods.filter(food => 
          food.ingredients && food.ingredients.toLowerCase().includes(allergen.toLowerCase())
        );
        healthInsights.allergenExposure[allergen] = exposedFoods.length;
      });
    }

    // Analyze disease risk foods
    if (user.diseases && user.diseases.length > 0) {
      user.diseases.forEach(disease => {
        const riskyFoods = foods.filter(food => 
          food.healthRisk && 
          food.healthRisk.diseases.some(risk => risk.disease.toLowerCase() === disease.toLowerCase())
        );
        healthInsights.diseaseRiskFoods[disease] = riskyFoods.length;
      });
    }

    // Generate recommendations
    healthInsights.recommendations = [
      'Review foods with high allergen exposure',
      'Consider alternatives for disease-risky foods',
      'Increase variety in food categories',
      'Focus on fresh, whole foods when possible'
    ];

    res.json({ success: true, data: healthInsights });
  } catch (error) {
    console.error('Health insights failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate health insights', error: error.message });
  }
});

module.exports = router;
