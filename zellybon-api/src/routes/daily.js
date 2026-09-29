// Günlük giriş ödülü, günlük görevler ve sandık açma.

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { applyRewards, syncLives, chestTierById, openChest, CHEST_TIERS } from '../rewards.js';
import {
  LOGIN_CALENDAR, loginStatus, ensureQuests, publicQuests, QUEST_POOL, QUEST_BONUS, todayStr,
} from '../daily.js';

const router = Router();

async function loadUser(req, res) {
  const user = await User.findById(req.userId);
  if (!user) res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  return user;
}

function dailyPayload(user) {
  const login = loginStatus(user);
  return {
    login: {
      ...login,
      calendar: LOGIN_CALENDAR.map((rewards, i) => ({ day: i + 1, rewards })),
    },
    quests: publicQuests(user),
  };
}

router.get('/daily', requireAuth, async (req, res, next) => {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    ensureQuests(user);
    if (user.isModified()) await user.save();
    res.json({ ...dailyPayload(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.post('/daily/login', requireAuth, async (req, res, next) => {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    const status = loginStatus(user);
    if (status.claimedToday) return res.status(409).json({ error: 'Bugünün ödülünü zaten aldın.' });
    const rewards = LOGIN_CALENDAR[status.day - 1].map((r) => ({ ...r, reason: `Giriş ödülü · ${status.day}. gün` }));
    syncLives(user);
    applyRewards(user, rewards);
    user.daily = { lastClaim: todayStr(), day: status.day };
    ensureQuests(user);
    await user.save();
    res.json({ rewards, ...dailyPayload(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.post('/daily/quests/:id/claim', requireAuth, async (req, res, next) => {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    ensureQuests(user);
    const item = user.quests.items.find((i) => i.id === req.params.id);
    const def = QUEST_POOL.find((q) => q.id === req.params.id);
    if (!item || !def) return res.status(404).json({ error: 'Bugün böyle bir görev yok.' });
    if (item.claimed) return res.status(409).json({ error: 'Bu görevin ödülünü zaten aldın.' });
    if (item.progress < def.target) return res.status(409).json({ error: 'Görev henüz tamamlanmadı.' });
    item.claimed = true;
    user.markModified('quests');
    const rewards = [{ ...def.reward, reason: def.text }];
    applyRewards(user, rewards);
    await user.save();
    res.json({ rewards, ...dailyPayload(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.post('/daily/quests/bonus', requireAuth, async (req, res, next) => {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    ensureQuests(user);
    if (!publicQuests(user).bonusReady) return res.status(409).json({ error: 'Önce üç görevin ödülünü al.' });
    user.quests.bonusClaimed = true;
    user.markModified('quests');
    const rewards = [{ ...QUEST_BONUS, reason: 'Günün bütün görevleri' }];
    applyRewards(user, rewards);
    await user.save();
    res.json({ rewards, ...dailyPayload(user), user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

router.post('/chests/:id/open', requireAuth, async (req, res, next) => {
  try {
    const user = await loadUser(req, res);
    if (!user) return;
    const chest = user.chests.id(req.params.id);
    if (!chest) return res.status(404).json({ error: 'Böyle bir sandık yok.' });
    const tier = chestTierById(chest.tier);
    if ((user.keys ?? 0) < tier.keys) {
      return res.status(409).json({ error: `Bu sandık için ${tier.keys} anahtar gerekiyor.` });
    }
    user.keys -= tier.keys;
    chest.deleteOne();
    const opened = openChest(CHEST_TIERS.indexOf(tier));
    syncLives(user);
    applyRewards(user, opened.items);
    await user.save();
    res.json({ opened, user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
