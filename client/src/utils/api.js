import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds timeout for OCR operations
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // Enhanced error logging
    console.error('❌ API Error Details:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('🔐 Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 500) {
      const serverError = error.response?.data?.message || 'Internal server error';
      console.error('🚨 Server Error:', serverError);
      toast.error(`Server error: ${serverError}`);
    } else if (error.response?.status === 400) {
      const validationError = error.response?.data?.message || 'Invalid request';
      console.error('⚠️ Validation Error:', validationError);
      toast.error(`Validation error: ${validationError}`);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('🌐 Network/Connection Error');
      toast.error('Cannot connect to server. Please check if the backend is running.');
    } else {
      const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
      console.error('❓ Other Error:', message);
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
