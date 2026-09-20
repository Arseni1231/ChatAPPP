# ChatApp v2

Переписанная модульная версия ChatApp.

Стек: React 18, Vite 6.1.0, Node.js, Express, Socket.IO, Redis, JWT.

## Локальный запуск

```powershell
npm install
npm --prefix server install
npm --prefix client install
```

Создай `server/.env` по примеру `server/.env.example`, затем:

```powershell
npm run dev
```

Frontend: http://localhost:5173
Backend health: http://localhost:3001/api/health
