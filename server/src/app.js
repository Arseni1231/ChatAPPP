import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { createAuthMiddleware } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createBootstrapRouter } from './routes/bootstrap.routes.js';
import { createGroupsRouter } from './routes/groups.routes.js';
import { createMessagesRouter } from './routes/messages.routes.js';

export function createApp({ firestore, redis, io, config }) {
  const app = express();
  const auth = createAuthMiddleware(config.jwtSecret);

  app.use(cors({
    origin: config.isProduction ? true : config.clientOrigin,
    credentials: true
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    try {
      const pong = await redis.ping();
      await firestore.collection('_health').doc('ping').set(
        { checkedAt: new Date().toISOString() },
        { merge: true }
      );
      res.json({ ok: pong === 'PONG', redis: true, firebase: true });
    } catch (error) {
      console.error('Health error:', error);
      res.status(503).json({ ok: false, redis: false, firebase: false });
    }
  });

  app.use('/api/auth', createAuthRouter({
    firestore,
    redis,
    io,
    jwtSecret: config.jwtSecret
  }));
  app.use('/api/bootstrap', createBootstrapRouter({ firestore, redis, auth }));
  app.use('/api/groups', createGroupsRouter({ firestore, redis, io, auth }));
  app.use('/api/messages', createMessagesRouter({ firestore, redis, auth }));

  if (config.isProduction) {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(currentDir, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  return app;
}
