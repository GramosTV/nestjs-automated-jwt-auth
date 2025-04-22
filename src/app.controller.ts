import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from './auth/interfaces/auth-fastify-request.interface';
import { FastifyReply } from 'fastify';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getHello(@Req() req: AuthFastifyRequest, @Res() res: FastifyReply) {
    return this.appService.getHello(req.user.email);
  }
}
