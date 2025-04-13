import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from './auth/interfaces/auth-fastify-request.interface';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getHello(@Req() req: AuthFastifyRequest) {
    return this.appService.getHello(req.user.email);
  }
}
