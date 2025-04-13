import { Role } from '../interfaces/role.enum';

export class ResponseUserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  emailVerifiedAt: Date | null;
}
