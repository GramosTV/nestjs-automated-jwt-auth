import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { TestModule } from './test/test.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfiguration from './config/db.config';
import mailerConfig from './config/mailer.config';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import cookieConfig from './config/cookie.config';
import googleConfig from './config/google.config';
import gmailConfig from './config/gmail.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        dbConfiguration,
        mailerConfig,
        appConfig,
        jwtConfig,
        cookieConfig,
        googleConfig,
        gmailConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.getOrThrow('database'),
      }),
    }),
    AuthModule,
    UsersModule,
    MailModule,
    RefreshTokensModule,
    TestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
