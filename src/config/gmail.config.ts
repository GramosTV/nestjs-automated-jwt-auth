import { registerAs } from '@nestjs/config';

export default registerAs('gmail', () => ({
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  accessToken: process.env.GMAIL_ACCESS_TOKEN,
  fromEmail: process.env.GMAIL_FROM_EMAIL,
  fromName: process.env.GMAIL_FROM_NAME || 'Your App Name',
}));
