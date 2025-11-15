const express = require('express');
const multer = require('multer');
const Food = require('../models/Food');
const User = require('../models/User');
const auth = require('../middleware/auth');
const ocrService = require('../services/ocrService');
const nutritionService = require('../services/nutritionService');
const healthRiskService = require('../services/healthRiskService');
const barcodeService = require('../services/barcodeService');
const notificationService = require('../services/notificationService');
const recommendationService = require('../services/recommendationService');
const axios = require('axios');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const router = express.Router();

function parseDateString(dateStr) {
  // If already ISO, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If DD-MM-YYYY, convert to YYYY-MM-DD
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
}

// Normalize category values coming from the client/UI to match schema enum
function normalizeCategory(inputCategory) {
  if (!inputCategory) return 'other';
  const value = String(inputCategory).trim().toLowerCase();
  const map = {
    'fruits': 'fruits',
    'vegetables': 'vegetables',
    'dairy': 'dairy',
    'meat': 'meat',
    'meat & poultry': 'meat',
    'fish & seafood': 'meat',
    'grains & cereals': 'grains',
    'grains': 'grains',
    'snacks': 'snacks',
    'beverages': 'beverages',
    'condiments & sauces': 'condiments',
    'condiments': 'condiments',
    'frozen foods': 'frozen',
    'frozen': 'frozen',
    'canned foods': 'canned',
    'canned': 'canned',
    'bakery': 'bakery',
    'legumes': 'grains',
    'nuts & seeds': 'snacks',
    'other': 'other'
  };
  return map[value] || 'other';
}

// Normalize allergens to match schema enum
function normalizeAllergens(allergens) {
  if (!allergens) return [];
  const allowed = new Set(['milk','eggs','fish','shellfish','tree-nuts','peanuts','wheat','soybeans','sesame']);
  const map = {
    'soy': 'soybeans',
    'soya': 'soybeans',
    'tree nuts': 'tree-nuts',
    'tree_nuts': 'tree-nuts',
    'sesame seeds': 'sesame',
    'sesame-seeds': 'sesame',
    'gluten': 'wheat'
  };
  const toArray = Array.isArray(allergens)
    ? allergens
    : String(allergens)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
  return toArray
    .map(a => a.replace(/^en:/, '').trim().toLowerCase())
    .map(a => map[a] || a)
    .filter(a => allowed.has(a));
}

// List all food items for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const foods = await Food.find({ userId: req.user._id }).sort({ expiryDate: 1 });
    res.json({ success: true, data: foods });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch food items.' });
  }
});

// Get a single food item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const food = await Food.findOne({ _id: req.params.id, userId: req.user._id });
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });
    res.json({ success: true, data: food });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch food item.' });
  }
});

// Add a new food item
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.expiryDate) body.expiryDate = parseDateString(body.expiryDate);
    if (body.bestBeforeDate) body.bestBeforeDate = parseDateString(body.bestBeforeDate);
    if (body.manufacturedDate) body.manufacturedDate = parseDateString(body.manufacturedDate);
    
    const food = new Food({ ...body, userId: req.user._id });
    await food.save();

    // Get user for notifications
    const user = await User.findById(req.user._id);
    
    // Check for health risks and send notification
    if (food.allergens && food.allergens.length > 0) {
      const healthRisks = await healthRiskService.analyzeHealthRisks(user, food);
      if (healthRisks && healthRisks.overallRisk !== 'safe') {
        await notificationService.sendHealthRiskAlert(user, food, healthRisks);
      }
    }

    // Send expiry reminder notification if food expires soon
    if (food.expiryDate) {
      const expiryDate = new Date(food.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
        await notificationService.sendNotification(user, {
          type: 'expiry_warning',
          title: `⚠️ Food Expiring Soon: ${food.name}`,
          message: `${food.name} ${food.brand ? `by ${food.brand}` : ''} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Plan to use it soon!`,
          foodItems: [{
            name: food.name,
            brand: food.brand,
            expiryDate: food.expiryDate
          }],
          recommendations: [
            'Plan a meal using this ingredient',
            'Consider freezing if possible',
            'Share with friends or family'
          ]
        });
      }
    }

    res.status(201).json({ success: true, message: 'Food item added.', data: food });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to add food item.', error: error.message });
  }
});

// Update a food item
router.put('/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.expiryDate) body.expiryDate = parseDateString(body.expiryDate);
    if (body.bestBeforeDate) body.bestBeforeDate = parseDateString(body.bestBeforeDate);
    if (body.manufacturedDate) body.manufacturedDate = parseDateString(body.manufacturedDate);
    if (body.estimatedValue !== undefined) {
      if (body.estimatedValue === null || String(body.estimatedValue).trim() === '') {
        body.estimatedValue = null;
      } else {
        const num = parseFloat(body.estimatedValue);
        body.estimatedValue = (!isNaN(num) && num >= 0) ? num : 0;
      }
    }
    if (body.quantityInput !== undefined) {
      body.quantityInput = typeof body.quantityInput === 'string' ? body.quantityInput : '';
    }
    if (body.productUnits !== undefined) {
      body.productUnits = typeof body.productUnits === 'string' ? body.productUnits : '';
    }
    const food = await Food.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      body,
      { new: true, runValidators: true }
    );
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });
    res.json({ success: true, message: 'Food item updated.', data: food });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update food item.', error: error.message });
  }
});

// Delete a food item
router.delete('/:id', auth, async (req, res) => {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });
    res.json({ success: true, message: 'Food item deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete food item.' });
  }
});

// Fetch nutrition info from Open Food Facts
router.get('/nutrition', auth, async (req, res) => {
  try {
    const { name, barcode } = req.query;
    let url;
    if (barcode) {
      url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    } else if (name) {
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`;
    } else {
      return res.status(400).json({ success: false, message: 'Provide a name or barcode.' });
    }
    const response = await axios.get(url);
    let product;
    if (barcode) {
      product = response.data.product;
    } else {
      product = response.data.products && response.data.products[0];
    }
    if (!product) {
      return res.status(404).json({ success: false, message: 'No nutrition info found.' });
    }
    // Extract nutrition info
    const nutrition = {
      calories: product.nutriments?.energy_kcal,
      protein: product.nutriments?.proteins,
      carbohydrates: product.nutriments?.carbohydrates,
      fat: product.nutriments?.fat,
      fiber: product.nutriments?.fiber,
      sugar: product.nutriments?.sugars,
      sodium: product.nutriments?.sodium,
      cholesterol: product.nutriments?.cholesterol,
      vitamins: {
        vitaminA: product.nutriments?.vitamin_a,
        vitaminC: product.nutriments?.vitamin_c,
        vitaminD: product.nutriments?.vitamin_d,
        vitaminB12: product.nutriments?.vitamin_b12,
      },
      minerals: {
        calcium: product.nutriments?.calcium,
        iron: product.nutriments?.iron,
        potassium: product.nutriments?.potassium,
      },
      ingredients: product.ingredients_text,
      allergens: product.allergens_tags?.map(a => a.replace('en:', '')),
      product_name: product.product_name,
      brand: product.brands,
      serving_size: product.serving_size,
    };
    res.json({ success: true, data: nutrition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nutrition info.' });
  }
});

// OCR endpoint for extracting dates from images
router.post('/ocr/extract-dates', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const result = await ocrService.extractDatesFromImage(req.file.buffer);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('OCR extraction failed:', error);
    res.status(500).json({ success: false, message: 'Failed to extract dates from image', error: error.message });
  }
});

// Barcode lookup endpoint
router.get('/barcode/:barcode', auth, async (req, res) => {
  try {
    const { barcode } = req.params;
    const result = await barcodeService.lookupBarcode(barcode);
    
    if (result.success) {
      // Also get nutrition information if available
      if (result.data.name) {
        const nutrition = await nutritionService.getNutritionByName(result.data.name);
        if (nutrition) {
          result.data.nutrition = nutrition;
        }
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Barcode lookup failed:', error);
    res.status(500).json({ success: false, message: 'Failed to lookup barcode', error: error.message });
  }
});

// Enhanced nutrition lookup endpoint
router.get('/nutrition/lookup', auth, async (req, res) => {
  try {
    const { name, barcode, servingAmount, servingUnit } = req.query;
    
    let nutrition = null;
    
    if (barcode) {
      nutrition = await nutritionService.getNutritionByBarcode(barcode);
    } else if (name) {
      nutrition = await nutritionService.getNutritionByName(name);
    } else {
      return res.status(400).json({ success: false, message: 'Provide a name or barcode' });
    }
    
    if (!nutrition) {
      return res.status(404).json({ success: false, message: 'Nutrition information not found' });
    }
    
    // Adjust for serving size if provided
    if (servingAmount && servingUnit) {
      nutrition = nutritionService.calculateNutritionForServing(nutrition, parseFloat(servingAmount), servingUnit);
    }
    
    res.json({ success: true, data: nutrition });
  } catch (error) {
    console.error('Nutrition lookup failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nutrition information', error: error.message });
  }
});

// Health risk analysis endpoint
router.post('/health-risk/analyze', auth, async (req, res) => {
  try {
    const { foodData } = req.body;
    
    if (!foodData) {
      return res.status(400).json({ success: false, message: 'Food data is required' });
    }
    
    const user = await User.findById(req.user._id);
    const risks = await healthRiskService.analyzeHealthRisk(foodData, user);
    
    res.json({ success: true, data: risks });
  } catch (error) {
    console.error('Health risk analysis failed:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze health risks', error: error.message });
  }
});

// Get health risk for existing food item
router.get('/:id/health-risk', auth, async (req, res) => {
  try {
    const food = await Food.findOne({ _id: req.params.id, userId: req.user._id });
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }
    
    const user = await User.findById(req.user._id);
    const risks = await healthRiskService.analyzeHealthRisk(food, user);
    
    res.json({ success: true, data: risks });
  } catch (error) {
    console.error('Health risk analysis failed:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze health risks', error: error.message });
  }
});

// Smart recommendations endpoint
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const userFoods = await Food.find({ userId: req.user._id });
    
    const recommendations = await recommendationService.getPersonalizedRecommendations(user, userFoods);
    
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Recommendations failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations', error: error.message });
  }
});

// Get recipe details
router.get('/recipes/:recipeId', auth, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const recipeDetails = await recommendationService.getRecipeDetails(recipeId);
    
    if (!recipeDetails) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    
    res.json({ success: true, data: recipeDetails });
  } catch (error) {
    console.error('Recipe details failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get recipe details', error: error.message });
  }
});

// Search products by name
router.get('/search/products', auth, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    
    const result = await barcodeService.searchProductsByName(query, parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error('Product search failed:', error);
    res.status(500).json({ success: false, message: 'Failed to search products', error: error.message });
  }
});

// Simple and reliable food creation endpoint
router.post('/enhanced', auth, async (req, res) => {
  try {
    console.log('🍎 Food creation request received:', {
      name: req.body.name,
      expiryDate: req.body.expiryDate,
      userId: req.user._id
    });
    
    const { name, expiryDate, bestBeforeDate, manufacturedDate, category, brand, barcode, ingredients, allergens, storageLocation, notes } = req.body;
  let { estimatedValue } = req.body;
    const reqQuantity = req.body.quantity;
    
    // Validate required fields
    if (!name || !name.trim()) {
      console.log('❌ Validation failed: Missing name');
      return res.status(400).json({ 
        success: false, 
        message: 'Food name is required' 
      });
    }
    
    if (!expiryDate) {
      console.log('❌ Validation failed: Missing expiry date');
      return res.status(400).json({ 
        success: false, 
        message: 'Expiry date is required' 
      });
    }
    
    // Normalize quantity to schema shape
    let quantityAmount = 1;
    let quantityUnit = 'pieces';
    if (reqQuantity && typeof reqQuantity === 'object') {
      quantityAmount = parseFloat(reqQuantity.amount) || 1;
      quantityUnit = reqQuantity.unit || 'pieces';
    } else if (reqQuantity) {
      quantityAmount = parseFloat(reqQuantity) || 1;
      quantityUnit = (req.body.unit || 'pieces');
    }

    // Normalize ingredients to array
    const normalizedIngredients = Array.isArray(ingredients)
      ? ingredients
      : (ingredients ? String(ingredients).split(',').map(s => s.trim()).filter(Boolean) : []);

    // Parse estimatedValue to number if provided
    let parsedEstimatedValue = null;
    if (estimatedValue !== undefined && estimatedValue !== null && String(estimatedValue).trim() !== '') {
      const num = parseFloat(estimatedValue);
      if (!isNaN(num) && num >= 0) {
        parsedEstimatedValue = num;
      } else {
        parsedEstimatedValue = 0; // treat invalid as 0 explicitly if user entered
      }
    }

    const foodData = {
      name: name.trim(),
      expiryDate: parseDateString(expiryDate),
      bestBeforeDate: bestBeforeDate ? parseDateString(bestBeforeDate) : null,
      manufacturedDate: manufacturedDate ? parseDateString(manufacturedDate) : null,
      quantity: {
        amount: quantityAmount,
        unit: quantityUnit
      },
      quantityInput: typeof req.body.quantityInput === 'string' ? req.body.quantityInput : '',
      productUnits: typeof req.body.productUnits === 'string' ? req.body.productUnits : '',
      category: normalizeCategory(category),
      brand: brand || '',
      barcode: barcode || '',
      ingredients: normalizedIngredients,
      allergens: normalizeAllergens(allergens),
      estimatedValue: parsedEstimatedValue,
      entryMethod: barcode ? 'barcode' : (req.body._fromOCR ? 'ocr' : 'manual'),
      userId: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 Creating food item:', foodData);
    
    const food = new Food(foodData);
    const savedFood = await food.save();
    
    console.log('✅ Food item saved successfully:', {
      id: savedFood._id,
      name: savedFood.name,
      expiryDate: savedFood.expiryDate
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Food item added successfully! 🎉', 
      data: {
        food: savedFood
      }
    });
    
  } catch (error) {
    console.error('❌ Food creation failed:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add food item: ' + error.message
    });
  }
});

// Get expiring foods
router.get('/expiring/:days', auth, async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 3;
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + days);
    
    const expiringFoods = await Food.find({
      userId: req.user._id,
      expiryDate: {
        $gte: new Date(),
        $lte: checkDate
      }
    }).sort({ expiryDate: 1 });
    
    res.json({ success: true, data: expiringFoods });
  } catch (error) {
    console.error('Get expiring foods failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get expiring foods', error: error.message });
  }
});

// Get food statistics
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const [totalFoods, expiredFoods, expiringSoon, expiringThisWeek] = await Promise.all([
      Food.countDocuments({ userId }),
      Food.countDocuments({ userId, expiryDate: { $lt: now } }),
      Food.countDocuments({ userId, expiryDate: { $gte: now, $lte: threeDaysFromNow } }),
      Food.countDocuments({ userId, expiryDate: { $gte: now, $lte: oneWeekFromNow } })
    ]);
    
    const stats = {
      totalFoods,
      expiredFoods,
      expiringSoon,
      expiringThisWeek,
      healthyFoods: totalFoods - expiredFoods // Simplified calculation
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard statistics', error: error.message });
  }
});

module.exports = router; 