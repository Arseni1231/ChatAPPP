import { getJson, setJson } from './cache.js';

const CACHE_KEY = 'cache:groups';

function fromDoc(doc) {
  return { id: doc.id, ...doc.data() };
}

export async function ensureGeneralGroup(firestore) {
  const ref = firestore.collection('groups').doc('general');
  const doc = await ref.get();
  if (!doc.exists) {
    await ref.set({
      name: 'Общий чат',
      createdBy: 'system',
      createdAt: new Date().toISOString()
    });
  }
}

export async function listGroups({ firestore, redis }) {
  const cached = await getJson(redis, CACHE_KEY);
  if (cached) return cached;

  await ensureGeneralGroup(firestore);
  const snap = await firestore.collection('groups').orderBy('createdAt').get();
  const groups = snap.docs.map(fromDoc).sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return a.name.localeCompare(b.name);
  });

  await setJson(redis, CACHE_KEY, groups, 300);
  return groups;
}

export async function groupExists(firestore, id) {
  const doc = await firestore.collection('groups').doc(id).get();
  return doc.exists;
}

export async function createGroup({ firestore, redis, name, createdBy }) {
  const ref = firestore.collection('groups').doc();
  const group = {
    id: ref.id,
    name,
    createdBy,
    createdAt: new Date().toISOString()
  };

  await ref.set({ name: group.name, createdBy, createdAt: group.createdAt });
  await redis.del(CACHE_KEY);
  return group;
}
