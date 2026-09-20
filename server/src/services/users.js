import bcrypt from 'bcryptjs';

export function publicUser(user) {
  return { id: user.id, username: user.username };
}

export async function getUser(redis, id) {
  const user = await redis.hGetAll(`user:${id}`);
  return user?.id ? user : null;
}

export async function getUserByUsername(redis, username) {
  const normalized = String(username).trim().toLowerCase();
  const id = await redis.get(`username:${normalized}`);
  if (!id) return null;
  return getUser(redis, id);
}

export async function listUsers(redis) {
  const ids = await redis.sMembers('users');
  const users = await Promise.all(ids.map((id) => getUser(redis, id)));
  return users.filter(Boolean).map(publicUser).sort((a, b) => a.username.localeCompare(b.username));
}

export async function createUser(redis, username, password) {
  const normalized = username.toLowerCase();
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  const reserved = await redis.set(`username:${normalized}`, id, { NX: true });
  if (!reserved) {
    const error = new Error('USERNAME_TAKEN');
    error.code = 'USERNAME_TAKEN';
    throw error;
  }

  const user = { id, username, normalized, passwordHash, createdAt: new Date().toISOString() };

  try {
    await redis.multi().hSet(`user:${id}`, user).sAdd('users', id).exec();
  } catch (error) {
    await redis.del(`username:${normalized}`);
    throw error;
  }

  return user;
}
