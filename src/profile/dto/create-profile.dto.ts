import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsObject,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class CreateProfileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsArray()
  @IsString({ each: true })
  preferred_gender: string[];

  @IsArray()
  @IsString({ each: true })
  languages: string[];

  @IsObject()
  age_range: {
    min: number;
    max: number;
  };

  @IsArray()
  @IsString({ each: true })
  interests: string[];

  @IsObject()
  @IsOptional()
  traits?: {
    extroversion?: number;
    introversion?: number;
    agreeableness?: number;
    assertiveness?: number;
    openness?: number;
    emotional_stability?: number;
    conscientiousness?: number;
    sarcastic_humor?: boolean;
    dry_humor?: boolean;
    playful_humor?: boolean;
    silly_humor?: boolean;
    intellectual_humor?: boolean;
  };

  @IsObject()
  @IsOptional()
  boundaries?: {
    talk_intensity?: string;
    silence_tolerance?: string;
    emotional_openness?: string;
  };

  @IsObject()
  @IsOptional()
  preferences?: {
    duration?: string[];
    frequency?: string[];
  };

  @IsObject()
  @IsOptional()
  verification?: {
    id_verified?: boolean;
    social_profiles?: string[];
  };

  @IsString()
  @IsOptional()
  @MaxLength(200)
  custom_note?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[]; // [longitude, latitude]

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  distance_limit_km?: number;
}
