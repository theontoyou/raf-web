import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
  IsDateString,
  ArrayMinSize,
  ValidateNested,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class PresetLocationDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateProfileDto {
  // Legacy alias: some clients still send display_name instead of name
  @IsOptional()
  @IsString()
  display_name?: string;

  // Mandatory fields
  @Transform(({ value, obj }) => value ?? obj.display_name ?? obj.displayName)
  @IsString()
  @IsNotEmpty()
  name: string; // Display Name / Nickname

  @IsString()
  @IsOptional()
  profile_photo?: string; // URL or uploaded file reference

  // accept legacy short_bio as well
  @IsOptional()
  @IsString()
  short_bio?: string;

  @Transform(({ value, obj }) => value ?? obj.short_bio ?? obj.shortBio ?? obj.bio)
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bio?: string; // Short bio (1-2 lines)

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(3, { message: 'At least 3 interests/tags must be selected' })
  interests: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PresetLocationDto)
  @IsOptional()
  preset_locations?: PresetLocationDto[]; // Company-defined meeting spots (id + name)

  @IsString()
  @IsNotEmpty()
  city: string; // City name (e.g., Kochi) - required for matching

  // Optional fields
  @IsOptional()
  @IsObject()
  availability?: {
    // example: { Monday: ['Morning','Evening'], Tuesday: ['Afternoon'] }
    [day: string]: string[];
  };

  @IsOptional()
  @IsString()
  preferred_gender?: string; // male/female/any

  @IsOptional()
  @IsObject()
  preferred_age_range?: {
    min: number;
    max: number;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personality_traits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boundaries?: string[]; // e.g., ['no smoking', 'no pets']

  @IsString()
  @IsOptional()
  @MaxLength(200)
  custom_note?: string; // short note or special preferences
}
