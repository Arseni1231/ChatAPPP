import http from 'http';
import { Server } from 'socket.io';

import { config } from './config.js';
import { createRedisClient, connectRedis } from './db/redis.js';
import { createFirestore } from './db/firebase.js';
import { ensureGeneralGroup } from './services/groups.js';
import { createApp } from './app.js';
import { setupSocket } from './socket/setupSocket.js';

const redis = createRedisClient(config.redisUrl);
await connectRedis(redis);

const firestore = createFirestore(config.firebase);
await ensureGeneralGroup(firestore);

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: config.isProduction ? true : config.clientOrigin,
    credentials: true
  }
});

const app = createApp({ firestore, redis, io, config });
server.on('request', app);

setupSocket(io, {
  firestore,
  redis,
  jwtSecret: config.jwtSecret
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`ChatApp listening on ${config.port}`);
});

async function shutdown() {
  try {
    io.close();
    if (redis.isOpen) await redis.quit();
  } finally {
    server.close(() => process.exit(0));
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
