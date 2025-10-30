import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsOptional()
  @IsString()
  mobile_number?: string; // admin can be created with mobile or email

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string; // optional initial password for email login

  @IsString()
  @IsOptional()
  name?: string;
}
