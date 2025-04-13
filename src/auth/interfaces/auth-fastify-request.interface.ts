import { FastifyRequest } from 'fastify';
import { JwtAccessPayload } from './jwt-payload.interface';
import { UserEntity } from '../../users/entities/user.entity';

export interface AuthFastifyRequest extends FastifyRequest {
  user: JwtAccessPayload;
  cookies: {
    [key: string]: string;
  };
}

export interface LoginFastifyRequest extends FastifyRequest {
  user: Omit<UserEntity, 'password'>;
  cookies: {
    [key: string]: string;
  };
}
