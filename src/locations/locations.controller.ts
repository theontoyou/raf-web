import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { AddLocationDto } from './dto/add-location.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('locations')
export class LocationsController {
  constructor(private readonly svc: LocationsService) {}

  // Public: fetch districts or locations under a district using query ?district=Kochi
  @Get()
  async get(@Query('district') district?: string) {
    if (!district) return this.svc.getDistricts();
    return this.svc.getLocationsByDistrict(district);
  }

  // Admin: add location
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async add(@Body() body: AddLocationDto) {
    return this.svc.addLocation(body as any);
  }

  // Admin: delete by preset_location_id
  @Delete(':presetId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async delete(@Param('presetId') presetId: string) {
    return this.svc.deleteLocationById(presetId);
  }
}
