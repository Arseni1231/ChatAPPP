import { Router } from 'express';
import { conversationId } from '../utils/chat.js';
import { listDmMessages, listGroupMessages } from '../services/messages.js';
import { assertGroupMember } from '../services/groups.js';

export function createMessagesRouter({ firestore, redis, auth }) {
  const router = Router();

  router.get('/group/:groupId', auth, async (req, res) => {
    try {
      await assertGroupMember(firestore, req.params.groupId, req.user.id);

      const messages = await listGroupMessages({
        firestore,
        redis,
        groupId: req.params.groupId
      });

      res.json(messages);
    } catch (error) {
      if (error?.code === 'FORBIDDEN') {
        return res.status(403).json({ error: error.message });
      }

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
