const INDEX = 'presence:index';
const PREFIX = 'presence:user:';

const TTL_SECONDS = 70;

function redisAvailable(redis) {
  return Boolean(redis?.isReady);
}

function presenceKey(userId) {
  return `${PREFIX}${userId}`; // added (fourth problem)
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
      //.hIncrBy(HASH, userId, 1) 
      //.sAdd(SET, userId)
      .sAdd(INDEX, userId)
      .set(presenceKey(userId), 'online', { EX: TTL_SECONDS })
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

export async function heartbeatPresence(redis, userId) {////
  if (!redisAvailable(redis)) {////
    return false;////
  }////

  try {////
    await redis////
      .multi()////
      .sAdd(INDEX, userId) ////
      .set(presenceKey(userId), 'online', { EX: TTL_SECONDS }) //// added (fourth problem)
      .exec();////
      console.log(`HEARTBEAT: ${userId}`);

    return true;////
  } catch (error) {////
    console.warn(////
      'Presence heartbeat failed:',////
      error.message////
    );////

    return false;////
  }////
}////


export async function markOffline(redis, userId) {
  if (!redisAvailable(redis)) {
    return false;
  }

  //const count = await redis.hIncrBy(HASH, userId, -1);
  //if (count <= 0) {
    //await redis.multi().hDel(HASH, userId).sRem(SET, userId).exec();
  //}

  try {
    //const count = await redis.hIncrBy(HASH, userId, -1);
    //if (count <= 0) {
      //await redis.multi().hDel(HASH, userId).sRem(SET, userId).exec();
    //}

    await redis.del(presenceKey(userId)); 
    await redis.sRem(INDEX, userId);

    console.log(`Presence offline: ${userId}`);

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
    //return await redis.sMembers(SET);
  //} catch (error) {
    //console.warn(
      //'Presence onlineUsers failed:',
     // error.message
    //);

    //return [];
  //}

  const ids = await redis.sMembers(INDEX);
  if (!ids.length) {
    return [];
  }

  const keys = ids.map((userId) => presenceKey(userId));
  const values = await redis.mGet(keys);

  const online = [];
  const stale = [];

  ids.forEach((userId, index) => {
    if (values[index] === 'online') {
      online.push(userId);
    } else {
      stale.push(userId);
    }
  });

  if (stale.length) {
    await redis.sRem(INDEX, stale).catch(() => {});
  }

  return online;
} catch (error) {
    console.warn(
      'Presence onlineUsers failed:',
      error.message
    );

    return [];
  }
}

export const presenceConfig = {
  ttlSeconds: TTL_SECONDS,
  heartbeatSeconds: 25
};


