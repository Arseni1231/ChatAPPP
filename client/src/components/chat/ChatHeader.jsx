export default function ChatHeader({ target, online }) {
  return (
    <header className="chat-header">
      <div>
        <strong>{target.type === 'group' ? '# ' : ''}{target.name}</strong>
        <span>{target.type === 'group' ? 'Групповой чат' : online ? 'В сети' : 'Не в сети'}</span>
      </div>
    </header>
  );
}
