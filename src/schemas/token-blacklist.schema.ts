import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenBlacklistDocument = TokenBlacklist & Document;

@Schema({ timestamps: true })
export class TokenBlacklist {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop()
  admin_id?: string;

  @Prop()
  expires_at?: Date;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// Automatically remove expired blacklist entries
TokenBlacklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
