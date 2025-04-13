import { Module } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/entities/user.entity';
@Module({
  imports: [JwtModule, ScheduleModule.forRoot(), TypeOrmModule.forFeature([RefreshTokenEntity, UserEntity])],
  providers: [RefreshTokensService],
  exports: [RefreshTokensService, TypeOrmModule.forFeature([RefreshTokenEntity])],
})
export class RefreshTokensModule {}
