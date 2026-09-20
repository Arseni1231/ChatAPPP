import jwt from 'jsonwebtoken';

export function createAuthMiddleware(jwtSecret) {
  return function auth(req, res, next) {
    try {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Нужен вход в аккаунт' });
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      res.status(401).json({ error: 'Сессия недействительна' });
    }
  };
}
