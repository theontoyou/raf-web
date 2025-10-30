import { IsString, IsNotEmpty, IsArray, IsNumber, IsObject, Min, IsOptional, IsDateString } from 'class-validator';

export class InitiateRentalDto {
  @IsOptional()
  @IsString()
  user_id?: string;
  @IsObject()
  @IsNotEmpty()
  location: {
    city: string;
    preset_location_id?: string;
    preset_location_name?: string;
  };

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
