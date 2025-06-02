import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri:
    process.env.MONGODB_URI ||
    `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'nestjs_auth'}`,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}));
