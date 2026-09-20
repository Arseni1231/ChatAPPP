export function cleanText(value) {
  return String(value ?? '').trim();
}

export function conversationId(userA, userB) {
  return [userA, userB].sort().join(':');
}
