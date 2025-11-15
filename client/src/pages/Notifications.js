import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      
      if (response.data.success) {
        // Backend returns { notifications, total, unreadCount }
        const payload = response.data.data || {};
        const list = Array.isArray(payload.notifications) ? payload.notifications : (Array.isArray(payload) ? payload : []);
        setNotifications(list);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/api/notifications/preferences');
      
      if (response.data.success) {
        setPreferences(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/notifications/stats');
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`, {});
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all', {});
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      
      setNotifications(prev => 
        prev.filter(notif => notif._id !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      await api.put('/api/notifications/preferences', { notificationPreferences: newPreferences });
      
      setPreferences(newPreferences);
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const sendTestNotification = async () => {
    try {
      await api.post('/api/notifications/test', {});
      
      toast.success('Test notification sent!');
      setTimeout(fetchNotifications, 2000); // Refresh after 2 seconds
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'expiry_warning': return '⚠️';
      case 'expiry_critical': return '🚨';
      case 'health_risk': return '⚕️';
      case 'recommendation': return '💡';
      case 'weekly_summary': return '📊';
      case 'test': return '🧪';
      default: return '📢';
    }
  };

  const getNotificationColor = (type, read) => {
    const baseColor = read ? 'bg-gray-50' : 'bg-white';
    const borderColor = (() => {
      switch (type) {
        case 'expiry_critical': return 'border-l-red-500';
        case 'expiry_warning': return 'border-l-yellow-500';
        case 'health_risk': return 'border-l-orange-500';
        case 'recommendation': return 'border-l-blue-500';
        case 'weekly_summary': return 'border-l-green-500';
        default: return 'border-l-gray-500';
      }
    })();
    
    return `${baseColor} ${borderColor} border-l-4`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔔 Notifications
          </h1>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'notifications', name: 'Notifications', icon: '📢' },
                { id: 'preferences', name: 'Preferences', icon: '⚙️' },
                { id: 'stats', name: 'Statistics', icon: '📊' }
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

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {stats.unread || 0} unread of {stats.total || 0} total
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={sendTestNotification}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Send Test
                  </button>
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Mark All Read
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="space-y-3">
                {(!notifications || notifications.length === 0) ? (
                  <div className="text-center py-12">
                    <span className="text-6xl">📭</span>
                    <p className="mt-4 text-lg text-gray-600">No notifications yet</p>
                    <p className="mt-2 text-sm text-gray-500">
                      You'll receive notifications about expiring foods, health risks, and recommendations
                    </p>
                  </div>
                ) : (
                  (notifications || []).map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-4 rounded-lg shadow-sm ${getNotificationColor(notification.type, notification.read)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <span className="text-2xl">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1">
                            <h3 className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            <p className={`mt-1 text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            {notification.recommendations && notification.recommendations.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {notification.recommendations.map((rec, index) => (
                                    <li key={index}>• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="mt-2 text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Notification Channels</h3>
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
                          onChange={(e) => updatePreferences({
                            ...preferences,
                            [channel.key]: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-lg">{channel.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{channel.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Notification Types</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'expiryReminders', label: 'Expiry Reminders', icon: '⏰' },
                      { key: 'healthWarnings', label: 'Health Warnings', icon: '⚕️' },
                      { key: 'recommendations', label: 'Smart Recommendations', icon: '💡' },
                      { key: 'weeklySummary', label: 'Weekly Summary', icon: '📊' }
                    ].map(type => (
                      <label key={type.key} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={preferences[type.key] || false}
                          onChange={(e) => updatePreferences({
                            ...preferences,
                            [type.key]: e.target.checked
                          })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Reminder Days
                  </label>
                  <select
                    value={preferences.expiryReminderDays || 3}
                    onChange={(e) => updatePreferences({
                      ...preferences,
                      expiryReminderDays: parseInt(e.target.value)
                    })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value={1}>1 day before</option>
                    <option value={2}>2 days before</option>
                    <option value={3}>3 days before</option>
                    <option value={5}>5 days before</option>
                    <option value={7}>1 week before</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Time
                  </label>
                  <input
                    type="time"
                    value={preferences.notificationTime || '09:00'}
                    onChange={(e) => updatePreferences({
                      ...preferences,
                      notificationTime: e.target.value
                    })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
                  <div className="text-sm text-blue-800">Total Notifications</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.unread || 0}</div>
                  <div className="text-sm text-yellow-800">Unread</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.thisWeek || 0}</div>
                  <div className="text-sm text-green-800">This Week</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.thisMonth || 0}</div>
                  <div className="text-sm text-purple-800">This Month</div>
                </div>
              </div>

              {/* Notification Types Breakdown */}
              {stats.byType && Object.keys(stats.byType).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications by Type</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <span>{getNotificationIcon(type)}</span>
                          <span className="capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
