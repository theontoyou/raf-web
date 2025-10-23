import { IsString, IsNotEmpty, IsArray, IsNumber, IsObject, Min } from 'class-validator';

export class InitiateRentalDto {
  @IsObject()
  @IsNotEmpty()
  location: {
    city: string;
    preset_location_id?: string;
    preset_location_name?: string;
  };

  @IsObject()
  @IsNotEmpty()
  preferred_age: {
    min: number;
    max: number;
  };

  @IsArray()
  @IsString({ each: true })
  preferred_gender: string[];

  @IsObject()
  @IsNotEmpty()
  time_slot: {
    start: string;
    end: string;
  };

  @IsNumber()
  @Min(1)
  duration_hours: number;
}
