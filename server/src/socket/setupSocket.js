import jwt from 'jsonwebtoken';
import { cleanText, conversationId } from '../utils/chat.js';
import { getUser } from '../services/users.js';
import { groupExists } from '../services/groups.js';

export function setupSocket(io, { redis, jwtSecret }) {
  const online = new Map();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      socket.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    online.set(userId, (online.get(userId) || 0) + 1);
    socket.join(`user:${userId}`);

    const groupIds = await redis.sMembers('groups');
    for (const groupId of groupIds) socket.join(`group:${groupId}`);

    io.emit('presence', [...online.keys()]);

    socket.on('group:join', async (groupId) => {
      if (await groupExists(redis, groupId)) socket.join(`group:${groupId}`);
    });

    socket.on('message:group', async (payload, ack = () => {}) => {
      try {
        const groupId = String(payload?.groupId ?? '');
        const text = cleanText(payload?.text).slice(0, 4000);
        if (!text || !(await groupExists(redis, groupId))) return ack({ ok: false });

        const message = {
          id: crypto.randomUUID(),
          type: 'group',
          groupId,
          text,
          sender: { id: userId, username: socket.user.username },
          createdAt: new Date().toISOString()
        };

        const key = `messages:group:${groupId}`;
        await redis.multi().rPush(key, JSON.stringify(message)).lTrim(key, -1000, -1).exec();
        io.to(`group:${groupId}`).emit('message:new', message);
        ack({ ok: true });
      } catch (error) {
        console.error('Socket group message error:', error);
        ack({ ok: false });
      }
    });

    socket.on('message:dm', async (payload, ack = () => {}) => {
      try {
        const to = String(payload?.to ?? '');
        const text = cleanText(payload?.text).slice(0, 4000);
        if (!text || !to || !(await getUser(redis, to))) return ack({ ok: false });

        const dmId = conversationId(userId, to);
        const message = {
          id: crypto.randomUUID(),
          type: 'dm',
          conversationId: dmId,
          to,
          text,
          sender: { id: userId, username: socket.user.username },
          createdAt: new Date().toISOString()
        };

        const key = `messages:dm:${dmId}`;
        await redis.multi().rPush(key, JSON.stringify(message)).lTrim(key, -1000, -1).exec();
        io.to(`user:${userId}`).to(`user:${to}`).emit('message:new', message);
        ack({ ok: true });
      } catch (error) {
        console.error('Socket DM error:', error);
        ack({ ok: false });
      }
    });

    socket.on('disconnect', () => {
      const nextCount = (online.get(userId) || 1) - 1;
      if (nextCount <= 0) online.delete(userId);
      else online.set(userId, nextCount);
      io.emit('presence', [...online.keys()]);
    });
  });
}
