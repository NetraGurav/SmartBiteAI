const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { 
    expiresIn: '7d' 
  });
};

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, whatsapp } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      whatsapp
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Get Current User Profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Update User Profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'name', 'phone', 'whatsapp', 'age', 'gender', 'weight', 'height',
      'diseases', 'allergies', 'symptoms', 'medications', 'dietaryPreferences',
      'notificationPreferences'
    ];

    // Normalize list fields to expected object shape
    const toNamedObjects = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map(item => {
          if (typeof item === 'string') {
            const n = item.trim();
            return n ? { name: n } : null;
          }
          if (item && typeof item === 'object') {
            const n = typeof item.name === 'string' ? item.name.trim() : '';
            return n ? { name: n } : null;
          }
          return null;
        })
        .filter(Boolean);
    };

    // Filter and normalize
    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (['diseases','allergies','symptoms','medications'].includes(field)) {
          filteredUpdates[field] = toNamedObjects(updates[field]);
        } else if (field === 'dietaryPreferences') {
          filteredUpdates[field] = Array.isArray(updates[field]) ? updates[field] : [];
        } else if (field === 'notificationPreferences') {
          filteredUpdates[field] = updates[field];
        } else {
          filteredUpdates[field] = updates[field];
        }
      }
    });

    // Update user
    Object.assign(req.user, filteredUpdates);
    // Ensure Mongoose tracks nested array updates
    ['diseases','allergies','symptoms','medications','dietaryPreferences','notificationPreferences'].forEach(field => {
      if (filteredUpdates[field] !== undefined) {
        req.user.markModified(field);
      }
    });
    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: req.user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Send email with reset link
    // For now, just return success
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token.'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, async (req, res) => {
  try {
    // In a more advanced setup, you might want to blacklist the token
    // For now, just return success
    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
});

// Get Notification Preferences
router.get('/notification-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences phone whatsapp email name');
    
    res.json({
      success: true,
      data: {
        ...user.notificationPreferences.toObject(),
        contactInfo: {
          email: user.email,
          phone: user.phone || '',
          whatsapp: user.whatsapp || '',
          name: user.name
        }
      }
    });
  } catch (error) {
    console.error('Get notification preferences failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification preferences.' });
  }
});

// Simple and reliable notification preferences update
router.put('/notification-preferences', auth, async (req, res) => {
  try {
    console.log('🔔 Notification preferences update request:', {
      userId: req.user._id,
      hasChannels: !!req.body.channels,
      hasContactInfo: !!req.body.contactInfo
    });
    
    const userId = req.user._id;
    const { channels, expiryDays, notificationTime, types, contactInfo } = req.body;
    
    // Find user first
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    console.log('👤 User found:', user.name);
    
    // Update notification preferences
    if (channels) {
      user.notificationPreferences = user.notificationPreferences || {};
      user.notificationPreferences.channels = {
        email: Boolean(channels.email),
        sms: Boolean(channels.sms),
        whatsapp: Boolean(channels.whatsapp),
        inApp: Boolean(channels.inApp)
      };
      console.log('📢 Updated channels:', user.notificationPreferences.channels);
    }
    
    if (expiryDays !== undefined) {
      user.notificationPreferences = user.notificationPreferences || {};
      user.notificationPreferences.expiryDays = parseInt(expiryDays) || 3;
    }
    
    if (notificationTime) {
      user.notificationPreferences = user.notificationPreferences || {};
      user.notificationPreferences.notificationTime = notificationTime;
    }
    
    if (types) {
      user.notificationPreferences = user.notificationPreferences || {};
      user.notificationPreferences.types = {
        expiry: Boolean(types.expiry),
        healthWarnings: Boolean(types.healthWarnings),
        suggestions: Boolean(types.suggestions),
        summaries: Boolean(types.summaries)
      };
    }
    
    // Update contact information
    if (contactInfo) {
      if (contactInfo.phone !== undefined) {
        user.phone = String(contactInfo.phone || '').trim();
        console.log('📱 Updated phone:', user.phone);
      }
      if (contactInfo.whatsapp !== undefined) {
        user.whatsapp = String(contactInfo.whatsapp || '').trim();
        console.log('💬 Updated WhatsApp:', user.whatsapp);
      }
      if (contactInfo.email !== undefined) {
        const email = String(contactInfo.email || '').trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          user.email = email;
          console.log('📧 Updated email:', user.email);
        } else if (email) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid email format' 
          });
        }
      }
    }
    
    // Save user
    const savedUser = await user.save();
    console.log('✅ User preferences saved successfully');
    
    const responseData = {
      channels: savedUser.notificationPreferences?.channels || {
        email: true,
        sms: false,
        whatsapp: false,
        inApp: true
      },
      expiryDays: savedUser.notificationPreferences?.expiryDays || 3,
      notificationTime: savedUser.notificationPreferences?.notificationTime || '09:00',
      types: savedUser.notificationPreferences?.types || {
        expiry: true,
        healthWarnings: true,
        suggestions: true,
        summaries: true
      },
      contactInfo: {
        email: savedUser.email,
        phone: savedUser.phone || '',
        whatsapp: savedUser.whatsapp || '',
        name: savedUser.name
      }
    };
    
    res.json({
      success: true,
      message: 'Notification preferences updated successfully! 🎉',
      data: responseData
    });
    
  } catch (error) {
    console.error('❌ Notification preferences update failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update notification preferences: ' + error.message
    });
  }
});

// Test notification endpoint
router.post('/test-notification', auth, async (req, res) => {
  try {
    const { type = 'sms' } = req.body;
    const user = await User.findById(req.user._id);
    
    const notificationService = require('../services/notificationService');
    
    const testMessage = {
      title: '🍪 SmartBite AI Test Notification',
      message: `Hello ${user.name}! This is a test notification from SmartBite AI. Your notification system is working correctly! 📱`,
      type: 'test',
      priority: 'normal'
    };
    
    let result;
    
    switch (type) {
      case 'sms':
        if (!user.phone) {
          return res.status(400).json({ success: false, message: 'Phone number not set. Please add your phone number first.' });
        }
        result = await notificationService.sendSMS(user.phone, testMessage.message);
        break;
        
      case 'whatsapp':
        if (!user.whatsapp) {
          return res.status(400).json({ success: false, message: 'WhatsApp number not set. Please add your WhatsApp number first.' });
        }
        result = await notificationService.sendWhatsApp(user.whatsapp, testMessage.message);
        break;
        
      case 'email':
        result = await notificationService.sendEmail(user.email, testMessage.title, testMessage.message);
        break;
        
      default:
        return res.status(400).json({ success: false, message: 'Invalid notification type' });
    }
    
    if (result.success) {
      // Also add to in-app notifications
      await User.findByIdAndUpdate(user._id, {
        $push: {
          notifications: {
            title: testMessage.title,
            message: testMessage.message,
            type: 'test',
            read: false,
            createdAt: new Date()
          }
        }
      });
      
      res.json({
        success: true,
        message: `Test ${type} notification sent successfully!`,
        data: { sentTo: type === 'sms' ? user.phone : type === 'whatsapp' ? user.whatsapp : user.email }
      });
    } else {
      res.status(500).json({
        success: false,
        message: `Failed to send ${type} notification: ${result.error || 'Unknown error'}`
      });
    }
  } catch (error) {
    console.error('Test notification failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send test notification' });
  }
});

module.exports = router; 