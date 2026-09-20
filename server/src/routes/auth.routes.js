import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUserByUsername, publicUser } from '../services/users.js';

function signToken(user, jwtSecret) {
  return jwt.sign({ id: user.id, username: user.username }, jwtSecret, { expiresIn: '7d' });
}

export function createAuthRouter({ redis, io, jwtSecret }) {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const username = String(req.body?.username ?? '').trim();
      const password = String(req.body?.password ?? '');

      if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)) {
        return res.status(400).json({ error: 'Логин: 3–24 символа, буквы, цифры, _ или -' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
      }

      const user = await createUser(redis, username, password);
      const safeUser = publicUser(user);
      io.emit('user:new', safeUser);

      res.status(201).json({ token: signToken(safeUser, jwtSecret), user: safeUser });
    } catch (error) {
      if (error?.code === 'USERNAME_TAKEN') {
        return res.status(409).json({ error: 'Такой логин уже занят' });
      }
      console.error('Register error:', error);
      res.status(500).json({ error: 'Не удалось создать аккаунт' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const username = String(req.body?.username ?? '').trim();
      const password = String(req.body?.password ?? '');
      const user = await getUserByUsername(redis, username);

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      const safeUser = publicUser(user);
      res.json({ token: signToken(safeUser, jwtSecret), user: safeUser });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Не удалось выполнить вход' });
    }
  });

  return router;
}
