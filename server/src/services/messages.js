const LIMIT = 100;
const TTL = 3600;

function cacheKey(kind, id) {
  return `cache:messages:${kind}:${id}`;
}

function fromDoc(doc) {
  return { id: doc.id, ...doc.data() };
}

async function readCache(redis, key) {
  const rows = await redis.lRange(key, 0, -1);
  if (!rows.length) return null;
  return rows.flatMap((row) => {
    try { return [JSON.parse(row)]; }
    catch { return []; }
  });
}

async function writeCache(redis, key, messages) {
  const tx = redis.multi().del(key);
  for (const message of messages) tx.rPush(key, JSON.stringify(message));
  tx.expire(key, TTL);
  await tx.exec();
}

async function appendCache(redis, key, message) {
  await redis.multi()
    .rPush(key, JSON.stringify(message))
    .lTrim(key, -LIMIT, -1)
    .expire(key, TTL)
    .exec();
}

export async function listGroupMessages({ firestore, redis, groupId }) {
  const key = cacheKey('group', groupId);
  const cached = await readCache(redis, key);
  if (cached) return cached;

  const snap = await firestore.collection('groupMessages').doc(groupId)
    .collection('messages').orderBy('createdAt', 'desc').limit(LIMIT).get();
  const messages = snap.docs.map(fromDoc).reverse();
  if (messages.length) await writeCache(redis, key, messages);
  return messages;
}

export async function listDmMessages({ firestore, redis, conversationId }) {
  const key = cacheKey('dm', conversationId);
  const cached = await readCache(redis, key);
  if (cached) return cached;

  const snap = await firestore.collection('directMessages').doc(conversationId)
    .collection('messages').orderBy('createdAt', 'desc').limit(LIMIT).get();
  const messages = snap.docs.map(fromDoc).reverse();
  if (messages.length) await writeCache(redis, key, messages);
  return messages;
}

export async function saveGroupMessage({ firestore, redis, groupId, message }) {
  await firestore.collection('groupMessages').doc(groupId)
    .collection('messages').doc(message.id).set(message);
  await appendCache(redis, cacheKey('group', groupId), message);
}

export async function saveDmMessage({ firestore, redis, conversationId, message }) {
  await firestore.collection('directMessages').doc(conversationId)
    .collection('messages').doc(message.id).set(message);
  await appendCache(redis, cacheKey('dm', conversationId), message);
}
