import { useEffect, useRef } from 'react';
import { formatMessageTime } from '../../utils/chat.js';

export default function MessageList({ messages, me, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (loading) {
    return <div className="message-area centered">Загрузка сообщений...</div>;
  }

  return (
    <div className="message-area">
      {messages.length === 0 && <div className="empty-chat">Здесь пока нет сообщений</div>}

      {messages.map((message) => {
        const mine = message.sender.id === me.id;
        return (
          <div key={message.id} className={`message-row ${mine ? 'mine' : ''}`}>
            <div className="message-card">
              <div className="message-meta">
                <span>{message.sender.username}</span>
                <span>{formatMessageTime(message.createdAt)}</span>
              </div>
              <div className="message-text">{message.text}</div>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
