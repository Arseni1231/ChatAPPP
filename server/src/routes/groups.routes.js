import { Router } from 'express';
import { createGroup } from '../services/groups.js';

export function createGroupsRouter({ firestore, redis, io, auth }) {
  const router = Router();

  router.post('/', auth, async (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim().slice(0, 40);
      if (name.length < 2) {
        return res.status(400).json({ error: 'Название группы слишком короткое' });
      }

      const group = await createGroup({
        firestore,
        redis,
        name,
        createdBy: req.user.id
      });

      io.emit('group:new', group);
      res.status(201).json(group);
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ error: 'Не удалось создать группу' });
    }
  });

  return router;
}
