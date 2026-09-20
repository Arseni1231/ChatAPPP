import { Router } from 'express';
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  removeGroupMember,
  renameGroup
} from '../services/groups.js';

function sendGroupError(res, error) {
  if (error?.code === 'FORBIDDEN') {
    return res.status(403).json({ error: error.message });
  }

  if (error?.code === 'NOT_FOUND') {
    return res.status(404).json({ error: error.message });
  }

  if (error?.code === 'OWNER_CANNOT_BE_REMOVED') {
    return res.status(400).json({ error: error.message });
  }

  console.error('Group route error:', error);
  return res.status(500).json({ error: 'Ошибка при работе с группой' });
}

function emitToUsers(io, userIds, event, payload) {
  for (const userId of [...new Set((userIds || []).filter(Boolean))]) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function createGroupsRouter({ firestore, redis, io, auth }) {
  const router = Router();

  router.post('/', auth, async (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim().slice(0, 40);
      const memberIds = Array.isArray(req.body?.memberIds)
        ? req.body.memberIds.map(String)
        : [];

      if (name.length < 2) {
        return res.status(400).json({ error: 'Название группы слишком короткое' });
      }

      const group = await createGroup({
        firestore,
        redis,
        name,
        createdBy: req.user.id,
        memberIds
      });

      for (const memberId of group.members) {
        io.in(`user:${memberId}`).socketsJoin(`group:${group.id}`);
      }

      emitToUsers(io, group.members, 'group:new', group);
      res.status(201).json(group);
    } catch (error) {
      sendGroupError(res, error);
    }
  });

  router.patch('/:groupId', auth, async (req, res) => {
    try {
      const name = String(req.body?.name ?? '').trim().slice(0, 40);

      if (name.length < 2) {
        return res.status(400).json({ error: 'Название группы слишком короткое' });
      }

      const group = await renameGroup({
        firestore,
        redis,
        groupId: req.params.groupId,
        ownerId: req.user.id,
        name
      });

      emitToUsers(io, group.members, 'group:updated', group);
      res.json(group);
    } catch (error) {
      sendGroupError(res, error);
    }
  });

  router.post('/:groupId/members', auth, async (req, res) => {
    try {
      const memberId = String(req.body?.userId ?? '');

      if (!memberId) {
        return res.status(400).json({ error: 'Не указан пользователь' });
      }

      const group = await addGroupMember({
        firestore,
        redis,
        groupId: req.params.groupId,
        ownerId: req.user.id,
        memberId
      });

      io.in(`user:${memberId}`).socketsJoin(`group:${group.id}`);
      emitToUsers(io, group.members, 'group:updated', group);
      io.to(`user:${memberId}`).emit('group:new', group);

      res.json(group);
    } catch (error) {
      sendGroupError(res, error);
    }
  });

  router.delete('/:groupId/members/:userId', auth, async (req, res) => {
    try {
      const result = await removeGroupMember({
        firestore,
        redis,
        groupId: req.params.groupId,
        ownerId: req.user.id,
        memberId: req.params.userId
      });

      io.in(`user:${result.removedUserId}`)
        .socketsLeave(`group:${result.group.id}`);

      io.to(`user:${result.removedUserId}`).emit('group:removed', {
        groupId: result.group.id
      });

      emitToUsers(io, result.group.members, 'group:updated', result.group);
      res.json(result.group);
    } catch (error) {
      sendGroupError(res, error);
    }
  });

  router.delete('/:groupId', auth, async (req, res) => {
    try {
      const group = await deleteGroup({
        firestore,
        redis,
        groupId: req.params.groupId,
        ownerId: req.user.id
      });

      for (const memberId of group.members || []) {
        io.in(`user:${memberId}`).socketsLeave(`group:${group.id}`);
      }

      emitToUsers(io, group.members || [], 'group:removed', {
        groupId: group.id
      });

      res.json({ ok: true });
    } catch (error) {
      sendGroupError(res, error);
    }
  });

  return router;
}
