import { IsString, IsNotEmpty, IsArray, IsNumber, IsObject, Min, IsOptional, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './location.dto';

export class InitiateRentalDto {
  @IsOptional()
  // user_id removed: use JWT-derived user id (req.user) instead of client-provided id
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;

  @IsDateString()
  @IsNotEmpty()
  booking_date: string; // ISO date string (YYYY-MM-DD or full ISO)

  // Accept a booking hour range (start and end inclusive) in 24-hour format (0-23)
  @IsOptional()
  @IsNumber()
  booking_hour_start?: number;

  @IsOptional()
  @IsNumber()
  booking_hour_end?: number;

  @IsOptional()
  @IsObject()
  preferred_age?: {
    min: number;
    max: number;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_gender?: string[];
  // legacy time_slot removed in favor of booking_date + booking_hour range

  @IsOptional()
  @IsNumber()
  limit?: number;
}
