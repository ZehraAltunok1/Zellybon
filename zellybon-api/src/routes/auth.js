import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();
const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function readCredentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  return { username, password };
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = readCredentials(req.body);
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Kullanıcı adı 3-16 karakter olmalı ve sadece harf (a-z), rakam ve _ içermeli.',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    }
    if (password.length > 100) {
      return res.status(400).json({ error: 'Şifre çok uzun.' });
    }
    if (await User.exists({ username })) {
      return res.status(409).json({ error: 'Bu kullanıcı adı alınmış.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    res.status(201).json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Bu kullanıcı adı alınmış.' });
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = readCredentials(req.body);
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }
    const user = await User.findOne({ username });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    res.json({ token: signToken(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
