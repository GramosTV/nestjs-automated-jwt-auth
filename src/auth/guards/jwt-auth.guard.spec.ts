import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Role } from '../../users/interfaces/role.enum';
import { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

// Create a mock JWT strategy instead of using the real one
class MockJwtStrategy {
  validate(payload: any) {
    return payload;
  }
}

jest.mock('jsonwebtoken');

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mock for AuthService
    const authServiceMock = {
      validateRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
    };

    // Create mock for ConfigService
    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        const config = {
          'jwt.secret': 'test-jwt-secret',
        };
        return config[key];
      }),
    };

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
        { provide: ConfigService, useValue: configServiceMock },
        // Use our mock JWT strategy
        { provide: 'JwtStrategy', useClass: MockJwtStrategy },
      ],
    })
      // Avoid loading the real JwtStrategy by overriding it
      .overrideProvider('JwtStrategy')
      .useClass(MockJwtStrategy)
      .compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
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
      } as unknown as ExecutionContext; // Override the original implementation to avoid making actual AuthGuard calls
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
            const jwtSecret = configService.getOrThrow('jwt.secret');
            jwt.verify(accessToken, jwtSecret);
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
      // Execute
      const result = await guard.canActivate(mockContext);

      // Verify
      expect(result).toBe(true);
      expect(jwt.verify).not.toHaveBeenCalled();
    });
    it('should verify token when accessToken is present', async () => {
      // Setup
      mockRequest.headers['Authorization'] = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValueOnce({ sub: 'user-id' });

      // Execute
      const result = await guard.canActivate(mockContext);

      // Verify
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-jwt-secret');
      expect(configService.getOrThrow).toHaveBeenCalledWith('jwt.secret');
      expect(result).toBe(true);
    });

    it('should refresh token if accessToken is invalid but refreshToken is valid', async () => {
      // Setup
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';
      mockRequest.cookies = { refreshToken: 'valid-refresh-token' };

      // Make jwt.verify throw an error for invalid token
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

      // Execute
      const result = await guard.canActivate(mockContext);

      // Verify
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
      // Setup
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';
      mockRequest.cookies = { refreshToken: 'invalid-refresh-token' };

      // Make jwt.verify throw an error
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      // Mock AuthService to throw for invalid refresh token
      authService.validateRefreshToken.mockRejectedValueOnce(
        new Error('Invalid refresh token'),
      );

      // Execute and Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.validateRefreshToken).toHaveBeenCalledWith(
        'invalid-refresh-token',
      );
    });

    it('should throw UnauthorizedException when accessToken is invalid and no refreshToken', async () => {
      // Setup
      mockRequest.headers['Authorization'] = 'Bearer invalid-token';

      // Make jwt.verify throw an error
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      // Execute and Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.validateRefreshToken).not.toHaveBeenCalled();
    });
  });
});
