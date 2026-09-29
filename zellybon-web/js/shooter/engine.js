// Jöle Atış çekirdek mantığı (çizim yok; tarayıcıda ve Node'da çalışır).
//
// Kurallar:
// - Ortada küplerden bir resim var. Resmin çevresinde saat yönünün tersine dönen bir kaykay yolu var.
// - Altta jöle sütunları var; sadece her sütunun en öndeki jölesi seçilebilir.
// - Seçilen jöle yola çıkar, her şeritten geçerken o şeritteki İLK küp kendi rengindeyse onu vurur (mermi -1).
// - Mermisi biten jöle kaybolur. Bir tur atıp mermisi kalan jöle boş bir bekleme kutusuna iner.
//   Bekleme kutusundaki jöle tekrar yola gönderilebilir.
// - Tur bitiren jöle için boş kutu yoksa bölüm kaybedilir. Tüm küpler temizlenince bölüm kazanılır.

import { createRng } from '../game/rng.js';

export const SPEED = 9;          // saniyede geçilen şerit sayısı
export const ENTRY_SPACING = 1.3; // yola giriş için öndeki jöleyle en az mesafe (şerit)

/** Resimden ızgara üretir: grid[y][x] = renk harfi ya da null */
export function parseArt(art) {
  return art.map((row) => [...row].map((ch) => (ch === '.' ? null : ch)));
}

/**
 * Şerit p için vuruş yönü ve konumu. Yol sırası:
 * alt kenar (soldan sağa, yukarı ateş) → sağ kenar (aşağıdan yukarı, sola ateş) →
 * üst kenar (sağdan sola, aşağı ateş) → sol kenar (yukarıdan aşağı, sağa ateş)
 */
export function laneInfo(W, H, p) {
  if (p < W) return { side: 'bottom', x: p };
  if (p < W + H) return { side: 'right', y: H - 1 - (p - W) };
  if (p < 2 * W + H) return { side: 'top', x: W - 1 - (p - W - H) };
  return { side: 'left', y: p - 2 * W - H };
}

/** Şeritteki ilk (açıkta olan) küpün konumu ya da null */
export function firstCubeInLane(grid, p) {
  const H = grid.length;
  const W = grid[0].length;
  const lane = laneInfo(W, H, p);
  if (lane.side === 'bottom') {
    for (let y = H - 1; y >= 0; y--) if (grid[y][lane.x]) return { x: lane.x, y };
  } else if (lane.side === 'top') {
    for (let y = 0; y < H; y++) if (grid[y][lane.x]) return { x: lane.x, y };
  } else if (lane.side === 'right') {
    for (let x = W - 1; x >= 0; x--) if (grid[lane.y][x]) return { x, y: lane.y };
  } else {
    for (let x = 0; x < W; x++) if (grid[lane.y][x]) return { x, y: lane.y };
  }
  return null;
}

/** Bu renkte şu an vurulabilecek (açıkta) bir küp var mı? */
export function colorExposed(grid, color) {
  const L = 2 * (grid.length + grid[0].length);
  for (let p = 0; p < L; p++) {
    const c = firstCubeInLane(grid, p);
    if (c && grid[c.y][c.x] === color) return true;
  }
  return false;
}

// Küpleri dıştan içe katmanlara ayırır: 0 = baştan açıkta, 1 = 0'lar gidince açığa çıkan, ...
function peelLayers(grid) {
  const g = grid.map((row) => row.slice());
  const H = g.length;
  const W = g[0].length;
  const L = 2 * (W + H);
  const layer = grid.map((row) => row.map(() => -1));
  let remaining = g.flat().filter(Boolean).length;
  for (let k = 0; remaining > 0; k++) {
    const exposed = [];
    for (let p = 0; p < L; p++) {
      const c = firstCubeInLane(g, p);
      if (c && layer[c.y][c.x] === -1) {
        layer[c.y][c.x] = k;
        exposed.push(c);
      }
    }
    for (const c of exposed) g[c.y][c.x] = null;
    remaining -= exposed.length;
  }
  return layer;
}

/**
 * Bölümün jölelerini üretir. Her rengin toplam mermisi o renkteki küp sayısına tam eşittir.
 * Jöleler dıştan içe sıralanır; `shuffle` kadar rastgele sapma eklenir.
 * @returns {{ color: string, ammo: number }[][]} sütunlar (her sütunun başı = 0. eleman)
 */
export function buildColumns(level, seed = `main-${level.id}`) {
  const rng = createRng(seed);
  const grid = parseArt(level.art);
  const layer = peelLayers(grid);

  const byColor = new Map();
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    if (!byColor.has(c)) byColor.set(c, []);
    byColor.get(c).push(layer[y][x]);
  }));

  const shooters = [];
  for (const [color, layers] of byColor) {
    layers.sort((a, b) => a - b);
    let i = 0;
    while (i < layers.length) {
      const size = Math.min(level.ammo[rng.int(level.ammo.length)], layers.length - i);
      shooters.push({ color, ammo: size, key: layers[i] + (rng.next() - 0.5) * 2 * level.shuffle });
      i += size;
    }
  }
  shooters.sort((a, b) => a.key - b.key);

  const columns = Array.from({ length: level.columns }, () => []);
  shooters.forEach((s, k) => columns[k % level.columns].push({ color: s.color, ammo: s.ammo }));
  return columns;
}

let nextId = 1;

export function createEngine(level, { seed } = {}) {
  const grid = parseArt(level.art);
  const H = grid.length;
  const W = grid[0].length;
  const L = 2 * (W + H);
  const totalCubes = grid.flat().filter(Boolean).length;

  const state = {
    level,
    grid,
    W,
    H,
    L,
    totalCubes,
    cubesLeft: totalCubes,
    columns: buildColumns(level, seed).map((col) => col.map((s) => ({ id: nextId++, ...s }))),
    slots: Array(level.slots).fill(null),
    belt: [],     // yoldaki jöleler: { id, color, ammo, traveled, lastLane }
    pending: [],  // yola girmeyi bekleyenler
    status: 'playing', // 'playing' | 'won' | 'lost'
    loseReason: null,
    shots: 0,
  };

  const beltCount = () => state.belt.length + state.pending.length;
  const canLaunch = () => state.status === 'playing' && beltCount() < level.belt;

  function launch(shooter, from) {
    state.pending.push({ ...shooter, traveled: 0, lastLane: -1, from });
  }

  function launchFromColumn(c) {
    const col = state.columns[c];
    if (!col?.length || !canLaunch()) return false;
    launch(col.shift(), { type: 'column', index: c });
    return true;
  }

  function launchFromSlot(s) {
    const sh = state.slots[s];
    if (!sh || !canLaunch()) return false;
    state.slots[s] = null;
    launch(sh, { type: 'slot', index: s });
    return true;
  }

  // Hiçbir ilerleme mümkün değil mi? (yol boş, kutular dolu ve hiçbir seçilebilir jöle vuramıyor)
  function isStuck() {
    if (state.belt.length || state.pending.length) return false;
    if (state.slots.some((s) => !s)) return false;
    const candidates = [...state.slots, ...state.columns.map((col) => col[0]).filter(Boolean)];
    return !candidates.some((s) => colorExposed(state.grid, s.color));
  }

  /** Zamanı dt (ms) ilerletir; olay listesi döndürür (çizim/animasyon için). */
  function step(dt) {
    const events = [];
    if (state.status !== 'playing') return events;

    // Bekleyenler, önlerindeki jöle yeterince uzaklaşınca yola girer
    while (state.pending.length) {
      const last = state.belt[state.belt.length - 1];
      if (last && last.traveled < ENTRY_SPACING) break;
      const sh = state.pending.shift();
      state.belt.push(sh);
      events.push({ type: 'enter', shooter: sh });
    }

    const advance = (SPEED * dt) / 1000;
    for (const sh of [...state.belt]) {
      sh.traveled += advance;
      const lane = Math.min(L - 1, Math.floor(sh.traveled));
      // Kare atlamalarında aradaki şeritleri de işle
      for (let p = sh.lastLane + 1; p <= lane && sh.ammo > 0; p++) {
        sh.lastLane = p;
        const cube = firstCubeInLane(state.grid, p);
        if (cube && state.grid[cube.y][cube.x] === sh.color) {
          state.grid[cube.y][cube.x] = null;
          state.cubesLeft--;
          state.shots++;
          sh.ammo--;
          events.push({ type: 'hit', shooter: sh, lane: p, cube, color: sh.color });
        }
      }
      if (sh.ammo <= 0) {
        state.belt.splice(state.belt.indexOf(sh), 1);
        events.push({ type: 'empty', shooter: sh });
      } else if (sh.traveled >= L) {
        state.belt.splice(state.belt.indexOf(sh), 1);
        const free = state.slots.indexOf(null);
        if (free === -1) {
          state.status = 'lost';
          state.loseReason = 'slots';
          events.push({ type: 'overflow', shooter: sh });
          events.push({ type: 'lose', reason: 'slots' });
          return events;
        }
        const { traveled, lastLane, from, ...rest } = sh;
        state.slots[free] = rest;
        events.push({ type: 'toSlot', shooter: rest, slot: free });
      }
    }

    if (state.cubesLeft === 0) {
      state.status = 'won';
      events.push({ type: 'win' });
    } else if (isStuck()) {
      state.status = 'lost';
      state.loseReason = 'stuck';
      events.push({ type: 'lose', reason: 'stuck' });
    }
    return events;
  }

  return { state, step, launchFromColumn, launchFromSlot, canLaunch, beltCount };
}
