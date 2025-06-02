import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from './interfaces/role.enum';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userModel: jest.Mocked<Model<UserDocument>>;

  const mockUser: UserDocument = {
    _id: 'test-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerifiedAt: null,
  } as UserDocument;
  beforeEach(async () => {
    const MockUserModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: 'test-uuid',
        toObject: jest.fn().mockReturnValue({ ...data, _id: 'test-uuid' }),
      }),
    }));

    (MockUserModel as any).findOne = jest.fn();
    (MockUserModel as any).findById = jest.fn();
    (MockUserModel as any).findByIdAndUpdate = jest.fn();

    (MockUserModel as any).findOne.mockResolvedValue(null);
    (MockUserModel as any).findById.mockResolvedValue(null);
    const defaultUpdateQuery = {
      exec: jest.fn().mockResolvedValue(null),
    };
    (MockUserModel as any).findByIdAndUpdate.mockReturnValue(
      defaultUpdateQuery,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (userModel as any).findOne.mockResolvedValue(null);
    });

    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
      };

      (userModel as any).findOne.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await service.create(createUserDto);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(userModel).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'password123',
      };

      userModel.findOne.mockResolvedValue({
        email: 'existing@example.com',
      } as UserDocument);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException(
          `User with email ${createUserDto.email} already exists.`,
        ),
      );
    });
  });

  describe('findOneById', () => {
    it('should find a user by id successfully', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.findOneById('test-uuid');
      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith('test-uuid');
    });

    it('should throw NotFoundException if user with id does not exist', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.findOneById('non-existent-id')).rejects.toThrow(
        new NotFoundException('User with ID non-existent-id not found.'),
      );
    });
  });
  describe('findOneByEmail', () => {
    it('should find a user by email successfully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      };
      userModel.findOne.mockReturnValue(mockQuery as any);

      const result = await service.findOneByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should find a user by email with selected fields', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          _id: mockUser._id,
          email: mockUser.email,
          password: mockUser.password,
        }),
      };
      userModel.findOne.mockReturnValue(mockQuery as any);

      const result = await service.findOneByEmail('test@example.com', [
        '_id',
        'email',
        'password',
      ]);
      expect(result).toEqual({
        _id: mockUser._id,
        email: mockUser.email,
        password: mockUser.password,
      });
      expect(mockQuery.select).toHaveBeenCalledWith('_id email password');
    });

    it('should throw NotFoundException if user with email does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      userModel.findOne.mockReturnValue(mockQuery as any);

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

      const mockUserToUpdate = {
        ...mockUser,
        save: jest.fn().mockResolvedValue({ ...mockUser, ...updateUserDto }),
      };
      userModel.findById.mockResolvedValue(mockUserToUpdate);

      const result = await service.updateUser('test-uuid', updateUserDto);
      expect(result).toEqual({ ...mockUser, ...updateUserDto });
      expect(userModel.findById).toHaveBeenCalledWith('test-uuid');
      expect(mockUserToUpdate.save).toHaveBeenCalled();
    });
    it('should throw NotFoundException if user to update does not exist', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      userModel.findById.mockResolvedValue(null);

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

      const mockUserToUpdate = {
        ...mockUser,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          firstName: 'Updated',
          lastName: 'Name',
        }),
      };
      userModel.findById.mockResolvedValue(mockUserToUpdate);
      await service.updateUser('test-uuid', updateUserDto);

      expect(updateUserDto).not.toHaveProperty('password');
    });
  });

  describe('save', () => {
    it('should save a user entity', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockUser);
      const userWithSave = { ...mockUser, save: mockSave };

      const result = await service.save(userWithSave as any);
      expect(result).toEqual(mockUser);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
