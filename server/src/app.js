import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAuthMiddleware } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createBootstrapRouter } from './routes/bootstrap.routes.js';
import { createGroupsRouter } from './routes/groups.routes.js';
import { createMessagesRouter } from './routes/messages.routes.js';

export function configureApp(app, { redis, io, config }) {
  const auth = createAuthMiddleware(config.jwtSecret);

  app.use(cors({ origin: config.isProduction ? true : config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (_req, res) => {
    try { res.json({ ok: (await redis.ping()) === 'PONG' }); }
    catch { res.status(503).json({ ok: false }); }
  });

  app.use('/api/auth', createAuthRouter({ redis, io, jwtSecret: config.jwtSecret }));
  app.use('/api/bootstrap', createBootstrapRouter({ redis, auth }));
  app.use('/api/groups', createGroupsRouter({ redis, io, auth }));
  app.use('/api/messages', createMessagesRouter({ redis, auth }));

  if (config.isProduction) {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(currentDir, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }
}
