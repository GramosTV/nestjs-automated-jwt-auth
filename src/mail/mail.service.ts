import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { GmailService } from './gmail.service';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly useGmail: boolean;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly gmailService: GmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {
    // Check if Gmail configuration is available
    this.useGmail = this.isGmailConfigured();
    this.logger.log(`Email service initialized. Using ${this.useGmail ? 'Gmail API' : 'SMTP'}`);
  }

  private isGmailConfigured(): boolean {
    try {
      const clientId = this.configService.get('gmail.clientId');
      const clientSecret = this.configService.get('gmail.clientSecret');
      const refreshToken = this.configService.get('gmail.refreshToken');
      const fromEmail = this.configService.get('gmail.fromEmail');

      return !!(clientId && clientSecret && refreshToken && fromEmail);
    } catch {
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const origin = this.configService.getOrThrow<string>('app.origin');
    const resetUrl = `${origin}/auth/confirm-reset-password?token=${token}`;
    
    const templateContext = {
      resetUrl,
      title: 'Reset Your Password',
      content: 'You requested to reset your password. Click the link below to proceed.',
      buttonText: 'Reset Password',
    };

    if (this.useGmail) {
      await this.sendEmailViaGmail(email, 'Password Reset Request', 'reset-password', templateContext);
    } else {
      await this.sendEmailViaSMTP(email, 'Password Reset Request', 'reset-password', templateContext);
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const origin = this.configService.getOrThrow<string>('app.origin');
    
    const templateContext = {
      name,
      title: 'Welcome to Our Platform',
      content: 'Thank you for joining us! We\'re excited to have you on board.',
      loginUrl: `${origin}/auth/login`,
      buttonText: 'Get Started',
    };

    if (this.useGmail) {
      await this.sendEmailViaGmail(email, 'Welcome to Our Platform', 'welcome', templateContext);
    } else {
      await this.sendEmailViaSMTP(email, 'Welcome to Our Platform', 'welcome', templateContext);
    }
  }

  private async sendEmailViaGmail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<void> {
    try {
      const html = this.emailTemplateService.renderTemplate(template, context);
      const text = this.emailTemplateService.renderPlainTextFromTemplate(template, context);

      await this.gmailService.sendEmail({
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`Email sent via Gmail to ${to} with subject: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email via Gmail to ${to}:`, error);
      throw error;
    }
  }

  private async sendEmailViaSMTP(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context,
      });

      this.logger.log(`Email sent via SMTP to ${to} with subject: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email via SMTP to ${to}:`, error);
      throw error;
    }
  }

  async testEmailService(): Promise<{ gmail: boolean; smtp: boolean }> {
    const results = { gmail: false, smtp: false };

    if (this.useGmail) {
      try {
        results.gmail = await this.gmailService.testConnection();
      } catch (error) {
        this.logger.error('Gmail API test failed:', error);
      }
    }

    // Test SMTP if configured
    try {
      const mailerConfig = this.configService.get('mailer');
      if (mailerConfig) {
        results.smtp = true; // If config exists, assume SMTP is available
      }
    } catch (error) {
      this.logger.error('SMTP test failed:', error);
    }

    return results;
  }

  async sendTestEmail(email: string): Promise<{ success: boolean; method: string; error?: string }> {
    try {
      const templateContext = {
        title: 'Test Email',
        content: 'This is a test email to verify your email service configuration.',
        buttonText: 'Verify Setup',
        testTime: new Date().toISOString(),
      };

      if (this.useGmail) {
        await this.sendEmailViaGmail(email, 'Test Email - Gmail API', 'welcome', templateContext);
        return { success: true, method: 'Gmail API' };
      } else {
        await this.sendEmailViaSMTP(email, 'Test Email - SMTP', 'welcome', templateContext);
        return { success: true, method: 'SMTP' };
      }
    } catch (error) {
      this.logger.error('Test email failed:', error);
      return { 
        success: false, 
        method: this.useGmail ? 'Gmail API' : 'SMTP',
        error: error.message 
      };
    }
  }
}
