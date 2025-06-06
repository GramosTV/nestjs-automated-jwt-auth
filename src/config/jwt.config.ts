import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  passwordSecret: process.env.JWT_PASSWORD_SECRET,
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '30d',
  passwordResetExpiry: '20m',
}));
