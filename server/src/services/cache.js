//export async function getJson(redis, key) {
  //const raw = await redis.get(key);
  //if (!raw) return null;
  //try { return JSON.parse(raw); }
  //catch { await redis.del(key); return null; }
//}

//export async function setJson(redis, key, value, ttlSeconds) {
  //await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
//}

export function redisAvailable(redis) {
  return Boolean(redis?.isReady);
}

export async function getJson(redis, key) {
  if (!redisAvailable(redis)){ return null;
  }

  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch(error) {
    console.warn('Redis cache read failed:', error.message);

    return null;
  }
}

export async function setJson(redis, key, value, ttlSeconds) {
  if (!redisAvailable(redis)) {
     return false; 
  }

  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch(error) {
    console.warn('Redis cache write failed:', error.message);
    return false;
  }
}

export async function safeDel(redis, ...keys) {
  if (!redisAvailable(redis) || keys.length === 0) {
    return false;
  }

  try {
    await redis.del(keys);
    return true;
  } catch(error) {
    console.warn('Redis cache delete failed:', error.message);
    return false;
  }
}
