import bcrypt from 'bcryptjs';
import { getJson, setJson } from './cache.js';

const CACHE_KEY = 'cache:users';

export function publicUser(user) {
  return { id: user.id, username: user.username };
}

export async function getUser(firestore, id) {
  const doc = await firestore.collection('users').doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getUserByUsername(firestore, username) {
  const normalized = String(username).trim().toLowerCase();
  const nameDoc = await firestore.collection('usernames').doc(normalized).get();
  if (!nameDoc.exists) return null;
  return getUser(firestore, nameDoc.data().uid);
}

export async function listUsers({ firestore, redis }) {
  const cached = await getJson(redis, CACHE_KEY);
  if (cached) return cached;

  const snap = await firestore.collection('users').orderBy('usernameLower').get();
  const users = snap.docs.map((doc) => publicUser({ id: doc.id, ...doc.data() }));
  await setJson(redis, CACHE_KEY, users, 60);
  return users;
}

export async function createUser({ firestore, redis, username, password }) {
  const normalized = username.toLowerCase();
  const userRef = firestore.collection('users').doc();
  const usernameRef = firestore.collection('usernames').doc(normalized);
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  await firestore.runTransaction(async (tx) => {
    const existing = await tx.get(usernameRef);
    if (existing.exists) {
      const error = new Error('USERNAME_TAKEN');
      error.code = 'USERNAME_TAKEN';
      throw error;
    }

    tx.set(usernameRef, { uid: userRef.id, createdAt: now });
    tx.set(userRef, {
      username,
      usernameLower: normalized,
      passwordHash,
      createdAt: now
    });
  });

  await redis.del(CACHE_KEY);
  return getUser(firestore, userRef.id);
}
