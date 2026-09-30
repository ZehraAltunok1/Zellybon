// Jöle Atış için otomatik oyuncular: bölümlerin kazanılabilirliğini ve zorluğunu ölçmek için.
// Testler ve bölüm planlayan ajan (level-agent) kullanır. Çizim yok; Node'da çalışır.

import { createEngine, firstCubeInLane } from './engine.js';

// Bu renkten şu an kaç şeritte vurulabilir (kilitsiz) küp var?
function exposedCount(state, color) {
  const { grid, locked, L } = state;
  let n = 0;
  for (let p = 0; p < L; p++) {
    const c = firstCubeInLane(grid, p);
    if (c && grid[c.y][c.x] === color && !locked[c.y][c.x]) n++;
  }
  return n;
}

/**
 * Makul bir oyuncu: yolda yer varsa önce kutudaki, sonra sütundaki jölelerden en çok küp vurabilecek
 * olanı gönderir. Kimse vuramıyorsa arkasındaki jölesi işe yarayacak sütunu ilerletir.
 * @returns {object} oyun sonundaki durum (status: 'won' | 'lost' | 'playing')
 */
export function playSmart(level, { maxMs = 10 * 60 * 1000, seed } = {}) {
  const e = createEngine(level, { seed });
  const { state } = e;
  let t = 0;
  while (state.status === 'playing' && t < maxMs) {
    if (e.canLaunch()) {
      let best = null;
      state.slots.forEach((s, i) => {
        if (!s) return;
        const n = exposedCount(state, s.color);
        if (n > 0 && (!best || n + 1000 > best.score)) best = { score: n + 1000, slot: i };
      });
      state.columns.forEach((c, i) => {
        if (!c[0]) return;
        const n = exposedCount(state, c[0].color);
        if (n > 0 && (!best || n > best.score)) best = { score: n, col: i };
      });
      if (best?.slot !== undefined) e.launchFromSlot(best.slot);
      else if (best) e.launchFromColumn(best.col);
      else if (!state.belt.length && !state.pending.length && state.slots.includes(null)) {
        let pick = state.columns.findIndex((c) => c[1] && e.canHit(c[1].color));
        if (pick < 0) pick = state.columns.findIndex((c) => c.length);
        if (pick >= 0) e.launchFromColumn(pick);
      }
    }
    e.step(50);
    t += 50;
  }
  return state;
}

/** Düşünmeden oynayan oyuncu: ara sıra rastgele bir jöle gönderir (zorluk ölçümü için). */
export function playRandom(level, seed, { maxMs = 4 * 60 * 1000 } = {}) {
  let s = seed >>> 0 || 1;
  const r = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const e = createEngine(level);
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
export function measureShooter(level, { runs = 30 } = {}) {
  const smart = playSmart(level);
  let wins = 0;
  for (let i = 1; i <= runs; i++) if (playRandom(level, i * 7919).status === 'won') wins++;
  return { solvable: smart.status === 'won', loseReason: smart.loseReason, randomWinRate: wins / runs };
}
