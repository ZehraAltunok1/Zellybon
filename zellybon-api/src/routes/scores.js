// Jöle Patlat — Hızlı Tur skorları ve kişisel rekorlar.

import { Router } from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/requireAuth.js';
import Score from '../models/Score.js';
import User from '../models/User.js';
import { quickRoundRewards, applyRewards, syncLives } from '../rewards.js';
import { bumpQuest } from '../daily.js';

const router = Router();

const isInt = (v) => Number.isInteger(v);

// 60 sn + en fazla 3 Kum Saati (her biri +10 sn)
const MIN_DURATION = 55000;
const MAX_DURATION = 95000;

router.post('/scores', requireAuth, async (req, res, next) => {
  try {
    const { score, maxCombo = 0, jelliesPopped = 0, durationMs } = req.body ?? {};
    if (!isInt(durationMs) || durationMs < MIN_DURATION || durationMs > MAX_DURATION) {
      return res.status(400).json({ error: 'Geçersiz tur süresi.' });
    }
    if (!isInt(score) || score < 0 || score > 50000) {
      return res.status(400).json({ error: 'Geçersiz skor.' });
    }
    if (!isInt(maxCombo) || maxCombo < 0 || maxCombo > 100) {
      return res.status(400).json({ error: 'Geçersiz kombo değeri.' });
    }
    if (!isInt(jelliesPopped) || jelliesPopped < 0 || jelliesPopped > 8000) {
      return res.status(400).json({ error: 'Geçersiz jöle sayısı.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    await Score.create({ userId: user._id, mode: 'quick', score, maxCombo, jelliesPopped, durationMs });

    const isNewBest = score > user.bestScore;
    if (isNewBest) user.bestScore = score;
    const rewards = quickRoundRewards({ score, isNewBest, maxCombo });
    syncLives(user);
    applyRewards(user, rewards);
    bumpQuest(user, 'play');
    if (score >= 1500) bumpQuest(user, 'quick_score');
    await user.save();

    res.status(201).json({ saved: true, isNewBest, bestScore: user.bestScore, rewards, user: user.toPublic() });
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
