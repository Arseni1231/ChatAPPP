# ChatApp — Redis + Firebase + Render

React + Node.js + Socket.IO. Код разделён по компонентам, маршрутам и сервисам.

## Разделение обязанностей баз

### Firebase Cloud Firestore — постоянные данные

Firestore является источником истины и хранит:

- аккаунты пользователей и bcrypt-хеши паролей;
- индекс логинов;
- группы;
- историю групповых сообщений;
- историю личных сообщений.

Если Redis очистить или перезапустить, эти данные не потеряются.

### Redis — быстрые и временные данные

Redis хранит:

- online/offline presence;
- число WebSocket-соединений пользователя;
- кэш списка пользователей;
- кэш групп;
- кэш последних сообщений;
- rate limit отправки сообщений.

Redis ускоряет приложение, но не является основной долговременной БД.

## Облако

Приложение подготовлено для Render. Один Render Web Service собирает React и запускает Node.js/Socket.IO. Redis остаётся в Redis Cloud, Firebase — в Firebase Cloud Firestore.

Схема:

Browser -> Render (React + Node + Socket.IO)
                       |             |
                       v             v
                  Redis Cloud    Firebase Firestore
                  cache/presence permanent data

## 1. Установка

Node.js 20.18 подходит.

```powershell
npm install
npm --prefix server install
npm --prefix client install
```

## 2. Firebase

Создай Firebase project и Cloud Firestore database.

В Firebase Console:

Project settings -> Service accounts -> Generate new private key

Скачанный JSON НЕ клади в GitHub. Из него нужны только:

- `project_id`
- `client_email`
- `private_key`

## 3. server/.env

Создай `server/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=long-random-secret
REDIS_URL=redis://default:PASSWORD@HOST:PORT
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 4. Локальный запуск

```powershell
npm run dev
```

Frontend: http://localhost:5173
Health: http://localhost:3001/api/health

У health endpoint при нормальной работе должно быть:

```json
{"ok":true,"redis":true,"firebase":true}
```

## 5. Render

Проект содержит `render.yaml`.

Если создаёшь Web Service вручную:

Build Command:

```text
npm install && npm run build
```

Start Command:

```text
npm start
```

Environment Variables:

- `NODE_ENV=production`
- `JWT_SECRET`
- `REDIS_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Не загружай `.env` и service-account JSON в GitHub.

## Важно про старую v2

v2 хранила постоянные данные в Redis. v3 переносит постоянные данные в Firestore. Старые тестовые пользователи/сообщения из Redis автоматически не мигрируют.
