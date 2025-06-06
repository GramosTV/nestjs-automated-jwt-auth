import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const origin = this.configService.getOrThrow<string>('app.origin');
    const resetUrl = `${origin}/auth/confirm-reset-password?token=${token}`;
    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: './reset-password',
      context: {
        resetUrl,
        title: 'Reset Your Password',
        content:
          'You requested to reset your password. Click the link below to proceed.',
        buttonText: 'Reset Password',
      },
    });
  }
}
