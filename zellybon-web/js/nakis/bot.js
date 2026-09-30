// Nakış için otomatik oyuncular: bölümlerin kazanılabilirliğini ve zorluğunu ölçmek için.
// Testler ve bölüm planlayan ajan (level-agent) kullanır. Çizim yok; Node'da çalışır.

import { createNakisEngine } from './engine.js';

/** Makul bir oyuncu: yolda yer varsa şu an işleyebilecek bir makarayı gönderir (önce kutudakiler). */
export function playSmartNakis(level, { maxMs = 15 * 60 * 1000 } = {}) {
  const e = createNakisEngine(level);
  const { state } = e;
  let t = 0;
  while (state.status === 'playing' && t < maxMs) {
    if (e.canLaunch()) {
      const slot = state.slots.findIndex((s) => s && e.canStitchColor(s.color));
      const col = state.columns.findIndex((c) => c[0] && e.canStitchColor(c[0].color));
      if (slot >= 0) e.launchFromSlot(slot);
      else if (col >= 0) e.launchFromColumn(col);
      else if (!state.belt.length && !state.pending.length && state.slots.includes(null)) {
        let pick = state.columns.findIndex((c) => c[1] && e.canStitchColor(c[1].color));
        if (pick < 0) pick = state.columns.findIndex((c) => c.length);
        if (pick >= 0) e.launchFromColumn(pick);
      }
    }
    e.step(50);
    t += 50;
  }
  return state;
}

/** Düşünmeden oynayan oyuncu: ara sıra rastgele bir makara gönderir. */
export function playRandomNakis(level, seed, { maxMs = 5 * 60 * 1000 } = {}) {
  let s = seed >>> 0 || 1;
  const r = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const e = createNakisEngine(level);
  const { state } = e;
  let t = 0;
  while (state.status === 'playing' && t < maxMs) {
    if (e.canLaunch() && r() < 0.08) {
      const opts = [];
      state.columns.forEach((c, i) => c.length && opts.push(['c', i]));
      state.slots.forEach((x, i) => x && opts.push(['s', i]));
      if (opts.length) {
        const [kind, i] = opts[Math.floor(r() * opts.length)];
        if (kind === 'c') e.launchFromColumn(i);
        else e.launchFromSlot(i);
      }
    }
    e.step(50);
    t += 50;
  }
  return state;
}

/** Zorluk ölçümü: akıllı oyuncu kazanıyor mu, rastgele oyuncu yüzde kaç kazanıyor? */
export function measureNakis(level, { runs = 16 } = {}) {
  const smart = playSmartNakis(level);
  let wins = 0;
  for (let i = 1; i <= runs; i++) if (playRandomNakis(level, i * 7919).status === 'won') wins++;
  return { solvable: smart.status === 'won', loseReason: smart.loseReason, randomWinRate: wins / runs };
}
