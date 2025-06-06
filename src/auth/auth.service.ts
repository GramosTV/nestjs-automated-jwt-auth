import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../users/entities/user.entity';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokensService: RefreshTokensService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  generateAccessToken(payload: JwtAccessPayload): string {
    try {
      return this.jwtService.sign(payload, {
        expiresIn: this.configService.getOrThrow<string>(
          'jwt.accessTokenExpiry',
        ),
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });
    } catch (error) {
      throw new InternalServerErrorException('Error generating access token');
    }
  }
  async validateRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });

      const token = await this.refreshTokensService.findOne(decoded.jti);
      if (!token || token.isRevoked || token.expiresAt < new Date()) {
        throw new Error();
      }

      const isValid = await bcrypt.compare(refreshToken, token.token);
      if (!isValid) {
        throw new Error();
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserEntity, 'password'>> {
    try {
      const user = await this.usersService.findOneByEmail(email, [
        'id',
        'email',
        'role',
        'password',
      ]);
      if (!user) {
        throw new ForbiddenException('Invalid credentials');
      }

      const isMatch = await bcrypt.compare(pass, user.password);
      if (!isMatch) {
        throw new ForbiddenException('Invalid credentials');
      }

      const { password, ...result } = user;
      return result;
    } catch (error) {
      throw error;
    }
  }

  async login(user: Omit<UserEntity, 'password'>) {
    try {
      const jti = uuidv4();
      const payload = {
        email: user.email,
        sub: user.id,
        jti,
        role: user.role,
      };
      const accessToken = this.generateAccessToken(payload);
      const refreshToken = await this.refreshTokensService.create(
        user.id,
        payload,
        jti,
      );
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error during login process');
    }
  }
  async logout(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
      await this.refreshTokensService.revoke(decoded.jti);
      return { message: 'Logout successful' };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.validateRefreshToken(refreshToken);
      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const user = await this.usersService.findOneByEmail(email);
      if (user) {
        await this.mailService.sendPasswordResetEmail(
          email,
          this.jwtService.sign(
            { userId: user.id },
            {
              expiresIn: this.configService.getOrThrow<string>(
                'jwt.passwordResetExpiry',
              ),
              secret:
                this.configService.getOrThrow<string>('jwt.passwordSecret'),
            },
          ),
        );
      }
      return {
        message: `If an account with the email ${email} exists, a password reset link has been sent.`,
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: `If an account with the email ${email} exists, a password reset link has been sent.`,
        statusCode: 200,
      };
    }
  }
  async confirmResetPassword(token: string, password: string) {
    try {
      const decoded = await this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('jwt.passwordSecret'),
      });
      const user = await this.usersService.findOneById(decoded.userId);
      if (!user) {
        throw new Error();
      }
      user.password = await bcrypt.hash(password, 10);
      await this.usersService.save(user);
      return {
        message: 'Your password has been successfully reset.',
        statusCode: 201,
      };
    } catch (error) {
      throw new UnauthorizedException(
        'The provided token is invalid or has expired.',
      );
    }
  }

  async googleLogin(req) {
    if (!req.user) {
      throw new UnauthorizedException('No user from Google');
    }

    try {
      let user;
      try {
        user = await this.usersService.findOneByEmail(req.user.email);
      } catch (error) {
        if (error instanceof NotFoundException) {
          const randomPassword = uuidv4();
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          user = await this.usersService.create({
            email: req.user.email,
            password: hashedPassword,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          });
        } else {
          throw error;
        }
      }

      return this.login(user);
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new InternalServerErrorException(
        'Error during Google authentication',
      );
    }
  }
}
