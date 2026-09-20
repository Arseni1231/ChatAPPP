import { createClient } from 'redis';

export function createRedisClient(url) {
  const redis = createClient({ url });

  redis.on('error', (error) => {
    console.error('Redis error:', error?.code || error?.message || error);
  });

  return redis;
}

export async function connectRedis(redis) {
  if (!redis.isOpen) {
    await redis.connect();
  }

  const pong = await redis.ping();
  if (pong !== 'PONG') throw new Error('Redis did not respond with PONG');

  console.log('Redis connected');
}
