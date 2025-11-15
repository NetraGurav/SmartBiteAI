const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true
  },
  
  // Physical Information
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  weight: {
    type: Number, // in kg
    min: 0
  },
  height: {
    type: Number, // in cm
    min: 0
  },
  
  // Health Profile
  diseases: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate'
    },
    diagnosedDate: Date,
    notes: String
  }],
  
  allergies: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate'
    },
    reaction: String,
    notes: String
  }],
  
  symptoms: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    frequency: {
      type: String,
      enum: ['rarely', 'sometimes', 'often', 'always'],
      default: 'sometimes'
    },
    notes: String
  }],
  
  medications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: String,
    frequency: String,
    notes: String
  }],
  
  dietaryPreferences: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'keto', 'paleo', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'low-sodium', 'low-sugar']
  }],
  
  // In-app Notifications
  notifications: [{
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    foodItems: [{
      name: String,
      brand: String,
      expiryDate: Date
    }],
    recommendations: [String]
  }],

  // Notification Preferences
  notificationPreferences: {
    channels: {
      email: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true }
    },
    expiryDays: { type: Number, default: 3, min: 1, max: 30 },
    notificationTime: { type: String, default: '09:00' }, // 24-hour format
    types: {
      expiry: { type: Boolean, default: true },
      healthWarnings: { type: Boolean, default: true },
      suggestions: { type: Boolean, default: true },
      summaries: { type: Boolean, default: true }
    }
  },
  
  // Account Settings
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema); 