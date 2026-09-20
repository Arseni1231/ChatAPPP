import jwt from 'jsonwebtoken';
import { cleanText, conversationId } from '../utils/chat.js';
import { getUser } from '../services/users.js';
import {
  assertGroupMember,
  isGroupMember,
  listGroups
} from '../services/groups.js';
import { saveDmMessage, saveGroupMessage } from '../services/messages.js';
import { markOnline, markOffline, onlineUsers } from '../services/presence.js';
import { canSendMessage } from '../services/rateLimit.js';

export function setupSocket(io, { firestore, redis, jwtSecret }) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));

      socket.user = jwt.verify(token, jwtSecret);
      const user = await getUser(firestore, socket.user.id);
      if (!user) return next(new Error('unauthorized'));

      socket.profile = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    await markOnline(redis, userId);
    socket.join(`user:${userId}`);

    const groups = await listGroups({ firestore, redis, userId });
    for (const group of groups) {
      socket.join(`group:${group.id}`);
    }

    io.emit('presence', await onlineUsers(redis));

    socket.on('group:join', async (groupId) => {
      if (await isGroupMember(firestore, groupId, userId)) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('message:group', async (payload, ack = () => {}) => {
      try {
        if (!(await canSendMessage(redis, userId))) {
          return ack({ ok: false, error: 'Слишком много сообщений' });
        }

        const groupId = String(payload?.groupId ?? '');
        const text = cleanText(payload?.text).slice(0, 4000);

        if (!text) return ack({ ok: false });

        await assertGroupMember(firestore, groupId, userId);

        const message = {
          id: crypto.randomUUID(),
          type: 'group',
          groupId,
          text,
          sender: { id: userId, username: socket.profile.username },
          createdAt: new Date().toISOString()
        };

        await saveGroupMessage({ firestore, redis, groupId, message });
        io.to(`group:${groupId}`).emit('message:new', message);
        ack({ ok: true });
      } catch (error) {
        ack({
          ok: false,
          error: error?.code === 'FORBIDDEN'
            ? 'У тебя нет доступа к этой группе'
            : 'Не удалось отправить сообщение'
        });
      }
    });

    socket.on('message:dm', async (payload, ack = () => {}) => {
      try {
        if (!(await canSendMessage(redis, userId))) {
          return ack({ ok: false, error: 'Слишком много сообщений' });
        }

        const to = String(payload?.to ?? '');
        const text = cleanText(payload?.text).slice(0, 4000);
        if (!text || !to || !(await getUser(firestore, to))) {
          return ack({ ok: false });
        }

        const dmId = conversationId(userId, to);
        const message = {
          id: crypto.randomUUID(),
          type: 'dm',
          conversationId: dmId,
          to,
          text,
          sender: { id: userId, username: socket.profile.username },
          createdAt: new Date().toISOString()
        };

        await saveDmMessage({ firestore, redis, conversationId: dmId, message });
        io.to(`user:${userId}`).to(`user:${to}`).emit('message:new', message);
        ack({ ok: true });
      } catch (error) {
        console.error('Socket DM error:', error);
        ack({ ok: false });
      }
    });

    socket.on('disconnect', async () => {
      try {
        await markOffline(redis, userId);
        io.emit('presence', await onlineUsers(redis));
      } catch (error) {
        console.error('Presence error:', error);
      }
    });
  });
}
