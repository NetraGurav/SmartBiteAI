const axios = require('axios');

class NutritionService {
  constructor() {
    this.edamamAppId = process.env.EDAMAM_APP_ID;
    this.edamamAppKey = process.env.EDAMAM_APP_KEY;
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY || '79f0c33f21ab4e8287aac919bdb359e1';
    this.usdaApiKey = process.env.USDA_API_KEY;
  }

  async getNutritionByBarcode(barcode) {
    try {
      // Try Open Food Facts first (free)
      const openFoodFactsUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
      const response = await axios.get(openFoodFactsUrl);
      
      if (response.data.status === 1) {
        return this.parseOpenFoodFactsData(response.data.product);
      }
      
      // Fallback to other APIs if needed
      return await this.getNutritionByName(barcode);
    } catch (error) {
      console.error('Barcode nutrition lookup failed:', error);
      return null;
    }
  }

  async getNutritionByName(foodName) {
    console.log(`🔍 Searching nutrition for: ${foodName}`);
    
    // Try multiple APIs in sequence for better coverage
    const apis = [
      { name: 'Open Food Facts', method: () => this.getOpenFoodFactsByName(foodName) },
      { name: 'Spoonacular', method: () => this.getSpoonacularNutrition(foodName) },
      { name: 'Edamam', method: () => this.getEdamamNutrition(foodName) },
      { name: 'USDA', method: () => this.getUSDANutrition(foodName) }
    ];

    for (const api of apis) {
      try {
        console.log(`📡 Trying ${api.name} API...`);
        const result = await api.method();
        if (result && this.hasValidNutritionData(result)) {
          console.log(`✅ Found nutrition data from ${api.name}`);
          return result;
        }
      } catch (error) {
        console.log(`❌ ${api.name} API failed:`, error.message);
      }
    }

    console.log(`❌ No nutrition data found for: ${foodName}`);
    return null;
  }

  async getOpenFoodFactsByName(foodName) {
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=1`;
      const response = await axios.get(searchUrl);
      
      if (response.data.products && response.data.products.length > 0) {
        return this.parseOpenFoodFactsData(response.data.products[0]);
      }
      
      return null;
    } catch (error) {
      console.error('Open Food Facts search error:', error);
      return null;
    }
  }

  hasValidNutritionData(nutrition) {
    if (!nutrition) return false;
    
    const hasMacros = nutrition.macronutrients && (
      nutrition.macronutrients.calories > 0 ||
      nutrition.macronutrients.protein > 0 ||
      nutrition.macronutrients.carbohydrates > 0 ||
      nutrition.macronutrients.fat > 0
    );
    
    const hasIngredients = nutrition.ingredients && nutrition.ingredients.length > 0;
    
    return hasMacros || hasIngredients;
  }

  async getEdamamNutrition(foodName) {
    try {
      const url = `https://api.edamam.com/api/nutrition-data`;
      const params = {
        app_id: this.edamamAppId,
        app_key: this.edamamAppKey,
        ingr: `1 ${foodName}`
      };
      
      const response = await axios.get(url, { params });
      return this.parseEdamamData(response.data);
    } catch (error) {
      console.error('Edamam API error:', error);
      return null;
    }
  }

  async getSpoonacularNutrition(foodName) {
    try {
      // First try to find as ingredient
      const ingredientResult = await this.getSpoonacularIngredient(foodName);
      if (ingredientResult) return ingredientResult;

      // Then try to find as product
      const productResult = await this.getSpoonacularProduct(foodName);
      if (productResult) return productResult;

      return null;
    } catch (error) {
      console.error('Spoonacular API error:', error);
      return null;
    }
  }

  async getSpoonacularIngredient(foodName) {
    try {
      const url = `https://api.spoonacular.com/food/ingredients/search`;
      const params = {
        apiKey: this.spoonacularApiKey,
        query: foodName,
        number: 1
      };
      
      const response = await axios.get(url, { params });
      if (response.data.results && response.data.results.length > 0) {
        const ingredient = response.data.results[0];
        return await this.getSpoonacularIngredientNutrition(ingredient.id);
      }
      
      return null;
    } catch (error) {
      console.error('Spoonacular ingredient search error:', error);
      return null;
    }
  }

  async getSpoonacularProduct(foodName) {
    try {
      const url = `https://api.spoonacular.com/food/products/search`;
      const params = {
        apiKey: this.spoonacularApiKey,
        query: foodName,
        number: 1
      };
      
      const response = await axios.get(url, { params });
      if (response.data.products && response.data.products.length > 0) {
        const product = response.data.products[0];
        return await this.getSpoonacularProductNutrition(product.id);
      }
      
      return null;
    } catch (error) {
      console.error('Spoonacular product search error:', error);
      return null;
    }
  }

  async getSpoonacularProductNutrition(productId) {
    try {
      const url = `https://api.spoonacular.com/food/products/${productId}`;
      const params = {
        apiKey: this.spoonacularApiKey
      };
      
      const response = await axios.get(url, { params });
      return this.parseSpoonacularData(response.data);
    } catch (error) {
      console.error('Spoonacular product API error:', error);
      return null;
    }
  }

  async getSpoonacularIngredientNutrition(ingredientId) {
    try {
      const url = `https://api.spoonacular.com/food/ingredients/${ingredientId}/information`;
      const params = {
        apiKey: this.spoonacularApiKey,
        amount: 100,
        unit: 'grams'
      };
      
      const response = await axios.get(url, { params });
      return this.parseSpoonacularData(response.data);
    } catch (error) {
      console.error('Spoonacular ingredient API error:', error);
      return null;
    }
  }

  async getUSDANutrition(foodName) {
    try {
      const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search`;
      const searchParams = {
        api_key: this.usdaApiKey,
        query: foodName,
        pageSize: 1
      };
      
      const searchResponse = await axios.get(searchUrl, { params: searchParams });
      if (searchResponse.data.foods && searchResponse.data.foods.length > 0) {
        const food = searchResponse.data.foods[0];
        return this.parseUSDAData(food);
      }
      
      return null;
    } catch (error) {
      console.error('USDA API error:', error);
      return null;
    }
  }

  parseOpenFoodFactsData(product) {
    const nutrition = {
      name: product.product_name || 'Unknown',
      brand: product.brands || '',
      barcode: product.code || '',
      servingSize: {
        amount: 100,
        unit: 'grams'
      },
      macronutrients: {
        calories: product.nutriments?.['energy-kcal_100g'] || 0,
        protein: product.nutriments?.proteins_100g || 0,
        carbohydrates: product.nutriments?.carbohydrates_100g || 0,
        fat: product.nutriments?.fat_100g || 0,
        fiber: product.nutriments?.fiber_100g || 0,
        sugar: product.nutriments?.sugars_100g || 0
      },
      micronutrients: {
        sodium: product.nutriments?.sodium_100g || 0,
        potassium: product.nutriments?.potassium_100g || 0,
        calcium: product.nutriments?.calcium_100g || 0,
        iron: product.nutriments?.iron_100g || 0,
        vitaminC: product.nutriments?.['vitamin-c_100g'] || 0,
        vitaminA: product.nutriments?.['vitamin-a_100g'] || 0
      },
      ingredients: product.ingredients_text || '',
      allergens: product.allergens_tags || [],
      additives: product.additives_tags || [],
      nutritionGrade: product.nutrition_grade_fr || '',
      categories: product.categories_tags || []
    };

    return nutrition;
  }

  parseEdamamData(data) {
    return {
      servingSize: {
        amount: 100,
        unit: 'grams'
      },
      macronutrients: {
        calories: data.calories || 0,
        protein: data.totalNutrients?.PROCNT?.quantity || 0,
        carbohydrates: data.totalNutrients?.CHOCDF?.quantity || 0,
        fat: data.totalNutrients?.FAT?.quantity || 0,
        fiber: data.totalNutrients?.FIBTG?.quantity || 0,
        sugar: data.totalNutrients?.SUGAR?.quantity || 0
      },
      micronutrients: {
        sodium: data.totalNutrients?.NA?.quantity || 0,
        potassium: data.totalNutrients?.K?.quantity || 0,
        calcium: data.totalNutrients?.CA?.quantity || 0,
        iron: data.totalNutrients?.FE?.quantity || 0,
        vitaminC: data.totalNutrients?.VITC?.quantity || 0,
        vitaminA: data.totalNutrients?.VITA_RAE?.quantity || 0
      }
    };
  }

  parseSpoonacularData(data) {
    const nutrition = {
      name: data.name || 'Unknown',
      servingSize: {
        amount: 100,
        unit: 'grams'
      },
      macronutrients: {},
      micronutrients: {},
      ingredients: data.ingredients || '',
      allergens: data.allergens || []
    };

    // Handle nutrition data from different Spoonacular endpoints
    let nutrients = [];
    
    if (data.nutrition && data.nutrition.nutrients) {
      nutrients = data.nutrition.nutrients;
    } else if (data.nutrition && data.nutrition.caloricBreakdown) {
      // Handle caloric breakdown format
      nutrition.macronutrients.calories = data.nutrition.caloricBreakdown.percentProtein + 
                                         data.nutrition.caloricBreakdown.percentCarbs + 
                                         data.nutrition.caloricBreakdown.percentFat;
    }

    // Parse nutrients
    nutrients.forEach(nutrient => {
      const name = nutrient.name?.toLowerCase() || '';
      const amount = nutrient.amount || 0;

      switch (name) {
        case 'calories':
          nutrition.macronutrients.calories = amount;
          break;
        case 'protein':
          nutrition.macronutrients.protein = amount;
          break;
        case 'carbohydrates':
          nutrition.macronutrients.carbohydrates = amount;
          break;
        case 'fat':
          nutrition.macronutrients.fat = amount;
          break;
        case 'fiber':
          nutrition.macronutrients.fiber = amount;
          break;
        case 'sugar':
          nutrition.macronutrients.sugar = amount;
          break;
        case 'sodium':
          nutrition.micronutrients.sodium = amount;
          break;
        case 'potassium':
          nutrition.micronutrients.potassium = amount;
          break;
        case 'calcium':
          nutrition.micronutrients.calcium = amount;
          break;
        case 'iron':
          nutrition.micronutrients.iron = amount;
          break;
        case 'vitamin c':
          nutrition.micronutrients.vitaminC = amount;
          break;
        case 'vitamin a':
          nutrition.micronutrients.vitaminA = amount;
          break;
      }
    });

    return nutrition;
  }

  parseUSDAData(food) {
    const nutrition = {
      name: food.description || 'Unknown',
      servingSize: {
        amount: 100,
        unit: 'grams'
      },
      macronutrients: {},
      micronutrients: {}
    };

    if (food.foodNutrients) {
      food.foodNutrients.forEach(nutrient => {
        const name = nutrient.nutrientName?.toLowerCase() || '';
        const value = nutrient.value || 0;

        if (name.includes('energy')) {
          nutrition.macronutrients.calories = value;
        } else if (name.includes('protein')) {
          nutrition.macronutrients.protein = value;
        } else if (name.includes('carbohydrate')) {
          nutrition.macronutrients.carbohydrates = value;
        } else if (name.includes('total lipid')) {
          nutrition.macronutrients.fat = value;
        } else if (name.includes('fiber')) {
          nutrition.macronutrients.fiber = value;
        } else if (name.includes('sugars')) {
          nutrition.macronutrients.sugar = value;
        } else if (name.includes('sodium')) {
          nutrition.micronutrients.sodium = value;
        } else if (name.includes('potassium')) {
          nutrition.micronutrients.potassium = value;
        } else if (name.includes('calcium')) {
          nutrition.micronutrients.calcium = value;
        } else if (name.includes('iron')) {
          nutrition.micronutrients.iron = value;
        } else if (name.includes('vitamin c')) {
          nutrition.micronutrients.vitaminC = value;
        } else if (name.includes('vitamin a')) {
          nutrition.micronutrients.vitaminA = value;
        }
      });
    }

    return nutrition;
  }

  calculateNutritionForServing(nutrition, servingAmount, servingUnit) {
    if (!nutrition || !servingAmount) return nutrition;

    // Convert serving to grams for calculation
    let gramsMultiplier = 1;
    
    switch (servingUnit?.toLowerCase()) {
      case 'kg':
      case 'kilograms':
        gramsMultiplier = servingAmount * 1000 / 100;
        break;
      case 'g':
      case 'grams':
        gramsMultiplier = servingAmount / 100;
        break;
      case 'ml':
      case 'milliliters':
        gramsMultiplier = servingAmount / 100; // Assume 1ml = 1g for liquids
        break;
      case 'l':
      case 'liters':
        gramsMultiplier = servingAmount * 1000 / 100;
        break;
      default:
        gramsMultiplier = 1; // Keep as is for pieces, etc.
    }

    const adjustedNutrition = JSON.parse(JSON.stringify(nutrition));
    
    // Adjust macronutrients
    Object.keys(adjustedNutrition.macronutrients).forEach(key => {
      adjustedNutrition.macronutrients[key] *= gramsMultiplier;
    });

    // Adjust micronutrients
    Object.keys(adjustedNutrition.micronutrients).forEach(key => {
      adjustedNutrition.micronutrients[key] *= gramsMultiplier;
    });

    adjustedNutrition.servingSize = {
      amount: servingAmount,
      unit: servingUnit
    };

    return adjustedNutrition;
  }
}

module.exports = new NutritionService();
