import { Router } from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/requireAuth.js';
import Score from '../models/Score.js';
import User from '../models/User.js';

const router = Router();

const isInt = (v) => Number.isInteger(v);

router.post('/scores', requireAuth, async (req, res, next) => {
  try {
    const { score, maxCombo = 0, jelliesPopped = 0, durationMs } = req.body ?? {};
    if (!isInt(durationMs) || durationMs < 55000 || durationMs > 65000) {
      return res.status(400).json({ error: 'Geçersiz tur süresi.' });
    }
    if (!isInt(score) || score < 0 || score > 50000) {
      return res.status(400).json({ error: 'Geçersiz skor.' });
    }
    if (!isInt(maxCombo) || maxCombo < 0 || maxCombo > 100) {
      return res.status(400).json({ error: 'Geçersiz kombo değeri.' });
    }
    if (!isInt(jelliesPopped) || jelliesPopped < 0 || jelliesPopped > 5000) {
      return res.status(400).json({ error: 'Geçersiz jöle sayısı.' });
    }

    await Score.create({ userId: req.userId, mode: 'quick', score, maxCombo, jelliesPopped, durationMs });

    // Atomik güncelleme: yalnızca yeni skor mevcut rekordan büyükse bestScore değişir.
    const updated = await User.findOneAndUpdate(
      { _id: req.userId, bestScore: { $lt: score } },
      { $set: { bestScore: score } },
      { returnDocument: 'after' },
    );
    const isNewBest = Boolean(updated);
    const user = updated ?? (await User.findById(req.userId));
    res.status(201).json({ saved: true, isNewBest, bestScore: user?.bestScore ?? score });
  } catch (err) {
    next(err);
  }
});

router.get('/records', requireAuth, async (req, res, next) => {
  try {
    const mode = req.query.mode ?? 'quick';
    if (mode !== 'quick') return res.status(400).json({ error: 'Geçersiz mod.' });
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [records, statsAgg] = await Promise.all([
      Score.find({ userId, mode })
        .sort({ score: -1, createdAt: -1 })
        .limit(10)
        .select({ _id: 0, score: 1, maxCombo: 1, jelliesPopped: 1, createdAt: 1 })
        .lean(),
      Score.aggregate([
        { $match: { userId, mode } },
        {
          $group: {
            _id: null,
            gamesPlayed: { $sum: 1 },
            totalJellies: { $sum: '$jelliesPopped' },
            longestCombo: { $max: '$maxCombo' },
            bestScore: { $max: '$score' },
          },
        },
      ]),
    ]);

    const s = statsAgg[0] ?? {};
    res.json({
      records,
      stats: {
        gamesPlayed: s.gamesPlayed ?? 0,
        totalJellies: s.totalJellies ?? 0,
        longestCombo: s.longestCombo ?? 0,
        bestScore: s.bestScore ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
