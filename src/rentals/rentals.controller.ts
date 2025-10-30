import { Controller, Post, Body, Req, UseGuards, BadRequestException, Get, Query, Param } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { InitiateRentalDto } from './dto/initiate-rental.dto';
import { ConfirmRentalDto } from './dto/confirm-rental.dto';
import { VerifyRentalOtpDto } from './dto/verify-rental-otp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async initiateRental(@Body() initiateRentalDto: InitiateRentalDto, @Req() req: any) {
    // Renter id comes from the authenticated JWT user. Do not allow client to override.
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      throw new BadRequestException('Authenticated user not found');
    }

    return this.rentalsService.initiateRental(userId, initiateRentalDto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async confirmRental(@Body() confirmRentalDto: ConfirmRentalDto, @Req() req: any) {
    // Ensure renter_id is the authenticated user. If client omitted it, set it from JWT.
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      throw new BadRequestException('Authenticated user not found');
    }

    // Fill renter_id if missing or if client attempted to override
    (confirmRentalDto as any).renter_id = String(userId);

    return this.rentalsService.confirmRental(confirmRentalDto);
  }

  @Post('otp-verify')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async verifyOtp(@Body() verifyRentalOtpDto: VerifyRentalOtpDto) {
    return this.rentalsService.verifyRentalOtp(verifyRentalOtpDto);
  }

  @Get('user/:userId/orders')
  @UseGuards(JwtAuthGuard)
  async getUserOrders(
    @Param('userId') userId: string,
    @Query('step') step?: string,
    @Query('limit') limit?: string,
  ) {
    // Treat `step` as a 1-based page index for client friendliness (default page = 1).
    // Backwards-compatible: if older clients pass 0 it will be clamped to 1.
    const s = step ? parseInt(step, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.rentalsService.getUserOrders(userId, s, l);
  }
}
