// Ana oyun (Jöle Atış): bölüm başlatma (1 can + seçilen güçlendiriciler harcanır) ve bölüm sonucu
// (kazanınca can iade edilir; bölüm ilk kez geçilince para, sandık bölümlerinde sandık kazanılır).

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import {
  MAIN_LEVEL_COUNT, LIVES_MAX, BOOSTER_TYPES, syncLives, applyRewards,
  mainLevelCoins, chestIndexFor, openChest,
} from '../rewards.js';

const router = Router();

function readLevelId(body) {
  const levelId = body?.levelId;
  return Number.isInteger(levelId) && levelId >= 1 && levelId <= MAIN_LEVEL_COUNT ? levelId : null;
}

router.post('/main/start', requireAuth, async (req, res, next) => {
  try {
    const levelId = readLevelId(req.body);
    if (!levelId) return res.status(404).json({ error: 'Böyle bir bölüm yok.' });
    const boosters = Array.isArray(req.body.boosters) ? [...new Set(req.body.boosters)] : [];
    if (!boosters.every((b) => BOOSTER_TYPES.includes(b))) {
      return res.status(400).json({ error: 'Geçersiz güçlendirici.' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (levelId > user.mainLevel) return res.status(403).json({ error: 'Bu bölümün kilidi henüz açılmadı.' });

    syncLives(user);
    if (user.lives < 1) {
      await user.save();
      return res.status(409).json({ error: 'Canın kalmadı.', user: user.toPublic() });
    }
    for (const b of boosters) {
      if ((user.boosters[b] ?? 0) < 1) {
        return res.status(409).json({ error: 'Bu güçlendiriciden kalmadı.', user: user.toPublic() });
      }
    }
    for (const b of boosters) user.boosters[b] -= 1;
    // Can dolu iken harcanırsa dolum sayacı şimdi başlar
    if (user.lives >= LIVES_MAX) user.livesAt = new Date();
    user.lives -= 1;
    await user.save();
    res.json({ started: true, boosters, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.post('/main/result', requireAuth, async (req, res, next) => {
  try {
    const levelId = readLevelId(req.body);
    if (!levelId) return res.status(404).json({ error: 'Böyle bir bölüm yok.' });
    const { won } = req.body;
    if (typeof won !== 'boolean') return res.status(400).json({ error: 'Geçersiz sonuç.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (levelId > user.mainLevel) return res.status(403).json({ error: 'Bu bölümün kilidi henüz açılmadı.' });

    syncLives(user);
    const rewards = [];
    let chest = null;
    const firstWin = won && levelId === user.mainLevel;
    if (won) {
      // Kazanınca başta harcanan can geri verilir
      user.lives = Math.min(LIVES_MAX, user.lives + 1);
      if (user.lives >= LIVES_MAX) user.livesAt = new Date();
    }
    if (firstWin) {
      user.mainLevel = levelId + 1;
      rewards.push({ type: 'coins', count: mainLevelCoins(levelId), reason: `Bölüm ${levelId} geçildi` });
      const chestIndex = chestIndexFor(levelId);
      if (chestIndex >= 0) {
        chest = openChest(chestIndex);
        rewards.push(...chest.items);
      }
      applyRewards(user, rewards);
    }
    await user.save();
    res.json({
      saved: true,
      firstWin,
      unlockedNext: firstWin && levelId < MAIN_LEVEL_COUNT,
      rewards,
      chest,
      user: user.toPublic(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
