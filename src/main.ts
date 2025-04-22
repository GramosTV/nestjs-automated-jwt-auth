import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySecureSession from '@fastify/secure-session';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { randomBytes } from 'crypto';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
  );

  const secureSecret =
    process.env.COOKIE_SECRET && process.env.COOKIE_SECRET.length >= 32
      ? process.env.COOKIE_SECRET
      : randomBytes(32).toString('hex');

  await app.register(fastifyCookie);

  await app.register(fastifySecureSession, {
    key: Buffer.from(secureSecret, 'hex'),
    cookieName: 'session',
    cookie: {
      path: '/',
      httpOnly: true,
      secure: true,
    },
  });

  app.use((req, res, next) => {
    if (!res.setHeader) {
      res.setHeader = function (name, value) {
        this.raw.setHeader(name, value);
        return this;
      };
    }

    if (!res.end) {
      res.end = function (data) {
        this.raw.end(data);
        return this;
      };
    }

    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
