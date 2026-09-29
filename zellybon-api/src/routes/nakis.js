// Nakış: tablo sonucu ve joker kullanımı. Can harcanmaz; tablo ilk kez tamamlanınca para
// (her 3 tabloda bir de joker) kazanılır ve sonraki tablo açılır.

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { NAKIS_LEVEL_COUNT, NAKIS_JOKER_TYPES, nakisRewards, applyRewards } from '../rewards.js';

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
    let rewards = [];
    if (firstWin) {
      user.nakisLevel = levelId + 1;
      rewards = nakisRewards(levelId);
      applyRewards(user, rewards);
    }
    await user.save();
    res.json({ saved: true, firstWin, rewards, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

// Oyun sırasında bir Nakış jokeri kullanılır; stok atomik olarak bir azalır.
router.post('/nakis/jokers/use', requireAuth, async (req, res, next) => {
  try {
    const { type } = req.body ?? {};
    if (!NAKIS_JOKER_TYPES.includes(type)) return res.status(400).json({ error: 'Geçersiz joker.' });
    const field = `nakisJokers.${type}`;
    const user = await User.findOneAndUpdate(
      { _id: req.userId, [field]: { $gt: 0 } },
      { $inc: { [field]: -1 } },
      { returnDocument: 'after' },
    );
    if (!user) return res.status(409).json({ error: 'Bu jokerden kalmadı.' });
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
