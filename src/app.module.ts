import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import dbConfiguration from './config/db.config';
import mailerConfig from './config/mailer.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [dbConfiguration, mailerConfig],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('database.uri'),
        useNewUrlParser: configService.get('database.useNewUrlParser'),
        useUnifiedTopology: configService.get('database.useUnifiedTopology'),
      }),
    }),
    AuthModule,
    UsersModule,
    MailModule,
    RefreshTokensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
