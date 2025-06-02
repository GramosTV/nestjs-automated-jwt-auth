import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Role } from '../../users/interfaces/role.enum';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

class MockJwtStrategy {
  validate(payload: any) {
    return payload;
  }
}

jest.mock('jsonwebtoken');

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let authService: jest.Mocked<AuthService>;
  beforeEach(async () => {
    const authServiceMock = {
      validateRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
    };

    process.env.JWT_SECRET = 'test-jwt-secret';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret',
        }),
      ],
      providers: [
        JwtAuthGuard,
        { provide: AuthService, useValue: authServiceMock },
        { provide: 'JwtStrategy', useClass: MockJwtStrategy },
      ],
    })
      .overrideProvider('JwtStrategy')
      .useClass(MockJwtStrategy)
      .compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        cookies: {},
      };

      mockResponse = {
        cookie: jest.fn(),
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as unknown as ExecutionContext;

      jest
        .spyOn(JwtAuthGuard.prototype, 'canActivate')
        .mockImplementation(async function (
          this: any,
          context: ExecutionContext,
        ) {
          const req = context.switchToHttp().getRequest();
          const res = context.switchToHttp().getResponse();

          const accessToken = req.headers['Authorization']?.split(' ')[1];
          const refreshToken = req.cookies?.['refreshToken'];

          if (!accessToken) {
            return true; // Mock parent behavior
          }

          try {
            jwt.verify(accessToken, process.env.JWT_SECRET!);
            return true;
          } catch (err) {
            if (refreshToken) {
              try {
                const payload =
                  await authService.validateRefreshToken(refreshToken);
                const newAccessToken = authService.generateAccessToken(payload);

                res.cookie('accessToken', newAccessToken, {
                  httpOnly: true,
                  secure: true,
                  sameSite: 'strict',
                });

                req.headers.authorization = `Bearer ${newAccessToken}`;
                return true;
              } catch (err) {
                throw new UnauthorizedException('Invalid refresh token');
              }
            } else {
              throw new UnauthorizedException('Invalid access token');
            }
          }
        });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should pass to parent class when no accessToken present', async () => {
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(jwt.verify).not.toHaveBeenCalled();
    });
    it('should verify token when accessToken is present', async () => {
      mockRequest.headers['Authorization'] = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValueOnce({ sub: 'user-id' });

      const result = await guard.canActivate(mockContext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
      expect(result).toBe(true);
    });
    it('should refresh token if accessToken is invalid but refreshToken is valid', async () => {
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';
      mockRequest.cookies = { refreshToken: 'valid-refresh-token' };

      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const mockPayload: JwtRefreshPayload = {
        sub: 'user-id',
        email: 'test@example.com',
        jti: 'token-id',
        role: Role.USER,
      };
      authService.validateRefreshToken.mockResolvedValueOnce(mockPayload);
      authService.generateAccessToken.mockReturnValueOnce('new-access-token');

      const result = await guard.canActivate(mockContext);

      expect(authService.validateRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(authService.generateAccessToken).toHaveBeenCalledWith(mockPayload);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
      expect(mockRequest.headers.authorization).toBe('Bearer new-access-token');
      expect(result).toBe(true);
    });
    it('should throw UnauthorizedException when both tokens are invalid', async () => {
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';
      mockRequest.cookies = { refreshToken: 'invalid-refresh-token' };

      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      authService.validateRefreshToken.mockRejectedValueOnce(
        new Error('Invalid refresh token'),
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.validateRefreshToken).toHaveBeenCalledWith(
        'invalid-refresh-token',
      );
    });
    it('should throw UnauthorizedException when accessToken is invalid and no refreshToken', async () => {
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.validateRefreshToken).not.toHaveBeenCalled();
    });
  });
});
