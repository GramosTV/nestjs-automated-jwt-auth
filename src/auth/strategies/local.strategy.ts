import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { SignInDto } from '../dto/sign-in.dto';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passReqToCallback: true,
    });
  }

  async validate(request: any, email: string, password: string) {
    const loginDto = new SignInDto();
    loginDto.email = email;
    loginDto.password = password;

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        statusCode: 401,
      });
    }

    return user;
  }
}
