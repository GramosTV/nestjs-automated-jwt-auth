import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class TestEmailDto {
  email: string;
}

@Controller('test')
@UseGuards(JwtAuthGuard)
export class TestController {
  constructor(private readonly mailService: MailService) {}

  @Get('email-service')
  async testEmailService() {
    const results = await this.mailService.testEmailService();
    return {
      message: 'Email service test completed',
      results,
      gmailConfigured: results.gmail,
      smtpConfigured: results.smtp,
    };
  }

  @Post('send-email')
  async sendTestEmail(@Body() body: TestEmailDto) {
    const result = await this.mailService.sendTestEmail(body.email);
    return {
      message: 'Test email sending completed',
      ...result,
    };
  }
}
