import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const NotificationPreferences = ({ isModal = false, onClose = null }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({});
  const [preferences, setPreferences] = useState({
    email: true,
    sms: false,
    whatsapp: false,
    inApp: true,
    expiryReminders: true,
    healthWarnings: true,
    recommendations: true,
    weeklySummary: true,
    expiryReminderDays: 3,
    notificationTime: '09:00'
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/preferences');
      
      if (response.data.success) {
        setPreferences(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await api.put('/api/notifications/preferences', { notificationPreferences: preferences });
      
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
      
      const response = await api.post('/api/notifications/test', { type });
      
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
        {/* Notification Channels */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">📱 Notification Channels</h3>
          <div className="space-y-3">
            {[
              { key: 'email', label: 'Email Notifications', icon: '📧' },
              { key: 'sms', label: 'SMS Notifications', icon: '📱' },
              { key: 'whatsapp', label: 'WhatsApp Notifications', icon: '💬' },
              { key: 'inApp', label: 'In-App Notifications', icon: '🔔' }
            ].map(channel => (
              <label key={channel.key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences[channel.key] || false}
                  onChange={(e) => handlePreferenceChange(channel.key, e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-lg">{channel.icon}</span>
                <span className="text-sm font-medium text-gray-700">{channel.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Notification Types</h3>
          <div className="space-y-3">
            {[
              { key: 'expiryReminders', label: 'Expiry Reminders', icon: '⏰' },
              { key: 'healthWarnings', label: 'Health Warnings', icon: '⚠️' },
              { key: 'recommendations', label: 'Smart Recommendations', icon: '💡' },
              { key: 'weeklySummary', label: 'Weekly Summary', icon: '📊' }
            ].map(type => (
              <label key={type.key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences[type.key] || false}
                  onChange={(e) => handlePreferenceChange(type.key, e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-lg">{type.icon}</span>
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </label>
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
                value={preferences.expiryReminderDays || 3}
                onChange={(e) => handlePreferenceChange('expiryReminderDays', parseInt(e.target.value))}
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
                value={preferences.notificationTime || '09:00'}
                onChange={(e) => handlePreferenceChange('notificationTime', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Test Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">🧪 Test Notifications</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleTestNotification('email')}
              disabled={testing.email}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {testing.email ? 'Sending...' : 'Test Email'}
            </button>
            <button
              onClick={() => handleTestNotification('sms')}
              disabled={testing.sms}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {testing.sms ? 'Sending...' : 'Test SMS'}
            </button>
            <button
              onClick={() => handleTestNotification('whatsapp')}
              disabled={testing.whatsapp}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {testing.whatsapp ? 'Sending...' : 'Test WhatsApp'}
            </button>
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
