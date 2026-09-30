// İğnedenlik (bölümlü, can harcamaz) ve Jöle Solucan (3 dakikalık rekor turu; can ve para kazandırır).

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { PINS_LEVEL_COUNT, pinsRewards, wormRewards, applyRewards, syncLives } from '../rewards.js';
import { bumpQuest } from '../daily.js';

const router = Router();
const isInt = (v) => Number.isInteger(v);

router.post('/pins/result', requireAuth, async (req, res, next) => {
  try {
    const { levelId, won } = req.body ?? {};
    if (!isInt(levelId) || levelId < 1 || levelId > PINS_LEVEL_COUNT) {
      return res.status(404).json({ error: 'Böyle bir bölüm yok.' });
    }
    if (typeof won !== 'boolean') return res.status(400).json({ error: 'Geçersiz sonuç.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const current = user.pinLevel ?? 1;
    if (levelId > current) return res.status(403).json({ error: 'Bu bölümün kilidi henüz açılmadı.' });

    const firstWin = won && levelId === current;
    let rewards = [];
    if (firstWin) {
      user.pinLevel = levelId + 1;
      rewards = pinsRewards(levelId);
      applyRewards(user, rewards);
    }
    bumpQuest(user, 'play');
    if (won) bumpQuest(user, 'pins_win');
    await user.save();
    res.json({ saved: true, firstWin, rewards, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// Tur en fazla 180 sn sürer
const WORM_MAX_MS = 185000;

router.post('/worm/result', requireAuth, async (req, res, next) => {
  try {
    const { score, kills = 0, rank = 1, crowned = false, durationMs } = req.body ?? {};
    if (!isInt(durationMs) || durationMs < 0 || durationMs > WORM_MAX_MS) {
      return res.status(400).json({ error: 'Geçersiz tur süresi.' });
    }
    // Boy saniyede kabaca 15'ten hızlı artamaz
    if (!isInt(score) || score < 0 || score > 20 + Math.ceil(durationMs / 1000) * 15) {
      return res.status(400).json({ error: 'Geçersiz skor.' });
    }
    if (!isInt(kills) || kills < 0 || kills > 60) return res.status(400).json({ error: 'Geçersiz değer.' });
    if (!isInt(rank) || rank < 1 || rank > 20) return res.status(400).json({ error: 'Geçersiz sıra.' });
    if (typeof crowned !== 'boolean') return res.status(400).json({ error: 'Geçersiz değer.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const isNewBest = score > (user.wormBest ?? 0);
    if (isNewBest) user.wormBest = score;
    const rewards = wormRewards({ score, kills, crowned, isNewBest });
    syncLives(user);
    applyRewards(user, rewards);
    bumpQuest(user, 'play');
    if (score >= 300) bumpQuest(user, 'worm_score');
    await user.save();
    res.json({ saved: true, isNewBest, best: user.wormBest, rewards, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
