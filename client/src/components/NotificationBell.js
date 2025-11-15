import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../utils/api';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    setSocket(newSocket);

    // Join user room for notifications
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        newSocket.emit('join-user-room', payload.userId);
      } catch (error) {
        console.error('Failed to parse token:', error);
      }
    }

    // Listen for new notifications
    newSocket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.success(notification.title, {
        duration: 5000,
        icon: getNotificationIcon(notification.type),
        onClick: () => {
          setIsOpen(true);
        }
      });
    });

    // Fetch initial notifications
    fetchNotifications();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications?limit=5');
      
      if (response.data.success) {
        const data = response.data.data || {};
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
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

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-full"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-4-4-4 4z" />
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark All Read
                </button>
              )}
              <button
                onClick={handleViewAll}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                View All
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center">
                <span className="text-4xl">📭</span>
                <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${getNotificationColor(notification.type, notification.read)}`}
                  onClick={() => !notification.read && markAsRead(notification._id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notification.title}
                      </h4>
                      <p className={`text-xs mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'} line-clamp-2`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="px-4 py-2 border-t border-gray-200 text-center">
              <button
                onClick={handleViewAll}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
