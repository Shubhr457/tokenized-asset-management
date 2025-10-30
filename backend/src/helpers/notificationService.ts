import nodemailer from 'nodemailer';
import logger from './logger';
import { env } from '../environments';

let transporter: nodemailer.Transporter | null = null;

if (env.EMAIL_USER && env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: false,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS
    }
  });
}

export async function sendNotification(email: string, subject: string, message: string): Promise<void> {
  try {
    if (!transporter) {
      logger.warn('Email service not configured. Notification not sent:', { email, subject });
      return;
    }

    await transporter.sendMail({
      from: env.EMAIL_USER,
      to: email,
      subject: subject,
      text: message,
      html: `<p>${message}</p>`
    });

    logger.info(`Notification sent to ${email}: ${subject}`);
  } catch (error: any) {
    logger.error('Error sending notification:', error);
  }
}

export async function sendWebhookNotification(url: string, data: any): Promise<void> {
  try {
    logger.info('Webhook notification sent:', { url, data });
  } catch (error: any) {
    logger.error('Error sending webhook notification:', error);
  }
}

