import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RefreshTokensService } from './refresh-tokens.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from '../users/entities/user.entity';
import { Repository, MoreThan, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../users/interfaces/role.enum';
import { JwtRefreshPayload } from '../auth/interfaces/jwt-payload.interface';

jest.mock('bcrypt');

describe('RefreshTokensService', () => {
  let service: RefreshTokensService;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshTokenEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockToken: RefreshTokenEntity = {
    id: 'token-uuid',
    user: mockUser,
    jti: 'jti-uuid',
    token: 'hashed-token',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPayload: JwtRefreshPayload = {
    sub: mockUser.id,
    email: mockUser.email,
    role: mockUser.role,
    jti: 'jti-uuid',
  };

  beforeEach(async () => {
    const refreshTokenRepoMock = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const userRepoMock = {
      findOne: jest.fn(),
    };
    const jwtServiceMock = {
      sign: jest.fn(),
    };

    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        const mockConfig = {
          'jwt.refreshTokenExpiry': '30d',
          'jwt.refreshSecret': 'test-jwt-refresh-secret',
        };
        return mockConfig[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensService,
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: refreshTokenRepoMock,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepoMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<RefreshTokensService>(RefreshTokensService);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshTokenEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    jwtService = module.get(JwtService);

    // Mock environment variables
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    beforeEach(() => {
      jwtService.sign.mockReturnValue('new-refresh-token');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-token');
      userRepository.findOne.mockResolvedValue(mockUser);
      refreshTokenRepository.find.mockResolvedValue([]);
      refreshTokenRepository.create.mockReturnValue(mockToken);
      refreshTokenRepository.save.mockResolvedValue(mockToken);
    });

    it('should create a refresh token successfully', async () => {
      const result = await service.create(mockUser.id, mockPayload, 'jti-uuid');

      expect(result).toEqual('new-refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith(mockPayload, {
        expiresIn: '30d',
        secret: 'test-jwt-refresh-secret',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-refresh-token', 10);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(refreshTokenRepository.create).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalled();
    });

    it('should delete oldest token when user has more than 3 active tokens', async () => {
      const oldestToken = {
        ...mockToken,
        id: 'oldest-token',
        expiresAt: new Date(Date.now() + 1000),
      };
      const middleToken = {
        ...mockToken,
        id: 'middle-token',
        expiresAt: new Date(Date.now() + 2000),
      };
      const newestToken = {
        ...mockToken,
        id: 'newest-token',
        expiresAt: new Date(Date.now() + 3000),
      };

      refreshTokenRepository.find.mockResolvedValue([
        oldestToken,
        middleToken,
        newestToken,
      ]);

      await service.create(mockUser.id, mockPayload, 'jti-uuid');

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        id: 'oldest-token',
      });
    });
  });

  describe('findOne', () => {
    it('should find a token by jti', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(mockToken);

      const result = await service.findOne('jti-uuid');

      expect(result).toEqual(mockToken);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { jti: 'jti-uuid' },
      });
    });

    it('should return null if token not found', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should revoke a token by updating isRevoked to true', async () => {
      await service.revoke('jti-uuid');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: 'jti-uuid' },
        { isRevoked: true },
      );
    });
  });

  describe('revokeAllTokensForUser', () => {
    it('should revoke all tokens for a user', async () => {
      await service.revokeAllTokensForUser('user-id');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: 'user-id' } },
        { isRevoked: true },
      );
    });
  });

  describe('deleteExpiredTokens', () => {
    it('should delete all tokens that have expired', async () => {
      await service.deleteExpiredTokens();

      expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(expect.any(Date)),
      });
    });
  });
});
