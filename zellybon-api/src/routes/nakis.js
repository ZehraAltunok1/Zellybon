// Nakış: tablo sonucu. Can harcanmaz; tablo ilk kez tamamlanınca para kazanılır ve sonraki tablo açılır.

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { NAKIS_LEVEL_COUNT, nakisLevelCoins, applyRewards } from '../rewards.js';

const router = Router();

router.post('/nakis/result', requireAuth, async (req, res, next) => {
  try {
    const { levelId, won } = req.body ?? {};
    if (!Number.isInteger(levelId) || levelId < 1 || levelId > NAKIS_LEVEL_COUNT) {
      return res.status(404).json({ error: 'Böyle bir tablo yok.' });
    }
    if (typeof won !== 'boolean') return res.status(400).json({ error: 'Geçersiz sonuç.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const current = user.nakisLevel ?? 1;
    if (levelId > current) return res.status(403).json({ error: 'Bu tablonun kilidi henüz açılmadı.' });

    const firstWin = won && levelId === current;
    const rewards = [];
    if (firstWin) {
      user.nakisLevel = levelId + 1;
      rewards.push({ type: 'coins', count: nakisLevelCoins(levelId), reason: `Tablo ${levelId} tamamlandı` });
      applyRewards(user, rewards);
    }
    await user.save();
    res.json({ saved: true, firstWin, rewards, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
