import { Router } from 'express';
import { conversationId } from '../utils/chat.js';
import { listDmMessages, listGroupMessages } from '../services/messages.js';

export function createMessagesRouter({ firestore, redis, auth }) {
  const router = Router();

  router.get('/group/:groupId', auth, async (req, res) => {
    try {
      const messages = await listGroupMessages({
        firestore,
        redis,
        groupId: req.params.groupId
      });
      res.json(messages);
    } catch (error) {
      console.error('Group messages error:', error);
      res.status(500).json({ error: 'Не удалось загрузить сообщения' });
    }
  });

  router.get('/dm/:userId', auth, async (req, res) => {
    try {
      const id = conversationId(req.user.id, req.params.userId);
      const messages = await listDmMessages({ firestore, redis, conversationId: id });
      res.json(messages);
    } catch (error) {
      console.error('DM messages error:', error);
      res.status(500).json({ error: 'Не удалось загрузить сообщения' });
    }
  });

  return router;
}
