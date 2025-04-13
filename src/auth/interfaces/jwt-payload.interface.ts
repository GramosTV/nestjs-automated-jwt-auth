import { Role } from '../../users/interfaces/role.enum';

export interface JwtAccessPayload {
  email: string;
  sub: string;
  role: Role;
}

export interface JwtRefreshPayload {
  email: string;
  sub: string;
  jti: string;
  role: Role;
}
