import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rental, RentalDocument } from '../schemas/rental.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { InitiateRentalDto } from './dto/initiate-rental.dto';
import { ConfirmRentalDto } from './dto/confirm-rental.dto';
import { VerifyRentalOtpDto } from './dto/verify-rental-otp.dto';

@Injectable()
export class RentalsService {
  constructor(
    @InjectModel(Rental.name) private rentalModel: Model<RentalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async initiateRental(userId: string, initiateRentalDto: InitiateRentalDto) {
    const { location, preferred_age, preferred_gender, duration_hours } = initiateRentalDto;

    // Find matching users based on criteria
    const matches = await this.userModel
      .find({
        _id: { $ne: userId }, // Exclude current user
        'profile.city': location.city,
        'profile.gender': { $in: preferred_gender },
        'profile.age': { $gte: preferred_age.min, $lte: preferred_age.max },
        // Matching by preset location id/name if provided
        ...(location.preset_location_id ? { 'preset_locations.id': location.preset_location_id } : {}),
        ...(location.preset_location_name ? { 'preset_locations.name': location.preset_location_name } : {}),
      })
      .limit(10)
      .select('profile.name profile.age profile.images profile.location profile.city');

    const matchResults = matches.map((match) => ({
      user_id: match._id,
      name: match.profile?.name,
      age: match.profile?.age,
      image: match.profile?.images?.[0] || '',
    }));

    return {
      status: 'success',
      msg: 'Top matches fetched',
      matches: matchResults,
    };
  }

  async confirmRental(confirmRentalDto: ConfirmRentalDto) {
    const { renter_id, host_id, scheduled_at, duration_hours, credits_used, location } =
      confirmRentalDto;

    // Check renter credits
    const renter = await this.userModel.findById(renter_id);
    if (!renter) {
      throw new NotFoundException('Renter not found');
    }

    if (renter.credits.balance < credits_used) {
      throw new BadRequestException('Insufficient credits');
    }

    // Check host availability
    const host = await this.userModel.findById(host_id);
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    // Generate OTPs
    const renter_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const host_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const common_otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create rental
    const rental = await this.rentalModel.create({
      renter_id,
      host_id,
      location: {
        city: location.city,
        preset_location_id: location.preset_location_id,
        preset_location_name: location.preset_location_name,
      },
      scheduled_at: new Date(scheduled_at),
      status: 'confirmed',
      otp_stage: {
        renter_otp,
        host_otp,
        common_otp,
        verified: false,
      },
      duration_hours,
      credits_used,
      created_at: new Date(),
    });

    // Deduct credits
    renter.credits.balance -= credits_used;
    renter.credits.spent += credits_used;
    await renter.save();

    // TODO: Send OTPs to both users via SMS/notification
    console.log(`Renter OTP: ${renter_otp}`);
    console.log(`Host OTP: ${host_otp}`);
    console.log(`Common OTP: ${common_otp}`);

    return {
      status: 'success',
      msg: 'Rental confirmed',
      rental_id: rental._id,
    };
  }

  async verifyRentalOtp(verifyRentalOtpDto: VerifyRentalOtpDto) {
    const { rental_id, user_id, otp } = verifyRentalOtpDto;

    const rental = await this.rentalModel.findById(rental_id);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    // Check if OTP matches renter, host, or common OTP
    const isValidOtp =
      otp === rental.otp_stage.renter_otp ||
      otp === rental.otp_stage.host_otp ||
      otp === rental.otp_stage.common_otp;

    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark as verified
    rental.otp_stage.verified = true;
    rental.status = 'in-progress';
    await rental.save();

    return {
      status: 'success',
      msg: 'OTP verified',
    };
  }

  // Helper function to calculate distance between two coordinates
  // distance calculation removed - rentals match by preset locations
}
