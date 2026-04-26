/**
 * Notification Service
 * 
 * Handles sending notifications via Email and Slack.
 * Implements a simple interface to abstract the provider details.
 */

import axios from 'axios';
import nodemailer from 'nodemailer';

import { logger } from '@/lib/logger';

// Configuration interfaces
interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
}



export class NotificationService {
    private emailTransporter: nodemailer.Transporter | null = null;
    private slackWebhookUrl: string | null = null;
    private emailFrom: string = 'noreply@the-copy.com';

    constructor() {
        this.initializeEmail();
        this.initializeSlack();
    }

    /**
     * Initialize Email Transporter
     */
    private initializeEmail() {
        if (process.env['SMTP_HOST'] && process.env['SMTP_USER'] && process.env['SMTP_PASS']) {
            try {
                const config: EmailConfig = {
                    host: process.env['SMTP_HOST'],
                    port: parseInt(process.env['SMTP_PORT'] || '587'),
                    secure: process.env['SMTP_SECURE'] === 'true',
                    auth: {
                        user: process.env['SMTP_USER'],
                        pass: process.env['SMTP_PASS'],
                    },
                    from: process.env['SMTP_FROM'] || 'noreply@the-copy.com',
                };

                this.emailTransporter = nodemailer.createTransport(config);
                this.emailFrom = config.from;
                logger.info('📧 Notification Service: Email initialized');
            } catch (error) {
                logger.error('❌ Notification Service: Failed to initialize email', error);
            }
        } else {
            logger.warn('⚠️ Notification Service: SMTP credentials missing, email notifications disabled');
        }
    }

    /**
     * Initialize Slack Webhook
     */
    private initializeSlack() {
        if (process.env['SLACK_WEBHOOK_URL']) {
            this.slackWebhookUrl = process.env['SLACK_WEBHOOK_URL'];
            logger.info('💬 Notification Service: Slack initialized');
        } else {
            logger.warn('⚠️ Notification Service: SLACK_WEBHOOK_URL missing, slack notifications disabled');
        }
    }

    /**
     * Send Email Notification
     */
    async sendEmail(to: string | string[], subject: string, htmlBody: string): Promise<boolean> {
        if (!this.emailTransporter) return false;

        try {
            const info = await this.emailTransporter.sendMail({
                from: this.emailFrom,
                to: Array.isArray(to) ? to.join(',') : to,
                subject,
                html: htmlBody,
            });
            logger.info(`📧 Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error('❌ Failed to send email', error);
            return false;
        }
    }

    /**
     * Send Slack Notification
     */
    async sendSlack(message: string, options?: { title?: string; color?: string; fields?: any[] }): Promise<boolean> {
        if (!this.slackWebhookUrl) return false;

        try {
            const payload: any = {
                text: message, // Fallback text
            };

            if (options) {
                payload.attachments = [
                    {
                        color: options.color || '#36a64f', // Default green
                        title: options["title"],
                        text: message,
                        fields: options.fields,
                        footer: 'The Copy - Notification Service',
                        ts: Math.floor(Date.now() / 1000),
                    },
                ];
            }

            await axios.post(this.slackWebhookUrl, payload);
            logger.info('💬 Slack notification sent');
            return true;
        } catch (error) {
            logger.error('❌ Failed to send slack notification', error);
            return false;
        }
    }

    /**
     * Send Alert (Both Email and Slack if available)
     */
    async sendAlert(level: 'INFO' | 'WARNING' | 'CRITICAL', title: string, message: string, data?: Record<string, any>) {
        const timestamp = new Date().toISOString();
        const formattedData = data ? JSON.stringify(data, null, 2) : '';

        // 1. Send via Slack
        const color = level === 'CRITICAL' ? '#ff0000' : level === 'WARNING' ? '#ffcc00' : '#36a64f';
        const fields = data ? Object.entries(data).map(([k, v]) => ({ title: k, value: String(v), short: true })) : [];

        await this.sendSlack(message, {
            title: `[${level}] ${title}`,
            color,
            fields
        });

        // 2. Send via Email (Only for Critical/Warning or if configured)
        if (level !== 'INFO') {
            const emailRecipients = process.env['ALERT_EMAIL_RECIPIENTS'] || 'admin@the-copy.com';
            const htmlBody = `
        <h2>[${level}] ${title}</h2>
        <p><strong>Time:</strong> ${timestamp}</p>
        <p>${message}</p>
        ${formattedData ? `<pre>${formattedData}</pre>` : ''}
        <hr/>
        <p>Sent by The Copy Notification Service</p>
      `;

            await this.sendEmail(emailRecipients.split(','), `[ALERT] ${title}`, htmlBody);
        }
    }
}

export const notificationService = new NotificationService();
export default notificationService;
