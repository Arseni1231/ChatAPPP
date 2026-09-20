import { useState } from 'react';

export default function CreateGroupForm({ onCreate }) {
  const [name, setName] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    await onCreate(cleanName);
    setName('');
  }

  return (
    <form className="create-group-form" onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая группа" maxLength={40} />
      <button aria-label="Создать группу">+</button>
    </form>
  );
}
