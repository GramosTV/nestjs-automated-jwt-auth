import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDocument } from './schemas/user.schema';
import { UuidValidationPipe } from '../common/pipes/uuid.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthFastifyRequest } from '../auth/interfaces/auth-fastify-request.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDocument> {
    return await this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('userdata')
  async findOne(@Req() req: AuthFastifyRequest): Promise<UserDocument> {
    return await this.usersService.findOneById(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(
    @Param('id', UuidValidationPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    return await this.usersService.updateUser(id, updateUserDto);
  }
}
