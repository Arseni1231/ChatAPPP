export async function canSendMessage(redis, userId) {
  const bucket = Math.floor(Date.now() / 60000);
  const key = `ratelimit:messages:${userId}:${bucket}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 70);
  return count <= 60;
}
