import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
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
    const userId = req.body.user_id || req.user?.id;
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
}
