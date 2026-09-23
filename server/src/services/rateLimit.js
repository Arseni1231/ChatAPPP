//export async function canSendMessage(redis, userId) {
  //const bucket = Math.floor(Date.now() / 60000);
  //const key = `ratelimit:messages:${userId}:${bucket}`;
  //const count = await redis.incr(key);
  //if (count === 1) await redis.expire(key, 70);
  //return count <= 60;
//}

const MESSAGE_LIMIT = 60;
const MESSAGE_WINDOW_SECONDS = 60;

const LOGIN_LIMIT = 5;
const LOGIN_IP_LIMIT = 25;
const LOGIN_WINDOW_SECONDS = 10 * 60;

function redisAvailable(redis) {
  return Boolean(redis?.isReady); // added(third problem)
}

export async function canSendMessage(
  redis,
  userId
) {
  if (!redisAvailable(redis)) {
    return true;
  }

  const key = `ratelimit:messages:${userId}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(
        key,
        MESSAGE_WINDOW_SECONDS
      );
    }

    return count <= MESSAGE_LIMIT;
  } catch (error) {
    console.error(
      'Message rate limit error:',
      error
    );

    return true;
  }
}

function loginUserKey(username, ip) {
  const normalizedUsername = String(username)
    .trim()
    .toLowerCase();
  
  return `ratelimit:login:user:${normalizedUsername}:${ip}`;
}

function loginIpKey(ip) {
  return `ratelimit:login:ip:${ip}`;
}

async function incrementCounter(redis, key) {
  const count = await redis.incr(key);

  if(count === 1){
    await redis.expire(
      key,
      LOGIN_WINDOW_SECONDS
    );
  }
  return count;
}

export async function isLoginAllowed(redis, username, ip) {
  if (!redisAvailable(redis)) {
    return true; // aded(third problem)
  }
  try {
  const userKey = loginUserKey(username, ip);
  const ipKey = loginIpKey(ip);

  const [userAttempts, ipAttempts] = await Promise.all([
    redis.get(userKey),
    redis.get(ipKey)
  ]);

  return (
    Number(userAttempts || 0) < LOGIN_LIMIT &&
    Number(ipAttempts || 0) < LOGIN_IP_LIMIT
  );

} catch (error) {
  console.error(
    'Login rate limit error:',
    error
  );

  return true;
}}

export async function recordLoginFailure(redis, username, ip) {
  if (!redisAvailable(redis)) {
    return {
      userAttempts: 0,
      ipAttempts: 0,
      remaining: LOGIN_LIMIT, //added(third problem)
      blocked: false
    };
  }
  try{
  const userKey = loginUserKey(username, ip);
  const ipKey = loginIpKey(ip);

  const [userAttempts, ipAttempts] = await Promise.all([
    incrementCounter(redis, userKey),
    incrementCounter(redis, ipKey)
  ]);

  return {
    userAttempts,
    ipAttempts,
    remaining: Math.max(0, LOGIN_LIMIT - userAttempts),
    blocked: userAttempts >= LOGIN_LIMIT || ipAttempts >= LOGIN_IP_LIMIT

  };
}catch (error) {
  console.error(
    'Login rate limit error:',
    error
  );

  return {
    userAttempts: 0,
    ipAttempts: 0,
    remaining: LOGIN_LIMIT,
    blocked: false
  };
}
}

export async function clearLoginFailures(
  redis,
  username,
  ip
) {

  if (!redisAvailable(redis)) {
    return; //added(third problem)
  }

  try {
    const userKey = loginUserKey(
      username,
      ip
    );

    await redis.del(userKey);

  } catch (error) {
    console.error(
      'Clear login failures error:',
      error
    );
  }
}

export const loginLimitConfig = {
  maxAttempts: LOGIN_LIMIT,
  windowSeconds: LOGIN_WINDOW_SECONDS
};
