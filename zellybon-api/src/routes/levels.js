// Jöle Patlat bölümleri.

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { MATCH_LEVEL_COUNT, matchLevelRewards, applyRewards, syncLives } from '../rewards.js';
import { bumpQuest } from '../daily.js';

const router = Router();

router.post('/levels/:id/result', requireAuth, async (req, res, next) => {
  try {
    const levelId = Number(req.params.id);
    if (!Number.isInteger(levelId) || levelId < 1 || levelId > MATCH_LEVEL_COUNT) {
      return res.status(404).json({ error: 'Böyle bir bölüm yok.' });
    }
    const { won, score, stars } = req.body ?? {};
    if (typeof won !== 'boolean') return res.status(400).json({ error: 'Geçersiz sonuç.' });
    if (!Number.isInteger(score) || score < 0 || score > 100000) {
      return res.status(400).json({ error: 'Geçersiz skor.' });
    }
    if (!Number.isInteger(stars) || stars < 0 || stars > 3 || (won ? stars < 1 : stars !== 0)) {
      return res.status(400).json({ error: 'Geçersiz yıldız sayısı.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const prevStars = user.levels.get(String(levelId - 1))?.stars ?? 0;
    if (levelId > 1 && prevStars < 1) {
      return res.status(403).json({ error: 'Bu bölümün kilidi henüz açılmadı.' });
    }

    const old = user.levels.get(String(levelId)) ?? { stars: 0, best: 0 };
    const firstWin = won && old.stars === 0;
    const firstThreeStars = stars === 3 && old.stars < 3;
    user.levels.set(String(levelId), { stars: Math.max(old.stars, stars), best: Math.max(old.best, score) });

    const rewards = matchLevelRewards({ levelId, won, firstWin, firstThreeStars });
    syncLives(user);
    applyRewards(user, rewards);
    bumpQuest(user, 'play');
    if (won) bumpQuest(user, 'match_win');
    await user.save();

    res.json({
      saved: true,
      isNewBest: score > old.best,
      unlockedNext: firstWin && levelId < MATCH_LEVEL_COUNT,
      rewards,
      user: user.toPublic(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
