import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../src/users/interfaces/role.enum';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import * as fastifyCookie from '@fastify/cookie';
import { getTestDbConfig } from './test-helpers';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

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

    jwtService = moduleFixture.get<JwtService>(JwtService);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ (GET) should return 401 when not authenticated', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('/ (GET) should return greeting when authenticated', async () => {
    const testToken = jwtService.sign(
      { email: 'test@example.com', sub: 'user-id', role: Role.USER },
      { secret: process.env.JWT_SECRET },
    );

    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('Hello test@example.com');
      });
  });
});
