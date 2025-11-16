const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    // Basic Food Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Manual quantity input like "200gm", "2x50gm" for display/export
    quantityInput: {
      type: String,
      default: "",
    },
    // Additional product units descriptor (e.g., "pack", "box")
    productUnits: {
      type: String,
      default: "",
    },
    // Pricing (optional, in INR)
    estimatedValue: {
      type: Number,
      default: null,
      min: 0,
    },
    brand: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    // Quantity and Storage
    quantity: {
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      unit: {
        type: String,
        enum: [
          "grams",
          "kilograms",
          "milliliters",
          "liters",
          "pieces",
          "packets",
          "cans",
          "bottles",
        ],
        default: "pieces",
      },
    },

    // Dates
    expiryDate: {
      type: Date,
      required: true,
    },
    bestBeforeDate: Date,
    manufacturedDate: Date,
    shelfLife: {
      value: Number,
      unit: {
        type: String,
        enum: ["days", "weeks", "months", "years"],
        default: "days",
      },
    },

    // Categories and Tags
    category: {
      type: String,
      enum: [
        "dairy",
        "meat",
        "fruits",
        "vegetables",
        "grains",
        "snacks",
        "beverages",
        "condiments",
        "frozen",
        "canned",
        "bakery",
        "other",
      ],
      default: "other",
    },
    tags: [String],

    // Nutrition Information
    nutrition: {
      calories: Number,
      protein: Number,
      carbohydrates: Number,
      fat: Number,
      fiber: Number,
      sugar: Number,
      sodium: Number,
      cholesterol: Number,
      vitamins: {
        vitaminA: Number,
        vitaminC: Number,
        vitaminD: Number,
        vitaminE: Number,
        vitaminK: Number,
        vitaminB1: Number,
        vitaminB2: Number,
        vitaminB3: Number,
        vitaminB6: Number,
        vitaminB12: Number,
        folate: Number,
      },
      minerals: {
        calcium: Number,
        iron: Number,
        magnesium: Number,
        phosphorus: Number,
        potassium: Number,
        zinc: Number,
      },
    },

    // Ingredients and Allergens
    ingredients: [String],
    allergens: [
      {
        type: String,
        enum: [
          "milk",
          "eggs",
          "fish",
          "shellfish",
          "tree-nuts",
          "peanuts",
          "wheat",
          "soybeans",
          "sesame",
        ],
      },
    ],

    // Health Risk Assessment
    healthRisks: [
      {
        type: {
          type: String,
          enum: [
            "allergen",
            "disease-risk",
            "symptom-trigger",
            "drug-interaction",
          ],
          required: true,
        },
        severity: {
          type: String,
          enum: ["safe", "risky", "harmful"],
          required: true,
        },
        description: String,
        affectedConditions: [String],
        shortTermConsequences: String,
        longTermConsequences: String,
        references: [String],
      },
    ],

    // Entry Method
    entryMethod: {
      type: String,
      enum: ["barcode", "ocr", "manual"],
      required: true,
    },

    // OCR Data (if applicable)
    ocrData: {
      originalImage: String, // URL to stored image
      extractedText: String,
      confidence: Number,
      processingDate: Date,
    },

    // User and Status
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "consumed", "expired", "wasted"],
      default: "active",
    },

    // Consumption Tracking
    consumedDate: Date,
    consumedAmount: {
      amount: Number,
      unit: String,
    },

    // Notifications
    notificationsSent: [
      {
        type: {
          type: String,
          enum: ["expiry", "health-warning", "suggestion"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        channel: {
          type: String,
          enum: ["email", "whatsapp", "sms", "in-app"],
          required: true,
        },
        message: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
foodSchema.index({ userId: 1, expiryDate: 1 });
foodSchema.index({ userId: 1, status: 1 });
foodSchema.index({ barcode: 1 });
foodSchema.index({ "healthRisks.severity": 1 });

// Virtual for days until expiry
foodSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.expiryDate) return null;
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for expiry status
foodSchema.virtual("expiryStatus").get(function () {
  const daysUntilExpiry = this.daysUntilExpiry;
  if (daysUntilExpiry === null) return "unknown";
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 1) return "expiring-today";
  if (daysUntilExpiry <= 3) return "expiring-soon";
  if (daysUntilExpiry <= 7) return "expiring-week";
  return "safe";
});

// Method to check if food is expired
foodSchema.methods.isExpired = function () {
  return this.expiryDate && new Date() > this.expiryDate;
};

// Method to check if food is expiring soon
foodSchema.methods.isExpiringSoon = function (days = 3) {
  if (!this.expiryDate) return false;
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
};

// Method to get health risk summary
foodSchema.methods.getHealthRiskSummary = function () {
  if (!this.healthRisks || this.healthRisks.length === 0) {
    return { overall: "safe", risks: [] };
  }

  const harmfulRisks = this.healthRisks.filter(
    (risk) => risk.severity === "harmful"
  );
  const riskyRisks = this.healthRisks.filter(
    (risk) => risk.severity === "risky"
  );

  let overall = "safe";
  if (harmfulRisks.length > 0) overall = "harmful";
  else if (riskyRisks.length > 0) overall = "risky";

  return {
    overall,
    risks: this.healthRisks,
    harmfulCount: harmfulRisks.length,
    riskyCount: riskyRisks.length,
  };
};

// Ensure virtual fields are included when converting to JSON
foodSchema.set("toJSON", { virtuals: true });
foodSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Food", foodSchema);
