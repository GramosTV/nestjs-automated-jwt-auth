import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FastifyRequest, FastifyReply } from 'fastify';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  AuthFastifyRequest,
  LoginFastifyRequest,
} from './interfaces/auth-fastify-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: LoginFastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(
      req.user,
    );

    res.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return res.send({ accessToken });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing');
    }

    res.clearCookie('refreshToken');

    return await this.authService.logout(refreshToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing');
    }

    const { accessToken } = await this.authService.refreshToken(refreshToken);

    res.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return { accessToken };
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() RequestPasswordResetDto: RequestPasswordResetDto,
  ) {
    return await this.authService.requestPasswordReset(
      RequestPasswordResetDto.email,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async confirmResetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.confirmResetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}
