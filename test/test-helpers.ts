import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserEntity } from '../src/users/entities/user.entity';
import { RefreshTokenEntity } from '../src/refresh-tokens/entities/refresh-token.entity';
import dbConfig from '../src/config/db.config';
import 'dotenv/config';

export function getTestDbConfig() {
  const testDbName = 'test_db';

  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.JWT_PASSWORD_SECRET = 'test-jwt-password-secret';
  process.env.COOKIE_SECRET = 'test-cookie-secret';

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const username = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';

  process.env.DB_NAME = testDbName;

  return {
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [dbConfig],
      }),
      TypeOrmModule.forRoot({
        type: 'mysql',
        host,
        port: parseInt(port, 10),
        username,
        password,
        database: testDbName,
        entities: [UserEntity, RefreshTokenEntity],
        synchronize: true,
        dropSchema: true,
        autoLoadEntities: true,
      }),
    ],
  };
}
