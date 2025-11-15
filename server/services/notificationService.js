const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cron = require('node-cron');
const moment = require('moment');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
    this.startScheduledJobs();
  }

  initializeServices() {
    // Initialize email service
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    // Initialize Twilio for SMS and WhatsApp
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  async sendNotification(user, notification) {
    const results = {
      email: null,
      sms: null,
      whatsapp: null,
      inApp: null
    };

    try {
      const preferences = user.notificationPreferences || {};

      // Send email notification
      if (preferences.email && user.email) {
        results.email = await this.sendEmailNotification(user.email, notification);
      }

      // Send SMS notification
      if (preferences.sms && user.phone) {
        results.sms = await this.sendSMSNotification(user.phone, notification);
      }

      // Send WhatsApp notification
      if (preferences.whatsapp && user.whatsapp) {
        results.whatsapp = await this.sendWhatsAppNotification(user.whatsapp, notification);
      }

      // Store in-app notification
      if (preferences.inApp !== false) { // Default to true
        results.inApp = await this.storeInAppNotification(user._id, notification);
      }

      return results;
    } catch (error) {
      console.error('Notification sending failed:', error);
      return results;
    }
  }

  async sendEmailNotification(email, notification) {
    if (!this.emailTransporter) {
      console.log('Email service not configured');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const htmlContent = this.generateEmailHTML(notification);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: notification.title,
        text: notification.message,
        html: htmlContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSMSNotification(phone, notification) {
    if (!this.twilioClient) {
      console.log('SMS service not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: `${notification.title}\n\n${notification.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWhatsAppNotification(whatsapp, notification) {
    if (!this.twilioClient) {
      console.log('WhatsApp service not configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: `${notification.title}\n\n${notification.message}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${whatsapp}`
      });

      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async storeInAppNotification(userId, notification) {
    try {
      const User = require('../models/User');
      
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            ...notification,
            createdAt: new Date(),
            read: false
          }
        }
      });

      // Send real-time notification via Socket.IO
      this.sendRealtimeNotification(userId, notification);

      return { success: true };
    } catch (error) {
      console.error('In-app notification storage failed:', error);
      return { success: false, error: error.message };
    }
  }

  sendRealtimeNotification(userId, notification) {
    try {
      const { getIO } = require('../index');
      const io = getIO && getIO();
      
      if (io) {
        io.to(`user-${userId}`).emit('new-notification', {
          ...notification,
          createdAt: new Date(),
          read: false
        });
        console.log(`📡 Real-time notification sent to user ${userId}`);
      }
    } catch (error) {
      console.error('Real-time notification failed:', error);
    }
  }

  generateEmailHTML(notification) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .alert { padding: 15px; border-radius: 6px; margin: 15px 0; }
            .alert-warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; }
            .alert-danger { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
            .alert-info { background: #dbeafe; border: 1px solid #3b82f6; color: #1e40af; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍎 SmartBite AI</h1>
                <h2>${notification.title}</h2>
            </div>
            <div class="content">
                <div class="alert alert-${this.getAlertType(notification.type)}">
                    ${notification.message}
                </div>
                
                ${notification.foodItems ? this.generateFoodItemsHTML(notification.foodItems) : ''}
                ${notification.recommendations ? this.generateRecommendationsHTML(notification.recommendations) : ''}
                
                <p>
                    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">
                        Open SmartBite AI
                    </a>
                </p>
            </div>
            <div class="footer">
                <p>You received this notification because you have enabled email notifications in your SmartBite AI settings.</p>
                <p>To manage your notification preferences, visit your profile settings.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  getAlertType(notificationType) {
    switch (notificationType) {
      case 'expiry_warning':
      case 'health_risk':
        return 'warning';
      case 'expiry_critical':
      case 'allergen_alert':
        return 'danger';
      default:
        return 'info';
    }
  }

  generateFoodItemsHTML(foodItems) {
    if (!foodItems || foodItems.length === 0) return '';
    
    return `
      <h3>Affected Food Items:</h3>
      <ul>
        ${foodItems.map(item => `
          <li>
            <strong>${item.name}</strong>
            ${item.brand ? `(${item.brand})` : ''}
            ${item.expiryDate ? `- Expires: ${moment(item.expiryDate).format('MMM DD, YYYY')}` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  generateRecommendationsHTML(recommendations) {
    if (!recommendations || recommendations.length === 0) return '';
    
    return `
      <h3>Recommendations:</h3>
      <ul>
        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    `;
  }

  startScheduledJobs() {
    // Check for expiring foods daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily expiry check...');
      await this.checkExpiringFoods();
    });

    // Send weekly summary on Sundays at 10 AM
    cron.schedule('0 10 * * 0', async () => {
      console.log('Sending weekly summaries...');
      await this.sendWeeklySummaries();
    });

    // Check for health risks when new foods are added (handled in food routes)
    console.log('Notification scheduled jobs started');
  }

  async checkExpiringFoods() {
    try {
      const User = require('../models/User');
      const Food = require('../models/Food');

      const users = await User.find({ 'notificationPreferences.expiryReminders': true });

      for (const user of users) {
        const expiryDays = user.notificationPreferences.expiryReminderDays || 3;
        const checkDate = moment().add(expiryDays, 'days').startOf('day');

        const expiringFoods = await Food.find({
          userId: user._id,
          expiryDate: {
            $gte: new Date(),
            $lte: checkDate.toDate()
          }
        });

        if (expiringFoods.length > 0) {
          const expiredFoods = expiringFoods.filter(food => moment(food.expiryDate).isBefore(moment()));
          const soonToExpire = expiringFoods.filter(food => moment(food.expiryDate).isAfter(moment()));

          if (expiredFoods.length > 0) {
            await this.sendNotification(user, {
              type: 'expiry_critical',
              title: `⚠️ ${expiredFoods.length} Food Item(s) Expired`,
              message: `You have ${expiredFoods.length} food item(s) that have already expired. Please check your inventory and dispose of expired items safely.`,
              foodItems: expiredFoods.map(food => ({
                name: food.name,
                brand: food.brand,
                expiryDate: food.expiryDate
              })),
              recommendations: [
                'Check and dispose of expired items safely',
                'Update your inventory to remove expired items',
                'Consider meal planning to reduce food waste'
              ]
            });
          }

          if (soonToExpire.length > 0) {
            await this.sendNotification(user, {
              type: 'expiry_warning',
              title: `📅 ${soonToExpire.length} Food Item(s) Expiring Soon`,
              message: `You have ${soonToExpire.length} food item(s) expiring within ${expiryDays} days. Plan to use them soon to avoid waste.`,
              foodItems: soonToExpire.map(food => ({
                name: food.name,
                brand: food.brand,
                expiryDate: food.expiryDate
              })),
              recommendations: [
                'Plan meals using these ingredients',
                'Consider freezing items if possible',
                'Share with friends or family if you cannot use them'
              ]
            });
          }
        }
      }
    } catch (error) {
      console.error('Expiry check failed:', error);
    }
  }

  async sendWeeklySummaries() {
    try {
      const User = require('../models/User');
      const Food = require('../models/Food');

      const users = await User.find({ 'notificationPreferences.weeklySummary': true });

      for (const user of users) {
        const weekStart = moment().startOf('week');
        const weekEnd = moment().endOf('week');

        // Get foods added this week
        const newFoods = await Food.find({
          userId: user._id,
          createdAt: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() }
        });

        // Get foods expiring next week
        const nextWeekStart = moment().add(1, 'week').startOf('week');
        const nextWeekEnd = moment().add(1, 'week').endOf('week');
        
        const expiringNextWeek = await Food.find({
          userId: user._id,
          expiryDate: { $gte: nextWeekStart.toDate(), $lte: nextWeekEnd.toDate() }
        });

        // Get total inventory count
        const totalFoods = await Food.countDocuments({ userId: user._id });

        await this.sendNotification(user, {
          type: 'weekly_summary',
          title: '📊 Your Weekly SmartBite Summary',
          message: `Here's your food inventory summary for this week:
          
• ${newFoods.length} new food items added
• ${expiringNextWeek.length} items expiring next week
• ${totalFoods} total items in your inventory

Keep up the great work managing your food inventory!`,
          foodItems: expiringNextWeek.length > 0 ? expiringNextWeek.slice(0, 5) : [],
          recommendations: [
            'Plan meals for next week using expiring items',
            'Consider batch cooking to use multiple ingredients',
            'Review your shopping list to avoid overbuying'
          ]
        });
      }
    } catch (error) {
      console.error('Weekly summary failed:', error);
    }
  }

  async sendHealthRiskAlert(user, food, risks) {
    if (risks.overallRisk === 'safe') return;

    const severity = risks.overallRisk === 'harmful' ? 'CRITICAL' : 'WARNING';
    const emoji = risks.overallRisk === 'harmful' ? '🚨' : '⚠️';

    await this.sendNotification(user, {
      type: 'health_risk',
      title: `${emoji} Health ${severity}: ${food.name}`,
      message: `The food item "${food.name}" ${food.brand ? `by ${food.brand}` : ''} has been flagged with health risks based on your profile.`,
      foodItems: [{
        name: food.name,
        brand: food.brand,
        expiryDate: food.expiryDate
      }],
      recommendations: risks.recommendations || []
    });
  }

  async markNotificationAsRead(userId, notificationId) {
    try {
      const User = require('../models/User');
      
      await User.updateOne(
        { _id: userId, 'notifications._id': notificationId },
        { $set: { 'notifications.$.read': true } }
      );

      return { success: true };
    } catch (error) {
      console.error('Mark notification as read failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserNotifications(userId, limit = 20, skip = 0) {
    try {
      const User = require('../models/User');
      
      const user = await User.findById(userId)
        .select('notifications')
        .slice('notifications', [skip, limit]);

      return {
        success: true,
        notifications: user?.notifications || []
      };
    } catch (error) {
      console.error('Get user notifications failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
