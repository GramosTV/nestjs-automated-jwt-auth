import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './interfaces/role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;
  const mockUser: UserDocument = {
    _id: 'test-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: '',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerifiedAt: null,
  } as UserDocument;

  beforeEach(async () => {
    const usersServiceMock = {
      create: jest.fn(),
      findOneById: jest.fn(),
      updateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should call usersService.createUser with the provided data', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
      };

      usersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOne', () => {
    it('should return the user data from auth request', async () => {
      const mockReq = {
        user: {
          sub: 'test-uuid',
          email: 'test@example.com',
          role: Role.USER,
        },
      };

      usersService.findOneById.mockResolvedValue(mockUser as any);

      const result = await controller.findOne(mockReq as any);

      expect(usersService.findOneById).toHaveBeenCalledWith('test-uuid');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should call usersService.updateUser with id and update data', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      usersService.updateUser.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      } as any);

      const result = await controller.updateUser('test-uuid', updateUserDto);

      expect(usersService.updateUser).toHaveBeenCalledWith(
        'test-uuid',
        updateUserDto,
      );
      expect(result).toEqual({
        ...mockUser,
        firstName: 'Updated',
        lastName: 'Name',
      });
    });
  });
});
