export async function ensureGeneralGroup(redis) {
  const exists = await redis.sIsMember('groups', 'general');
  if (exists) return;

  const group = {
    id: 'general',
    name: 'Общий чат',
    createdBy: 'system',
    createdAt: new Date().toISOString()
  };

  await redis.multi().hSet('group:general', group).sAdd('groups', 'general').exec();
}

export async function listGroups(redis) {
  await ensureGeneralGroup(redis);
  const ids = await redis.sMembers('groups');
  const groups = await Promise.all(ids.map((id) => redis.hGetAll(`group:${id}`)));

  return groups.filter((group) => group?.id).sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function createGroup(redis, name, createdBy) {
  const group = { id: crypto.randomUUID(), name, createdBy, createdAt: new Date().toISOString() };
  await redis.multi().hSet(`group:${group.id}`, group).sAdd('groups', group.id).exec();
  return group;
}

export async function groupExists(redis, id) {
  return redis.sIsMember('groups', id);
}
