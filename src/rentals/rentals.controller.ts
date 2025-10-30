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
    // Get userId from JWT token in production
    const userId = req.body.user_id || req.user?.id || req.user?._id;

    if (!userId) {
      // If JWT is disabled (guard allowed requests) we require client to pass user_id in body
      // so that we can look up credits and perform rental initiation.
      throw new BadRequestException('user_id is required in request body when not authenticated');
    }

    return this.rentalsService.initiateRental(userId, initiateRentalDto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard) // Requires JWT authentication
  async confirmRental(@Body() confirmRentalDto: ConfirmRentalDto) {
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
    const s = step ? parseInt(step, 10) : 0;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.rentalsService.getUserOrders(userId, s, l);
  }
}
