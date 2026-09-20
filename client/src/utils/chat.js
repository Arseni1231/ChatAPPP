export function dmConversationId(userA, userB) {
  return [userA, userB].sort().join(':');
}

export function messageBelongsToTarget(message, target, meId) {
  if (!message || !target) return false;

  if (target.type === 'group') {
    return message.type === 'group' && message.groupId === target.id;
  }

  return message.type === 'dm' && message.conversationId === dmConversationId(meId, target.id);
}

export function formatMessageTime(value) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
