import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { MailService } from '../mail/mail.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schemas/user.schema';
import { Role } from '../users/interfaces/role.enum';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokensService: jest.Mocked<RefreshTokensService>;
  let mailService: jest.Mocked<MailService>;
  const mockUser: Partial<UserDocument> = {
    _id: 'test-uuid',
    email: 'test@example.com',
    role: Role.USER,
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    toObject: jest.fn(() => ({
      _id: 'test-uuid',
      email: 'test@example.com',
      role: Role.USER,
      password: 'hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
    })),
  };

  beforeEach(async () => {
    const usersServiceMock = {
      findOneByEmail: jest.fn(),
      findOneById: jest.fn(),
      save: jest.fn(),
    };

    const jwtServiceMock = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn(),
    };

    const refreshTokensServiceMock = {
      create: jest.fn().mockResolvedValue('test-refresh-token'),
      findOne: jest.fn(),
      revoke: jest.fn(),
    };

    const mailServiceMock = {
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: RefreshTokensService, useValue: refreshTokensServiceMock },
        { provide: MailService, useValue: mailServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    refreshTokensService = module.get(RefreshTokensService);
    mailService = module.get(MailService);

    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
    process.env.JWT_PASSWORD_SECRET = 'test-jwt-password-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user object when credentials are valid', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual({
        _id: mockUser._id,
        id: mockUser._id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
      });
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        'test@example.com',
        ['_id', 'email', 'role', 'password'],
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      usersService.findOneByEmail.mockRejectedValue(
        new ForbiddenException('Invalid credentials'),
      );

      await expect(
        service.validateUser('nonexistent@example.com', 'password'),
      ).rejects.toThrow(ForbiddenException);
    });
    it('should throw ForbiddenException when password is invalid', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens when login is successful', async () => {
      const userWithoutPassword = {
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
      };

      jwtService.sign.mockReturnValue('test-access-token');
      refreshTokensService.create.mockResolvedValue('test-refresh-token');

      const result = await service.login(userWithoutPassword as any);

      expect(result).toEqual({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
      });

      expect(jwtService.sign).toHaveBeenCalled();
      expect(refreshTokensService.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should return new access token when refresh token is valid', async () => {
      const mockPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
        jti: 'token-id',
      };

      service.validateRefreshToken = jest.fn().mockResolvedValue(mockPayload);
      service.generateAccessToken = jest
        .fn()
        .mockReturnValue('new-access-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual({ accessToken: 'new-access-token' });
      expect(service.validateRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(service.generateAccessToken).toHaveBeenCalledWith({
        sub: mockPayload.sub,
        email: mockPayload.email,
        role: mockPayload.role,
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      service.validateRefreshToken = jest.fn().mockRejectedValue(new Error());

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      jwtService.verify.mockReturnValue({ jti: 'token-id' });

      const result = await service.logout('valid-refresh-token');

      expect(result).toEqual({ message: 'Logout successful' });
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-jwt-refresh-secret',
      });
      expect(refreshTokensService.revoke).toHaveBeenCalledWith('token-id');
    });

    it('should throw UnauthorizedException when token is invalid during logout', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(service.logout('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing user', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser as UserDocument);
      jwtService.sign.mockReturnValue('password-reset-token');

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual({
        message:
          'If an account with the email test@example.com exists, a password reset link has been sent.',
        statusCode: 200,
      });
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password-reset-token',
      );
    });

    it('should return success message even when user does not exist for security', async () => {
      usersService.findOneByEmail.mockRejectedValue(new Error());

      const result = await service.requestPasswordReset(
        'nonexistent@example.com',
      );

      expect(result).toEqual({
        message:
          'If an account with the email nonexistent@example.com exists, a password reset link has been sent.',
        statusCode: 200,
      });
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirmResetPassword', () => {
    it('should reset password when token is valid', async () => {
      jwtService.verify.mockReturnValue({ userId: mockUser._id });
      usersService.findOneById.mockResolvedValue({
        ...mockUser,
        password: '',
        __v: 0,
      } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      const result = await service.confirmResetPassword(
        'valid-token',
        'newpassword',
      );

      expect(result).toEqual({
        message: 'Your password has been successfully reset.',
        statusCode: 201,
      });
      expect(usersService.save).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error();
      });

      await expect(
        service.confirmResetPassword('invalid-token', 'newpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
