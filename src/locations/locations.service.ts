import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationDocument } from '../schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(@InjectModel('Location') private locationModel: Model<LocationDocument>) {}

  async addLocation(data: Partial<LocationDocument>) {
    // Normalize textual fields to lowercase for consistent DB-level matching
    if (data.district) data.district = String(data.district).toLowerCase();
    if (data.place_name) data.place_name = String(data.place_name).toLowerCase();
    if ((data as any).preset_location_name) (data as any).preset_location_name = String((data as any).preset_location_name).toLowerCase();
    if ((data as any).city) (data as any).city = String((data as any).city).toLowerCase();

    const created = new this.locationModel(data);
    return created.save();
  }

  async deleteLocationById(preset_location_id: string) {
    return this.locationModel.findOneAndDelete({ preset_location_id }).exec();
  }

  async getDistricts() {
    // return unique district names
    const districts = await this.locationModel.distinct('district').exec();
    return districts;
  }

  async getLocationsByDistrict(district: string) {
    // perform case-insensitive match for district
    if (!district) return [];
    const regex = new RegExp(`^${district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    return this.locationModel.find({ district: regex }).lean().exec();
  }

  async getAllLocations() {
    return this.locationModel.find().lean().exec();
  }
}
