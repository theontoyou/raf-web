import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyRentalOtpDto {
  @IsString()
  @IsNotEmpty()
  rental_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
