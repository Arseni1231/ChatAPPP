import { Router } from 'express';
import { listUsers } from '../services/users.js';
import { listGroups } from '../services/groups.js';

export function createBootstrapRouter({ redis, auth }) {
  const router = Router();

  router.get('/', auth, async (_req, res) => {
    try {
      const [users, groups] = await Promise.all([listUsers(redis), listGroups(redis)]);
      res.json({ users, groups });
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Не удалось загрузить чаты' });
    }
  });

  return router;
}
