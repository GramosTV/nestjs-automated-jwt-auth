import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [TestController],
})
export class TestModule {}
