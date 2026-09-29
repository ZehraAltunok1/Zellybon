// Joker, can ve ödül kuralları. Jokerler ve canlar satın alınmaz; sadece oyun içinde kazanılır.

export const JOKER_TYPES = ['hammer', 'shuffle', 'colorBomb', 'hourglass'];
export const STARTING_JOKERS = { hammer: 1, shuffle: 1, colorBomb: 1, hourglass: 1 };
export const MATCH_LEVEL_COUNT = 20; // Jöle Patlat bölümleri
export const MAIN_LEVEL_COUNT = 10;  // Ana oyun (Jöle Atış) bölümleri

export const LIVES_MAX = 5;
export const LIFE_REGEN_MS = 30 * 60 * 1000;

// Jöle Patlat bölümü ilk kez geçildiğinde verilen joker sırayla döner.
const LEVEL_REWARD_CYCLE = ['hammer', 'shuffle', 'hourglass', 'colorBomb'];

/** Hızlı Tur sonunda kazanılan ödüller: canlar ve jokerler. */
export function quickRoundRewards({ score, isNewBest, maxCombo }) {
  const rewards = [];
  if (score >= 3000) rewards.push({ type: 'life', count: 2, reason: '3.000+ puan' });
  else if (score >= 1500) rewards.push({ type: 'life', count: 1, reason: '1.500+ puan' });
  if (isNewBest) rewards.push({ type: 'hammer', count: 1, reason: 'Yeni rekor' });
  if (maxCombo >= 6) rewards.push({ type: 'shuffle', count: 1, reason: `x${maxCombo} kombo` });
  return rewards;
}

/** Jöle Patlat bölümü sonunda kazanılan ödüller. */
export function matchLevelRewards({ levelId, won, firstWin, firstThreeStars }) {
  const rewards = [];
  if (won) rewards.push({ type: 'life', count: 1, reason: 'Bölüm geçildi' });
  if (firstWin) {
    rewards.push({
      type: LEVEL_REWARD_CYCLE[(levelId - 1) % LEVEL_REWARD_CYCLE.length],
      count: 1,
      reason: `Bölüm ${levelId} ilk kez geçildi`,
    });
    if (levelId % 5 === 0) {
      for (const type of JOKER_TYPES) rewards.push({ type, count: 1, reason: 'Hazine sandığı' });
    }
  }
  if (firstThreeStars) rewards.push({ type: 'colorBomb', count: 1, reason: 'İlk kez 3 yıldız' });
  return rewards;
}

/**
 * Zamanla dolan canları hesaplar ve kullanıcı belgesine yazar (kaydetmez).
 * livesAt: bir sonraki canın sayılmaya başladığı an.
 */
export function syncLives(user, now = Date.now()) {
  if (user.lives >= LIVES_MAX) {
    user.lives = Math.min(user.lives, LIVES_MAX);
    user.livesAt = new Date(now);
    return;
  }
  const since = now - new Date(user.livesAt ?? now).getTime();
  const gained = Math.floor(since / LIFE_REGEN_MS);
  if (gained <= 0) return;
  user.lives = Math.min(LIVES_MAX, user.lives + gained);
  user.livesAt = user.lives >= LIVES_MAX
    ? new Date(now)
    : new Date(new Date(user.livesAt).getTime() + gained * LIFE_REGEN_MS);
}

export function livesInfo(user, now = Date.now()) {
  const full = user.lives >= LIVES_MAX;
  return {
    lives: user.lives,
    max: LIVES_MAX,
    // Bir sonraki can için kalan süre (ms); canlar doluysa null
    nextLifeInMs: full ? null : Math.max(0, new Date(user.livesAt).getTime() + LIFE_REGEN_MS - now),
  };
}

/** Ödülleri kullanıcı belgesine uygular (canlar LIVES_MAX ile sınırlıdır). Kaydetmez. */
export function applyRewards(user, rewards, now = Date.now()) {
  for (const r of rewards) {
    if (r.type === 'life') {
      syncLives(user, now);
      user.lives = Math.min(LIVES_MAX, user.lives + r.count);
      if (user.lives >= LIVES_MAX) user.livesAt = new Date(now);
    } else if (JOKER_TYPES.includes(r.type)) {
      user.jokers[r.type] = (user.jokers[r.type] ?? 0) + r.count;
    }
  }
}
