import { Controller, Post, Body, UseGuards, Get, Query, Delete, Param, Req } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Create admin - protected so only existing admins can create new admins
  @Post('create')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createAdmin(@Body() dto: CreateAdminDto) {
    const user = await this.adminService.createAdmin(dto.mobile_number, dto.name, dto.email, dto.password);
    return { status: 'success', msg: 'Admin created/updated', user_id: user._id };
  }

  // Admin login via email+password (public)
  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    const resp = await this.adminService.loginWithEmail(email, password);
    return { status: 'success', msg: 'Logged in', ...resp };
  }

  // Admin logout (protected) - token will be blacklisted
  @Post('logout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async logout(@Req() req: any) {
    const authHeader = req.headers && req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const adminId = req.user && (req.user._id || req.user.id);
    const resp = await this.adminService.logout(token, String(adminId));
    return resp;
  }

  // Get users by filter (city, preset_location_id, status=active|inactive, search)
  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUsers(
    @Query('city') city?: string,
    @Query('preset_location_id') preset_location_id?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('age_min') age_min?: string,
    @Query('age_max') age_max?: string,
    @Query('preset_location_name') preset_location_name?: string,
    @Query('step') step?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const s = step ? parseInt(step, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const resp = await this.adminService.getUsersByFilter(
      { city, preset_location_id, preset_location_name, status, gender, age_min, age_max, search },
      s,
      l,
    );
    return { status: 'success', msg: 'Users fetched', ...resp };
  }

  @Delete('users/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteUser(@Param('userId') userId: string, @Req() req: any) {
    const adminId = req.user && (req.user.id || req.user._id);
    return this.adminService.softDeleteUser(userId, String(adminId));
  }

  @Get('rentals/active')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getActiveRentals(
    @Query('city') city?: string,
    @Query('preset_location_id') preset_location_id?: string,
    @Query('step') step?: string,
    @Query('limit') limit?: string,
  ) {
    const s = step ? parseInt(step, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const resp = await this.adminService.getActiveRentals({ city, preset_location_id }, s, l);
    return { status: 'success', msg: 'Active rentals fetched', ...resp };
  }

  @Get('dashboard/summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getDashboardSummary(@Query('since') since?: string, @Query('period') period?: string) {
    const resp = await this.adminService.getDashboardSummary({ since, period });
    return { status: 'success', totals: resp };
  }

  @Get('rentals/recent')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRecentRentals(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 5;
    const resp = await this.adminService.getRecentRentals(l);
    return { status: 'success', rentals: resp };
  }

  @Get('rentals/pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getPendingRentals(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 20;
    const resp = await this.adminService.getPendingRentals(l);
    return { status: 'success', rentals: resp };
  }

  @Post('rentals/:rentalId/confirm')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async confirmRental(@Param('rentalId') rentalId: string) {
    const rental = await this.adminService.confirmRental(rentalId);
    return { status: 'success', msg: 'Rental confirmed', rental };
  }

  @Post('rentals/:rentalId/cancel')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async cancelRental(@Param('rentalId') rentalId: string, @Body('reason') reason?: string) {
    const rental = await this.adminService.cancelRental(rentalId, reason);
    return { status: 'success', msg: 'Rental cancelled', rental };
  }

  @Post('rentals/:rentalId/complete')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async completeRental(@Param('rentalId') rentalId: string) {
    const rental = await this.adminService.completeRental(rentalId);
    return { status: 'success', msg: 'Rental completed', rental };
  }

  @Get('analytics/rentals')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRentalSeries(@Query('range') range?: string, @Query('group_by') group_by?: string) {
    const resp = await this.adminService.getRentalSeries({ range, group_by });
    return { status: 'success', series: resp };
  }

  @Get('analytics/users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserSeries(@Query('range') range?: string, @Query('group_by') group_by?: string) {
    const resp = await this.adminService.getUserSeries({ range, group_by });
    return { status: 'success', series: resp };
  }
}
