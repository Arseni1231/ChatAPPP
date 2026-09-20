import AuthPage from './pages/AuthPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const auth = useAuth();

  if (!auth.token || !auth.user) {
    return <AuthPage onAuthenticated={auth.setSession} />;
  }

  return <ChatPage token={auth.token} me={auth.user} onLogout={auth.clearSession} />;
}
