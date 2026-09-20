import { io } from 'socket.io-client';

export function createChatSocket(token) {
  return io({
    auth: { token },
    transports: ['websocket', 'polling']
  });
}
