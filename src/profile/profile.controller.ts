
import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('presets')
  getPresets() {
    return this.profileService.getPresets();
  }

  @Post('profile/create')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async createProfile(@Body() createProfileDto: CreateProfileDto, @Req() req: any) {
    const userId = req.body.user_id || req.user?.id;
    return this.profileService.createProfile(userId, createProfileDto);
  }

  @Get('profile/:user_id')
  async getProfile(@Param('user_id') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Put('profile/:user_id')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async updateProfile(@Param('user_id') userId: string, @Body() updateProfileDto: Partial<CreateProfileDto>) {
    return this.profileService.updateProfile(userId, updateProfileDto);
  }

  @Delete('profile/:user_id')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async deleteProfile(@Param('user_id') userId: string) {
    return this.profileService.deleteProfile(userId);
  }
}
