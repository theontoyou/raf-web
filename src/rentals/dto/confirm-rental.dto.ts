import { IsString, IsNotEmpty, IsNumber, IsObject, IsDateString, Min, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './location.dto';

export class ConfirmRentalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  renter_id?: string;

  @IsString()
  @IsNotEmpty()
  host_id: string;

  @IsDateString()
  @IsNotEmpty()
  scheduled_at: string;

  @IsDateString()
  @IsNotEmpty()
  booking_date: string;

  @IsNumber()
  @IsNotEmpty()
  booking_hour: number;

  @IsNumber()
  @Min(1)
  duration_hours: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  credits_used?: number; // optional, defaults to 0 in service

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  location: LocationDto;
}
