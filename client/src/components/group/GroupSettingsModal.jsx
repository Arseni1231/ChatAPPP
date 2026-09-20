import { useEffect, useMemo, useState } from 'react';

export default function GroupSettingsModal({
  group,
  users,
  me,
  onClose,
  onRename,
  onAddMember,
  onRemoveMember,
  onDelete
}) {
  const [name, setName] = useState(group.name);
  const isOwner = group.ownerId === me.id;

  useEffect(() => {
    setName(group.name);
  }, [group.name]);

  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );

  const currentMembers = (group.members || [])
    .map((id) => userMap.get(id))
    .filter(Boolean);

  const availableUsers = users.filter(
    (user) => !(group.members || []).includes(user.id)
  );

  async function saveName(event) {
    event.preventDefault();
    const cleanName = name.trim();

    if (cleanName.length < 2 || cleanName === group.name) return;
    await onRename(cleanName);
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Удалить группу "${group.name}"?`
    );

    if (confirmed) await onDelete();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="group-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="group-modal-header">
          <div>
            <strong>{group.name}</strong>
            <span>
              {isOwner ? 'Ты создатель группы' : 'Участники группы'}
            </span>
          </div>

          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {isOwner && (
          <form className="rename-group-form" onSubmit={saveName}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
            />

            <button type="submit" className="small-primary-button">
              Переименовать
            </button>
          </form>
        )}

        <div className="modal-section-title">Участники</div>

        <div className="modal-user-list">
          {currentMembers.map((user) => {
            const owner = user.id === group.ownerId;

            return (
              <div key={user.id} className="modal-user-row">
                <div>
                  <strong>{user.username}</strong>
                  {owner && <span>Создатель</span>}
                </div>

                {isOwner && !owner && (
                  <button
                    type="button"
                    className="danger-text-button"
                    onClick={() => onRemoveMember(user.id)}
                  >
                    Удалить
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isOwner && availableUsers.length > 0 && (
          <>
            <div className="modal-section-title">Добавить пользователя</div>

            <div className="modal-user-list">
              {availableUsers.map((user) => (
                <div key={user.id} className="modal-user-row">
                  <strong>{user.username}</strong>

                  <button
                    type="button"
                    className="small-secondary-button"
                    onClick={() => onAddMember(user.id)}
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {isOwner && (
          <div className="group-danger-zone">
            <button
              type="button"
              className="danger-button"
              onClick={handleDelete}
            >
              Удалить группу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
