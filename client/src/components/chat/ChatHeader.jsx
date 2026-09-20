export default function ChatHeader({
  target,
  online,
  group,
  onOpenGroupSettings
}) {
  const showGroupButton =
    target.type === 'group' &&
    target.id !== 'general' &&
    group;

  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <strong>
          {target.type === 'group' ? '# ' : ''}
          {target.name}
        </strong>

        <span>
          {target.type === 'group'
            ? target.id === 'general'
              ? 'Общий публичный чат'
              : `${group?.members?.length || 0} участников`
            : online
              ? 'В сети'
              : 'Не в сети'}
        </span>
      </div>

      {showGroupButton && (
        <button
          type="button"
          className="header-action-button"
          onClick={onOpenGroupSettings}
        >
          Участники
        </button>
      )}
    </header>
  );
}
