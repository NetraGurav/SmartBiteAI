const axios = require('axios');
const nutritionService = require('./nutritionService');

class BarcodeService {
  constructor() {
    this.openFoodFactsBaseUrl = 'https://world.openfoodfacts.org/api/v0/product';
    this.upcDatabaseUrl = 'https://api.upcitemdb.com/prod/trial/lookup';
    // Optional providers (require API keys)
    this.nutritionixItemUrl = 'https://trackapi.nutritionix.com/v2/search/item';
    this.spoonacularUpcUrl = 'https://api.spoonacular.com/food/products/upc';
    this.openFoodFactsSearchV2 = 'https://world.openfoodfacts.org/api/v2/search';
    this.barcodeLookupUrl = 'https://api.barcodelookup.com/v3/products';
    this.eanSearchUrl = 'https://api.ean-search.org/api';
  }

  async lookupBarcode(barcode) {
    try {
      // Clean and validate barcode
      const cleanBarcode = this.cleanBarcode(barcode);
      if (!this.isValidBarcode(cleanBarcode)) {
        return {
          success: false,
          error: 'Invalid barcode format'
        };
      }

      // Try Open Food Facts first (most comprehensive for food items)
      const openFoodFactsResult = await this.lookupOpenFoodFacts(cleanBarcode);
      if (openFoodFactsResult.success) {
        return openFoodFactsResult;
      }

      // Try Open Food Facts v2 search with India filter
      const offV2India = await this.lookupOpenFoodFactsV2India(cleanBarcode);
      if (offV2India.success) {
        return offV2India;
      }

      // Try Nutritionix if credentials provided
      const nutritionixResult = await this.lookupNutritionix(cleanBarcode);
      if (nutritionixResult.success) {
        return nutritionixResult;
      }

      // Try Spoonacular if credentials provided
      const spoonacularResult = await this.lookupSpoonacular(cleanBarcode);
      if (spoonacularResult.success) {
        return spoonacularResult;
      }

      // Try BarcodeLookup (broad commercial DB)
      const barcodeLookup = await this.lookupBarcodeLookup(cleanBarcode);
      if (barcodeLookup.success) {
        return barcodeLookup;
      }

      // Try EAN-Search (international EAN coverage)
      const eanSearch = await this.lookupEANSearch(cleanBarcode);
      if (eanSearch.success) {
        return eanSearch;
      }

      // Fallback to UPC Item Database
      const upcResult = await this.lookupUPCDatabase(cleanBarcode);
      if (upcResult.success) {
        return upcResult;
      }

      return {
        success: false,
        error: 'Product not found in any database',
        barcode: cleanBarcode
      };
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      return {
        success: false,
        error: 'Barcode lookup service error',
        details: error.message
      };
    }
  }

  async lookupOpenFoodFacts(barcode) {
    try {
      const url = `${this.openFoodFactsBaseUrl}/${barcode}.json`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SmartBiteAI/1.0 (contact@smartbiteai.com)'
        }
      });

      if (response.data.status === 1 && response.data.product) {
        const product = response.data.product;
        
        return {
          success: true,
          source: 'Open Food Facts',
          data: {
            name: product.product_name || product.product_name_en || 'Unknown Product',
            brand: product.brands || '',
            barcode: barcode,
            category: product.categories || '',
            ingredients: product.ingredients_text || product.ingredients_text_en || '',
            allergens: this.parseAllergens(product.allergens_tags || []),
            nutrition: await this.parseOpenFoodFactsNutrition(product),
            images: {
              front: product.image_front_url || product.image_url || '',
              nutrition: product.image_nutrition_url || '',
              ingredients: product.image_ingredients_url || ''
            },
            packaging: product.packaging || '',
            stores: product.stores || '',
            countries: product.countries || '',
            nutritionGrade: product.nutrition_grade_fr || product.nutriscore_grade || '',
            novaGroup: product.nova_group || '',
            ecoscore: product.ecoscore_grade || '',
            labels: product.labels_tags || [],
            additives: product.additives_tags || []
          }
        };
      }

      return {
        success: false,
        error: 'Product not found in Open Food Facts'
      };
    } catch (error) {
      console.error('Open Food Facts lookup failed:', error);
      return {
        success: false,
        error: 'Open Food Facts API error'
      };
    }
  }

  async lookupUPCDatabase(barcode) {
    try {
      const response = await axios.get(this.upcDatabaseUrl, {
        params: { upc: barcode },
        timeout: 10000
      });

      if (response.data.code === 'OK' && response.data.items && response.data.items.length > 0) {
        const item = response.data.items[0];
        
        return {
          success: true,
          source: 'UPC Item Database',
          data: {
            name: item.title || 'Unknown Product',
            brand: item.brand || '',
            barcode: barcode,
            category: item.category || '',
            description: item.description || '',
            images: {
              front: item.images && item.images.length > 0 ? item.images[0] : ''
            },
            // UPC Database doesn't provide nutrition info, so we'll try to get it separately
            nutrition: await nutritionService.getNutritionByName(item.title || ''),
            msrp: item.msrp || '',
            model: item.model || '',
            size: item.size || ''
          }
        };
      }

      return {
        success: false,
        error: 'Product not found in UPC Database'
      };
    } catch (error) {
      console.error('UPC Database lookup failed:', error);
      return {
        success: false,
        error: 'UPC Database API error'
      };
    }
  }

  async lookupOpenFoodFactsV2India(barcode) {
    try {
      const response = await axios.get(this.openFoodFactsSearchV2, {
        params: {
          code: barcode,
          countries_tags_en: 'india',
          fields: 'product_name,brands,code,ingredients_text,ingredients_text_en,categories,image_front_url,image_url,image_ingredients_url,image_nutrition_url,nutriscore_grade,nutrition_grade_fr,nova_group,countries,labels_tags,additives_tags,nutriments',
          page_size: 1
        },
        timeout: 10000,
        headers: { 'User-Agent': 'SmartBiteAI/1.0 (contact@smartbiteai.com)' }
      });

      const products = response.data && response.data.products ? response.data.products : [];
      if (products.length === 0) {
        return { success: false, error: 'OFF v2 India: product not found' };
      }
      const p = products[0];
      const normalized = {
        name: p.product_name || 'Unknown Product',
        brand: p.brands || '',
        barcode,
        category: p.categories || '',
        ingredients: p.ingredients_text || p.ingredients_text_en || '',
        allergens: [],
        nutrition: await this.parseOpenFoodFactsNutrition({ nutriments: p.nutriments || {} }),
        images: {
          front: p.image_front_url || p.image_url || '',
          nutrition: p.image_nutrition_url || '',
          ingredients: p.image_ingredients_url || ''
        },
        nutritionGrade: p.nutrition_grade_fr || p.nutriscore_grade || '',
        novaGroup: p.nova_group || '',
        countries: p.countries || ''
      };
      return { success: true, source: 'Open Food Facts (India)', data: normalized };
    } catch (error) {
      console.error('OFF v2 India lookup failed:', error.message);
      return { success: false, error: 'OFF v2 India API error' };
    }
  }

  async lookupNutritionix(barcode) {
    try {
      const appId = process.env.NUTRITIONIX_APP_ID;
      const appKey = process.env.NUTRITIONIX_APP_KEY;
      if (!appId || !appKey) {
        return { success: false, skipped: true, error: 'Nutritionix keys not configured' };
      }

      const response = await axios.get(this.nutritionixItemUrl, {
        params: { upc: barcode },
        timeout: 10000,
        headers: {
          'x-app-id': appId,
          'x-app-key': appKey
        }
      });

      const item = response.data && response.data.foods ? response.data.foods[0] : response.data.item;
      if (!item) {
        return { success: false, error: 'Product not found in Nutritionix' };
      }

      const normalized = this.normalizeProduct({
        name: item.food_name || item.item_name || 'Unknown Product',
        brand: item.brand_name || item.nix_brand_name || '',
        barcode,
        category: item.tags ? item.tags.food_group : '',
        ingredients: item.nf_ingredient_statement || '',
        images: { front: item.photo?.thumb || '' },
        nutrition: {
          macronutrients: {
            calories: item.nf_calories || 0,
            protein: item.nf_protein || 0,
            carbohydrates: item.nf_total_carbohydrate || 0,
            fat: item.nf_total_fat || 0,
            fiber: item.nf_dietary_fiber || 0,
            sugar: item.nf_sugars || 0,
            saturatedFat: item.nf_saturated_fat || 0,
            transFat: item.nf_trans_fatty_acid || 0
          },
          micronutrients: {
            sodium: item.nf_sodium || 0,
            cholesterol: item.nf_cholesterol || 0
          }
        }
      });

      return { success: true, source: 'Nutritionix', data: normalized };
    } catch (error) {
      console.error('Nutritionix lookup failed:', error.message);
      return { success: false, error: 'Nutritionix API error' };
    }
  }

  async lookupSpoonacular(barcode) {
    try {
      const apiKey = process.env.SPOONACULAR_API_KEY || '79f0c33f21ab4e8287aac919bdb359e1';
      if (!apiKey) {
        return { success: false, skipped: true, error: 'Spoonacular key not configured' };
      }

      const url = `${this.spoonacularUpcUrl}/${barcode}`;
      const response = await axios.get(url, {
        params: { apiKey },
        timeout: 10000
      });

      const p = response.data || {};
      if (!p || Object.keys(p).length === 0) {
        return { success: false, error: 'Product not found in Spoonacular' };
      }

      const normalized = this.normalizeProduct({
        name: p.title || p.name || 'Unknown Product',
        brand: p.brand || '',
        barcode,
        category: (p.aisle || p.badges?.category) || '',
        ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(', ') : (p.ingredients || ''),
        images: { front: p.image || '' },
        nutrition: p.nutrition ? {
          macronutrients: {
            calories: p.nutrition.caloricBreakdown ? p.nutrition.caloricBreakdown.percentProtein : 0,
            protein: p.nutrition.nutrients?.find(n => n.name === 'Protein')?.amount || 0,
            carbohydrates: p.nutrition.nutrients?.find(n => n.name === 'Carbohydrates')?.amount || 0,
            fat: p.nutrition.nutrients?.find(n => n.name === 'Fat')?.amount || 0,
            fiber: p.nutrition.nutrients?.find(n => n.name === 'Fiber')?.amount || 0,
            sugar: p.nutrition.nutrients?.find(n => n.name === 'Sugar')?.amount || 0,
            saturatedFat: p.nutrition.nutrients?.find(n => n.name === 'Saturated Fat')?.amount || 0
          },
          micronutrients: {
            sodium: p.nutrition.nutrients?.find(n => n.name === 'Sodium')?.amount || 0,
            cholesterol: p.nutrition.nutrients?.find(n => n.name === 'Cholesterol')?.amount || 0
          }
        } : undefined
      });

      return { success: true, source: 'Spoonacular', data: normalized };
    } catch (error) {
      console.error('Spoonacular lookup failed:', error.message);
      return { success: false, error: 'Spoonacular API error' };
    }
  }

  async lookupBarcodeLookup(barcode) {
    try {
      const apiKey = process.env.BARCODELOOKUP_API_KEY;
      if (!apiKey) {
        return { success: false, skipped: true, error: 'BarcodeLookup key not configured' };
      }

      const response = await axios.get(this.barcodeLookupUrl, {
        params: { barcode, key: apiKey },
        timeout: 10000
      });

      const products = response.data && response.data.products ? response.data.products : [];
      if (products.length === 0) {
        return { success: false, error: 'Product not found in BarcodeLookup' };
      }
      const p = products[0];
      const normalized = this.normalizeProduct({
        name: p.product_name || p.title || 'Unknown Product',
        brand: p.brand || p.manufacturer || '',
        barcode,
        category: (Array.isArray(p.category) ? p.category.join(', ') : p.category) || '',
        ingredients: p.ingredients || '',
        images: { front: (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : '' },
        nutrition: null
      });
      return { success: true, source: 'BarcodeLookup', data: normalized };
    } catch (error) {
      console.error('BarcodeLookup failed:', error.message);
      return { success: false, error: 'BarcodeLookup API error' };
    }
  }

  async lookupEANSearch(barcode) {
    try {
      const apiKey = process.env.EANSEARCH_API_KEY;
      if (!apiKey) {
        return { success: false, skipped: true, error: 'EANSearch key not configured' };
      }

      const response = await axios.get(this.eanSearchUrl, {
        params: {
          op: 'barcode-lookup',
          ean: barcode,
          format: 'json',
          token: apiKey
        },
        timeout: 10000
      });

      const res = response.data || {};
      const p = (res.result && res.result.length > 0) ? res.result[0] : null;
      if (!p) {
        return { success: false, error: 'Product not found in EANSearch' };
      }

      const normalized = this.normalizeProduct({
        name: p.name || p.product || 'Unknown Product',
        brand: p.company || '',
        barcode,
        category: p.category || '',
        ingredients: '',
        images: { front: '' },
        nutrition: null
      });
      return { success: true, source: 'EANSearch', data: normalized };
    } catch (error) {
      console.error('EANSearch failed:', error.message);
      return { success: false, error: 'EANSearch API error' };
    }
  }

  async parseOpenFoodFactsNutrition(product) {
    const nutrition = {
      servingSize: {
        amount: 100,
        unit: 'grams'
      },
      macronutrients: {},
      micronutrients: {}
    };

    const nutriments = product.nutriments || {};

    // Macronutrients (per 100g)
    nutrition.macronutrients = {
      calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
      protein: nutriments.proteins_100g || nutriments.proteins || 0,
      carbohydrates: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
      fat: nutriments.fat_100g || nutriments.fat || 0,
      fiber: nutriments.fiber_100g || nutriments.fiber || 0,
      sugar: nutriments.sugars_100g || nutriments.sugars || 0,
      saturatedFat: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0,
      transFat: nutriments['trans-fat_100g'] || nutriments['trans-fat'] || 0
    };

    // Micronutrients (per 100g)
    nutrition.micronutrients = {
      sodium: nutriments.sodium_100g || nutriments.sodium || 0,
      potassium: nutriments.potassium_100g || nutriments.potassium || 0,
      calcium: nutriments.calcium_100g || nutriments.calcium || 0,
      iron: nutriments.iron_100g || nutriments.iron || 0,
      vitaminC: nutriments['vitamin-c_100g'] || nutriments['vitamin-c'] || 0,
      vitaminA: nutriments['vitamin-a_100g'] || nutriments['vitamin-a'] || 0,
      vitaminD: nutriments['vitamin-d_100g'] || nutriments['vitamin-d'] || 0,
      vitaminE: nutriments['vitamin-e_100g'] || nutriments['vitamin-e'] || 0,
      vitaminK: nutriments['vitamin-k_100g'] || nutriments['vitamin-k'] || 0,
      vitaminB6: nutriments['vitamin-b6_100g'] || nutriments['vitamin-b6'] || 0,
      vitaminB12: nutriments['vitamin-b12_100g'] || nutriments['vitamin-b12'] || 0,
      folate: nutriments.folates_100g || nutriments.folates || 0,
      magnesium: nutriments.magnesium_100g || nutriments.magnesium || 0,
      phosphorus: nutriments.phosphorus_100g || nutriments.phosphorus || 0,
      zinc: nutriments.zinc_100g || nutriments.zinc || 0,
      cholesterol: nutriments.cholesterol_100g || nutriments.cholesterol || 0
    };

    return nutrition;
  }

  parseAllergens(allergenTags) {
    const allergenMap = {
      'en:gluten': 'gluten',
      'en:milk': 'dairy',
      'en:eggs': 'eggs',
      'en:nuts': 'nuts',
      'en:peanuts': 'peanuts',
      'en:sesame-seeds': 'sesame',
      'en:soybeans': 'soy',
      'en:fish': 'fish',
      'en:crustaceans': 'shellfish',
      'en:molluscs': 'shellfish',
      'en:celery': 'celery',
      'en:mustard': 'mustard',
      'en:lupin': 'lupin',
      'en:sulphur-dioxide-and-sulphites': 'sulfites'
    };

    return allergenTags
      .map(tag => allergenMap[tag.toLowerCase()] || tag.replace('en:', ''))
      .filter(allergen => allergen && allergen !== '');
  }

  normalizeProduct(raw) {
    return {
      name: raw.name || 'Unknown Product',
      brand: raw.brand || '',
      barcode: raw.barcode || '',
      category: raw.category || '',
      ingredients: raw.ingredients || '',
      allergens: raw.allergens || [],
      nutrition: raw.nutrition || null,
      images: raw.images || {}
    };
  }

  cleanBarcode(barcode) {
    // Remove any non-numeric characters
    return barcode.replace(/\D/g, '');
  }

  isValidBarcode(barcode) {
    // Check if barcode is a valid length (UPC-A: 12, EAN-13: 13, EAN-8: 8, UPC-E: 8)
    const validLengths = [8, 12, 13, 14];
    return validLengths.includes(barcode.length) && /^\d+$/.test(barcode);
  }

  validateUPC(barcode) {
    if (barcode.length !== 12) return false;
    
    // Calculate UPC check digit
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i]);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[11]);
  }

  validateEAN13(barcode) {
    if (barcode.length !== 13) return false;
    
    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(barcode[12]);
  }

  generateBarcodeSearchSuggestions(partialBarcode) {
    const suggestions = [];
    
    // If partial barcode is provided, suggest completing it
    if (partialBarcode && partialBarcode.length >= 4) {
      const cleaned = this.cleanBarcode(partialBarcode);
      
      // Suggest common barcode formats
      if (cleaned.length < 8) {
        suggestions.push({
          type: 'EAN-8',
          format: 'Complete to 8 digits',
          example: cleaned.padEnd(8, '0')
        });
      }
      
      if (cleaned.length < 12) {
        suggestions.push({
          type: 'UPC-A',
          format: 'Complete to 12 digits',
          example: cleaned.padEnd(12, '0')
        });
      }
      
      if (cleaned.length < 13) {
        suggestions.push({
          type: 'EAN-13',
          format: 'Complete to 13 digits',
          example: cleaned.padEnd(13, '0')
        });
      }
    }

    return suggestions;
  }

  async searchProductsByName(productName, limit = 10) {
    try {
      // Search Open Food Facts by name
      const searchUrl = 'https://world.openfoodfacts.org/cgi/search.pl';
      const response = await axios.get(searchUrl, {
        params: {
          search_terms: productName,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: limit
        },
        timeout: 10000
      });

      if (response.data.products && response.data.products.length > 0) {
        return {
          success: true,
          products: response.data.products.map(product => ({
            name: product.product_name || 'Unknown Product',
            brand: product.brands || '',
            barcode: product.code || '',
            image: product.image_front_small_url || product.image_url || '',
            category: product.categories || '',
            nutritionGrade: product.nutrition_grade_fr || ''
          }))
        };
      }

      return {
        success: false,
        error: 'No products found'
      };
    } catch (error) {
      console.error('Product search failed:', error);
      return {
        success: false,
        error: 'Product search service error'
      };
    }
  }

  async getBarcodeImage(barcode, format = 'png') {
    try {
      // Generate barcode image URL (using a free barcode generator service)
      const barcodeImageUrl = `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=EAN13&translate-esc=on&imagetype=${format}`;
      
      return {
        success: true,
        imageUrl: barcodeImageUrl,
        barcode: barcode,
        format: format
      };
    } catch (error) {
      console.error('Barcode image generation failed:', error);
      return {
        success: false,
        error: 'Failed to generate barcode image'
      };
    }
  }
}

module.exports = new BarcodeService();
