const HASH = 'presence:connections';
const SET = 'presence:online';

function redisAvailable(redis) {
  return Boolean(redis?.isReady);
}

export async function markOnline(redis, userId) {
  //await redis.hIncrBy(HASH, userId, 1);
  //await redis.sAdd(SET, userId);
  if (!redisAvailable(redis)) {
    return false;
  }

  try {
    await redis
      .multi()
      .hIncrBy(HASH, userId, 1)
      .sAdd(SET, userId)
      .exec();

    return true;
  } catch (error) {
    console.warn(
      'Presence markOnline failed:',
      error.message
    );

    return false;
  }
}



export async function markOffline(redis, userId) {
  if (!redisAvailable(redis)) {
    return false;
  }

  //const count = await redis.hIncrBy(HASH, userId, -1);
  //if (count <= 0) {
    //await redis.multi().hDel(HASH, userId).sRem(SET, userId).exec();
  //}

  try {
    const count = await redis.hIncrBy(HASH, userId, -1);
    if (count <= 0) {
      await redis.multi().hDel(HASH, userId).sRem(SET, userId).exec();
    }

    return true;
  } catch (error) {
    console.warn(
      'Presence markOffline failed:',
      error.message
    );

    return false;
  }
}

  

export async function onlineUsers(redis) {
  //return redis.sMembers(SET);
  if (!redisAvailable(redis)) {
    return [];
  }

  try {
    return await redis.sMembers(SET);
  } catch (error) {
    console.warn(
      'Presence onlineUsers failed:',
      error.message
    );

    return [];
  }
}
