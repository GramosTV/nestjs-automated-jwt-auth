import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { GmailService } from './gmail.service';
import { EmailTemplateService } from './email-template.service';
import { MailerModule } from '@nestjs-modules/mailer';
import mailerConfig from '../config/mailer.config';
import gmailConfig from '../config/gmail.config';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forFeature(gmailConfig),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('mailer'),
      }),
    }),
  ],
  providers: [MailService, GmailService, EmailTemplateService],
  exports: [MailService],
})
export class MailModule {}
