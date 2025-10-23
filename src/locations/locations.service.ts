import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationDocument } from '../schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(@InjectModel('Location') private locationModel: Model<LocationDocument>) {}

  async addLocation(data: Partial<LocationDocument>) {
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
    return this.locationModel.find({ district }).lean().exec();
  }

  async getAllLocations() {
    return this.locationModel.find().lean().exec();
  }
}
