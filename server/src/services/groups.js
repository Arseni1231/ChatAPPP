import { getJson, setJson, safeDel } from './cache.js';

function fromDoc(doc) {
  return { id: doc.id, ...doc.data() };
}

function cacheKey(userId) {
  return `cache:groups:${userId}`;
}

function uniqueIds(ids = []) {
  return [...new Set(ids.filter(Boolean).map(String))];
}

async function invalidateGroupCaches(redis, userIds = []) {
  const ids = uniqueIds(userIds);
  if (!ids.length) {
    
    return;

  }
  const keys = ids.map((id) => cacheKey(id));

  await safeDel(redis, ...keys);
  
}

function forbidden(message = 'Нет доступа к группе') {
  const error = new Error(message);
  error.code = 'FORBIDDEN';
  return error;
}

function notFound() {
  const error = new Error('Группа не найдена');
  error.code = 'NOT_FOUND';
  return error;
}

export async function ensureGeneralGroup(firestore) {
  const ref = firestore.collection('groups').doc('general');
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      name: 'Общий чат',
      ownerId: 'system',
      members: [],
      isPublic: true,
      createdAt: new Date().toISOString()
    });
  }
}

export async function getGroup(firestore, id) {
  const doc = await firestore.collection('groups').doc(id).get();
  return doc.exists ? fromDoc(doc) : null;
}

export async function listGroups({ firestore, redis, userId }) {
  const cached = await getJson(redis, cacheKey(userId));
  if (cached) return cached;

  await ensureGeneralGroup(firestore);

  const [generalDoc, privateSnap] = await Promise.all([
    firestore.collection('groups').doc('general').get(),
    firestore.collection('groups').where('members', 'array-contains', userId).get()
  ]);

  const groups = [];

  if (generalDoc.exists) {
    groups.push(fromDoc(generalDoc));
  }

  for (const doc of privateSnap.docs) {
    if (doc.id !== 'general') groups.push(fromDoc(doc));
  }

  groups.sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  await setJson(redis, cacheKey(userId), groups, 300);
  return groups;
}

export async function isGroupMember(firestore, groupId, userId) {
  if (groupId === 'general') return true;

  const group = await getGroup(firestore, groupId);
  if (!group) return false;

  return Array.isArray(group.members) && group.members.includes(userId);
}

export async function assertGroupMember(firestore, groupId, userId) {
  if (!(await isGroupMember(firestore, groupId, userId))) {
    throw forbidden();
  }
}

export async function assertGroupOwner(firestore, groupId, userId) {
  if (groupId === 'general') {
    throw forbidden('Общий чат нельзя изменять');
  }

  const group = await getGroup(firestore, groupId);
  if (!group) throw notFound();

  if (group.ownerId !== userId) {
    throw forbidden('Только создатель группы может это делать');
  }

  return group;
}

export async function createGroup({ firestore, redis, name, createdBy, memberIds = [] }) {
  const ref = firestore.collection('groups').doc();
  const members = uniqueIds([createdBy, ...memberIds]);

  const group = {
    id: ref.id,
    name,
    ownerId: createdBy,
    members,
    isPublic: false,
    createdAt: new Date().toISOString()
  };

  await ref.set({
    name: group.name,
    ownerId: group.ownerId,
    members: group.members,
    isPublic: false,
    createdAt: group.createdAt
  });

  await invalidateGroupCaches(redis, members);
  return group;
}

export async function renameGroup({ firestore, redis, groupId, ownerId, name }) {
  const group = await assertGroupOwner(firestore, groupId, ownerId);

  await firestore.collection('groups').doc(groupId).update({
    name,
    updatedAt: new Date().toISOString()
  });

  const updated = { ...group, name };
  await invalidateGroupCaches(redis, group.members || []);
  return updated;
}

export async function addGroupMember({ firestore, redis, groupId, ownerId, memberId }) {
  const group = await assertGroupOwner(firestore, groupId, ownerId);
  const members = uniqueIds([...(group.members || []), memberId, group.ownerId]);

  await firestore.collection('groups').doc(groupId).update({
    members,
    updatedAt: new Date().toISOString()
  });

  await invalidateGroupCaches(redis, members);
  return { ...group, members };
}

export async function removeGroupMember({ firestore, redis, groupId, ownerId, memberId }) {
  const group = await assertGroupOwner(firestore, groupId, ownerId);

  if (memberId === group.ownerId) {
    const error = new Error('Владельца группы нельзя удалить');
    error.code = 'OWNER_CANNOT_BE_REMOVED';
    throw error;
  }

  const oldMembers = group.members || [];
  const members = oldMembers.filter((id) => id !== memberId);

  await firestore.collection('groups').doc(groupId).update({
    members,
    updatedAt: new Date().toISOString()
  });

  await invalidateGroupCaches(redis, [...oldMembers, memberId]);

  return {
    group: { ...group, members },
    removedUserId: memberId
  };
}

async function deleteGroupMessages(
  firestore,
  groupId
) {
  const messagesRef = firestore
    .collection('groupMessages')
    .doc(groupId)
    .collection('messages');

  while (true) {
    const snapshot = await messagesRef
      .limit(400)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = firestore.batch();

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  }

  await firestore
    .collection('groupMessages')
    .doc(groupId)
    .delete();
}

export async function deleteGroup({ firestore, redis, groupId, ownerId }) {
  const group = await assertGroupOwner(firestore, groupId, ownerId);
  await deleteGroupMessages(firestore, groupId); // added (fifth problem)
  await firestore.collection('groups').doc(groupId).delete();
  await invalidateGroupCaches(redis, group.members || []);

  await safeDel(redis, `cache:messages:group:${groupId}`); // added (fifth problem)

  return group;
}
