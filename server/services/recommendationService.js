const axios = require('axios');

class RecommendationService {
  constructor() {
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY;
    this.edamamAppId = process.env.EDAMAM_APP_ID;
    this.edamamAppKey = process.env.EDAMAM_APP_KEY;
  }

  async getPersonalizedRecommendations(user, userFoods = []) {
    try {
      const recommendations = {
        foods: [],
        recipes: [],
        mealPlans: [],
        alternatives: []
      };

      // Get food recommendations based on health profile
      recommendations.foods = await this.getFoodRecommendations(user);

      // Get recipe recommendations using available foods
      recommendations.recipes = await this.getRecipeRecommendations(user, userFoods);

      // Generate meal plans
      recommendations.mealPlans = await this.generateMealPlans(user, userFoods);

      // Get alternatives for risky foods
      recommendations.alternatives = await this.getHealthyAlternatives(user);

      return recommendations;
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return {
        foods: [],
        recipes: [],
        mealPlans: [],
        alternatives: []
      };
    }
  }

  async getFoodRecommendations(user) {
    const recommendations = [];

    try {
      // Base recommendations on health profile
      const healthBasedFoods = this.getHealthBasedFoodRecommendations(user);
      recommendations.push(...healthBasedFoods);

      // Add nutritional gap recommendations
      const nutritionalRecommendations = this.getNutritionalRecommendations(user);
      recommendations.push(...nutritionalRecommendations);

      // Add seasonal recommendations
      const seasonalRecommendations = this.getSeasonalRecommendations();
      recommendations.push(...seasonalRecommendations);

      return recommendations.slice(0, 10); // Limit to top 10
    } catch (error) {
      console.error('Food recommendations failed:', error);
      return [];
    }
  }

  getHealthBasedFoodRecommendations(user) {
    const recommendations = [];
    const diseases = user.diseases || [];
    const allergies = user.allergies || [];

    // Diabetes-friendly foods
    if (diseases.includes('diabetes')) {
      recommendations.push(
        {
          name: 'Quinoa',
          category: 'Grains',
          reason: 'Low glycemic index, helps manage blood sugar',
          benefits: ['High protein', 'Complex carbohydrates', 'Fiber-rich'],
          priority: 'high'
        },
        {
          name: 'Leafy Greens (Spinach, Kale)',
          category: 'Vegetables',
          reason: 'Low in carbs, high in nutrients',
          benefits: ['Low glycemic', 'Rich in vitamins', 'Anti-inflammatory'],
          priority: 'high'
        },
        {
          name: 'Salmon',
          category: 'Protein',
          reason: 'Omega-3 fatty acids support heart health',
          benefits: ['Healthy fats', 'High protein', 'Anti-inflammatory'],
          priority: 'medium'
        }
      );
    }

    // Heart disease recommendations
    if (diseases.includes('heart disease') || diseases.includes('hypertension')) {
      recommendations.push(
        {
          name: 'Oats',
          category: 'Grains',
          reason: 'Beta-glucan helps lower cholesterol',
          benefits: ['Soluble fiber', 'Heart-healthy', 'Sustained energy'],
          priority: 'high'
        },
        {
          name: 'Berries',
          category: 'Fruits',
          reason: 'Antioxidants support cardiovascular health',
          benefits: ['Low sugar', 'High antioxidants', 'Anti-inflammatory'],
          priority: 'high'
        },
        {
          name: 'Nuts (if no allergy)',
          category: 'Snacks',
          reason: 'Healthy fats and protein',
          benefits: ['Monounsaturated fats', 'Protein', 'Vitamin E'],
          priority: allergies.includes('nuts') ? 'avoid' : 'medium'
        }
      );
    }

    // General healthy recommendations
    recommendations.push(
      {
        name: 'Greek Yogurt',
        category: 'Dairy',
        reason: 'High protein, probiotics for gut health',
        benefits: ['Probiotics', 'High protein', 'Calcium'],
        priority: allergies.includes('dairy') ? 'avoid' : 'medium'
      },
      {
        name: 'Sweet Potatoes',
        category: 'Vegetables',
        reason: 'Complex carbs, rich in vitamins',
        benefits: ['Vitamin A', 'Fiber', 'Potassium'],
        priority: 'medium'
      }
    );

    return recommendations.filter(rec => rec.priority !== 'avoid');
  }

  getNutritionalRecommendations(user) {
    const recommendations = [];
    
    // Based on common nutritional needs
    const age = user.age || 30;
    const gender = user.gender || 'other';

    if (age > 50) {
      recommendations.push(
        {
          name: 'Fortified Cereals',
          category: 'Grains',
          reason: 'B12 and vitamin D for older adults',
          benefits: ['Vitamin B12', 'Vitamin D', 'Iron'],
          priority: 'medium'
        },
        {
          name: 'Fatty Fish',
          category: 'Protein',
          reason: 'Omega-3s and vitamin D',
          benefits: ['Omega-3', 'Vitamin D', 'High protein'],
          priority: 'medium'
        }
      );
    }

    if (gender === 'female') {
      recommendations.push(
        {
          name: 'Lentils',
          category: 'Legumes',
          reason: 'Iron and folate for women',
          benefits: ['Iron', 'Folate', 'Protein', 'Fiber'],
          priority: 'medium'
        },
        {
          name: 'Dark Chocolate (70%+)',
          category: 'Treats',
          reason: 'Iron and magnesium',
          benefits: ['Iron', 'Magnesium', 'Antioxidants'],
          priority: 'low'
        }
      );
    }

    return recommendations;
  }

  getSeasonalRecommendations() {
    const month = new Date().getMonth();
    const recommendations = [];

    // Spring (March-May)
    if (month >= 2 && month <= 4) {
      recommendations.push(
        {
          name: 'Asparagus',
          category: 'Vegetables',
          reason: 'Fresh spring vegetable, in season',
          benefits: ['Folate', 'Vitamin K', 'Fiber'],
          priority: 'low'
        },
        {
          name: 'Strawberries',
          category: 'Fruits',
          reason: 'Peak season, high vitamin C',
          benefits: ['Vitamin C', 'Antioxidants', 'Low calories'],
          priority: 'low'
        }
      );
    }

    // Summer (June-August)
    if (month >= 5 && month <= 7) {
      recommendations.push(
        {
          name: 'Tomatoes',
          category: 'Vegetables',
          reason: 'Peak season, lycopene content',
          benefits: ['Lycopene', 'Vitamin C', 'Potassium'],
          priority: 'low'
        },
        {
          name: 'Watermelon',
          category: 'Fruits',
          reason: 'Hydrating summer fruit',
          benefits: ['Hydration', 'Vitamin A', 'Lycopene'],
          priority: 'low'
        }
      );
    }

    // Fall (September-November)
    if (month >= 8 && month <= 10) {
      recommendations.push(
        {
          name: 'Pumpkin',
          category: 'Vegetables',
          reason: 'Seasonal vegetable, beta-carotene',
          benefits: ['Beta-carotene', 'Fiber', 'Potassium'],
          priority: 'low'
        },
        {
          name: 'Apples',
          category: 'Fruits',
          reason: 'Peak harvest season',
          benefits: ['Fiber', 'Vitamin C', 'Antioxidants'],
          priority: 'low'
        }
      );
    }

    // Winter (December-February)
    if (month >= 11 || month <= 1) {
      recommendations.push(
        {
          name: 'Citrus Fruits',
          category: 'Fruits',
          reason: 'Vitamin C for immune support',
          benefits: ['Vitamin C', 'Immune support', 'Fiber'],
          priority: 'medium'
        },
        {
          name: 'Root Vegetables',
          category: 'Vegetables',
          reason: 'Hearty winter vegetables',
          benefits: ['Complex carbs', 'Fiber', 'Vitamins'],
          priority: 'low'
        }
      );
    }

    return recommendations;
  }

  async getRecipeRecommendations(user, userFoods) {
    const recipes = [];

    try {
      // Get recipes using available ingredients
      if (userFoods.length > 0) {
        const ingredientRecipes = await this.getRecipesByIngredients(userFoods);
        recipes.push(...ingredientRecipes);
      }

      // Get health-conscious recipes
      const healthRecipes = await this.getHealthConsciousRecipes(user);
      recipes.push(...healthRecipes);

      // Remove duplicates and limit results
      const uniqueRecipes = recipes.filter((recipe, index, self) => 
        index === self.findIndex(r => r.id === recipe.id)
      );

      return uniqueRecipes.slice(0, 8);
    } catch (error) {
      console.error('Recipe recommendations failed:', error);
      return [];
    }
  }

  async getRecipesByIngredients(userFoods) {
    if (!this.spoonacularApiKey) return [];

    try {
      const ingredients = userFoods
        .filter(food => !food.isExpired())
        .map(food => food.name)
        .join(',');

      const response = await axios.get('https://api.spoonacular.com/recipes/findByIngredients', {
        params: {
          apiKey: this.spoonacularApiKey,
          ingredients: ingredients,
          number: 6,
          ranking: 2, // Maximize used ingredients
          ignorePantry: true
        }
      });

      return response.data.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        usedIngredients: recipe.usedIngredients?.length || 0,
        missedIngredients: recipe.missedIngredients?.length || 0,
        reason: `Uses ${recipe.usedIngredients?.length || 0} of your ingredients`,
        category: 'ingredient-based',
        priority: 'high'
      }));
    } catch (error) {
      console.error('Ingredient-based recipe search failed:', error);
      return [];
    }
  }

  async getHealthConsciousRecipes(user) {
    if (!this.spoonacularApiKey) return this.getDefaultHealthRecipes(user);

    try {
      const diseases = user.diseases || [];
      const allergies = user.allergies || [];
      
      let diet = '';
      let intolerances = allergies.join(',');

      // Set diet based on health conditions
      if (diseases.includes('diabetes')) {
        diet = 'ketogenic';
      } else if (diseases.includes('heart disease')) {
        diet = 'whole30';
      }

      const response = await axios.get('https://api.spoonacular.com/recipes/complexSearch', {
        params: {
          apiKey: this.spoonacularApiKey,
          diet: diet,
          intolerances: intolerances,
          sort: 'healthiness',
          number: 6,
          addRecipeInformation: true
        }
      });

      return response.data.results.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        healthScore: recipe.healthScore,
        reason: `Healthy recipe (${recipe.healthScore}/100 health score)`,
        category: 'health-conscious',
        priority: 'medium'
      }));
    } catch (error) {
      console.error('Health-conscious recipe search failed:', error);
      return this.getDefaultHealthRecipes(user);
    }
  }

  getDefaultHealthRecipes(user) {
    const diseases = user.diseases || [];
    const recipes = [];

    if (diseases.includes('diabetes')) {
      recipes.push(
        {
          id: 'default-1',
          title: 'Grilled Salmon with Quinoa',
          reason: 'Low glycemic, high protein',
          category: 'diabetes-friendly',
          priority: 'high'
        },
        {
          id: 'default-2',
          title: 'Vegetable Stir-fry with Tofu',
          reason: 'Low carb, nutrient-dense',
          category: 'diabetes-friendly',
          priority: 'medium'
        }
      );
    }

    if (diseases.includes('heart disease')) {
      recipes.push(
        {
          id: 'default-3',
          title: 'Mediterranean Chickpea Salad',
          reason: 'Heart-healthy, low sodium',
          category: 'heart-healthy',
          priority: 'high'
        },
        {
          id: 'default-4',
          title: 'Baked Sweet Potato with Black Beans',
          reason: 'Fiber-rich, potassium source',
          category: 'heart-healthy',
          priority: 'medium'
        }
      );
    }

    // General healthy recipes
    recipes.push(
      {
        id: 'default-5',
        title: 'Rainbow Buddha Bowl',
        reason: 'Nutrient-dense, colorful vegetables',
        category: 'general-health',
        priority: 'medium'
      },
      {
        id: 'default-6',
        title: 'Lentil and Vegetable Soup',
        reason: 'High fiber, plant-based protein',
        category: 'general-health',
        priority: 'medium'
      }
    );

    return recipes;
  }

  async generateMealPlans(user, userFoods) {
    const mealPlans = [];

    try {
      // Generate daily meal plan
      const dailyPlan = await this.generateDailyMealPlan(user, userFoods);
      mealPlans.push(dailyPlan);

      // Generate weekly meal plan
      const weeklyPlan = await this.generateWeeklyMealPlan(user);
      mealPlans.push(weeklyPlan);

      return mealPlans;
    } catch (error) {
      console.error('Meal plan generation failed:', error);
      return [];
    }
  }

  async generateDailyMealPlan(user, userFoods) {
    const diseases = user.diseases || [];
    const allergies = user.allergies || [];

    const mealPlan = {
      type: 'daily',
      title: 'Today\'s Meal Plan',
      meals: {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: []
      },
      totalCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 }
    };

    // Customize based on health profile
    if (diseases.includes('diabetes')) {
      mealPlan.meals.breakfast = {
        name: 'Greek Yogurt with Berries and Nuts',
        reason: 'Low glycemic, high protein start',
        ingredients: ['Greek yogurt', 'Mixed berries', 'Almonds']
      };
      mealPlan.meals.lunch = {
        name: 'Quinoa Salad with Grilled Chicken',
        reason: 'Balanced macros, steady blood sugar',
        ingredients: ['Quinoa', 'Grilled chicken', 'Mixed vegetables']
      };
      mealPlan.meals.dinner = {
        name: 'Baked Salmon with Roasted Vegetables',
        reason: 'Omega-3s, low carb',
        ingredients: ['Salmon', 'Broccoli', 'Sweet potato']
      };
    } else {
      // General healthy meal plan
      mealPlan.meals.breakfast = {
        name: 'Oatmeal with Fruit and Nuts',
        reason: 'Fiber-rich, sustained energy',
        ingredients: ['Oats', 'Banana', 'Walnuts']
      };
      mealPlan.meals.lunch = {
        name: 'Mediterranean Bowl',
        reason: 'Balanced nutrition, heart-healthy',
        ingredients: ['Chickpeas', 'Cucumber', 'Feta cheese', 'Olive oil']
      };
      mealPlan.meals.dinner = {
        name: 'Stir-fried Vegetables with Brown Rice',
        reason: 'Nutrient-dense, whole grains',
        ingredients: ['Mixed vegetables', 'Brown rice', 'Tofu']
      };
    }

    // Add healthy snacks
    mealPlan.meals.snacks = [
      { name: 'Apple with Almond Butter', reason: 'Balanced macros' },
      { name: 'Carrot Sticks with Hummus', reason: 'Fiber and protein' }
    ];

    return mealPlan;
  }

  async generateWeeklyMealPlan(user) {
    return {
      type: 'weekly',
      title: 'This Week\'s Meal Plan',
      days: [
        { day: 'Monday', focus: 'High Protein', theme: 'Strength Building' },
        { day: 'Tuesday', focus: 'Heart Healthy', theme: 'Cardiovascular Support' },
        { day: 'Wednesday', focus: 'Anti-Inflammatory', theme: 'Recovery & Healing' },
        { day: 'Thursday', focus: 'Brain Food', theme: 'Cognitive Function' },
        { day: 'Friday', focus: 'Detox', theme: 'Cleansing & Energy' },
        { day: 'Saturday', focus: 'Comfort Food', theme: 'Healthy Indulgence' },
        { day: 'Sunday', focus: 'Meal Prep', theme: 'Week Preparation' }
      ],
      shoppingList: [
        'Lean proteins (chicken, fish, tofu)',
        'Colorful vegetables',
        'Whole grains',
        'Healthy fats (avocado, nuts, olive oil)',
        'Fresh herbs and spices'
      ]
    };
  }

  async getHealthyAlternatives(user) {
    const alternatives = [];
    const diseases = user.diseases || [];
    const allergies = user.allergies || [];

    // Common unhealthy foods and their alternatives
    const alternativeMap = {
      'white bread': {
        alternatives: ['Whole grain bread', 'Ezekiel bread', 'Cauliflower bread'],
        reason: 'Higher fiber, better blood sugar control'
      },
      'white rice': {
        alternatives: ['Brown rice', 'Quinoa', 'Cauliflower rice'],
        reason: 'More nutrients, lower glycemic index'
      },
      'soda': {
        alternatives: ['Sparkling water with fruit', 'Herbal tea', 'Kombucha'],
        reason: 'No added sugars, better hydration'
      },
      'chips': {
        alternatives: ['Baked vegetable chips', 'Air-popped popcorn', 'Nuts'],
        reason: 'Less processed, healthier fats'
      },
      'ice cream': {
        alternatives: ['Frozen yogurt', 'Nice cream (frozen banana)', 'Sorbet'],
        reason: 'Lower calories, less saturated fat'
      }
    };

    // Add disease-specific alternatives
    if (diseases.includes('diabetes')) {
      alternativeMap['regular pasta'] = {
        alternatives: ['Zucchini noodles', 'Shirataki noodles', 'Lentil pasta'],
        reason: 'Lower carbs, better blood sugar control'
      };
    }

    if (diseases.includes('hypertension')) {
      alternativeMap['table salt'] = {
        alternatives: ['Herbs and spices', 'Lemon juice', 'Garlic powder'],
        reason: 'Flavor without sodium'
      };
    }

    // Convert to array format
    Object.entries(alternativeMap).forEach(([unhealthy, data]) => {
      alternatives.push({
        unhealthyFood: unhealthy,
        alternatives: data.alternatives,
        reason: data.reason,
        category: 'substitution'
      });
    });

    return alternatives;
  }

  async getRecipeDetails(recipeId) {
    if (!this.spoonacularApiKey) return null;

    try {
      const response = await axios.get(`https://api.spoonacular.com/recipes/${recipeId}/information`, {
        params: {
          apiKey: this.spoonacularApiKey,
          includeNutrition: true
        }
      });

      return {
        id: response.data.id,
        title: response.data.title,
        image: response.data.image,
        readyInMinutes: response.data.readyInMinutes,
        servings: response.data.servings,
        instructions: response.data.instructions,
        ingredients: response.data.extendedIngredients?.map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        })),
        nutrition: response.data.nutrition?.nutrients?.reduce((acc, nutrient) => {
          acc[nutrient.name.toLowerCase()] = {
            amount: nutrient.amount,
            unit: nutrient.unit
          };
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Recipe details fetch failed:', error);
      return null;
    }
  }
}

module.exports = new RecommendationService();
