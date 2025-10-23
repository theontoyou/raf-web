import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RentalDocument = Rental & Document;

@Schema({ _id: false })
class RentalLocation {
  @Prop({ required: true })
  city: string;

  @Prop()
  preset_location_id: string;

  @Prop()
  preset_location_name: string;
}

@Schema({ _id: false })
class OtpStage {
  @Prop()
  renter_otp: string;

  @Prop()
  host_otp: string;

  @Prop()
  common_otp: string;

  @Prop({ default: false })
  verified: boolean;
}

@Schema({ timestamps: true })
export class Rental {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  renter_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  host_id: Types.ObjectId;

  @Prop({ type: RentalLocation, index: '2dsphere' })
  location: RentalLocation;

  @Prop({ required: true })
  scheduled_at: Date;

  @Prop({ default: 'pending', index: true })
  status: string; // pending, confirmed, in-progress, completed, cancelled

  @Prop({ type: OtpStage })
  otp_stage: OtpStage;

  @Prop({ required: true })
  duration_hours: number;

  @Prop({ required: true })
  credits_used: number;

  @Prop({ default: () => new Date() })
  created_at: Date;

  @Prop()
  completed_at: Date;
}

export const RentalSchema = SchemaFactory.createForClass(Rental);

// Indexes are defined using @Prop decorators above
