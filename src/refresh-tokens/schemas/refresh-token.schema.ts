import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({
  collection: 'refresh_tokens',
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;
  @Prop({ required: true })
  jti: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ jti: 1 });
RefreshTokenSchema.index({ user: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });
