# 🔔 SmartBite AI Notification System

## Overview
The SmartBite AI notification system provides comprehensive, real-time notifications to help users manage their food inventory effectively. It includes multiple notification channels, automated triggers, and a user-friendly interface.

## 🚀 Features

### 📱 Multiple Notification Channels
- **Email Notifications**: HTML-formatted emails with rich content
- **SMS Notifications**: Text messages via Twilio
- **WhatsApp Notifications**: Messages via Twilio WhatsApp API
- **In-App Notifications**: Real-time notifications with Socket.IO

### 🔔 Notification Types
- **Expiry Reminders**: Alerts when food is about to expire
- **Health Warnings**: Notifications about allergens and health risks
- **Smart Recommendations**: Recipe and meal suggestions
- **Weekly Summaries**: Comprehensive weekly reports

### ⚡ Real-Time Features
- **Socket.IO Integration**: Instant notifications without page refresh
- **Live Updates**: Notification bell shows unread count in real-time
- **Toast Notifications**: Non-intrusive popup notifications

### 🎯 Automated Triggers
- **Food Expiry**: Automatic alerts 1-14 days before expiry
- **Health Risks**: Instant notifications for allergen conflicts
- **Weekly Reports**: Scheduled summaries every Sunday
- **Daily Checks**: Automated expiry monitoring

## 🛠️ Technical Implementation

### Backend Components

#### 1. Notification Service (`server/services/notificationService.js`)
```javascript
// Core notification functionality
- sendNotification(user, notification)
- sendEmailNotification(email, notification)
- sendSMSNotification(phone, notification)
- sendWhatsAppNotification(whatsapp, notification)
- storeInAppNotification(userId, notification)
- sendRealtimeNotification(userId, notification)
```

#### 2. Socket.IO Integration (`server/index.js`)
```javascript
// Real-time communication
- User room management
- Real-time notification broadcasting
- Connection handling
```

#### 3. Notification Routes (`server/routes/notifications.js`)
```javascript
// API endpoints
GET    /api/notifications              // Get user notifications
PATCH  /api/notifications/:id/read     // Mark as read
PATCH  /api/notifications/read-all     // Mark all as read
DELETE /api/notifications/:id          // Delete notification
DELETE /api/notifications              // Clear all notifications
PUT    /api/notifications/preferences  // Update preferences
GET    /api/notifications/preferences  // Get preferences
POST   /api/notifications/test         // Send test notification
GET    /api/notifications/stats        // Get statistics
```

### Frontend Components

#### 1. Notification Bell (`client/src/components/NotificationBell.js`)
- Real-time unread count
- Dropdown notification list
- Mark as read functionality
- Toast notifications

#### 2. Notifications Page (`client/src/pages/Notifications.js`)
- Complete notification management
- Preferences configuration
- Statistics dashboard
- Test notification functionality

#### 3. Notification Preferences (`client/src/components/NotificationPreferences.js`)
- Channel configuration
- Timing settings
- Test notifications
- User preferences management

## 🔧 Configuration

### Environment Variables
```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@smartbiteai.com

# Twilio Configuration (SMS & WhatsApp)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Client URL for email links
CLIENT_URL=http://localhost:3000
```

### Dependencies
```json
// Server
{
  "socket.io": "^4.7.5",
  "nodemailer": "^6.9.8",
  "twilio": "^4.20.1",
  "node-cron": "^3.0.3"
}

// Client
{
  "socket.io-client": "^4.7.5",
  "react-hot-toast": "^2.4.1"
}
```

## 📋 Usage Examples

### Sending a Notification
```javascript
// Backend
const notification = {
  type: 'expiry_warning',
  title: '⚠️ Food Expiring Soon: Apples',
  message: 'Your apples expire in 2 days. Plan to use them soon!',
  foodItems: [{ name: 'Apples', expiryDate: '2024-01-15' }],
  recommendations: ['Make apple pie', 'Freeze for later use']
};

await notificationService.sendNotification(user, notification);
```

### Real-Time Updates
```javascript
// Frontend
useEffect(() => {
  const socket = io('http://localhost:5000');
  
  socket.emit('join-user-room', userId);
  
  socket.on('new-notification', (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    toast.success(notification.title);
  });
}, []);
```

## 🎨 UI Components

### Notification Bell
- Shows unread count badge
- Dropdown with recent notifications
- Click to mark as read
- "View All" link to full page

### Notification Cards
- Color-coded by type (warning, critical, info)
- Icons for visual identification
- Timestamp and read status
- Action buttons (mark read, delete)

### Preferences Panel
- Toggle switches for each channel
- Timing configuration
- Test notification buttons
- Save preferences

## 🔄 Automated Workflows

### Daily Expiry Check
```javascript
// Runs every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  await notificationService.checkExpiringFoods();
});
```

### Weekly Summary
```javascript
// Runs every Sunday at 10 AM
cron.schedule('0 10 * * 0', async () => {
  await notificationService.sendWeeklySummaries();
});
```

### Food Creation Integration
```javascript
// Automatic notifications when adding food
if (healthRisks.overallRisk !== 'safe') {
  await notificationService.sendHealthRiskAlert(user, food, healthRisks);
}

if (daysUntilExpiry <= 3) {
  await notificationService.sendNotification(user, expiryNotification);
}
```

## 🧪 Testing

### Test Notifications
- Use the test endpoint: `POST /api/notifications/test`
- Test different notification types
- Verify all channels work correctly

### Real-Time Testing
1. Open multiple browser tabs
2. Send a test notification
3. Verify it appears in all tabs instantly
4. Check unread count updates

## 📊 Analytics

### Notification Statistics
- Total notifications sent
- Unread count
- Notifications by type
- Weekly/monthly trends

### User Engagement
- Read rates by channel
- Preference patterns
- Response times

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   # Server
   cd server && npm install
   
   # Client
   cd client && npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy example env file
   cp server/env.example server/.env
   
   # Add your API keys and credentials
   ```

3. **Start Services**
   ```bash
   # Start server
   cd server && npm start
   
   # Start client
   cd client && npm start
   ```

4. **Test Notifications**
   - Go to Notifications page
   - Configure preferences
   - Send test notifications
   - Verify real-time updates

## 🔒 Security Features

- **User Authentication**: All endpoints require valid JWT tokens
- **Room Isolation**: Users only receive their own notifications
- **Input Validation**: All notification data is validated
- **Rate Limiting**: Prevents notification spam

## 🎯 Future Enhancements

- **Push Notifications**: Browser push notifications
- **Mobile App**: Native mobile notifications
- **AI Recommendations**: Smart notification timing
- **Custom Templates**: User-defined notification templates
- **Analytics Dashboard**: Advanced notification analytics

## 📞 Support

For issues or questions about the notification system:
- Check the console logs for error messages
- Verify environment variables are set correctly
- Test individual notification channels
- Check Socket.IO connection status

---

**The SmartBite AI notification system is now fully functional and ready for production use! 🎉**
