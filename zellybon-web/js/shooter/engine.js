// Jöle Atış çekirdek mantığı (çizim yok; tarayıcıda ve Node'da çalışır).
//
// Kurallar:
// - Ortada küplerden bir resim var. Resmin çevresinde saat yönünün tersine dönen bir kaykay yolu var.
// - Altta jöle sütunları var; sadece her sütunun en öndeki jölesi seçilebilir.
// - Seçilen jöle yola çıkar, her şeritten geçerken o şeritteki İLK küp kendi rengindeyse onu vurur (mermi -1).
// - Mermisi biten jöle kaybolur. Bir tur atıp mermisi kalan jöle boş bir bekleme kutusuna iner.
//   Bekleme kutusundaki jöle tekrar yola gönderilebilir.
// - Tur bitiren jöle için boş kutu yoksa bölüm kaybedilir. Tüm küpler temizlenince bölüm kazanılır.
// - Karakterli jöleler (her vuruş yine 1 mermi harcar, böylece mermi hesabı hep tutar):
//   Zıplayan (bounce): şeritte 2 küp vurur. Roket (fast): yolda daha hızlı gider.
//   Delici (pierce): şeritte art arda gelen aynı renk küplerin hepsini vurur.
//   Bomba (bomb): vurduğu küpün 4 komşusundaki aynı renk küpleri de vurur (içerideki küplere ulaşır).
// - Engeller (bölümün isteğe bağlı `mods` katmanı; resimle aynı boyutta, '.' = engel yok):
//   'a' Zırhlı küp: iki vuruşta kırılır (ilk vuruş zırhı düşürür). Mermi hesabında 2 sayılır.
//   'l' Kilitli küp: yanındaki (4 komşu) herhangi bir küp patlayana kadar vurulamaz; şeridi kapatır.

import { createRng } from '../game/rng.js';

export const SPEED = 9;          // saniyede geçilen şerit sayısı
export const ENTRY_SPACING = 1.3; // yola giriş için öndeki jöleyle en az mesafe (şerit)
export const FAST_MULTIPLIER = 1.8;

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

/** Engel katmanı: hp[y][x] (zırhlı = 2, normal = 1, boş = 0) ve locked[y][x] */
export function parseMods(level) {
  const grid = parseArt(level.art);
  const rows = level.mods ?? [];
  const hp = grid.map((row, y) => row.map((c, x) => (!c ? 0 : rows[y]?.[x] === 'a' ? 2 : 1)));
  const locked = grid.map((row, y) => row.map((c, x) => Boolean(c) && rows[y]?.[x] === 'l'));
  return { hp, locked };
}

/** Bu renkte şu an vurulabilecek (açıkta ve kilitsiz) bir küp var mı? */
export function colorExposed(grid, color, locked = null) {
  const L = 2 * (grid.length + grid[0].length);
  for (let p = 0; p < L; p++) {
    const c = firstCubeInLane(grid, p);
    if (c && grid[c.y][c.x] === color && !locked?.[c.y][c.x]) return true;
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
  const { hp } = parseMods(level);

  // Her vuruş için bir mermi: zırhlı küpler iki kez sayılır
  const byColor = new Map();
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    if (!byColor.has(c)) byColor.set(c, []);
    for (let k = 0; k < hp[y][x]; k++) byColor.get(c).push(layer[y][x]);
  }));

  const shooters = [];
  for (const [color, layers] of byColor) {
    layers.sort((a, b) => a - b);
    let i = 0;
    while (i < layers.length) {
      const size = Math.min(level.ammo[rng.int(level.ammo.length)], layers.length - i);
      const ability = level.abilities?.length && rng.next() < (level.abilityRate ?? 0)
        ? level.abilities[rng.int(level.abilities.length)]
        : null;
      shooters.push({ color, ammo: size, ability, key: layers[i] + (rng.next() - 0.5) * 2 * level.shuffle });
      i += size;
    }
  }
  shooters.sort((a, b) => a.key - b.key);
  // Bölümün tanıttığı yeni karakter mutlaka görünsün: yoksa ilk jölelerden birine verilir
  if (level.intro && !shooters.some((s) => s.ability === level.intro)) {
    shooters[Math.min(1, shooters.length - 1)].ability = level.intro;
  }

  const columns = Array.from({ length: level.columns }, () => []);
  shooters.forEach((s, k) => columns[k % level.columns].push({ color: s.color, ammo: s.ammo, ability: s.ability }));
  return columns;
}

let nextId = 1;

/**
 * @param {object} level
 * @param {{ seed?: string, boosters?: { extraSlot?: boolean, superStart?: boolean } }} [opts]
 *   extraSlot: +1 bekleme kutusu, superStart: her sütunun ilk jölesi Delici olur
 */
export function createEngine(level, { seed, boosters = {} } = {}) {
  const grid = parseArt(level.art);
  const H = grid.length;
  const W = grid[0].length;
  const L = 2 * (W + H);
  const totalCubes = grid.flat().filter(Boolean).length;
  const { hp, locked } = parseMods(level);

  const state = {
    level,
    grid,
    hp,
    locked,
    W,
    H,
    L,
    totalCubes,
    cubesLeft: totalCubes,
    columns: buildColumns(level, seed).map((col) => col.map((s) => ({ id: nextId++, ...s }))),
    slots: Array(level.slots + (boosters.extraSlot ? 1 : 0)).fill(null),
    belt: [],     // yoldaki jöleler: { id, color, ammo, traveled, lastLane }
    pending: [],  // yola girmeyi bekleyenler
    status: 'playing', // 'playing' | 'won' | 'lost'
    loseReason: null,
    shots: 0,
  };

  if (boosters.superStart) {
    for (const col of state.columns) if (col[0]) col[0].ability = 'pierce';
  }

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
    return !candidates.some((s) => colorExposed(state.grid, s.color, state.locked));
  }

  /** Bu renkteki bir jöle şu an bir şey vurabilir mi? (botlar ve ipuçları için) */
  const canHit = (color) => colorExposed(state.grid, color, state.locked);

  function hit(sh, cube, lane, events, via = null) {
    state.shots++;
    sh.ammo--;
    if (state.hp[cube.y][cube.x] > 1) {
      // Zırh düşer, küp yerinde kalır
      state.hp[cube.y][cube.x]--;
      events.push({ type: 'armor', shooter: sh, lane, cube, color: sh.color, via });
      return;
    }
    state.hp[cube.y][cube.x] = 0;
    state.grid[cube.y][cube.x] = null;
    state.cubesLeft--;
    events.push({ type: 'hit', shooter: sh, lane, cube, color: sh.color, via });
    // Yanındaki kilitli küplerin kilidi açılır
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cube.x + dx;
      const ny = cube.y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !state.locked[ny][nx]) continue;
      state.locked[ny][nx] = false;
      events.push({ type: 'unlock', cube: { x: nx, y: ny } });
    }
  }

  const matches = (cube, color) => cube && state.grid[cube.y][cube.x] === color && !state.locked[cube.y][cube.x];

  // Bir şeritten geçerken ateş: ilk küp jölenin rengindeyse vurur, sonra karakter yeteneği devreye girer
  function fireLane(sh, p, events) {
    const cube = firstCubeInLane(state.grid, p);
    if (!matches(cube, sh.color)) return;
    hit(sh, cube, p, events);

    if (sh.ability === 'bounce' || sh.ability === 'pierce') {
      let extra = sh.ability === 'bounce' ? 1 : Infinity;
      while (extra-- > 0 && sh.ammo > 0) {
        const next = firstCubeInLane(state.grid, p);
        if (!matches(next, sh.color)) break;
        hit(sh, next, p, events, sh.ability);
      }
    } else if (sh.ability === 'bomb') {
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (sh.ammo <= 0) break;
        const n = { x: cube.x + dx, y: cube.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= W || n.y >= H) continue;
        if (matches(n, sh.color)) hit(sh, n, p, events, 'bomb');
      }
    }
  }

  /** Zamanı dt (ms) ilerletir; olay listesi döndürür (çizim/animasyon için). */
  function step(dt) {
    const events = [];
    if (state.status !== 'playing') return events;

    // Bekleyenler, önlerindeki jöle yeterince uzaklaşınca yola girer
    while (state.pending.length) {
      const nearest = state.belt.reduce((m, b) => Math.min(m, b.traveled), Infinity);
      if (nearest < ENTRY_SPACING) break;
      const sh = state.pending.shift();
      state.belt.push(sh);
      events.push({ type: 'enter', shooter: sh });
    }

    const advance = (SPEED * dt) / 1000;
    for (const sh of [...state.belt]) {
      sh.traveled += sh.ability === 'fast' ? advance * FAST_MULTIPLIER : advance;
      const lane = Math.min(L - 1, Math.floor(sh.traveled));
      // Kare atlamalarında aradaki şeritleri de işle
      for (let p = sh.lastLane + 1; p <= lane && sh.ammo > 0; p++) {
        sh.lastLane = p;
        fireLane(sh, p, events);
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

  return { state, step, launchFromColumn, launchFromSlot, canLaunch, beltCount, canHit };
}
