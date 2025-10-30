import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class LocationDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  preset_location_id?: string;

  @IsOptional()
  @IsString()
  preset_location_name?: string;
}
