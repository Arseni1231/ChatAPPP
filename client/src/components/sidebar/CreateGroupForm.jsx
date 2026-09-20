import { useState } from 'react';

export default function CreateGroupForm({ me, users, onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const candidates = users.filter((user) => user.id !== me.id);

  function toggleUser(userId) {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = name.trim();
    if (cleanName.length < 2) return;

    await onCreate({
      name: cleanName,
      memberIds: selectedIds
    });

    setName('');
    setSelectedIds([]);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="new-group-button"
        onClick={() => setOpen(true)}
      >
        + Создать группу
      </button>
    );
  }

  return (
    <form className="group-create-panel" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Название группы"
        maxLength={40}
        autoFocus
      />

      <div className="member-picker-title">Добавить участников</div>

      <div className="member-picker">
        {candidates.length === 0 && (
          <div className="sidebar-empty">
            Других пользователей пока нет
          </div>
        )}

        {candidates.map((user) => (
          <label key={user.id} className="member-checkbox">
            <input
              type="checkbox"
              checked={selectedIds.includes(user.id)}
              onChange={() => toggleUser(user.id)}
            />
            <span>{user.username}</span>
          </label>
        ))}
      </div>

      <div className="group-create-actions">
        <button type="submit" className="small-primary-button">
          Создать
        </button>

        <button
          type="button"
          className="small-secondary-button"
          onClick={() => {
            setOpen(false);
            setName('');
            setSelectedIds([]);
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
