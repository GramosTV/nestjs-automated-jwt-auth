import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import mailerConfig from '../config/mailer.config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('mailer'),
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
