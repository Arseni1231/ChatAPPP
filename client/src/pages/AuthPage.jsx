import { useState } from 'react';
import { apiRequest } from '../api/http.js';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const session = await apiRequest(`/api/auth/${mode}`, {
        method: 'POST',
        body: { username, password }
      });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) => current === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">ChatApp</div>
        <h1>{mode === 'login' ? 'Вход' : 'Создать аккаунт'}</h1>

        <label>
          Логин
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Ваш логин" required />
        </label>

        <label>
          Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Ваш пароль" required />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="primary-button" disabled={submitting}>
          {submitting ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        <button type="button" className="link-button" onClick={switchMode}>
          {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </main>
  );
}
