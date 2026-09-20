import { Router } from 'express';
import { listUsers } from '../services/users.js';
import { listGroups } from '../services/groups.js';

export function createBootstrapRouter({ firestore, redis, auth }) {
  const router = Router();

  router.get('/', auth, async (req, res) => {
    try {
      const [users, groups] = await Promise.all([
        listUsers({ firestore, redis }),
        listGroups({ firestore, redis, userId: req.user.id })
      ]);

      res.json({ users, groups });
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Не удалось загрузить чаты' });
    }
  });

  return router;
}
