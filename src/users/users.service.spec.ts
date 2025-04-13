import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from './interfaces/role.enum';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  const mockUser: UserEntity = {
    id: 'test-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerifiedAt: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      insert: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
      };

      userRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue({
        ...createUserDto,
        password: 'hashedPassword',
      } as UserEntity);

      await service.createUser(createUserDto);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
      expect(userRepository.insert).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'password123',
      };

      userRepository.findOneBy.mockResolvedValue({
        email: 'existing@example.com',
      } as UserEntity);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new ConflictException(
          `User with email ${createUserDto.email} already exists.`,
        ),
      );
    });
  });

  describe('findOneById', () => {
    it('should find a user by id successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneById('test-uuid');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid' },
      });
    });

    it('should throw NotFoundException if user with id does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById('non-existent-id')).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found.'),
      );
    });
  });

  describe('findOneByEmail', () => {
    it('should find a user by email successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: undefined,
      });
    });

    it('should find a user by email with selected fields', async () => {
      userRepository.findOne.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        password: mockUser.password,
      } as UserEntity);

      const result = await service.findOneByEmail('test@example.com', [
        'id',
        'email',
        'password',
      ]);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        password: mockUser.password,
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: ['id', 'email', 'password'],
      });
    });

    it('should throw NotFoundException if user with email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneByEmail('non-existent@example.com'),
      ).rejects.toThrow(
        new NotFoundException(
          'User with email non-existent@example.com not found.',
        ),
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({ ...mockUser, ...updateUserDto });

      const result = await service.updateUser('test-uuid', updateUserDto);
      expect(result).toEqual({ ...mockUser, ...updateUserDto });
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: 'test-uuid',
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      userRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent-id', updateUserDto),
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found.'),
      );
    });

    it('should remove password from updateUserDto', async () => {
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        password: 'shouldBeRemoved',
      };

      userRepository.findOneBy.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
        password: mockUser.password,
      });

      await service.updateUser('test-uuid', updateUserDto);

      // Check that password is not passed to save
      const savedUser = userRepository.save.mock.calls[0][0];
      expect(savedUser.password).toEqual(mockUser.password);
      expect('password' in updateUserDto).toBeFalsy();
    });
  });

  describe('save', () => {
    it('should save a user entity', async () => {
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.save(mockUser);
      expect(result).toEqual(mockUser);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });
});
