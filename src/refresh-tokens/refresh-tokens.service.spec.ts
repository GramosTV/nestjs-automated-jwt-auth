import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokensService } from './refresh-tokens.service';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/interfaces/role.enum';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';

jest.mock('bcrypt');

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let refreshTokenModel: jest.Mocked<Model<RefreshTokenDocument>>;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    _id: 'test-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerifiedAt: null,
  };

  const mockToken = {
    _id: 'token-uuid',
    user: mockUser._id,
    jti: 'jti-uuid',
    token: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  const mockPayload: JwtRefreshPayload = {
    sub: mockUser._id,
    email: mockUser.email,
    role: mockUser.role,
    jti: 'jti-uuid',
  };
  beforeEach(async () => {
    const MockRefreshTokenModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, ...mockToken }),
    }));
    (MockRefreshTokenModel as any).find = jest.fn();
    (MockRefreshTokenModel as any).findOne = jest.fn();
    (MockRefreshTokenModel as any).findById = jest.fn();
    (MockRefreshTokenModel as any).findByIdAndDelete = jest.fn();
    (MockRefreshTokenModel as any).updateOne = jest.fn();
    (MockRefreshTokenModel as any).updateMany = jest.fn();
    (MockRefreshTokenModel as any).deleteMany = jest.fn();

    const userModelMock = {
      findById: jest.fn(),
    };

    const jwtServiceMock = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: getModelToken(RefreshToken.name),
          useValue: MockRefreshTokenModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();
    service = module.get<RefreshTokensService>(RefreshTokensService);
    refreshTokenModel = module.get(getModelToken(RefreshToken.name));
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get(JwtService);

    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    beforeEach(() => {
      jwtService.sign.mockReturnValue('new-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      userModel.findById.mockResolvedValue(mockUser);
      refreshTokenModel.find.mockResolvedValue([]);
    });
    it('should create a refresh token successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue({
        ...mockToken,
        _id: 'token-uuid',
      });

      (refreshTokenModel as any).mockImplementation((data) => ({
        ...data,
        save: mockSave,
      }));

      const result = await service.create(
        mockUser._id,
        mockPayload,
        'jti-uuid',
      );

      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        expiresIn: '30d',
        secret: 'test-jwt-refresh-secret',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-refresh-token', 10);
      expect(userModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should delete oldest token when user has more than 3 active tokens', async () => {
      const oldestToken = {
        ...mockToken,
        _id: 'oldest-token',
        expiresAt: new Date(Date.now() + 1000),
      };
      const middleToken = {
        ...mockToken,
        _id: 'middle-token',
        expiresAt: new Date(Date.now() + 2000),
      };
      const newestToken = {
        ...mockToken,
        _id: 'newest-token',
        expiresAt: new Date(Date.now() + 3000),
      };
      refreshTokenModel.find.mockResolvedValue([
        oldestToken,
        middleToken,
        newestToken,
      ] as any);

      const mockSave = jest.fn().mockResolvedValue(mockToken);
      (refreshTokenModel as any).mockImplementation((data) => ({
        ...data,
        save: mockSave,
      }));

      await service.create(mockUser._id, mockPayload, 'jti-uuid');

      expect(refreshTokenModel.findByIdAndDelete).toHaveBeenCalledWith(
        'oldest-token',
      );
    });
  });

  describe('findOne', () => {
    it('should find a token by jti', async () => {
      refreshTokenModel.findOne.mockResolvedValue(mockToken as any);

      const result = await service.findOne('jti-uuid');

      expect(result).toEqual(mockToken);
      expect(refreshTokenModel.findOne).toHaveBeenCalledWith({
        jti: 'jti-uuid',
      });
    });

    it('should return null if token not found', async () => {
      refreshTokenModel.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should revoke a token by updating isRevoked to true', async () => {
      await service.revoke('jti-uuid');

      expect(refreshTokenModel.updateOne).toHaveBeenCalledWith(
        { jti: 'jti-uuid' },
        { isRevoked: true },
      );
    });
  });

  describe('revokeAllTokensForUser', () => {
    it('should revoke all tokens for a user', async () => {
      await service.revokeAllTokensForUser('user-id');

      expect(refreshTokenModel.updateMany).toHaveBeenCalledWith(
        { user: 'user-id' },
        { isRevoked: true },
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete all tokens that have expired', async () => {
      await service.deleteExpiredTokens();

      expect(refreshTokenModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
    });
  });
});
