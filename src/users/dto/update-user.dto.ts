import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
