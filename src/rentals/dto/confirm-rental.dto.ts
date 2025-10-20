import { IsString, IsNotEmpty, IsNumber, IsObject, IsDateString, Min } from 'class-validator';

export class ConfirmRentalDto {
  @IsString()
  @IsNotEmpty()
  renter_id: string;

  @IsString()
  @IsNotEmpty()
  host_id: string;

  @IsDateString()
  @IsNotEmpty()
  scheduled_at: string;

  @IsNumber()
  @Min(1)
  duration_hours: number;

  @IsNumber()
  @Min(1)
  credits_used: number;

  @IsObject()
  @IsNotEmpty()
  location: {
    city: string;
    coordinates: number[];
  };
}
