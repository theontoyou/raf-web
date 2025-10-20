import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  image_url: string;

  @Prop()
  target_url: string;

  @Prop({ default: true, index: true })
  active: boolean;

  @Prop({ default: () => new Date() })
  created_at: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

// Index is defined using @Prop decorator above
