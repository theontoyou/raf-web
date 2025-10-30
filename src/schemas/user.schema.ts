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

// Boundaries were originally modeled as an object; switch to an array of strings
// to accept incoming payloads like ["no smoking", "no pets"].


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

  // role: 'user' or 'admin'
  @Prop({ default: 'user' })
  role: string;

  @Prop({ type: Profile })
  profile: Profile;

  @Prop({ type: [{ id: String, name: String }], default: [] })
  preset_locations: { id: string; name: string }[];

  // availability stored as a map from weekday to an array of available hours (numbers)
  // example: { Monday: [11, 17], Friday: [15] }
  @Prop({ type: Map, of: [Number], default: {} })
  availability: Map<string, number[]> | Record<string, number[]>;

  @Prop()
  preferred_gender: string;

  @Prop({ type: { min: Number, max: Number } })
  preferred_age_range: { min: number; max: number };

  @Prop({ type: [String] })
  personality_traits: string[];

  @Prop({ type: Traits })
  traits: Traits;

  @Prop({ type: [String], index: true })
  interests: string[];

  @Prop({ default: false })
  is_on_rent: boolean;

  // Track active bookings per user with booking_date and booking_hour (0-23)
  @Prop({ type: [{ booking_date: String, booking_hour: Number, rental_id: String, role: String, status: String }], default: [] })
  active_bookings: Array<{ booking_date: string; booking_hour: number; rental_id?: string; role?: string; status?: string }>;

  // Accept boundaries as a simple array of strings (e.g. ["no smoking", "no pets"])
  @Prop({ type: [String] })
  boundaries: string[];

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
