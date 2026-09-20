export function cleanText(value) {
  return String(value ?? '').trim();
}

export function conversationId(userA, userB) {
  return [userA, userB].sort().join(':');
}

export function safeJsonRows(rows) {
  return rows.flatMap((row) => {
    try { return [JSON.parse(row)]; }
    catch { return []; }
  });
}
