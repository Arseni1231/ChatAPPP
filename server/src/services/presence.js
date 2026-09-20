const HASH = 'presence:connections';
const SET = 'presence:online';

export async function markOnline(redis, userId) {
  await redis.hIncrBy(HASH, userId, 1);
  await redis.sAdd(SET, userId);
}

export async function markOffline(redis, userId) {
  const count = await redis.hIncrBy(HASH, userId, -1);
  if (count <= 0) {
    await redis.multi().hDel(HASH, userId).sRem(SET, userId).exec();
  }
}

export async function onlineUsers(redis) {
  return redis.sMembers(SET);
}
