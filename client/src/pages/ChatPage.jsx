import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/http.js';
import { createChatSocket } from '../socket/createSocket.js';
import { messageBelongsToTarget } from '../utils/chat.js';
import Sidebar from '../components/sidebar/Sidebar.jsx';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import MessageList from '../components/chat/MessageList.jsx';
import MessageComposer from '../components/chat/MessageComposer.jsx';

const DEFAULT_TARGET = { type: 'group', id: 'general', name: 'Общий чат' };

export default function ChatPage({ token, me, onLogout }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const activeTargetRef = useRef(target);

  useEffect(() => {
    activeTargetRef.current = target;
  }, [target]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const data = await apiRequest('/api/bootstrap', { token });
        if (cancelled) return;
        setUsers(data.users);
        setGroups(data.groups);
      } catch (requestError) {
        if (requestError.status === 401) {
          onLogout();
          return;
        }
        if (!cancelled) setError(requestError.message);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, onLogout]);

  useEffect(() => {
    const socket = createChatSocket(token);
    socketRef.current = socket;

    function handlePresence(ids) {
      setOnlineUsers(ids);
    }

    function handleNewGroup(group) {
      setGroups((current) => {
        if (current.some((item) => item.id === group.id)) return current;
        return [...current, group];
      });
    }

    function handleNewUser(user) {
      setUsers((current) => {
        if (current.some((item) => item.id === user.id)) return current;
        return [...current, user].sort((a, b) => a.username.localeCompare(b.username));
      });
    }

    function handleNewMessage(message) {
      const currentTarget = activeTargetRef.current;
      if (!messageBelongsToTarget(message, currentTarget, me.id)) return;

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
    }

    function handleConnectError(socketError) {
      if (socketError?.message === 'unauthorized') {
        onLogout();
        return;
      }
      setError('Не удалось подключиться к realtime-чату');
    }

    socket.on('presence', handlePresence);
    socket.on('group:new', handleNewGroup);
    socket.on('user:new', handleNewUser);
    socket.on('message:new', handleNewMessage);
    socket.on('connect_error', handleConnectError);

    return () => {
      socket.off('presence', handlePresence);
      socket.off('group:new', handleNewGroup);
      socket.off('user:new', handleNewUser);
      socket.off('message:new', handleNewMessage);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, me.id, onLogout]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      setError('');

      try {
        const path = target.type === 'group'
          ? `/api/messages/group/${target.id}`
          : `/api/messages/dm/${target.id}`;

        const data = await apiRequest(path, { token });
        if (!cancelled) setMessages(data);
      } catch (requestError) {
        if (requestError.status === 401) {
          onLogout();
          return;
        }
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    if (target.type === 'group') {
      socketRef.current?.emit('group:join', target.id);
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [target, token, onLogout]);

  function sendMessage(text) {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Соединение с чатом потеряно');
      return;
    }

    if (target.type === 'group') {
      socket.emit('message:group', { groupId: target.id, text });
      return;
    }

    socket.emit('message:dm', { to: target.id, text });
  }

  async function createGroup(name) {
    try {
      const group = await apiRequest('/api/groups', {
        method: 'POST',
        token,
        body: { name }
      });

      setTarget({ type: 'group', id: group.id, name: group.name });
    } catch (requestError) {
      if (requestError.status === 401) {
        onLogout();
        return;
      }
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        me={me}
        users={users}
        groups={groups}
        onlineUsers={onlineUsers}
        target={target}
        onSelectTarget={setTarget}
        onCreateGroup={createGroup}
        onLogout={onLogout}
      />

      <main className="chat-panel">
        <ChatHeader target={target} online={onlineUsers.includes(target.id)} />

        {error && (
          <button className="error-banner" onClick={() => setError('')}>
            {error}
          </button>
        )}

        <MessageList messages={messages} me={me} loading={loadingMessages} />
        <MessageComposer targetName={target.name} onSend={sendMessage} />
      </main>
    </div>
  );
}
