import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { mobile_number } = loginDto;

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date();
    otp_expiry.setMinutes(
      otp_expiry.getMinutes() + parseInt(this.configService.get('OTP_EXPIRY_MINUTES', '10')),
    );

    // Find or create user
    let user = await this.userModel.findOne({ 'auth.mobile_number': mobile_number });

    if (!user) {
      // Create new user
      user = await this.userModel.create({
        auth: {
          mobile_number,
          otp,
          otp_expiry,
          otp_verified: false,
          created_at: new Date(),
        },
        credits: {
          balance: parseInt(this.configService.get('DEFAULT_USER_CREDITS', '3')),
          spent: 0,
        },
        status: {
          online: true,
          last_seen: new Date(),
        },
      });
    } else {
      // Update existing user with new OTP
      user.auth.otp = otp;
      user.auth.otp_expiry = otp_expiry;
      await user.save();
    }

    // Send OTP via Twilio (commented until service is purchased)
    // await this.sendOtpViaTwilio(mobile_number, otp);
    
    // For development: log OTP to console
    console.log(`OTP for ${mobile_number}: ${otp}`);

    // For testing: return OTP in response (REMOVE IN PRODUCTION)
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';

    return {
      status: 'success',
      msg: 'OTP sent successfully',
      ...(isDevelopment && { otp }), // Only include OTP in development
    };
  }

  /**
   * Send OTP via Twilio SMS
   * Uncomment when Twilio service is purchased
   */
  // private async sendOtpViaTwilio(mobile_number: string, otp: string) {
  //   const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
  //   const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
  //   const twilioNumber = this.configService.get('TWILIO_PHONE_NUMBER');
  //   
  //   const client = require('twilio')(accountSid, authToken);
  //   
  //   try {
  //     await client.messages.create({
  //       body: `Your OnToYou verification code is: ${otp}. Valid for 10 minutes.`,
  //       from: twilioNumber,
  //       to: `+91${mobile_number}`, // Assuming India (+91)
  //     });
  //     console.log(`OTP sent to ${mobile_number} via Twilio`);
  //   } catch (error) {
  //     console.error('Twilio SMS Error:', error);
  //     throw new Error('Failed to send OTP');
  //   }
  // }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { mobile_number, otp } = verifyOtpDto;

    const user = await this.userModel.findOne({ 'auth.mobile_number': mobile_number });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check OTP validity
    if (user.auth.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (new Date() > user.auth.otp_expiry) {
      throw new UnauthorizedException('OTP expired');
    }

    // Update user
    user.auth.otp_verified = true;
    user.auth.last_login = new Date();
    user.status.online = true;
    user.status.last_seen = new Date();
    await user.save();

    // Generate JWT token if enabled
    let token = null;
    if (this.configService.get('JWT_ENABLED') === 'true') {
      const payload = { sub: user._id, mobile: mobile_number };
      token = this.jwtService.sign(payload);
    }

    return {
      status: 'success',
      msg: 'OTP verified',
      token,
      user_id: user._id,
    };
  }

  async validateUser(userId: string): Promise<UserDocument> {
    return this.userModel.findById(userId);
  }
}
