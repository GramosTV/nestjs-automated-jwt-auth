import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';
import { LessThan, MoreThan } from 'typeorm';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private refreshTokenRepository: Repository<RefreshTokenEntity>,
    private jwtService: JwtService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  async create(userId: string, payload: JwtRefreshPayload, jti: string): Promise<string> {
    try {
      const token = this.jwtService.sign(payload, {
        expiresIn: '30d',
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const activeTokens = await this.refreshTokenRepository.find({
        where: {
          user: { id: userId },
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
      });

      if (activeTokens.length >= 3) {
        const tokenToDelete = activeTokens.reduce((prev, curr) => (prev.expiresAt < curr.expiresAt ? prev : curr));

        await this.refreshTokenRepository.delete({ id: tokenToDelete.id });
      }

      const hashedToken = await bcrypt.hash(token, 10);

      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      const refreshToken = this.refreshTokenRepository.create({
        user,
        jti,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      await this.refreshTokenRepository.save(refreshToken);

      return token;
    } catch (error) {
      throw new InternalServerErrorException('Error creating refresh token');
    }
  }

  async findOne(jti: string): Promise<RefreshTokenEntity | null> {
    return await this.refreshTokenRepository.findOne({
      where: { jti },
    });
  }

  async revoke(jti: string): Promise<void> {
    await this.refreshTokenRepository.update({ jti }, { isRevoked: true });
  }

  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ user: { id: userId } }, { isRevoked: true });
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(now),
    });
  }

  @Cron('0 0 */7 * *')
  async handleExpiredTokensDeletion() {
    await this.deleteExpiredTokens();
  }
}
