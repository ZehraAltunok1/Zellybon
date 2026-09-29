import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { JOKER_TYPES } from '../rewards.js';
import { bumpQuest } from '../daily.js';

const router = Router();

// Jöle Patlat sırasında bir joker kullanılır; stok atomik olarak bir azalır.
router.post('/jokers/use', requireAuth, async (req, res, next) => {
  try {
    const { type } = req.body ?? {};
    if (!JOKER_TYPES.includes(type)) return res.status(400).json({ error: 'Geçersiz joker.' });

    const field = `jokers.${type}`;
    const user = await User.findOneAndUpdate(
      { _id: req.userId, [field]: { $gt: 0 } },
      { $inc: { [field]: -1 } },
      { returnDocument: 'after' },
    );
    if (!user) return res.status(409).json({ error: 'Bu jokerden kalmadı.' });
    bumpQuest(user, 'use_joker');
    await user.save();
    res.json({ jokers: user.publicJokers() });
  } catch (err) {
    next(err);
  }
});

export default router;
