// Oyun ekonomisi: canlar, jokerler, güçlendiriciler, para, sandıklar ve dükkân.
// Hepsi oyun içinde kazanılır; gerçek parayla satın alma yoktur.

export const JOKER_TYPES = ['hammer', 'shuffle', 'colorBomb', 'hourglass'];     // Jöle Patlat
export const BOOSTER_TYPES = ['extraSlot', 'superStart'];                      // Jöle Atış
export const NAKIS_JOKER_TYPES = ['scissors', 'needle', 'box', 'magnet'];       // Nakış
export const STARTING_JOKERS = { hammer: 1, shuffle: 1, colorBomb: 1, hourglass: 1 };
export const STARTING_BOOSTERS = { extraSlot: 1, superStart: 1 };
export const STARTING_NAKIS_JOKERS = { scissors: 2, needle: 2, box: 2, magnet: 2 };
export const MATCH_LEVEL_COUNT = 20; // Jöle Patlat bölümleri
export const MAIN_LEVEL_COUNT = 20;  // Jöle Atış bölümleri
export const NAKIS_LEVEL_COUNT = 24; // Nakış tabloları

export const LIVES_MAX = 5;
export const LIFE_REGEN_MS = 5 * 60 * 1000;

// ---------- Para ----------

/** Jöle Atış bölümü ilk kez geçilince kazanılan para: bölüm ilerledikçe artar. */
export const mainLevelCoins = (levelId) => 10 + levelId * 5;

/** Nakış tablosu ilk kez tamamlanınca kazanılan para. */
export const nakisLevelCoins = (levelId) => 8 + levelId * 4;

// ---------- Sandıklar ----------
// Sandıklar gittikçe seyrekleşir (aralar 2, 2, 3, 4, 5, 6 … bölüm) ama değerlenir.

// keys: sandığı açmak için gereken anahtar sayısı
export const CHEST_TIERS = [
  { id: 'bronze', name: 'Bronz Sandık', keys: 1, coins: 40, jokers: 1, boosters: 0, lives: 0 },
  { id: 'silver', name: 'Gümüş Sandık', keys: 2, coins: 80, jokers: 2, boosters: 1, lives: 0 },
  { id: 'gold', name: 'Altın Sandık', keys: 3, coins: 150, jokers: 3, boosters: 1, lives: LIVES_MAX },
  { id: 'diamond', name: 'Elmas Sandık', keys: 4, coins: 280, jokers: 4, boosters: 2, lives: LIVES_MAX },
  { id: 'legend', name: 'Efsane Sandık', keys: 5, coins: 500, jokers: 6, boosters: 3, lives: LIVES_MAX },
];

export const chestTierById = (id) => CHEST_TIERS.find((t) => t.id === id) ?? null;

/** Bölüm bir sandık veriyorsa ödül olarak ekler (sandık açılmaz, envantere girer). */
export function levelChestReward(levelId, gameName) {
  const index = chestIndexFor(levelId);
  if (index < 0) return null;
  const tier = chestTier(index);
  return { type: 'chest', tier: tier.id, count: 1, reason: `${gameName} ${levelId}. bölüm` };
}

/** Sandık veren bölümler: 2, 4, 7, 11, 16, 22, … */
export function chestLevels(upTo = 100) {
  const out = [];
  for (let level = 2, gap = 2; level <= upTo; gap++) {
    out.push(level);
    level += gap;
  }
  return out;
}

/** Bu bölüm bir sandık veriyor mu? Veriyorsa kaçıncı sandık (0 = ilk). */
export function chestIndexFor(levelId) {
  return chestLevels(levelId).indexOf(levelId);
}

export function chestTier(index) {
  return CHEST_TIERS[Math.min(index, CHEST_TIERS.length - 1)];
}

/** Sonraki sandık: { level, tier } ya da yoksa null */
export function nextChest(fromLevel) {
  const level = chestLevels(MAIN_LEVEL_COUNT).find((l) => l >= fromLevel);
  if (!level) return null;
  return { level, tier: chestTier(chestIndexFor(level)).id };
}

/** Sandık içeriğini üretir (random: 0..1 üreten fonksiyon). */
export function openChest(index, random = Math.random) {
  const tier = chestTier(index);
  const items = [{ type: 'coins', count: tier.coins, reason: tier.name }];
  if (tier.lives) items.push({ type: 'life', count: tier.lives, reason: tier.name });
  const jokerCounts = {};
  const pool = [...JOKER_TYPES, ...NAKIS_JOKER_TYPES];
  for (let k = 0; k < tier.jokers; k++) {
    const t = pool[Math.floor(random() * pool.length)];
    jokerCounts[t] = (jokerCounts[t] ?? 0) + 1;
  }
  const boosterCounts = {};
  for (let k = 0; k < tier.boosters; k++) {
    const t = BOOSTER_TYPES[k % BOOSTER_TYPES.length];
    boosterCounts[t] = (boosterCounts[t] ?? 0) + 1;
  }
  for (const [type, count] of Object.entries({ ...boosterCounts, ...jokerCounts })) {
    items.push({ type, count, reason: tier.name });
  }
  return { tier: tier.id, name: tier.name, items };
}

// ---------- Dükkân ----------

export const SHOP_ITEMS = [
  { id: 'life1', name: '1 Can', grant: { life: 1 }, price: 30 },
  { id: 'lifeFull', name: 'Canları Doldur', grant: { life: LIVES_MAX }, price: 100 },
  { id: 'extraSlot', name: 'Ekstra Kutu', grant: { extraSlot: 1 }, price: 60 },
  { id: 'superStart', name: 'Süper Başlangıç', grant: { superStart: 1 }, price: 90 },
  { id: 'hammer', name: 'Çekiç', grant: { hammer: 1 }, price: 40 },
  { id: 'shuffle', name: 'Karıştır', grant: { shuffle: 1 }, price: 30 },
  { id: 'hourglass', name: 'Kum Saati', grant: { hourglass: 1 }, price: 50 },
  { id: 'colorBomb', name: 'Renk Bombası', grant: { colorBomb: 1 }, price: 80 },
  { id: 'scissors', name: 'Makas', grant: { scissors: 1 }, price: 30 },
  { id: 'needle', name: 'Sihirli İğne', grant: { needle: 1 }, price: 50 },
  { id: 'box', name: 'Ekstra Kutu (Nakış)', grant: { box: 1 }, price: 40 },
  { id: 'magnet', name: 'Mıknatıs', grant: { magnet: 1 }, price: 40 },
];

/** Nakış tablosu ilk kez tamamlanınca: para, her 3 tabloda bir de rastgele bir Nakış jokeri. */
export function nakisRewards(levelId, random = Math.random) {
  const rewards = [{ type: 'coins', count: nakisLevelCoins(levelId), reason: `Tablo ${levelId} tamamlandı` }];
  if (levelId % 3 === 0) {
    const type = NAKIS_JOKER_TYPES[Math.floor(random() * NAKIS_JOKER_TYPES.length)];
    rewards.push({ type, count: 1, reason: `Tablo ${levelId} hediyesi` });
  }
  return rewards;
}

// ---------- Ödül kuralları ----------

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
    rewards.push({ type: 'coins', count: 10, reason: `Bölüm ${levelId} ilk kez geçildi` });
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

// ---------- Canlar ----------

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
    regenMs: LIFE_REGEN_MS,
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
    } else if (r.type === 'coins') {
      user.coins = (user.coins ?? 0) + r.count;
    } else if (r.type === 'key') {
      user.keys = (user.keys ?? 0) + r.count;
    } else if (r.type === 'chest') {
      for (let k = 0; k < r.count; k++) user.chests.push({ tier: r.tier, source: r.reason ?? '' });
    } else if (JOKER_TYPES.includes(r.type)) {
      user.jokers[r.type] = (user.jokers[r.type] ?? 0) + r.count;
    } else if (BOOSTER_TYPES.includes(r.type)) {
      user.boosters[r.type] = (user.boosters[r.type] ?? 0) + r.count;
    } else if (NAKIS_JOKER_TYPES.includes(r.type)) {
      user.nakisJokers[r.type] = (user.nakisJokers[r.type] ?? 0) + r.count;
    }
  }
}
