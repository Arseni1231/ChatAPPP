import CreateGroupForm from './CreateGroupForm.jsx';

export default function Sidebar({
  me,
  users,
  groups,
  onlineUsers,
  target,
  onSelectTarget,
  onCreateGroup,
  onLogout
}) {
  const otherUsers = users.filter((user) => user.id !== me.id);

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <div>
          <strong>ChatApp</strong>
          <span>@{me.username}</span>
        </div>
        <button className="small-button" onClick={onLogout}>Выйти</button>
      </header>

      <div className="sidebar-content">
        <section className="sidebar-section">
          <div className="section-title">Группы</div>

          <div className="chat-list">
            {groups.map((group) => {
              const active = target.type === 'group' && target.id === group.id;

              return (
                <button
                  key={group.id}
                  className={`chat-list-item ${active ? 'active' : ''}`}
                  onClick={() => onSelectTarget({
                    type: 'group',
                    id: group.id,
                    name: group.name
                  })}
                >
                  <span className="group-icon">#</span>
                  <span>{group.name}</span>
                </button>
              );
            })}
          </div>

          <CreateGroupForm
            me={me}
            users={users}
            onCreate={onCreateGroup}
          />
        </section>

        <section className="sidebar-section">
          <div className="section-title">Личные сообщения</div>

          <div className="chat-list">
            {otherUsers.length === 0 && (
              <div className="sidebar-empty">
                Других пользователей пока нет
              </div>
            )}

            {otherUsers.map((user) => {
              const active = target.type === 'dm' && target.id === user.id;
              const online = onlineUsers.includes(user.id);

              return (
                <button
                  key={user.id}
                  className={`chat-list-item ${active ? 'active' : ''}`}
                  onClick={() => onSelectTarget({
                    type: 'dm',
                    id: user.id,
                    name: user.username
                  })}
                >
                  <span className={`presence-dot ${online ? 'online' : ''}`} />
                  <span>{user.username}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
