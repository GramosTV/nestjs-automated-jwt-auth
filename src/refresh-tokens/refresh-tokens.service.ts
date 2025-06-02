import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(
    userId: string,
    payload: JwtRefreshPayload,
    jti: string,
  ): Promise<string> {
    try {
      const token = this.jwtService.sign(payload, {
        expiresIn: '30d',
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const activeTokens = await this.refreshTokenModel.find({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (activeTokens.length >= 3) {
        const tokenToDelete = activeTokens.reduce((prev, curr) =>
          prev.expiresAt < curr.expiresAt ? prev : curr,
        );

        await this.refreshTokenModel.findByIdAndDelete(tokenToDelete._id);
      }

      const hashedToken = await bcrypt.hash(token, 10);

      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      const refreshToken = new this.refreshTokenModel({
        user: user._id,
        jti,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      await refreshToken.save();

      return token;
    } catch (error) {
      throw new InternalServerErrorException('Error creating refresh token');
    }
  }

  async findOne(jti: string): Promise<RefreshTokenDocument | null> {
    return await this.refreshTokenModel.findOne({ jti });
  }

  async revoke(jti: string): Promise<void> {
    await this.refreshTokenModel.updateOne({ jti }, { isRevoked: true });
  }

  async revokeAllTokensForUser(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { user: userId },
      { isRevoked: true },
    );
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: now },
    });
  }

  @Cron('0 0 */7 * *')
  async handleExpiredTokensDeletion() {
    await this.deleteExpiredTokens();
  }
}
