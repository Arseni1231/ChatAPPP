import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { createRedisClient, connectRedis } from './db/redis.js';
import { ensureGeneralGroup } from './services/groups.js';
import { configureApp } from './app.js';
import { setupSocket } from './socket/setupSocket.js';

const redis = createRedisClient(config.redisUrl);
await connectRedis(redis);
await ensureGeneralGroup(redis);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.isProduction ? true : config.clientOrigin, credentials: true }
});

configureApp(app, { redis, io, config });
setupSocket(io, { redis, jwtSecret: config.jwtSecret });

server.listen(config.port, '0.0.0.0', () => {
  console.log(`ChatApp listening on ${config.port}`);
});

async function shutdown() {
  console.log('Shutting down...');
  io.close();
  if (redis.isOpen) await redis.quit();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
