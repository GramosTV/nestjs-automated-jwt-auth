import { Module } from '@nestjs/common';
import { RefreshTokensService } from './refresh-tokens.service';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    JwtModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [RefreshTokensService],
  exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
