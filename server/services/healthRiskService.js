const axios = require('axios');

class HealthRiskService {
  constructor() {
    this.allergenDatabase = this.initializeAllergenDatabase();
    this.diseaseRiskDatabase = this.initializeDiseaseRiskDatabase();
    this.drugInteractionDatabase = this.initializeDrugInteractionDatabase();
  }

  initializeAllergenDatabase() {
    return {
      // Common allergens and their variants
      nuts: ['nuts', 'peanuts', 'almonds', 'walnuts', 'cashews', 'pistachios', 'hazelnuts', 'pecans', 'brazil nuts', 'macadamia', 'pine nuts'],
      shellfish: ['shellfish', 'shrimp', 'crab', 'lobster', 'oysters', 'mussels', 'clams', 'scallops', 'prawns'],
      fish: ['fish', 'salmon', 'tuna', 'cod', 'mackerel', 'sardines', 'anchovies', 'herring'],
      dairy: ['milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt', 'lactose', 'casein', 'whey'],
      eggs: ['eggs', 'egg', 'albumin', 'lecithin', 'mayonnaise'],
      soy: ['soy', 'soya', 'soybeans', 'tofu', 'tempeh', 'miso', 'soy sauce', 'edamame'],
      gluten: ['gluten', 'wheat', 'barley', 'rye', 'oats', 'spelt', 'kamut', 'triticale'],
      sesame: ['sesame', 'tahini', 'sesame oil', 'sesame seeds'],
      sulfites: ['sulfites', 'sulfur dioxide', 'sodium sulfite', 'potassium sulfite'],
      mustard: ['mustard', 'mustard seed', 'mustard oil'],
      celery: ['celery', 'celeriac', 'celery seed'],
      lupin: ['lupin', 'lupine', 'lupin flour']
    };
  }

  initializeDiseaseRiskDatabase() {
    return {
      diabetes: {
        avoid: ['sugar', 'glucose', 'fructose', 'sucrose', 'high fructose corn syrup', 'honey', 'maple syrup', 'agave'],
        limit: ['carbohydrates', 'refined flour', 'white rice', 'white bread', 'pasta'],
        consequences: {
          shortTerm: 'May cause blood sugar spikes and difficulty managing glucose levels',
          longTerm: 'Can worsen diabetes control and increase risk of complications'
        }
      },
      hypertension: {
        avoid: ['sodium', 'salt', 'monosodium glutamate', 'sodium chloride', 'sodium bicarbonate'],
        limit: ['processed foods', 'canned foods', 'pickled foods', 'cured meats'],
        consequences: {
          shortTerm: 'May increase blood pressure temporarily',
          longTerm: 'Can worsen hypertension and increase cardiovascular risk'
        }
      },
      'heart disease': {
        avoid: ['trans fats', 'hydrogenated oils', 'partially hydrogenated oils'],
        limit: ['saturated fats', 'cholesterol', 'sodium', 'processed meats'],
        consequences: {
          shortTerm: 'May affect cardiovascular function',
          longTerm: 'Can increase risk of heart attacks and strokes'
        }
      },
      'kidney disease': {
        avoid: ['phosphorus', 'potassium', 'sodium'],
        limit: ['protein', 'dairy products', 'nuts', 'whole grains'],
        consequences: {
          shortTerm: 'May strain kidney function',
          longTerm: 'Can accelerate kidney damage and disease progression'
        }
      },
      'liver disease': {
        avoid: ['alcohol', 'acetaminophen', 'iron supplements'],
        limit: ['sodium', 'protein', 'fats'],
        consequences: {
          shortTerm: 'May stress liver function',
          longTerm: 'Can worsen liver damage and impair detoxification'
        }
      },
      celiac: {
        avoid: ['gluten', 'wheat', 'barley', 'rye', 'oats', 'spelt', 'kamut', 'triticale'],
        limit: [],
        consequences: {
          shortTerm: 'May cause digestive symptoms, bloating, and discomfort',
          longTerm: 'Can damage intestinal lining and cause malabsorption'
        }
      },
      'lactose intolerance': {
        avoid: ['lactose', 'milk', 'dairy products'],
        limit: ['cheese', 'yogurt', 'ice cream'],
        consequences: {
          shortTerm: 'May cause digestive upset, bloating, and diarrhea',
          longTerm: 'Continued consumption may worsen symptoms'
        }
      },
      gout: {
        avoid: ['purines', 'organ meats', 'anchovies', 'sardines', 'beer'],
        limit: ['red meat', 'seafood', 'alcohol', 'fructose'],
        consequences: {
          shortTerm: 'May trigger gout attacks and joint pain',
          longTerm: 'Can increase frequency and severity of gout episodes'
        }
      }
    };
  }

  initializeDrugInteractionDatabase() {
    return {
      warfarin: {
        avoid: ['vitamin k', 'leafy greens', 'broccoli', 'spinach', 'kale'],
        consequences: 'May interfere with blood clotting medication effectiveness'
      },
      'ace inhibitors': {
        avoid: ['potassium', 'salt substitutes', 'bananas', 'oranges'],
        consequences: 'May cause dangerous potassium levels'
      },
      'calcium channel blockers': {
        avoid: ['grapefruit', 'grapefruit juice'],
        consequences: 'May increase drug concentration and side effects'
      },
      statins: {
        avoid: ['grapefruit', 'grapefruit juice', 'alcohol'],
        consequences: 'May increase risk of muscle damage and liver problems'
      },
      'monoamine oxidase inhibitors': {
        avoid: ['tyramine', 'aged cheese', 'cured meats', 'fermented foods', 'alcohol'],
        consequences: 'May cause dangerous blood pressure spikes'
      },
      metformin: {
        limit: ['alcohol', 'high carbohydrate foods'],
        consequences: 'May affect blood sugar control and increase side effects'
      }
    };
  }

  async analyzeHealthRisk(food, userProfile) {
    const risks = {
      allergens: [],
      diseases: [],
      drugInteractions: [],
      symptoms: [],
      overallRisk: 'safe',
      recommendations: []
    };

    try {
      // Normalize user profile arrays to string name arrays
      const allergyNames = (userProfile.allergies || []).map(a => (typeof a === 'string' ? a : (a.name || ''))).filter(Boolean);
      const diseaseNames = (userProfile.diseases || []).map(d => (typeof d === 'string' ? d : (d.name || ''))).filter(Boolean);
      const medicationNames = (userProfile.medications || []).map(m => (typeof m === 'string' ? m : (m.name || ''))).filter(Boolean);
      const symptomNames = (userProfile.symptoms || []).map(s => (typeof s === 'string' ? s : (s.name || ''))).filter(Boolean);

      // Check for allergen risks
      if (allergyNames.length > 0) {
        risks.allergens = this.checkAllergenRisks(food, allergyNames);
      }

      // Check for disease-related risks
      if (diseaseNames.length > 0) {
        risks.diseases = this.checkDiseaseRisks(food, diseaseNames);
      }

      // Check for drug interactions
      if (medicationNames.length > 0) {
        risks.drugInteractions = this.checkDrugInteractions(food, medicationNames);
      }

      // Check for symptom triggers
      if (symptomNames.length > 0) {
        risks.symptoms = this.checkSymptomTriggers(food, symptomNames);
      }

      // Adjust severities for dietary preferences (e.g., low-sugar)
      this.adjustForDietaryPreferences(risks, {
        dietaryPreferences: userProfile.dietaryPreferences || []
      });

      // Calculate overall risk level
      risks.overallRisk = this.calculateOverallRisk(risks);

      // Generate recommendations
      risks.recommendations = this.generateRecommendations(risks, food);

      return risks;
    } catch (error) {
      console.error('Health risk analysis failed:', error);
      return {
        ...risks,
        error: 'Failed to analyze health risks'
      };
    }
  }

  checkAllergenRisks(food, userAllergies) {
    const risks = [];
    const ingredients = this.extractIngredients(food);

    userAllergies.forEach(allergy => {
      const allergenKeywords = this.allergenDatabase[allergy.toLowerCase()] || [allergy.toLowerCase()];
      
      allergenKeywords.forEach(keyword => {
        if (ingredients.some(ingredient => ingredient.toLowerCase().includes(keyword))) {
          risks.push({
            type: 'allergen',
            allergen: allergy,
            severity: 'harmful',
            found: keyword,
            consequence: `Contains ${allergy} which you are allergic to. May cause allergic reactions.`,
            recommendation: `Avoid this product completely due to ${allergy} allergy.`
          });
        }
      });
    });

    return risks;
  }

  checkDiseaseRisks(food, userDiseases) {
    const risks = [];
    const ingredients = this.extractIngredients(food);
    const nutrition = food.nutrition || {};
    const name = (food.name || '').toLowerCase();
    const category = (food.category || '').toLowerCase();

    userDiseases.forEach(disease => {
      const diseaseData = this.diseaseRiskDatabase[disease.toLowerCase()];
      if (!diseaseData) return;

      // Check avoid list
      diseaseData.avoid.forEach(avoidItem => {
        const inIngredients = ingredients.some(ingredient => ingredient.toLowerCase().includes(avoidItem.toLowerCase()));
        const inNutrition = this.checkNutritionContent(nutrition, avoidItem, true);
        const heuristicHigh = this.heuristicHighRiskFor(disease.toLowerCase(), { name, category, ingredients });
        if (inIngredients || inNutrition || heuristicHigh) {
          risks.push({
            type: 'disease',
            disease: disease,
            severity: heuristicHigh ? 'risky' : 'risky',
            found: inIngredients ? avoidItem : (inNutrition ? `${avoidItem} (high)` : 'heuristic'),
            consequence: diseaseData.consequences.shortTerm,
            longTermConsequence: diseaseData.consequences.longTerm,
            recommendation: `Avoid due to ${disease}. Contains ${avoidItem}.`
          });
        }
      });

      // Check limit list
      diseaseData.limit.forEach(limitItem => {
        if (ingredients.some(ingredient => ingredient.toLowerCase().includes(limitItem.toLowerCase())) ||
            this.checkNutritionContent(nutrition, limitItem, true)) {
          risks.push({
            type: 'disease',
            disease: disease,
            severity: 'moderate',
            found: limitItem,
            consequence: `Should be limited due to ${disease}`,
            recommendation: `Consume in moderation due to ${disease}.`
          });
        }
      });
    });

    return risks;
  }

  checkDrugInteractions(food, userMedications) {
    const risks = [];
    const ingredients = this.extractIngredients(food);

    userMedications.forEach(medication => {
      const drugData = this.drugInteractionDatabase[medication.toLowerCase()];
      if (!drugData) return;

      if (drugData.avoid) {
        drugData.avoid.forEach(avoidItem => {
          if (ingredients.some(ingredient => ingredient.toLowerCase().includes(avoidItem.toLowerCase()))) {
            risks.push({
              type: 'drug_interaction',
              medication: medication,
              severity: 'harmful',
              found: avoidItem,
              consequence: drugData.consequences,
              recommendation: `Avoid due to interaction with ${medication}.`
            });
          }
        });
      }

      if (drugData.limit) {
        drugData.limit.forEach(limitItem => {
          if (ingredients.some(ingredient => ingredient.toLowerCase().includes(limitItem.toLowerCase()))) {
            risks.push({
              type: 'drug_interaction',
              medication: medication,
              severity: 'moderate',
              found: limitItem,
              consequence: drugData.consequences,
              recommendation: `Limit consumption due to ${medication} interaction.`
            });
          }
        });
      }
    });

    return risks;
  }

  checkSymptomTriggers(food, userSymptoms) {
    const risks = [];
    const ingredients = this.extractIngredients(food);

    // Common symptom triggers
    const symptomTriggers = {
      headache: ['msg', 'monosodium glutamate', 'nitrates', 'nitrites', 'tyramine', 'caffeine'],
      bloating: ['lactose', 'beans', 'cabbage', 'broccoli', 'carbonated', 'artificial sweeteners'],
      heartburn: ['spicy', 'acidic', 'tomato', 'citrus', 'chocolate', 'coffee', 'alcohol'],
      nausea: ['greasy', 'fried', 'high fat', 'spicy', 'strong odors'],
      'stomach pain': ['lactose', 'gluten', 'spicy', 'acidic', 'high fiber'],
      diarrhea: ['lactose', 'artificial sweeteners', 'high fat', 'spicy', 'caffeine'],
      constipation: ['low fiber', 'processed', 'dairy', 'iron supplements'],
      rash: ['food dyes', 'preservatives', 'artificial colors', 'sulfites']
    };

    userSymptoms.forEach(symptom => {
      const triggers = symptomTriggers[symptom.toLowerCase()] || [];
      
      triggers.forEach(trigger => {
        if (ingredients.some(ingredient => ingredient.toLowerCase().includes(trigger.toLowerCase()))) {
          risks.push({
            type: 'symptom_trigger',
            symptom: symptom,
            severity: 'moderate',
            found: trigger,
            consequence: `May trigger or worsen ${symptom}`,
            recommendation: `Monitor consumption as it may worsen ${symptom}.`
          });
        }
      });
    });

    return risks;
  }

  extractIngredients(food) {
    let ingredients = [];
    
    if (food.ingredients) {
      if (typeof food.ingredients === 'string') {
        ingredients = food.ingredients.split(',').map(i => i.trim());
      } else if (Array.isArray(food.ingredients)) {
        ingredients = food.ingredients;
      }
    }

    // Also check food name and brand for common allergens
    if (food.name) ingredients.push(food.name);
    if (food.brand) ingredients.push(food.brand);
    if (food.category) ingredients.push(food.category);

    return ingredients;
  }

  checkNutritionContent(nutrition, nutrient, isLimit = false) {
    if (!nutrition || !nutrition.macronutrients && !nutrition.micronutrients) return false;

    const allNutrients = { ...nutrition.macronutrients, ...nutrition.micronutrients };
    
    const nutrientMap = {
      'sugar': 'sugar',
      'sodium': 'sodium',
      'carbohydrates': 'carbohydrates',
      'protein': 'protein',
      'fat': 'fat',
      'potassium': 'potassium',
      'phosphorus': 'phosphorus'
    };

    const mappedNutrient = nutrientMap[nutrient.toLowerCase()];
    if (!mappedNutrient || !allNutrients[mappedNutrient]) return false;

    const value = allNutrients[mappedNutrient];
    
    if (isLimit) {
      // Define "high" thresholds for limiting
      const highThresholds = {
        sugar: 15, // grams per 100g
        sodium: 600, // mg per 100g
        carbohydrates: 60, // grams per 100g
        protein: 20, // grams per 100g
        fat: 20, // grams per 100g
        potassium: 300, // mg per 100g
        phosphorus: 200 // mg per 100g
      };
      
      return value > (highThresholds[mappedNutrient] || 0);
    }

    return value > 0;
  }

  heuristicHighRiskFor(disease, ctx) {
    // Heuristic for common cases when nutrition data is missing
    // Focus: diabetes → high sugar items like glucose biscuits, cookies, sweets, soda, juice
    if (disease !== 'diabetes') return false;
    const { name, category, ingredients } = ctx;
    const hay = `${name} ${category} ${ingredients.join(' ').toLowerCase()}`;
    const sugarKeywords = ['glucose', 'sugar', 'sucrose', 'fructose', 'corn syrup', 'syrup', 'jaggery', 'sweet', 'maltodextrin'];
    const sugaryFoodKeywords = ['biscuit', 'cookie', 'sweet', 'chocolate', 'candy', 'cake', 'pastry', 'soft drink', 'soda', 'juice', 'dessert'];
    const hasSugar = sugarKeywords.some(k => hay.includes(k));
    const looksSugary = sugaryFoodKeywords.some(k => hay.includes(k));
    return hasSugar || looksSugary;
  }

  adjustForDietaryPreferences(risks, userCtx) {
    const prefs = (userCtx.dietaryPreferences || []).map(p => String(p).toLowerCase());
    const prefersLowSugar = prefs.includes('low-sugar') || prefs.includes('low sugar');
    if (prefersLowSugar) {
      // If any diabetes-related disease risk exists, escalate moderate → risky
      risks.diseases = risks.diseases.map(r => {
        if (String(r.disease).toLowerCase() === 'diabetes' && (r.found?.includes('sugar') || r.found?.includes('glucose') || r.found === 'heuristic')) {
          return { ...r, severity: r.severity === 'moderate' ? 'risky' : r.severity };
        }
        return r;
      });
    }
  }

  calculateOverallRisk(risks) {
    const allRisks = [
      ...risks.allergens,
      ...risks.diseases,
      ...risks.drugInteractions,
      ...risks.symptoms
    ];

    if (allRisks.some(risk => risk.severity === 'harmful')) {
      return 'harmful';
    }
    
    if (allRisks.some(risk => risk.severity === 'risky')) {
      return 'risky';
    }
    
    if (allRisks.some(risk => risk.severity === 'moderate')) {
      return 'moderate';
    }

    return 'safe';
  }

  generateRecommendations(risks, food) {
    const recommendations = [];
    
    if (risks.overallRisk === 'harmful') {
      recommendations.push('⚠️ AVOID this product completely due to serious health risks.');
    } else if (risks.overallRisk === 'risky') {
      recommendations.push('⚠️ This product is not recommended for your health profile.');
    } else if (risks.overallRisk === 'moderate') {
      recommendations.push('⚠️ Consume with caution and in moderation.');
    } else {
      recommendations.push('✅ This product appears safe for your health profile.');
    }

    // Add specific recommendations
    const allRisks = [
      ...risks.allergens,
      ...risks.diseases,
      ...risks.drugInteractions,
      ...risks.symptoms
    ];

    allRisks.forEach(risk => {
      if (risk.recommendation) {
        recommendations.push(risk.recommendation);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  async getAlternativeSuggestions(food, userProfile) {
    // This would integrate with recommendation service
    // For now, return basic suggestions based on risk type
    const suggestions = [];
    
    const risks = await this.analyzeHealthRisk(food, userProfile);
    
    if (risks.allergens.length > 0) {
      suggestions.push('Look for allergen-free alternatives in the same category');
    }
    
    if (risks.diseases.some(r => r.disease === 'diabetes')) {
      suggestions.push('Consider sugar-free or low-carb alternatives');
    }
    
    if (risks.diseases.some(r => r.disease === 'hypertension')) {
      suggestions.push('Look for low-sodium or no-salt-added versions');
    }

    return suggestions;
  }
}

module.exports = new HealthRiskService();
