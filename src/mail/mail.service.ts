import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.ORIGIN}/auth/confirm-reset-password?token=${token}`;
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
