import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/http.js';
import { createChatSocket } from '../socket/createSocket.js';
import { messageBelongsToTarget } from '../utils/chat.js';
import Sidebar from '../components/sidebar/Sidebar.jsx';
import ChatHeader from '../components/chat/ChatHeader.jsx';
import MessageList from '../components/chat/MessageList.jsx';
import MessageComposer from '../components/chat/MessageComposer.jsx';
import GroupSettingsModal from '../components/group/GroupSettingsModal.jsx';

const DEFAULT_TARGET = {
  type: 'group',
  id: 'general',
  name: 'Общий чат'
};

export default function ChatPage({ token, me, onLogout }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState('');
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);

  const socketRef = useRef(null);
  const activeTargetRef = useRef(target);

  const currentGroup = useMemo(
    () =>
      target.type === 'group'
        ? groups.find((group) => group.id === target.id) || null
        : null,
    [groups, target]
  );

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
    console.log('SOCKET EFFECT START', me.id);
    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
  console.log('CLIENT SOCKET CONNECTED:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log(
    'CLIENT SOCKET DISCONNECTED:',
    socket.id,
    reason
  );
});

socket.io.on('reconnect_attempt', (attempt) => {
  console.log(
    'CLIENT RECONNECT ATTEMPT:',
    attempt
  );
});

    const presenceHeartbeatTimer = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence:heartbeat');
      }
    }, 25000);

    function handlePresence(ids) {
      setOnlineUsers(ids);
    }

    function handleNewGroup(group) {
      socket.emit('group:join', group.id);

      setGroups((current) => {
        const exists = current.some((item) => item.id === group.id);

        return exists
          ? current.map((item) => (item.id === group.id ? group : item))
          : [...current, group];
      });
    }

    function handleUpdatedGroup(group) {
      setGroups((current) =>
        current.map((item) => (item.id === group.id ? group : item))
      );

      setTarget((current) =>
        current.type === 'group' && current.id === group.id
          ? { ...current, name: group.name }
          : current
      );
    }

    function handleRemovedGroup({ groupId }) {
      setGroups((current) =>
        current.filter((group) => group.id !== groupId)
      );

      if (
        activeTargetRef.current.type === 'group' &&
        activeTargetRef.current.id === groupId
      ) {
        setGroupSettingsOpen(false);
        setTarget(DEFAULT_TARGET);
      }
    }

    function handleNewUser(user) {
      setUsers((current) => {
        if (current.some((item) => item.id === user.id)) return current;

        return [...current, user].sort((a, b) =>
          a.username.localeCompare(b.username)
        );
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
    socket.on('group:updated', handleUpdatedGroup);
    socket.on('group:removed', handleRemovedGroup);
    socket.on('user:new', handleNewUser);
    socket.on('message:new', handleNewMessage);
    socket.on('connect_error', handleConnectError);

    return () => {
      clearInterval(presenceHeartbeatTimer);

      socket.off('presence', handlePresence);
      socket.off('group:new', handleNewGroup);
      socket.off('group:updated', handleUpdatedGroup);
      socket.off('group:removed', handleRemovedGroup);
      socket.off('user:new', handleNewUser);
      socket.off('message:new', handleNewMessage);
      socket.off('connect_error', handleConnectError);
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, me.id, onLogout]);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      setError('');

      try {
        const path =
          target.type === 'group'
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

    const ack = (result) => {
      if (!result?.ok) {
        setError(result?.error || 'Не удалось отправить сообщение');
      }
    };

    if (target.type === 'group') {
      socket.emit('message:group', { groupId: target.id, text }, ack);
      return;
    }

    socket.emit('message:dm', { to: target.id, text }, ack);
  }

  async function createGroup({ name, memberIds }) {
    try {
      const group = await apiRequest('/api/groups', {
        method: 'POST',
        token,
        body: { name, memberIds }
      });

      setGroups((current) => {
        if (current.some((item) => item.id === group.id)) return current;
        return [...current, group];
      });

      setTarget({ type: 'group', id: group.id, name: group.name });
    } catch (requestError) {
      if (requestError.status === 401) {
        onLogout();
        return;
      }

      setError(requestError.message);
      throw requestError;
    }
  }

  async function renameCurrentGroup(name) {
    try {
      const group = await apiRequest(`/api/groups/${currentGroup.id}`, {
        method: 'PATCH',
        token,
        body: { name }
      });

      setGroups((current) =>
        current.map((item) => (item.id === group.id ? group : item))
      );

      setTarget((current) => ({ ...current, name: group.name }));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addMember(userId) {
    try {
      const group = await apiRequest(
        `/api/groups/${currentGroup.id}/members`,
        {
          method: 'POST',
          token,
          body: { userId }
        }
      );

      setGroups((current) =>
        current.map((item) => (item.id === group.id ? group : item))
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeMember(userId) {
    try {
      const group = await apiRequest(
        `/api/groups/${currentGroup.id}/members/${userId}`,
        {
          method: 'DELETE',
          token
        }
      );

      setGroups((current) =>
        current.map((item) => (item.id === group.id ? group : item))
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteCurrentGroup() {
    try {
      await apiRequest(`/api/groups/${currentGroup.id}`, {
        method: 'DELETE',
        token
      });

      setGroups((current) =>
        current.filter((item) => item.id !== currentGroup.id)
      );

      setGroupSettingsOpen(false);
      setTarget(DEFAULT_TARGET);
    } catch (requestError) {
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
        onSelectTarget={(nextTarget) => {
          setGroupSettingsOpen(false);
          setTarget(nextTarget);
        }}
        onCreateGroup={createGroup}
        onLogout={onLogout}
      />

      <main className="chat-panel">
        <ChatHeader
          target={target}
          online={onlineUsers.includes(target.id)}
          group={currentGroup}
          onOpenGroupSettings={() => setGroupSettingsOpen(true)}
        />

        {error && (
          <button className="error-banner" onClick={() => setError('')}>
            {error}
          </button>
        )}

        <MessageList messages={messages} me={me} loading={loadingMessages} />
        <MessageComposer targetName={target.name} onSend={sendMessage} />
      </main>

      {groupSettingsOpen && currentGroup && (
        <GroupSettingsModal
          group={currentGroup}
          users={users}
          me={me}
          onClose={() => setGroupSettingsOpen(false)}
          onRename={renameCurrentGroup}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onDelete={deleteCurrentGroup}
        />
      )}
    </div>
  );
}
