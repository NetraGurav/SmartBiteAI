import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const NotificationPreferences = ({ isModal = false, onClose = null }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({});
  const [preferences, setPreferences] = useState({
    channels: {
      email: true,
      whatsapp: false,
      sms: false,
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
      email: '',
      phone: '',
      whatsapp: '',
      name: ''
    }
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/notification-preferences');
      
      if (response.data.success) {
        const data = response.data.data;
        // Ensure proper structure with defaults
        setPreferences({
          channels: {
            email: data.channels?.email ?? true,
            whatsapp: data.channels?.whatsapp ?? false,
            sms: data.channels?.sms ?? false,
            inApp: data.channels?.inApp ?? true
          },
          expiryDays: data.expiryDays || 3,
          notificationTime: data.notificationTime || '09:00',
          types: {
            expiry: data.types?.expiry ?? true,
            healthWarnings: data.types?.healthWarnings ?? true,
            suggestions: data.types?.suggestions ?? true,
            summaries: data.types?.summaries ?? true
          },
          contactInfo: {
            email: data.contactInfo?.email || '',
            phone: data.contactInfo?.phone || '',
            whatsapp: data.contactInfo?.whatsapp || '',
            name: data.contactInfo?.name || ''
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelChange = (channel, value) => {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: value
      }
    }));
  };

  const handleTypeChange = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: value
      }
    }));
  };

  const handleContactInfoChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!preferences.contactInfo.email) {
        toast.error('Email address is required');
        return;
      }
      
      const payload = {
        channels: preferences.channels,
        expiryDays: parseInt(preferences.expiryDays),
        notificationTime: preferences.notificationTime,
        types: preferences.types,
        contactInfo: {
          email: preferences.contactInfo.email.trim(),
          phone: preferences.contactInfo.phone.trim(),
          whatsapp: preferences.contactInfo.whatsapp.trim()
        }
      };
      
      console.log('Saving preferences:', payload);
      
      const response = await api.put('/api/auth/notification-preferences', payload);
      
      if (response.data.success) {
        toast.success('Notification preferences updated successfully!');
        // Refresh the data to confirm it was saved
        await fetchPreferences();
        if (onClose) onClose();
      } else {
        throw new Error(response.data.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      const message = error.response?.data?.message || error.message || 'Failed to update notification preferences';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async (type) => {
    try {
      setTesting(prev => ({ ...prev, [type]: true }));
      
      const response = await api.post('/api/auth/test-notification', { type });
      
      if (response.data.success) {
        toast.success(`Test ${type} notification sent successfully! Check your ${type === 'sms' ? 'phone' : type === 'whatsapp' ? 'WhatsApp' : 'email'}.`);
      }
    } catch (error) {
      console.error(`Test ${type} notification failed:`, error);
      const message = error.response?.data?.message || `Failed to send test ${type} notification`;
      toast.error(message);
    } finally {
      setTesting(prev => ({ ...prev, [type]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const containerClass = isModal 
    ? "bg-white rounded-lg shadow-lg max-w-4xl mx-auto max-h-[90vh] overflow-y-auto"
    : "bg-white shadow rounded-lg";

  return (
    <div className={containerClass}>
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            🔔 Notification Preferences
          </h2>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">📱 Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={preferences.contactInfo.email}
                onChange={(e) => handleContactInfoChange('email', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={preferences.contactInfo.phone}
                onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Include country code for SMS notifications</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={preferences.contactInfo.whatsapp}
                onChange={(e) => handleContactInfoChange('whatsapp', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Include country code for WhatsApp notifications</p>
            </div>
          </div>
        </div>



        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Notification Types</h3>
          <div className="space-y-3">
            {[
              { key: 'expiry', label: 'Expiry Alerts', icon: '⏰', description: 'Get notified when food is about to expire' },
              { key: 'healthWarnings', label: 'Health Warnings', icon: '⚠️', description: 'Alerts for allergens and health risks' },
              { key: 'suggestions', label: 'Smart Suggestions', icon: '💡', description: 'Recipe and meal suggestions' },
              { key: 'summaries', label: 'Weekly Summaries', icon: '📊', description: 'Weekly reports and insights' }
            ].map(type => (
              <div key={type.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.types[type.key]}
                    onChange={(e) => handleTypeChange(type.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Timing Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">⏱️ Timing Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days Before Expiry
              </label>
              <select
                value={preferences.expiryDays}
                onChange={(e) => setPreferences(prev => ({ ...prev, expiryDays: parseInt(e.target.value) }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {[1, 2, 3, 5, 7, 10, 14].map(days => (
                  <option key={days} value={days}>
                    {days} day{days > 1 ? 's' : ''} before
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Time
              </label>
              <input
                type="time"
                value={preferences.notificationTime}
                onChange={(e) => setPreferences(prev => ({ ...prev, notificationTime: e.target.value }))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
