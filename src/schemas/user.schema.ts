import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
class Auth {
  @Prop({ required: true, unique: true })
  mobile_number: string;

  @Prop({ default: false })
  otp_verified: boolean;

  @Prop()
  otp: string;

  @Prop()
  otp_expiry: Date;

  @Prop({ default: () => new Date() })
  created_at: Date;

  @Prop()
  last_login: Date;
}

@Schema({ _id: false })
class Location {
  @Prop({ default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[]; // [longitude, latitude]
}

@Schema({ _id: false })
class AgeRange {
  @Prop({ required: true })
  min: number;

  @Prop({ required: true })
  max: number;
}

@Schema({ _id: false })
class Profile {
  @Prop()
  name: string;

  @Prop()
  dob: string;

  @Prop()
  bio: string;

  @Prop()
  gender: string;

  @Prop({ type: [String] })
  preferred_gender: string[];

  @Prop()
  age: number;

  @Prop({ type: AgeRange })
  age_range: AgeRange;

  @Prop({ type: [String] })
  languages: string[];

  @Prop({ type: [String] })
  images: string[];

  @Prop()
  city: string;

  @Prop({ type: Location, index: '2dsphere' })
  location: Location;

  @Prop({ default: 15 })
  distance_limit_km: number;
}

@Schema({ _id: false })
class Traits {
  @Prop()
  extroversion: number;

  @Prop()
  introversion: number;

  @Prop()
  agreeableness: number;

  @Prop()
  assertiveness: number;

  @Prop()
  openness: number;

  @Prop()
  emotional_stability: number;

  @Prop()
  conscientiousness: number;

  @Prop()
  sarcastic_humor: boolean;

  @Prop()
  dry_humor: boolean;

  @Prop()
  playful_humor: boolean;

  @Prop()
  silly_humor: boolean;

  @Prop()
  intellectual_humor: boolean;
}

@Schema({ _id: false })
class Boundaries {
  @Prop()
  talk_intensity: string;

  @Prop()
  silence_tolerance: string;

  @Prop()
  emotional_openness: string;
}

@Schema({ _id: false })
class Preferences {
  @Prop({ type: [String] })
  duration: string[];

  @Prop({ type: [String] })
  frequency: string[];
}

@Schema({ _id: false })
class PastRatings {
  @Prop({ default: 0 })
  average: number;

  @Prop({ default: 0 })
  count: number;
}

@Schema({ _id: false })
class Verification {
  @Prop({ default: false })
  id_verified: boolean;

  @Prop({ type: [String] })
  social_profiles: string[];

  @Prop({ type: PastRatings })
  past_ratings: PastRatings;

  @Prop({ default: 0 })
  no_show_count: number;

  @Prop({ default: 10 })
  punctuality_score: number;
}

@Schema({ _id: false })
class Credits {
  @Prop({ default: 3 })
  balance: number;

  @Prop({ default: 0 })
  spent: number;
}

@Schema({ _id: false })
class Status {
  @Prop({ default: false })
  online: boolean;

  @Prop()
  last_seen: Date;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Auth, required: true })
  auth: Auth;

  @Prop({ type: Profile })
  profile: Profile;

  @Prop({ type: Traits })
  traits: Traits;

  @Prop({ type: [String], index: true })
  interests: string[];

  @Prop({ type: Boundaries })
  boundaries: Boundaries;

  @Prop({ type: Preferences })
  preferences: Preferences;

  @Prop({ type: Verification })
  verification: Verification;

  @Prop({ maxlength: 200 })
  custom_note: string;

  @Prop({ type: Credits })
  credits: Credits;

  @Prop({ type: Status })
  status: Status;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes are defined using @Prop decorators above
// Additional composite indexes can be added here if needed
UserSchema.index({ 'profile.city': 1 });
UserSchema.index({ 'profile.gender': 1 });
UserSchema.index({ 'profile.preferred_gender': 1 });
UserSchema.index({ 'traits.openness': 1 });
UserSchema.index({ 'traits.extroversion': 1 });
