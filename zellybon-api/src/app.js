import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import scoreRoutes from './routes/scores.js';
import requireAuth from './middleware/requireAuth.js';
import User from './models/User.js';

export function createApp({ corsOrigin = '' } = {}) {
  const app = express();
  const origins = corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : false }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api', scoreRoutes);

  app.get('/api/me', requireAuth, async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      res.json({ user: user.toPublic() });
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res) => res.status(404).json({ error: 'Adres bulunamadı.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Geçersiz JSON gövdesi.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  });

  return app;
}
