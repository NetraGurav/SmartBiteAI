const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

console.log('🚀 Starting MINIMAL SmartBite AI Backend...');

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    success: true,
    message: 'SmartBite AI Backend is running! 🚀',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Test endpoints
app.get('/api/test', (req, res) => {
  console.log('✅ API test requested');
  res.json({
    success: true,
    message: 'API is working! 🎉',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  console.log('✅ POST test requested:', req.body);
  res.json({
    success: true,
    message: 'POST request working! 🎉',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Simple food creation endpoint (no database)
app.post('/api/foods/enhanced', (req, res) => {
  console.log('🍎 Food creation request:', req.body);
  
  const { name, expiryDate } = req.body;
  
  if (!name || !expiryDate) {
    return res.status(400).json({
      success: false,
      message: 'Name and expiry date are required'
    });
  }
  
  // Simulate successful food creation
  const mockFood = {
    _id: 'mock_' + Date.now(),
    name: name,
    expiryDate: expiryDate,
    createdAt: new Date().toISOString()
  };
  
  console.log('✅ Mock food created:', mockFood);
  
  res.status(201).json({
    success: true,
    message: 'Food item added successfully! 🎉',
    data: {
      food: mockFood
    }
  });
});

// Simple login endpoint (no database)
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request:', { email: req.body.email });
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  // Mock successful login (accept any email/password)
  const mockUser = {
    _id: 'mock_user_123',
    name: 'Test User',
    email: email,
    phone: '',
    whatsapp: '',
    notificationPreferences: {
      channels: {
        email: true,
        sms: false,
        whatsapp: false,
        inApp: true
      },
      expiryDays: 3,
      notificationTime: '09:00',
      types: {
        expiry: true,
        healthWarnings: true,
        suggestions: true,
        summaries: true
      }
    }
  };
  
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  console.log('✅ Mock login successful for:', email);
  
  res.json({
    success: true,
    message: 'Login successful! 🎉',
    data: {
      user: mockUser,
      token: mockToken
    }
  });
});

// Simple register endpoint (no database)
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Register request:', { email: req.body.email, name: req.body.name });
  
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email and password are required'
    });
  }
  
  // Mock successful registration
  const mockUser = {
    _id: 'mock_user_' + Date.now(),
    name: name,
    email: email,
    phone: '',
    whatsapp: '',
    notificationPreferences: {
      channels: {
        email: true,
        sms: false,
        whatsapp: false,
        inApp: true
      },
      expiryDays: 3,
      notificationTime: '09:00',
      types: {
        expiry: true,
        healthWarnings: true,
        suggestions: true,
        summaries: true
      }
    }
  };
  
  const mockToken = 'mock_jwt_token_' + Date.now();
  
  console.log('✅ Mock registration successful for:', email);
  
  res.json({
    success: true,
    message: 'Registration successful! 🎉',
    data: {
      user: mockUser,
      token: mockToken
    }
  });
});

// Simple profile endpoint (no database)
app.get('/api/auth/profile', (req, res) => {
  console.log('👤 Profile request');
  
  // Mock user profile (accept any token)
  const mockUser = {
    _id: 'mock_user_123',
    name: 'Test User',
    email: 'test@example.com',
    phone: '',
    whatsapp: '',
    notificationPreferences: {
      channels: {
        email: true,
        sms: false,
        whatsapp: false,
        inApp: true
      },
      expiryDays: 3,
      notificationTime: '09:00',
      types: {
        expiry: true,
        healthWarnings: true,
        suggestions: true,
        summaries: true
      }
    }
  };
  
  console.log('✅ Mock profile returned');
  
  res.json({
    success: true,
    data: {
      user: mockUser
    }
  });
});

// Simple notification preferences endpoint (no database)
app.put('/api/auth/notification-preferences', (req, res) => {
  console.log('🔔 Notification preferences update:', req.body);
  
  // Simulate successful update
  const mockPreferences = {
    channels: req.body.channels || {
      email: true,
      sms: false,
      whatsapp: false,
      inApp: true
    },
    expiryDays: req.body.expiryDays || 3,
    notificationTime: req.body.notificationTime || '09:00',
    types: req.body.types || {
      expiry: true,
      healthWarnings: true,
      suggestions: true,
      summaries: true
    },
    contactInfo: req.body.contactInfo || {
      email: 'test@example.com',
      phone: '',
      whatsapp: '',
      name: 'Test User'
    }
  };
  
  console.log('✅ Mock preferences updated:', mockPreferences);
  
  res.json({
    success: true,
    message: 'Notification preferences updated successfully! 🎉',
    data: mockPreferences
  });
});

// Get food inventory endpoint (no database)
app.get('/api/foods', (req, res) => {
  console.log('🍎 Food inventory requested');
  
  const mockFoods = [
    {
      _id: 'food_1',
      name: 'Apple',
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 5,
      unit: 'pieces',
      category: 'Fruits',
      brand: 'Fresh Market',
      storageLocation: 'Refrigerator',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'food_2',
      name: 'Milk',
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 1,
      unit: 'liter',
      category: 'Dairy',
      brand: 'Farm Fresh',
      storageLocation: 'Refrigerator',
      createdAt: new Date().toISOString()
    },
    {
      _id: 'food_3',
      name: 'Bread',
      expiryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 1,
      unit: 'loaf',
      category: 'Bakery',
      brand: 'Local Bakery',
      storageLocation: 'Pantry',
      createdAt: new Date().toISOString()
    }
  ];
  
  console.log('✅ Mock food inventory returned:', mockFoods.length, 'items');
  
  res.json({
    success: true,
    data: mockFoods
  });
});

// Get notifications endpoint (no database)
app.get('/api/notifications', (req, res) => {
  console.log('🔔 Notifications requested');
  
  const mockNotifications = [
    {
      _id: 'notif_1',
      type: 'expiry',
      title: 'Food Expiring Soon',
      message: 'Bread will expire tomorrow',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'notif_2',
      type: 'health',
      title: 'Health Warning',
      message: 'Check allergen information for new items',
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];
  
  console.log('✅ Mock notifications returned:', mockNotifications.length, 'items');
  
  res.json({
    success: true,
    data: mockNotifications
  });
});

// Get notification stats endpoint (no database)
app.get('/api/notifications/stats', (req, res) => {
  console.log('📊 Notification stats requested');
  
  const mockStats = {
    total: 15,
    unread: 3,
    expiry: 8,
    health: 4,
    suggestions: 3
  };
  
  console.log('✅ Mock notification stats returned');
  
  res.json({
    success: true,
    data: mockStats
  });
});

// Get notification preferences endpoint (no database)
app.get('/api/notifications/preferences', (req, res) => {
  console.log('🔔 Notification preferences requested');
  
  const mockPreferences = {
    channels: {
      email: true,
      sms: false,
      whatsapp: false,
      inApp: true
    },
    expiryDays: 3,
    notificationTime: '09:00',
    types: {
      expiry: true,
      healthWarnings: true,
      suggestions: true,
      summaries: true
    },
    contactInfo: {
      email: 'test@example.com',
      phone: '',
      whatsapp: '',
      name: 'Test User'
    }
  };
  
  console.log('✅ Mock notification preferences returned');
  
  res.json({
    success: true,
    data: mockPreferences
  });
});

// Dashboard endpoint (no database)
app.get('/api/dashboard', (req, res) => {
  console.log('📊 Dashboard data requested');
  
  const mockDashboard = {
    totalFoods: 5,
    expiringToday: 1,
    expiringSoon: 2,
    healthWarnings: 0,
    recentActivity: [
      { action: 'Added', item: 'Mock Apple', time: new Date().toISOString() }
    ]
  };
  
  res.json({
    success: true,
    data: mockDashboard
  });
});

// Catch all other routes
app.use('*', (req, res) => {
  console.log('❓ Unknown route requested:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error: ' + error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('✅ MINIMAL Backend running on port', PORT);
  console.log('🌐 Server URL: http://localhost:' + PORT);
  console.log('🔗 Test URL: http://localhost:' + PORT + '/api/test');
  console.log('📋 Ready to accept requests!');
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
