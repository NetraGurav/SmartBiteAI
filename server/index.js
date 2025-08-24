const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log('🚀 Starting SmartBite AI Backend...');

// Basic CORS - allow all origins for now
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



// Request timeout middleware to prevent hanging requests
app.use((req, res, next) => {
  // Set timeout for all requests (30 seconds)
  req.setTimeout(30000, () => {
    console.error(`Request timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Request timeout' 
      });
    }
  });
  
  res.setTimeout(30000, () => {
    console.error(`Response timeout: ${req.method} ${req.url}`);
    if (!res.headersSent) {
      res.status(408).json({ 
        success: false, 
        message: 'Response timeout' 
      });
    }
  });
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📥 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📤 ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

const PORT = process.env.PORT || 5000;

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartbite';
console.log('💾 Connecting to MongoDB:', MONGO_URI.replace(/\/\/.*@/, '//***:***@'));

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}).then(() => {
  console.log('✅ MongoDB connected successfully!');
}).catch((error) => {
  console.error('❌ MongoDB connection failed:', error.message);
  console.log('💡 Continuing without MongoDB for basic API testing...');
});

// Enhanced MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected - attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connected');
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed.');
  process.exit(0);
});
// --------------------------

// Routes
const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SmartBite AI backend is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Simple test endpoints
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working! 🚀',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'POST request working! 🚀',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// Global error handler to prevent crashes
app.use((error, req, res, next) => {
  console.error('❌ Global error handler:', error);
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process immediately, give it time to finish current requests
  setTimeout(() => {
    console.log('🛑 Exiting due to uncaught exception...');
    process.exit(1);
  }, 1000);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Server started at: ${new Date().toISOString()}`);
});