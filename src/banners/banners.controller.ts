
import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  async getBanners() {
    return this.bannersService.getActiveBanners();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard) // Admins only
  async addBanner(@Body() bannerDto: { title: string; image_url: string; target_url: string; active?: boolean }) {
    return this.bannersService.addBanner(bannerDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard) // Admins only
  async deleteBanner(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }
}
