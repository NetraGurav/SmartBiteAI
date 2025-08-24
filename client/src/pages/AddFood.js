import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AddFood = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState('scan'); // scan, photo, manual
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [nutritionData, setNutritionData] = useState(null);
  const [healthRisks, setHealthRisks] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    barcode: '',
    category: '',
    quantity: { amount: '', unit: 'pieces' },
    expiryDate: '',
    bestBeforeDate: '',
    manufacturedDate: '',
    shelfLife: { value: '', unit: 'months' },
    ingredients: '',
    allergens: [],
    location: 'pantry',
    notes: '',
    estimatedValue: '',
    dateCalculationMode: 'direct' // 'direct', 'calculated'
  });

  const categories = [
    'Fruits', 'Vegetables', 'Dairy', 'Meat & Poultry', 'Fish & Seafood',
    'Grains & Cereals', 'Legumes', 'Nuts & Seeds', 'Beverages', 'Snacks',
    'Condiments & Sauces', 'Frozen Foods', 'Canned Foods', 'Bakery', 'Other'
  ];

  const units = [
    'pieces', 'grams', 'kilograms', 'milliliters', 'liters',
    'packets', 'cans', 'bottles', 'boxes', 'bags'
  ];

  const shelfLifeUnits = [
    'days', 'weeks', 'months', 'years'
  ];

  // Function to calculate expiry date from manufacture date and shelf life
  const calculateExpiryDate = (manufactureDate, shelfLifeValue, shelfLifeUnit) => {
    if (!manufactureDate || !shelfLifeValue) return '';
    
    const date = new Date(manufactureDate);
    const value = parseInt(shelfLifeValue);
    
    switch (shelfLifeUnit) {
      case 'days':
        date.setDate(date.getDate() + value);
        break;
      case 'weeks':
        date.setDate(date.getDate() + (value * 7));
        break;
      case 'months':
        date.setMonth(date.getMonth() + value);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + value);
        break;
      default:
        return '';
    }
    
    return date.toISOString().split('T')[0];
  };

  // Auto-calculate expiry date when manufacture date or shelf life changes
  const updateCalculatedDates = (newFormData) => {
    if (newFormData.dateCalculationMode === 'calculated' && 
        newFormData.manufacturedDate && 
        newFormData.shelfLife.value) {
      
      const calculatedExpiry = calculateExpiryDate(
        newFormData.manufacturedDate,
        newFormData.shelfLife.value,
        newFormData.shelfLife.unit
      );
      
      if (calculatedExpiry) {
        newFormData.expiryDate = calculatedExpiry;
      }
    }
    return newFormData;
  };

  const locations = [
    'pantry', 'refrigerator', 'freezer', 'cabinet', 'counter'
  ];

  // Start camera for barcode scanning
  const startCamera = async () => {
    try {
      setScanStatus('📷 Starting camera...');
      
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setIsScanning(true);
        setScanStatus('📱 Camera ready! Point at barcode to scan');
        
        // Start scanning after camera is ready
        videoRef.current.onloadedmetadata = () => {
          setScanStatus('🔍 Scanning for barcodes...');
          scanBarcode();
        };
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setScanStatus('❌ Camera access failed');
      toast.error('Camera access denied. Please allow camera access and try again.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      const tracks = cameraStream.getTracks();
      tracks.forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsScanning(false);
    setScanStatus('');
  };

  // Scan barcode from video
  const scanBarcode = async () => {
    if (!videoRef.current || !cameraActive) return;
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Import jsQR dynamically
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        setScanStatus('✅ Barcode detected! Processing...');
        setScannedData({ barcode: code.data, type: 'barcode' });
        toast.success(`Barcode scanned: ${code.data}`);
        stopCamera();
        await lookupBarcode(code.data);
      } else {
        // Continue scanning
        if (isScanning) {
          setTimeout(scanBarcode, 100);
        }
      }
    } catch (error) {
      console.error('Barcode scanning error:', error);
      setScanStatus('⚠️ Scanning... Keep barcode in view');
      if (isScanning) {
        setTimeout(scanBarcode, 100);
      }
    }
  };

  // Capture photo for OCR
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob(async (blob) => {
        await processOCRImage(blob);
      }, 'image/jpeg', 0.8);
    }
  };

  // Process OCR image
  const processOCRImage = async (imageBlob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageBlob);
      
      const response = await api.post('/api/foods/ocr/extract-dates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const { dates, extractedText } = response.data.data;
        
        // Update form with extracted dates
        setFormData(prev => ({
          ...prev,
          expiryDate: dates.expiry || prev.expiryDate,
          bestBeforeDate: dates.bestBefore || prev.bestBeforeDate,
          manufacturedDate: dates.manufactured || prev.manufacturedDate
        }));
        
        toast.success('Dates extracted successfully!');
        setActiveTab('manual'); // Switch to manual form
      }
    } catch (error) {
      console.error('OCR failed:', error);
      toast.error('Failed to extract dates from image');
    } finally {
      setIsLoading(false);
      stopCamera();
    }
  };

  // Handle file upload for OCR
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only images are supported by the backend OCR endpoint
    if (file.type === 'application/pdf') {
      toast.error('PDF files are not supported for OCR. Please upload an image.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      toast.loading('🖼️ Processing image file...');
      
      const response = await api.post('/api/foods/ocr/extract-dates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        const { dates } = response.data.data;
        
        // Update form with extracted dates
        setFormData(prev => ({
          ...prev,
          expiryDate: dates?.expiry || prev.expiryDate,
          bestBeforeDate: dates?.bestBefore || prev.bestBeforeDate,
          manufacturedDate: dates?.manufactured || prev.manufacturedDate
        }));
        
        toast.success('✅ Dates extracted successfully!');
        setActiveTab('manual');
      } else {
        throw new Error(response.data.message || 'Failed to extract dates');
      }
    } catch (error) {
      console.error('OCR extraction failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to extract dates from image';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Lookup barcode
  const lookupBarcode = async (barcode) => {
    if (!barcode || barcode.length < 8) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(`/api/foods/barcode/${barcode}`);
      
      if (response.data.success) {
        const data = response.data.data;
        setScannedData(data);
        setNutritionData(data.nutrition);
        
        // Pre-fill form with scanned data
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          brand: data.brand || prev.brand,
          barcode: barcode,
          category: data.category || prev.category,
          ingredients: data.ingredients || prev.ingredients,
          allergens: data.allergens || prev.allergens
        }));
        
        toast.success('Product found! Data pre-filled.');
        setActiveTab('manual');
      } else {
        toast.error('Product not found in database');
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      toast.error('Failed to lookup barcode');
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze health risks
  const analyzeHealthRisks = async (foodData) => {
    try {
      const response = await api.post('/api/foods/health-risk/analyze', 
        { foodData },
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      
      if (response.data.success) {
        setHealthRisks(response.data.data);
      }
    } catch (error) {
      console.error('Health risk analysis failed:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const [parent, child] = name.includes('.') ? name.split('.') : [name];
    
    let newFormData = { ...formData };
    
    if (child) {
      newFormData[parent] = {
        ...newFormData[parent],
        [child]: value
      };
    } else {
      newFormData[name] = value;
    }
    
    // Auto-calculate expiry date if in calculated mode
    if (newFormData.dateCalculationMode === 'calculated' && 
        (['manufacturedDate', 'shelfLife.value', 'shelfLife.unit'].includes(name))) {
      newFormData = updateCalculatedDates(newFormData);
    }
    
    setFormData(newFormData);
    
    // Trigger barcode lookup when barcode is entered
    if (name === 'barcode' && value.length >= 8) {
      lookupBarcode(value);
    }
    
    // Analyze health risks when key fields change
    if (['name', 'ingredients', 'allergens'].includes(name)) {
      analyzeHealthRisks(newFormData);
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        toast.error('Food name is required');
        setIsLoading(false);
        return;
      }
      
      if (!formData.expiryDate) {
        toast.error('Expiry date is required');
        setIsLoading(false);
        return;
      }
      
      const submitData = {
        ...formData,
        nutrition: nutritionData,
        healthRisks: healthRisks
      };
      
      console.log('Submitting food data:', submitData);
      
      const response = await api.post('/api/foods/enhanced', submitData);
      
      if (response.data.success) {
        toast.success('Food item added successfully! 🎉');
        // Reset form
        setFormData({
          name: '',
          brand: '',
          category: '',
          quantity: 1,
          unit: 'pieces',
          expiryDate: '',
          bestBeforeDate: '',
          manufacturedDate: '',
          barcode: '',
          ingredients: '',
          allergens: '',
          storageLocation: '',
          notes: '',
          dateCalculationMode: 'direct',
          shelfLife: {
            value: '',
            unit: 'months'
          }
        });
        setNutritionData(null);
        setHealthRisks(null);
        navigate('/inventory');
      } else {
        throw new Error(response.data.message || 'Failed to add food item');
      }
    } catch (error) {
      console.error('Add food failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add food item';
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🍎 Add Food Item
          </h1>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'scan', name: 'Barcode Scan', icon: '📱' },
                { id: 'photo', name: 'Photo OCR', icon: '📷' },
                { id: 'manual', name: 'Manual Entry', icon: '✏️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Barcode Scan Tab */}
          {activeTab === 'scan' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-6xl">📱</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Scan Barcode or QR Code
                </h3>
                <p className="text-gray-600 mb-4">
                  Use your camera to scan product barcodes for instant product information
                </p>
                
                {!cameraActive ? (
                  <div className="space-y-4">
                    <button
                      onClick={startCamera}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Start Camera
                    </button>
                    
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or enter barcode manually:
                      </label>
                      <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        placeholder="Enter barcode number"
                        className="block w-full max-w-xs mx-auto border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Scanning Status */}
                    {scanStatus && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800 text-center font-medium">
                          {scanStatus}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 space-x-4">
                      <button
                        onClick={stopCamera}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                      >
                        Stop Camera
                      </button>
                      <button
                        onClick={() => {
                          setScanStatus('🔍 Scanning for barcodes...');
                          scanBarcode();
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        disabled={isScanning}
                      >
                        {isScanning ? 'Scanning...' : 'Scan Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Photo OCR Tab */}
          {activeTab === 'photo' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-6xl">📷</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Extract Dates from Photo
                </h3>
                <p className="text-gray-600 mb-4">
                  Take a photo of expiry, best before, or manufactured dates
                </p>
                
                {!cameraActive ? (
                  <div className="space-y-4">
                    <button
                      onClick={startCamera}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors mr-4"
                    >
                      Take Photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex space-x-4 justify-center">
                      <button
                        onClick={capturePhoto}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      >
                        Capture
                      </button>
                      <button
                        onClick={stopCamera}
                        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Food Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Organic Bananas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Dole"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Scan or enter barcode"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity.amount"
                    value={formData.quantity.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    name="quantity.unit"
                    value={formData.quantity.unit}
                    onChange={handleInputChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Entry Mode Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  📅 How would you like to enter dates?
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="dateCalculationMode"
                      value="direct"
                      checked={formData.dateCalculationMode === 'direct'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">📝 Enter dates directly</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="dateCalculationMode"
                      value="calculated"
                      checked={formData.dateCalculationMode === 'calculated'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">🧮 Calculate from manufacture date + shelf life</span>
                  </label>
                </div>
              </div>

              {/* Direct Date Entry Mode */}
              {formData.dateCalculationMode === 'direct' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleInputChange}
                      required
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Best Before Date
                    </label>
                    <input
                      type="date"
                      name="bestBeforeDate"
                      value={formData.bestBeforeDate}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manufactured Date
                    </label>
                    <input
                      type="date"
                      name="manufacturedDate"
                      value={formData.manufacturedDate}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Calculated Date Entry Mode */}
              {formData.dateCalculationMode === 'calculated' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manufactured Date *
                      </label>
                      <input
                        type="date"
                        name="manufacturedDate"
                        value={formData.manufacturedDate}
                        onChange={handleInputChange}
                        required
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shelf Life (Best Before) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          name="shelfLife.value"
                          value={formData.shelfLife.value}
                          onChange={handleInputChange}
                          required
                          min="1"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="6"
                        />
                        <select
                          name="shelfLife.unit"
                          value={formData.shelfLife.unit}
                          onChange={handleInputChange}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {shelfLifeUnits.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        e.g., "6 months" or "1 year" from manufacture date
                      </p>
                    </div>
                  </div>
                  
                  {/* Auto-calculated expiry date display */}
                  {formData.expiryDate && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center">
                        <span className="text-green-600 text-lg mr-2">✅</span>
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Auto-calculated Expiry Date: {new Date(formData.expiryDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-green-600">
                            Based on manufacture date + {formData.shelfLife.value} {formData.shelfLife.unit}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Location
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>
                        {loc.charAt(0).toUpperCase() + loc.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Value ($)
                  </label>
                  <input
                    type="number"
                    name="estimatedValue"
                    value={formData.estimatedValue}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="5.99"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingredients
                </label>
                <textarea
                  name="ingredients"
                  value={formData.ingredients}
                  onChange={handleInputChange}
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="List ingredients separated by commas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={2}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Additional notes about this food item"
                />
              </div>

              {/* Health Risk Display */}
              {healthRisks && healthRisks.overallRisk !== 'safe' && (
                <div className={`p-4 rounded-md ${
                  healthRisks.overallRisk === 'harmful' ? 'bg-red-50 border border-red-200' :
                  healthRisks.overallRisk === 'risky' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-orange-50 border border-orange-200'
                }`}>
                  <h4 className={`font-medium ${
                    healthRisks.overallRisk === 'harmful' ? 'text-red-800' :
                    healthRisks.overallRisk === 'risky' ? 'text-yellow-800' :
                    'text-orange-800'
                  }`}>
                    ⚠️ Health Risk Detected
                  </h4>
                  <div className="mt-2 space-y-1">
                    {healthRisks.recommendations.map((rec, index) => (
                      <p key={index} className={`text-sm ${
                        healthRisks.overallRisk === 'harmful' ? 'text-red-700' :
                        healthRisks.overallRisk === 'risky' ? 'text-yellow-700' :
                        'text-orange-700'
                      }`}>
                        • {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutrition Data Display */}
              {nutritionData && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">✅ Nutrition Information Found</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Calories:</span>
                      <span className="ml-1">{nutritionData.macronutrients?.calories || 0}</span>
                    </div>
                    <div>
                      <span className="font-medium">Protein:</span>
                      <span className="ml-1">{nutritionData.macronutrients?.protein || 0}g</span>
                    </div>
                    <div>
                      <span className="font-medium">Carbs:</span>
                      <span className="ml-1">{nutritionData.macronutrients?.carbohydrates || 0}g</span>
                    </div>
                    <div>
                      <span className="font-medium">Fat:</span>
                      <span className="ml-1">{nutritionData.macronutrients?.fat || 0}g</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/inventory')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Adding...' : 'Add Food Item'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFood;