import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['dist/**/**.entity{.ts,.js}'],
  bigNumberStrings: false,
  synchronize: process.env.NODE_ENV === 'development',
  logging: false,
}));
