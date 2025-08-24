const express = require('express');
const auth = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const User = require('../models/User');

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    
    const user = await User.findById(req.user._id).select('notifications');
    let notifications = user?.notifications || [];
    
    // Filter unread only if requested
    if (unreadOnly === 'true') {
      notifications = notifications.filter(notif => !notif.read);
    }
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const paginatedNotifications = notifications.slice(parseInt(skip), parseInt(skip) + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        total: notifications.length,
        unreadCount: notifications.filter(n => !n.read).length
      }
    });
  } catch (error) {
    console.error('Get notifications failed:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await notificationService.markNotificationAsRead(req.user._id, notificationId);
    
    if (result.success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error('Mark notification as read failed:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: error.message });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'notifications.$[].read': true } }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read failed:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read', error: error.message });
  }
});

// Delete notification
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { notifications: { _id: notificationId } } }
    );
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification failed:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
  }
});

// Clear all notifications
router.delete('/', auth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { notifications: [] } }
    );
    
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all notifications failed:', error);
    res.status(500).json({ success: false, message: 'Failed to clear notifications', error: error.message });
  }
});

// Update notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { notificationPreferences } = req.body;
    
    if (!notificationPreferences) {
      return res.status(400).json({ success: false, message: 'Notification preferences are required' });
    }
    
    await User.findByIdAndUpdate(
      req.user._id,
      { notificationPreferences },
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, message: 'Notification preferences updated' });
  } catch (error) {
    console.error('Update notification preferences failed:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification preferences', error: error.message });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    
    const defaultPreferences = {
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
    };
    
    const preferences = { ...defaultPreferences, ...user.notificationPreferences };
    
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Get notification preferences failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification preferences', error: error.message });
  }
});

// Send test notification
router.post('/test', auth, async (req, res) => {
  try {
    const { type = 'test' } = req.body;
    
    const user = await User.findById(req.user._id);
    
    const testNotification = {
      type: type,
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify your notification settings are working correctly.',
      recommendations: ['Your notification system is working properly!']
    };
    
    const results = await notificationService.sendNotification(user, testNotification);
    
    res.json({ 
      success: true, 
      message: 'Test notification sent',
      data: results
    });
  } catch (error) {
    console.error('Send test notification failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send test notification', error: error.message });
  }
});

// Get notification statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const notifications = user?.notifications || [];
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      thisWeek: notifications.filter(n => new Date(n.createdAt) >= oneWeekAgo).length,
      thisMonth: notifications.filter(n => new Date(n.createdAt) >= oneMonthAgo).length,
      byType: notifications.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get notification stats failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification statistics', error: error.message });
  }
});

module.exports = router;
