import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignInDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(24)
  password: string;
}
