import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAdminStrategy } from './strategies/jwt-admin.strategy';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokensModule } from '../refresh-tokens/refresh-tokens.module';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    RefreshTokensModule,
    JwtModule,
    MailModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAdminStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
