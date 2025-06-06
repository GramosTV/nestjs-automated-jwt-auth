import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { registerAs } from '@nestjs/config';

export default registerAs('mailer', () => ({
  transport: process.env.MAILER_TRANSPORT || {
    host: process.env.MAILER_HOST,
    port: 2525,
    secure: false,
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASS,
    },
    tls: {
      rejectUnauthorized: true,
    },
  },
  defaults: {
    from: process.env.MAILER_DEFAULT_FROM,
  },
  template: {
    dir: './src/templates/email',
    adapter: new HandlebarsAdapter(),
    options: {
      strict: true,
    },
  },
}));
