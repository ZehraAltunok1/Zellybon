// Ana oyun (Jöle Atış): bölüm başlatma (1 can harcar) ve bölüm sonucu (kazanınca can iade edilir).

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { MAIN_LEVEL_COUNT, LIVES_MAX, syncLives } from '../rewards.js';

const router = Router();

function readLevelId(body) {
  const levelId = body?.levelId;
  return Number.isInteger(levelId) && levelId >= 1 && levelId <= MAIN_LEVEL_COUNT ? levelId : null;
}

router.post('/main/start', requireAuth, async (req, res, next) => {
  try {
    const levelId = readLevelId(req.body);
    if (!levelId) return res.status(404).json({ error: 'Böyle bir bölüm yok.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (levelId > user.mainLevel) return res.status(403).json({ error: 'Bu bölümün kilidi henüz açılmadı.' });

    syncLives(user);
    if (user.lives < 1) {
      await user.save();
      return res.status(409).json({ error: 'Canın kalmadı.', user: user.toPublic() });
    }
    // Can dolu iken harcanırsa dolum sayacı şimdi başlar
    if (user.lives >= LIVES_MAX) user.livesAt = new Date();
    user.lives -= 1;
    await user.save();
    res.json({ started: true, user: user.toPublic() });
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
    let unlockedNext = false;
    if (won) {
      // Kazanınca başta harcanan can geri verilir
      user.lives = Math.min(LIVES_MAX, user.lives + 1);
      if (user.lives >= LIVES_MAX) user.livesAt = new Date();
      if (levelId === user.mainLevel && levelId < MAIN_LEVEL_COUNT + 1) {
        user.mainLevel = levelId + 1;
        unlockedNext = levelId < MAIN_LEVEL_COUNT;
      }
    }
    await user.save();
    res.json({ saved: true, unlockedNext, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
