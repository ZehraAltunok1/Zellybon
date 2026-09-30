// Nakış çekirdek mantığı (çizim yok; tarayıcıda ve Node'da çalışır).
//
// Kurallar:
// - Renksiz bir tablo var; her hücrenin olması gereken rengi soluk bir iz olarak görünür.
// - Altta ip makarası sütunları var (her makarada aynı uzunlukta ip). Öndeki makara seçilebilir.
// - Seçilen makara tablonun çevresindeki yolda döner. Her şeritten geçerken ip, o şeridin kenar
//   hücresinden tabloya girer ve BOYANMAMIŞ hücrelerin arasından (labirent gibi) yol bularak kendi
//   rengindeki EN İÇTEKİ hücreyi işler (ip 1 azalır). Boyanmış hücreler ipin geçişini kapatır.
// - Boyama içten başlar: ip sadece şu an en içte kalan katmanlardaki hücreleri işleyebilir
//   (en derin işlenmemiş katman ve `slack` kadar dışındakiler).
// - Ayrıca bir hücre, işlenince başka bir boyanmamış hücrenin dışarıyla bağlantısını keseceksa işlenemez.
//   Bu yüzden yanlış renk "yapamaz": ipi kalır ve tur sonunda bekleme kutusuna iner.
// - Bir rengin bütün hücreleri işlenince o renkteki kalan makaralar kaldırılır.
// - Tur bitiren makara için boş kutu yoksa ya da hiçbir makara ilerleyemiyorsa bölüm kaybedilir.
//   Bütün tablo işlenince bölüm kazanılır.
//
// En içteki (dışarıya en uzak) boyanmamış hücre işlenince hiçbir hücrenin bağlantısı kopmaz; bu yüzden
// doğru rengi veren oyuncu her zaman ilerleyebilir.
// - Engeller (bölümün isteğe bağlı `mods` katmanı; tabloyla aynı boyutta, '.' = engel yok):
//   'a' Çift ilmek: hücre iki kez işlenmeli (iki ip harcar); ilk ilmekten sonra hâlâ yol verir.
//   'l' Düğüm: yanındaki (4 komşu) hücrelerden biri tamamen işlenene kadar işlenemez.

import { createRng } from '../game/rng.js';
import { parseArt, laneInfo } from '../shooter/engine.js';

export const SPEED = 9;
export const ENTRY_SPACING = 1.3;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Şeridin tabloya giriş hücresi (kenardaki hücre) */
export function entryCell(W, H, p) {
  const lane = laneInfo(W, H, p);
  if (lane.side === 'bottom') return { x: lane.x, y: H - 1 };
  if (lane.side === 'top') return { x: lane.x, y: 0 };
  if (lane.side === 'right') return { x: W - 1, y: lane.y };
  return { x: 0, y: lane.y };
}

/** Her hücrenin dışarıya uzaklığı (kenar hücreler ve tablo dışı boşluklar 0). Tablonun şekline göre sabittir. */
export function computeDepth(grid) {
  const H = grid.length;
  const W = grid[0].length;
  const depth = grid.map((row) => row.map(() => Infinity));
  const queue = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || grid[y][x] === null) {
        depth[y][x] = 0;
        queue.push([x, y]);
      }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const [x, y] = queue[q];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (depth[ny][nx] > depth[y][x] + 1) {
        depth[ny][nx] = depth[y][x] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  return depth;
}

/**
 * Makaraları üretir: her renk, o renkteki hücre sayısı kadar ipe ihtiyaç duyar; ipler eşit uzunlukta
 * makaralara bölünür (son makarada fazla ip kalabilir). Makaralar içten dışa sıralanır, `shuffle` kadar sapar.
 */
export function buildSpoolColumns(level, seed = level.seed ?? `nakis-${level.id}`) {
  const rng = createRng(seed);
  const grid = parseArt(level.art);
  const depth = computeDepth(grid);
  const { need } = parseNakisMods(level);
  const byColor = new Map();
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    if (!byColor.has(c)) byColor.set(c, []);
    for (let k = 0; k < need[y][x]; k++) byColor.get(c).push(depth[y][x]);
  }));

  const spools = [];
  for (const [color, depths] of byColor) {
    depths.sort((a, b) => b - a); // en içteki önce
    for (let i = 0; i < depths.length; i += level.spool) {
      spools.push({ color, ammo: level.spool, key: -depths[i] + (rng.next() - 0.5) * 2 * level.shuffle });
    }
  }
  spools.sort((a, b) => a.key - b.key);
  const columns = Array.from({ length: level.columns }, () => []);
  spools.forEach((s, k) => columns[k % level.columns].push({ color: s.color, ammo: s.ammo }));
  return columns;
}

/** Engel katmanı: need[y][x] (çift ilmek = 2, normal = 1, boş = 0) ve locked[y][x] */
export function parseNakisMods(level) {
  const grid = parseArt(level.art);
  const rows = level.mods ?? [];
  const need = grid.map((row, y) => row.map((c, x) => (!c ? 0 : rows[y]?.[x] === 'a' ? 2 : 1)));
  const locked = grid.map((row, y) => row.map((c, x) => Boolean(c) && rows[y]?.[x] === 'l'));
  return { need, locked };
}

let nextId = 1;

export function createNakisEngine(level, { seed } = {}) {
  const grid = parseArt(level.art); // hedef renkler (null = tablonun dışı)
  const H = grid.length;
  const W = grid[0].length;
  const L = 2 * (W + H);
  const depth = computeDepth(grid);
  const painted = grid.map((row) => row.map(() => false));
  const totalCubes = grid.flat().filter(Boolean).length;
  const { need, locked } = parseNakisMods(level);
  const done = grid.map((row) => row.map(() => 0)); // hücreye atılan ilmek sayısı
  const left = {}; // renk → kalan ilmek sayısı
  grid.forEach((row, y) => row.forEach((c, x) => c && (left[c] = (left[c] ?? 0) + need[y][x])));

  const state = {
    level,
    grid,
    painted,
    need,
    done,
    locked,
    depth,
    W,
    H,
    L,
    totalCubes,
    cubesLeft: totalCubes,
    left,
    // `ammo`: makarada kalan ip (Jöle Atış çizimiyle ortak alan adı)
    columns: buildSpoolColumns(level, seed).map((col) => col.map((s) => ({ id: nextId++, ...s }))),
    slots: Array(level.slots).fill(null),
    belt: [],
    pending: [],
    status: 'playing',
    loseReason: null,
  };

  const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (grid[y][x] === null || !painted[y][x]);
  const slack = level.slack ?? 1;

  // İşlenebilecek en dış katman: en derin işlenmemiş hücrenin derinliği − slack
  function minPaintableDepth() {
    let max = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) if (grid[y][x] && !painted[y][x] && depth[y][x] > max) max = depth[y][x];
    }
    return max - slack;
  }

  // Kenardaki açık hücrelerden başlayarak ulaşılabilen işlenmemiş hücre sayısı
  function reachableUnpaintedFromOutside() {
    const seen = grid.map((row) => row.map(() => false));
    const queue = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && open(x, y)) {
          seen[y][x] = true;
          queue.push([x, y]);
        }
      }
    }
    let count = 0;
    for (let q = 0; q < queue.length; q++) {
      const [x, y] = queue[q];
      if (grid[y][x] && !painted[y][x]) count++;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (open(nx, ny) && !seen[ny][nx]) {
          seen[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
    return count;
  }

  // Bu hücre işlenirse diğer bütün işlenmemiş hücreler hâlâ dışarıya bağlı kalır mı?
  function safeToPaint(x, y) {
    painted[y][x] = true;
    const ok = reachableUnpaintedFromOutside() === state.cubesLeft - 1;
    painted[y][x] = false;
    return ok;
  }

  // Hücreye bir ilmek atılabilir mi? (kilitsiz ve, hücreyi tamamlıyorsa, kimsenin yolunu kesmiyor)
  const stitchable = (x, y) => !locked[y][x] && (done[y][x] + 1 < need[y][x] || safeToPaint(x, y));

  // Bir ilmek atar; hücre tamamlanırsa işlenmiş sayılır ve komşu düğümler çözülür
  function applyStitch(x, y, color, events, extra) {
    done[y][x]++;
    left[color]--;
    const complete = done[y][x] >= need[y][x];
    if (complete) {
      painted[y][x] = true;
      state.cubesLeft--;
    }
    events.push({ type: 'hit', cube: { x, y }, color, partial: !complete, ...extra });
    if (!complete) return;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !locked[ny][nx]) continue;
      locked[ny][nx] = false;
      events.push({ type: 'unlock', cube: { x: nx, y: ny } });
    }
  }

  // Giriş hücresinden açık hücreler üzerinden BFS: ulaşılan hücreler ve yol için ebeveynler
  function explore(start) {
    const parent = new Map();
    const key = (x, y) => y * W + x;
    if (!open(start.x, start.y)) return { parent, order: [] };
    const order = [start];
    parent.set(key(start.x, start.y), null);
    for (let q = 0; q < order.length; q++) {
      const { x, y } = order[q];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (open(nx, ny) && !parent.has(key(nx, ny))) {
          parent.set(key(nx, ny), key(x, y));
          order.push({ x: nx, y: ny });
        }
      }
    }
    return { parent, order };
  }

  function pathTo(parent, target) {
    const path = [];
    let k = target.y * W + target.x;
    while (k !== null && k !== undefined) {
      path.push({ x: k % W, y: Math.floor(k / W) });
      k = parent.get(k);
    }
    return path.reverse(); // girişten hedefe
  }

  /** Şerit p'den bu renkle işlenebilecek hücre: { cell, path } ya da null */
  function findStitch(color, p) {
    const { parent, order } = explore(entryCell(W, H, p));
    const minDepth = minPaintableDepth();
    // Adaylar: en içteki önce, eşitse girişe en yakın olan
    const candidates = order
      .map((c, i) => ({ ...c, i }))
      .filter(({ x, y }) => grid[y][x] === color && !painted[y][x] && depth[y][x] >= minDepth)
      .sort((a, b) => depth[b.y][b.x] - depth[a.y][a.x] || a.i - b.i);
    for (const c of candidates) {
      if (stitchable(c.x, c.y)) return { cell: { x: c.x, y: c.y }, path: pathTo(parent, c) };
    }
    return null;
  }

  /**
   * Bu renk şu an bir hücre işleyebilir mi? Her kenar hücresi bir şeridin girişi olduğundan ve işlenmemiş
   * hücreler hep dışarıya bağlı kaldığından, güvenle işlenebilecek bir hücre olması yeterlidir.
   */
  function canStitchColor(color) {
    if (!left[color]) return false;
    const minDepth = minPaintableDepth();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (grid[y][x] === color && !painted[y][x] && depth[y][x] >= minDepth && stitchable(x, y)) return true;
      }
    }
    return false;
  }

  const beltCount = () => state.belt.length + state.pending.length;
  const canLaunch = () => state.status === 'playing' && beltCount() < level.belt;

  function launch(spool, from) {
    state.pending.push({ ...spool, traveled: 0, lastLane: -1, from });
  }

  function launchFromColumn(c) {
    const col = state.columns[c];
    if (!col?.length || !canLaunch()) return false;
    launch(col.shift(), { type: 'column', index: c });
    return true;
  }

  function launchFromSlot(s) {
    const sp = state.slots[s];
    if (!sp || !canLaunch()) return false;
    state.slots[s] = null;
    launch(sp, { type: 'slot', index: s });
    return true;
  }

  // Bir rengin bütün hücreleri işlenince o renkteki makaralar kalkar
  function retireColor(color, events) {
    const drop = (sp) => {
      if (sp && sp.color === color) {
        events.push({ type: 'retire', shooter: sp });
        return true;
      }
      return false;
    };
    state.columns = state.columns.map((col) => col.filter((sp) => !drop(sp)));
    state.slots = state.slots.map((sp) => (drop(sp) ? null : sp));
    state.belt = state.belt.filter((sp) => !drop(sp));
    state.pending = state.pending.filter((sp) => !drop(sp));
    events.push({ type: 'colorDone', color });
  }

  function isStuck() {
    if (state.belt.length || state.pending.length) return false;
    if (state.slots.some((s) => !s)) return false;
    const candidates = [...state.slots, ...state.columns.map((col) => col[0]).filter(Boolean)];
    return !candidates.some((s) => canStitchColor(s.color));
  }

  function step(dt) {
    const events = [];
    if (state.status !== 'playing') return events;

    while (state.pending.length) {
      const nearest = state.belt.reduce((m, b) => Math.min(m, b.traveled), Infinity);
      if (nearest < ENTRY_SPACING) break;
      const sp = state.pending.shift();
      state.belt.push(sp);
      events.push({ type: 'enter', shooter: sp });
    }

    const advance = (SPEED * dt) / 1000;
    for (const sp of [...state.belt]) {
      if (!state.belt.includes(sp)) continue; // bu karede renk tamamlanıp kalkmış olabilir
      sp.traveled += advance;
      const lane = Math.min(L - 1, Math.floor(sp.traveled));
      for (let p = sp.lastLane + 1; p <= lane && sp.ammo > 0 && left[sp.color]; p++) {
        sp.lastLane = p;
        const found = findStitch(sp.color, p);
        if (!found) continue;
        sp.ammo--;
        applyStitch(found.cell.x, found.cell.y, sp.color, events, { shooter: sp, lane: p, path: found.path });
      }
      if (!state.belt.includes(sp)) continue;
      if (!left[sp.color]) {
        retireColor(sp.color, events);
      } else if (sp.ammo <= 0) {
        state.belt.splice(state.belt.indexOf(sp), 1);
        events.push({ type: 'empty', shooter: sp });
      } else if (sp.traveled >= L) {
        state.belt.splice(state.belt.indexOf(sp), 1);
        const free = state.slots.indexOf(null);
        if (free === -1) {
          state.status = 'lost';
          state.loseReason = 'slots';
          events.push({ type: 'overflow', shooter: sp });
          events.push({ type: 'lose', reason: 'slots' });
          return events;
        }
        const { traveled, lastLane, from, ...rest } = sp;
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

  // ---------- Jokerler ----------

  /** Makas: kutudaki ya da sütun başındaki bir makarayı atar. */
  function discard(target) {
    if (state.status !== 'playing') return [];
    let sp = null;
    if (target.type === 'slot') {
      sp = state.slots[target.index];
      if (sp) state.slots[target.index] = null;
    } else {
      sp = state.columns[target.index]?.shift() ?? null;
    }
    return sp ? [{ type: 'retire', shooter: sp, from: target }] : [];
  }

  /** Ekstra Kutu: bu bölüm için +1 bekleme kutusu. */
  function addSlot() {
    state.slots.push(null);
  }

  /** Sihirli İğne: en içteki `count` hücreyi doğru renkleriyle işler. */
  function autoStitch(count) {
    const events = [];
    for (let k = 0; k < count && state.cubesLeft > 0; k++) {
      // Tablonun en içteki, güvenle işlenebilecek hücresinin rengi
      let best = null;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!grid[y][x] || painted[y][x]) continue;
          if (best && depth[y][x] <= best.d) continue;
          if (stitchable(x, y)) best = { color: grid[y][x], d: depth[y][x] };
        }
      }
      if (!best) break;
      // Bu renk için hücreye ulaşan bir şerit bul
      let stitched = false;
      for (let p = 0; p < L && !stitched; p++) {
        const found = findStitch(best.color, p);
        if (!found) continue;
        applyStitch(found.cell.x, found.cell.y, best.color, events, { shooter: null, lane: p, path: found.path });
        if (!left[best.color]) retireColor(best.color, events);
        stitched = true;
      }
      if (!stitched) break;
    }
    return events;
  }

  /** Mıknatıs: her sütunda şu an işe yarayacak ilk makarayı en öne çeker. */
  function sortColumns() {
    let moved = 0;
    for (const col of state.columns) {
      const i = col.findIndex((sp) => canStitchColor(sp.color));
      if (i > 0) {
        col.unshift(...col.splice(i, 1));
        moved++;
      }
    }
    return moved;
  }

  return {
    state, step, launchFromColumn, launchFromSlot, canLaunch, beltCount, canStitchColor, findStitch,
    discard, addSlot, autoStitch, sortColumns,
  };
}
