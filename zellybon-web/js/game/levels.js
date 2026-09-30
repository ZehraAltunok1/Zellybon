// Jöle Patlat bölümleri. Zorluk, rastgele hamle yapan bir botun simülasyonuna göre ayarlandı:
// ilk bölümleri bot bile çoğunlukla geçer, son bölümler dikkatli oynamayı gerektirir.
//
// Renkler: 0 kırmızı, 1 turuncu, 2 sarı, 3 yeşil, 4 mavi, 5 mor
// goals:
//   { type: 'score', value }          hamleler bitince skor en az value olmalı
//   { type: 'collect', color, count } o renkten count jöle patlat (hepsi toplanınca bölüm hemen biter)
//   { type: 'ice' }                   tahtadaki bütün buzları kır (buzlu hücrede eşleşme/patlama olunca kırılır)
// ice: isteğe bağlı 8 satırlık buz katmanı ('x' = buzlu hücre, '.' = buzsuz)
// stars: [2 yıldız, 3 yıldız] puan eşikleri (bölümü geçmek 1 yıldız)

export const MOVE_BONUS = 60; // toplama bölümünde artan her hamle için bonus puan

export const LEVELS = [
  { id: 1, colors: 5, moves: 20, goals: [{ type: 'score', value: 1200 }], stars: [1900, 2600] },
  { id: 2, colors: 5, moves: 20, goals: [{ type: 'collect', color: 0, count: 18 }], stars: [1600, 2300] },
  { id: 3, colors: 5, moves: 20, goals: [{ type: 'collect', color: 4, count: 20 }], stars: [1700, 2400] },
  { id: 4, colors: 5, moves: 22, goals: [{ type: 'score', value: 1800 }], stars: [2400, 3100] },
  {
    id: 5, colors: 5, moves: 22,
    goals: [{ type: 'collect', color: 3, count: 18 }, { type: 'collect', color: 2, count: 18 }],
    stars: [1900, 2700],
  },
  { id: 6, colors: 5, moves: 20, goals: [{ type: 'score', value: 2000 }], stars: [2400, 3000] },
  { id: 7, colors: 6, moves: 25, goals: [{ type: 'collect', color: 5, count: 18 }], stars: [1500, 2000] },
  { id: 8, colors: 6, moves: 22, goals: [{ type: 'score', value: 1300 }], stars: [1600, 2000] },
  {
    id: 9, colors: 6, moves: 25,
    goals: [{ type: 'collect', color: 0, count: 14 }, { type: 'collect', color: 1, count: 14 }],
    stars: [1600, 2100],
  },
  { id: 10, colors: 6, moves: 25, goals: [{ type: 'score', value: 1600 }], stars: [1900, 2400] },
  { id: 11, colors: 6, moves: 22, goals: [{ type: 'collect', color: 4, count: 20 }], stars: [1500, 2000] },
  { id: 12, colors: 6, moves: 20, goals: [{ type: 'score', value: 1400 }], stars: [1700, 2100] },
  {
    id: 13, colors: 6, moves: 25,
    goals: [{ type: 'collect', color: 3, count: 15 }, { type: 'collect', color: 5, count: 15 }],
    stars: [1600, 2100],
  },
  { id: 14, colors: 6, moves: 25, goals: [{ type: 'score', value: 1800 }], stars: [2100, 2600] },
  { id: 15, colors: 6, moves: 22, goals: [{ type: 'collect', color: 2, count: 22 }], stars: [1600, 2100] },
  { id: 16, colors: 6, moves: 20, goals: [{ type: 'score', value: 1550 }], stars: [1800, 2200] },
  {
    id: 17, colors: 6, moves: 25,
    goals: [
      { type: 'collect', color: 0, count: 12 },
      { type: 'collect', color: 4, count: 12 },
      { type: 'collect', color: 3, count: 12 },
    ],
    stars: [1700, 2200],
  },
  { id: 18, colors: 6, moves: 22, goals: [{ type: 'score', value: 1750 }], stars: [2000, 2400] },
  { id: 19, colors: 6, moves: 25, goals: [{ type: 'collect', color: 1, count: 26 }], stars: [1800, 2300] },
  { id: 20, colors: 6, moves: 25, goals: [{ type: 'score', value: 2000 }], stars: [2300, 2800] },
];

export const getLevel = (id) => LEVELS.find((l) => l.id === id) ?? null;

// Toplama ve buz hedefleri tamamlanınca bölüm hamleler bitmeden biter
export const isCollectLevel = (level) => level.goals.every((g) => g.type === 'collect' || g.type === 'ice');

/** Buz katmanındaki buzlu hücrelerin indeksleri (8x8 tahta) */
export function iceCells(level, size = 8) {
  const out = [];
  (level.ice ?? []).forEach((row, y) => [...row].forEach((ch, x) => ch === 'x' && out.push(y * size + x)));
  return out;
}

/** Bir bölüm açık mı? 1. bölüm her zaman açık; diğerleri öncekinden en az 1 yıldızla açılır. */
export function isUnlocked(progress, id) {
  return id === 1 || (progress?.[id - 1]?.stars ?? 0) >= 1;
}

/** Hedeflerin karşılanıp karşılanmadığı. collected: renk → patlatılan sayı, iceLeft: kalan buz */
export function goalsMet(level, score, collected, iceLeft = 0) {
  return level.goals.every((g) => {
    if (g.type === 'score') return score >= g.value;
    if (g.type === 'ice') return iceLeft === 0;
    return (collected[g.color] ?? 0) >= g.count;
  });
}

export function starsFor(level, score, won) {
  if (!won) return 0;
  if (score >= level.stars[1]) return 3;
  if (score >= level.stars[0]) return 2;
  return 1;
}

export function totalStars(progress) {
  return Object.values(progress ?? {}).reduce((a, p) => a + (p.stars ?? 0), 0);
}
