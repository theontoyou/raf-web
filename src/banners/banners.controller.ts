
import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners() {
    return this.bannersService.getActiveBanners();
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Requires JWT authentication (Admin only in production)
  async addBanner(@Body() bannerDto: { title: string; image_url: string; target_url: string; active?: boolean }) {
    return this.bannersService.addBanner(bannerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication (Admin only in production)
  async deleteBanner(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }
}
