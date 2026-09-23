import { createClient } from 'redis';


//export function createRedisClient(url) {
  //const redis = createClient({ url});
//}

export function createRedisClient(url) {
  const redis = createClient({ url,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 3) { 
          return false;
        }

        return Math.min(
          500 * (retries + 1),
          2000
        );
  }
}

});



//redis.on('error', (error) => {
    //console.error('Redis error:', error?.code || error?.message || error);
  //});

  //return redis;
//}

redis.on('error', (error) => {
  console.warn(
    'Redis error:',
    error.message
  );
})

redis.on('reconnecting', () => {
  console.log(
    'Redis reconnecting...'
  );
});

return redis;
}

export async function connectRedis(redis) {
  
  //if (!redis.isOpen) {
    //await redis.connect();
  //}

  //const pong = await redis.ping();
  //if (pong !== 'PONG') throw new Error('Redis did not respond with PONG');

  //console.log('Redis connected');

  if (redis.isReady) {
    return true;
  }

  try {
    if(!redis.isOpen) {
      await redis.connect();
    }

    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error('Redis ping failed');
    
    
    
    console.log('Redis connected');

    return true;
  } catch (error) {
    console.warn('Redis unavailable:', error.message);

    if(redis.isOpen && !redis.isReady) {
      try {
      await redis.disconnect();
    } catch {}
    
  }
  return false;
}}



