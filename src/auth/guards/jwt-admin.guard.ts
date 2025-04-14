import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAdminGuard extends AuthGuard('admin') implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const accessToken = req.headers['Authorization']?.split(' ')[1];
    const refreshToken = req.cookies?.['refreshToken'];

    if (!accessToken) {
      return super.canActivate(context) as Promise<boolean>;
    }

    try {
      jwt.verify(accessToken, process.env.JWT_SECRET!);
    } catch (err) {
      if (refreshToken) {
        try {
          const payload =
            await this.authService.validateRefreshToken(refreshToken);
          const newAccessToken = this.authService.generateAccessToken(payload);

          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
          });

          req.headers['authorization'] = `Bearer ${newAccessToken}`;
        } catch (err) {
          throw new UnauthorizedException('Invalid refresh token');
        }
      } else {
        throw new UnauthorizedException('Invalid access token');
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
