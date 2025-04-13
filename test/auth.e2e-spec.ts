import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import * as fastifyCookie from '@fastify/cookie';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { ValidationPipe } from '@nestjs/common';
import { getTestDbConfig } from './test-helpers';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let authCookies: string[] = [];
  let userId: string;

  beforeAll(async () => {
    const testConfig = getTestDbConfig();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [...testConfig.imports, AppModule],
    }).compile();

    const adapter = new FastifyAdapter();
    app = moduleFixture.createNestApplication(adapter);

    await app.getHttpAdapter().getInstance().register(fastifyCookie, {
      secret: process.env.COOKIE_SECRET,
      hook: 'onRequest',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should register a new user', async () => {
    const createUserDto: CreateUserDto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await request(app.getHttpServer())
      .post('/users')
      .send(createUserDto)
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.id).toBeDefined();
    expect(response.body.email).toEqual(createUserDto.email);
    expect(response.body.firstName).toEqual(createUserDto.firstName);
    expect(response.body.lastName).toEqual(createUserDto.lastName);

    userId = response.body.id;
  });

  it('should not allow login with incorrect credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      })
      .expect(403);
  });

  it('should login with correct credentials and receive tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();

    const setCookie = response.headers['set-cookie'];
    authCookies = Array.isArray(setCookie)
      ? setCookie
      : [setCookie].filter(Boolean);
    expect(authCookies.length).toBeGreaterThanOrEqual(1);
  });

  it('should refresh token and get new access token', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', authCookies)
      .expect(200);

    expect(response.body.accessToken).toBeDefined();

    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      authCookies = Array.isArray(setCookie)
        ? setCookie
        : [setCookie].filter(Boolean);
    }
    expect(authCookies.length).toBeGreaterThanOrEqual(1);
  });

  it('should initiate password reset request', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/password-reset')
      .send({
        email: 'test@example.com',
      })
      .expect(200);

    expect(response.body.message).toContain('If an account with the email');
    expect(response.body.statusCode).toEqual(200);
  });
});
