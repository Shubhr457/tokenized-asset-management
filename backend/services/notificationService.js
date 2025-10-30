const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email transporter (configure if email credentials are provided)
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendNotification(email, subject, message) {
  try {
    if (!transporter) {
      logger.warn('Email service not configured. Notification not sent:', { email, subject });
      return;
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`
    });

    logger.info(`Notification sent to ${email}: ${subject}`);
  } catch (error) {
    logger.error('Error sending notification:', error);
  }
}

// Webhook notification (placeholder for future implementation)
async function sendWebhookNotification(url, data) {
  try {
    // Implementation for webhook notifications
    logger.info('Webhook notification sent:', { url, data });
  } catch (error) {
    logger.error('Error sending webhook notification:', error);
  }
}

module.exports = {
  sendNotification,
  sendWebhookNotification
};

