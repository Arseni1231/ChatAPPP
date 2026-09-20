import { useState } from 'react';

export default function MessageComposer({ targetName, onSend }) {
  const [text, setText] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;
    onSend(cleanText);
    setText('');
  }

  return (
    <form className="message-composer" onSubmit={handleSubmit}>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Сообщение: ${targetName}`} maxLength={4000} />
      <button className="send-button">Отправить</button>
    </form>
  );
}
