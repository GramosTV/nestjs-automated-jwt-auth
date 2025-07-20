import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GmailSendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor(private readonly configService: ConfigService) {
    this.initializeGmailClient();
  }

  private initializeGmailClient(): void {
    try {
      const clientId = this.configService.getOrThrow<string>('gmail.clientId');
      const clientSecret = this.configService.getOrThrow<string>('gmail.clientSecret');
      const refreshToken = this.configService.getOrThrow<string>('gmail.refreshToken');

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'https://developers.google.com/oauthplayground' // Redirect URL used for getting refresh token
      );

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // Create Gmail client
      this.gmail = google.gmail({
        version: 'v1',
        auth: this.oauth2Client,
      });

      this.logger.log('Gmail API client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Gmail API client:', error);
      throw error;
    }
  }

  async sendEmail(options: GmailSendEmailOptions): Promise<void> {
    try {
      const fromEmail = this.configService.getOrThrow<string>('gmail.fromEmail');
      const fromName = this.configService.get<string>('gmail.fromName', 'Your App');

      // Create email content
      const email = this.createRawEmail({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      // Send email
      const result = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email,
        },
      });

      this.logger.log(`Email sent successfully to ${options.to}. Message ID: ${result.data.id}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private createRawEmail(emailData: {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }): string {
    const { from, to, subject, html, text } = emailData;
    
    let email = '';
    email += `From: ${from}\r\n`;
    email += `To: ${to}\r\n`;
    email += `Subject: ${subject}\r\n`;
    email += 'MIME-Version: 1.0\r\n';

    if (html && text) {
      // Multi-part email with both HTML and text
      const boundary = 'boundary_' + Date.now();
      email += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
      
      email += `--${boundary}\r\n`;
      email += 'Content-Type: text/plain; charset=utf-8\r\n\r\n';
      email += `${text}\r\n\r\n`;
      
      email += `--${boundary}\r\n`;
      email += 'Content-Type: text/html; charset=utf-8\r\n\r\n';
      email += `${html}\r\n\r\n`;
      
      email += `--${boundary}--\r\n`;
    } else if (html) {
      // HTML only
      email += 'Content-Type: text/html; charset=utf-8\r\n\r\n';
      email += html;
    } else {
      // Text only
      email += 'Content-Type: text/plain; charset=utf-8\r\n\r\n';
      email += text || '';
    }

    // Encode to base64url
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      this.logger.log(`Gmail API connection test successful. Email: ${response.data.emailAddress}`);
      return true;
    } catch (error) {
      this.logger.error('Gmail API connection test failed:', error);
      return false;
    }
  }
}
