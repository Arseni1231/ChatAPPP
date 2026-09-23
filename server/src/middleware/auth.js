//import jwt from 'jsonwebtoken';

//export function createAuthMiddleware(jwtSecret) {
  //return function auth(req, res, next) {
    //try {
      //const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      //if (!token) return res.status(401).json({ error: 'Нужен вход в аккаунт' });
      //req.user = jwt.verify(token, jwtSecret);
      //next();
    //} catch {
      //res.status(401).json({ error: 'Сессия недействительна' });
    //}
  //};
//}

import jwt from 'jsonwebtoken';
import {
  getUser,
  userTokenVersion
} from '../services/users.js';

export function createAuthMiddleware({ jwtSecret, firestore }) {
  return async function auth(req, res, next) {
    try {
      const token = (req.headers.authorization || '')
        .replace(/^Bearer\s+/i, '');

      if (!token) {
        return res.status(401).json({
          error: 'Нужен вход в аккаунт'
        });
      }

      const decoded = jwt.verify(token, jwtSecret);

      const user = await getUser(
        firestore,
        decoded.id
      );

      if (!user) {
        return res.status(401).json({
          error: 'Пользователь не найден'
        });
      }

      if (
        userTokenVersion(user) !==
        Number(decoded.tokenVersion || 0)
      ) {
        return res.status(401).json({
          error: 'Сессия была отозвана'
        });
      }

      req.user = decoded;
      req.profile = user;

      next();
    } catch {
      res.status(401).json({
        error: 'Сессия недействительна'
      });
    }
  };
}

