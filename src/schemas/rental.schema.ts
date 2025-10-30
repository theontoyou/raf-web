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

  // Location is a simple object (city + preset location). Remove 2dsphere index to avoid GeoJSON requirements.
  @Prop({ type: RentalLocation })
  location: RentalLocation;

  

  @Prop({ required: true })
  booking_date: string; // stored as YYYY-MM-DD string to represent date without time

  @Prop({ required: true })
  booking_hour: number; // hour in 24-hour format (0-23)

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
