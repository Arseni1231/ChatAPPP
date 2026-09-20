export async function getJson(redis, key) {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { await redis.del(key); return null; }
}

export async function setJson(redis, key, value, ttlSeconds) {
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
}
