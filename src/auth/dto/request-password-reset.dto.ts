import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;
}
