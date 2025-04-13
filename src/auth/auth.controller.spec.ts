import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from '../users/interfaces/role.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const authServiceMock = {
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmResetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and set cookies', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.USER,
      };

      const mockReq = { user: mockUser };
      const mockRes = {
        setCookie: jest.fn(),
        send: jest.fn().mockReturnThis(),
      };

      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      await controller.login(mockReq as any, mockRes as any);

      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockRes.setCookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
      expect(mockRes.setCookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
      expect(mockRes.send).toHaveBeenCalledWith({
        accessToken: 'access-token',
      });
    });
  });

  describe('logout', () => {
    it('should call authService.logout and clear cookies', async () => {
      const mockReq = { cookies: { refreshToken: 'refresh-token' } };
      const mockRes = { clearCookie: jest.fn() };

      authService.logout.mockResolvedValue({ message: 'Logout successful' });

      const result = await controller.logout(mockReq as any, mockRes as any);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual({ message: 'Logout successful' });
    });

    it('should throw BadRequestException if refreshToken is missing', async () => {
      const mockReq = { cookies: {} };
      const mockRes = { clearCookie: jest.fn() };

      await expect(
        controller.logout(mockReq as any, mockRes as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRes.clearCookie).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken and set new accessToken cookie', async () => {
      const mockReq = { cookies: { refreshToken: 'refresh-token' } };
      const mockRes = { setCookie: jest.fn() };

      authService.refreshToken.mockResolvedValue({
        accessToken: 'new-access-token',
      });

      const result = await controller.refreshToken(
        mockReq as any,
        mockRes as any,
      );

      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockRes.setCookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('should throw BadRequestException if refreshToken is missing', async () => {
      const mockReq = { cookies: {} };
      const mockRes = { setCookie: jest.fn() };

      await expect(
        controller.refreshToken(mockReq as any, mockRes as any),
      ).rejects.toThrow(BadRequestException);

      expect(mockRes.setCookie).not.toHaveBeenCalled();
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should call authService.requestPasswordReset with correct email', async () => {
      const dto: RequestPasswordResetDto = { email: 'test@example.com' };
      const mockResponse = {
        message:
          'If an account with the email test@example.com exists, a password reset link has been sent.',
        statusCode: 200,
      };

      authService.requestPasswordReset.mockResolvedValue(mockResponse);

      const result = await controller.requestPasswordReset(dto);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('confirmResetPassword', () => {
    it('should call authService.confirmResetPassword with token and password', async () => {
      const dto: ResetPasswordDto = {
        token: 'reset-token',
        password: 'newPassword123',
      };

      const mockResponse = {
        message: 'Your password has been successfully reset.',
        statusCode: 201,
      };

      authService.confirmResetPassword.mockResolvedValue(mockResponse);

      const result = await controller.confirmResetPassword(dto);

      expect(authService.confirmResetPassword).toHaveBeenCalledWith(
        'reset-token',
        'newPassword123',
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
