import { Router } from 'express';
import { conversationId, safeJsonRows } from '../utils/chat.js';

export function createMessagesRouter({ redis, auth }) {
  const router = Router();

  router.get('/group/:groupId', auth, async (req, res) => {
    try {
      const rows = await redis.lRange(`messages:group:${req.params.groupId}`, -100, -1);
      res.json(safeJsonRows(rows));
    } catch (error) {
      console.error('Group messages error:', error);
      res.status(500).json({ error: 'Не удалось загрузить сообщения' });
    }
  });

  router.get('/dm/:userId', auth, async (req, res) => {
    try {
      const id = conversationId(req.user.id, req.params.userId);
      const rows = await redis.lRange(`messages:dm:${id}`, -100, -1);
      res.json(safeJsonRows(rows));
    } catch (error) {
      console.error('DM messages error:', error);
      res.status(500).json({ error: 'Не удалось загрузить сообщения' });
    }
  });

  return router;
}
