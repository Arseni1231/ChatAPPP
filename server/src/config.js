import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  isProduction
};
