import { IsString, IsOptional, IsArray, ArrayMinSize, IsIn } from 'class-validator';

export class AddLocationDto {
  @IsString()
  district: string; // e.g. Kochi

  @IsString()
  place_name: string; // e.g. Lulu Mall

  @IsOptional()
  @IsString()
  preset_location_id?: string; // internal id (optional - server will generate if omitted)

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  coordinates?: number[]; // [longitude, latitude] - optional

  @IsOptional()
  @IsString()
  spot_type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
