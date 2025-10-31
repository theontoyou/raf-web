import { Schema, Document } from 'mongoose';

export interface LocationDocument extends Document {
  district: string;
  place_name: string;
  preset_location_id?: string;
  coordinates?: number[];
  spot_type?: string;
  description?: string;
  city?: string;
  created_at: Date;
}

export const LocationSchema = new Schema<LocationDocument>(
  {
    district: { type: String, required: true },
    place_name: { type: String, required: true },
    // preset_location_id will be auto-generated from the MongoDB _id if not provided
    preset_location_id: { type: String, required: false, unique: true },
    coordinates: { type: [Number], required: false },
    spot_type: { type: String },
    description: { type: String },
    city: { type: String },
    created_at: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

// pre-save hook: if preset_location_id isn't set, populate it from the document's _id
LocationSchema.pre('save', function (next) {
  // `this` is the document
  try {
    if (!this.preset_location_id) {
      this.preset_location_id = this._id ? this._id.toString() : undefined;
    }
  } catch (e) {
    // ignore
  }
  next();
});

// normalize fields to lowercase to avoid case-sensitivity issues
LocationSchema.pre('save', function (next) {
  try {
    if (this.place_name) this.place_name = String(this.place_name).trim().toLowerCase();
    if (this.city) this.city = String(this.city).trim().toLowerCase();
    if (this.preset_location_id) this.preset_location_id = String(this.preset_location_id).trim().toLowerCase();
    if (this.district) this.district = String(this.district).trim().toLowerCase();
  } catch (e) {
    // ignore errors
  }
  next();
});
