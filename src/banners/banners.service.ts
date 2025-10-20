import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from '../schemas/banner.schema';

@Injectable()
export class BannersService {
  constructor(@InjectModel(Banner.name) private bannerModel: Model<BannerDocument>) {}

  async getActiveBanners() {
    const banners = await this.bannerModel.find({ active: true }).select('-__v');
    return {
      status: 'success',
      banners,
    };
  }

  async addBanner(bannerDto: { title: string; image_url: string; target_url: string; active?: boolean }) {
    const banner = await this.bannerModel.create({
      ...bannerDto,
      active: bannerDto.active !== undefined ? bannerDto.active : true,
      created_at: new Date(),
    });
    return {
      status: 'success',
      msg: 'Banner added',
      banner,
    };
  }

  async deleteBanner(id: string) {
    const result = await this.bannerModel.findByIdAndDelete(id);
    if (!result) {
      return { status: 'error', msg: 'Banner not found' };
    }
    return { status: 'success', msg: 'Banner deleted' };
  }
}
