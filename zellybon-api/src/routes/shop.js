// Dükkân: oyunda kazanılan paralarla can, güçlendirici ve joker alınır.

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { SHOP_ITEMS, LIVES_MAX, applyRewards, syncLives } from '../rewards.js';

const router = Router();

router.get('/shop', (req, res) => res.json({ items: SHOP_ITEMS }));

router.post('/shop/buy', requireAuth, async (req, res, next) => {
  try {
    const item = SHOP_ITEMS.find((i) => i.id === req.body?.itemId);
    if (!item) return res.status(404).json({ error: 'Böyle bir ürün yok.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if ((user.coins ?? 0) < item.price) return res.status(409).json({ error: 'Yeterli paran yok.' });

    syncLives(user);
    if (item.grant.life && user.lives >= LIVES_MAX) {
      return res.status(409).json({ error: 'Canların zaten dolu.' });
    }

    user.coins -= item.price;
    const rewards = Object.entries(item.grant).map(([type, count]) => ({ type, count, reason: 'Dükkân' }));
    applyRewards(user, rewards);
    await user.save();
    res.json({ bought: item.id, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
