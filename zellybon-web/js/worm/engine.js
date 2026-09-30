// Jöle Solucan oyun mantığı (çizimden bağımsız, testlerde de kullanılır).
//
// Yuvarlak bir arenada oyuncu ve bot solucanlar şeker yiyerek büyür. Başın başka bir solucanın
// gövdesine değerse ölürsün ve şekere dönüşürsün. Hızlanmak boy harcar. Kendi yorumumuz:
// güç şekerleri (mıknatıs, kalkan, turbo), taç en büyük solucanda, tur 3 dakika sürer.

import { createRng } from '../game/rng.js';

const TAU = Math.PI * 2;

export const WORLD_R = 1300;
export const ROUND_S = 180;
export const START_MASS = 20;
export const BOT_COUNT = 9;
const FOOD_TARGET = 650;
const POWER_MAX = 4;
const CELL = 64;

export const POWERS = {
  magnet: { name: 'Mıknatıs', icon: '🧲', duration: 10, color: 'e' },
  shield: { name: 'Kalkan', icon: '🛡️', duration: 6, color: 'c' },
  turbo: { name: 'Turbo', icon: '⚡', duration: 6, color: 'y' },
};
const POWER_KINDS = Object.keys(POWERS);

export const SKINS = [
  { id: 'portakal', name: 'Portakal', a: 'o', b: 'y' },
  { id: 'cilek', name: 'Çilek', a: 'r', b: 'i' },
  { id: 'nane', name: 'Nane', a: 'm', b: 'g' },
  { id: 'bogurtlen', name: 'Böğürtlen', a: 'p', b: 'e' },
  { id: 'deniz', name: 'Deniz', a: 'b', b: 'c' },
  { id: 'limon', name: 'Limon', a: 'y', b: 'l' },
];

const BOT_NAMES = ['Lokum', 'Pamuk', 'Karamel', 'Fındık', 'Boncuk', 'Tarçın', 'Limoncuk', 'Zıpzıp', 'Şekerpare', 'Pıtırcık', 'Badem', 'Kurabiye'];
const FOOD_COLORS = ['r', 'o', 'y', 'g', 'b', 'p', 'i', 'c', 'e', 'm', 'l'];

export const segCount = (mass) => 8 + Math.floor(mass / 3);
export const radiusOf = (mass) => 8 + Math.min(16, Math.sqrt(mass) * 0.65);
const speedOf = (w) => (w.boosting ? 270 : 150);
const turnRateOf = (mass) => 4.6 - Math.min(2, mass / 400);

function cellKey(cx, cy) {
  return (cx + 1000) * 4096 + (cy + 1000);
}

export function createWormEngine({ seed = 'worm', skin = SKINS[0], bots = BOT_COUNT, playerName = 'Sen' } = {}) {
  const rng = createRng(String(seed));
  const rand = (a = 1, b) => (b === undefined ? rng.next() * a : a + rng.next() * (b - a));
  let nextId = 1;

  const state = {
    t: 0,
    worms: [],
    food: [],
    player: null,
    leader: null,
    over: false,
    reason: null, // 'dead' | 'time'
    powerTimer: 3,
  };

  function randomPoint(maxR = WORLD_R - 60) {
    const r = Math.sqrt(rng.next()) * maxR;
    const a = rng.next() * TAU;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  function addFood(x, y, v, color = FOOD_COLORS[Math.floor(rand(FOOD_COLORS.length))], kind = null) {
    state.food.push({ x, y, v, color, kind, r: kind ? 13 : 3.5 + v * 1.5, born: state.t, id: nextId++ });
  }

  function spawnFood() {
    const p = randomPoint();
    const big = rng.next() < 0.12;
    addFood(p.x, p.y, big ? 3 : rng.next() < 0.5 ? 1 : 1.5);
  }

  function makeWorm({ name, skinDef, mass, isPlayer = false, at = null }) {
    const p = at ?? randomPoint(WORLD_R * 0.8);
    const dir = rand(TAU);
    const r = radiusOf(mass);
    const pts = [];
    for (let i = 0; i < segCount(mass); i++) {
      pts.push({ x: p.x - Math.cos(dir) * i * r * 0.55, y: p.y - Math.sin(dir) * i * r * 0.55 });
    }
    return {
      id: nextId++,
      name,
      skin: skinDef,
      isPlayer,
      pts,
      dir,
      target: dir,
      mass,
      r,
      alive: true,
      boosting: false,
      wantBoost: false,
      dropAcc: 0,
      kills: 0,
      effects: { magnet: 0, shield: 0, turbo: 0 },
      respawnAt: 0,
      diedAt: 0,
      ai: { next: 0, skill: rand(0.35, 1), aggression: rand(0.1, 0.6), wander: rand(TAU) },
    };
  }

  function farFromPlayer() {
    for (let k = 0; k < 20; k++) {
      const p = randomPoint(WORLD_R * 0.8);
      const pl = state.player;
      if (!pl || Math.hypot(p.x - pl.pts[0].x, p.y - pl.pts[0].y) > 500) return p;
    }
    return randomPoint(WORLD_R * 0.8);
  }

  function spawnBot(existing = null) {
    const skinDef = { a: FOOD_COLORS[Math.floor(rand(FOOD_COLORS.length))], b: FOOD_COLORS[Math.floor(rand(FOOD_COLORS.length))] };
    // Bazı botlar büyük başlar: taç için rekabet olsun
    const mass = rng.next() < 0.3 ? rand(90, 200) : rand(20, 70);
    const name = existing?.name ?? BOT_NAMES[state.worms.length % BOT_NAMES.length];
    const w = makeWorm({ name, skinDef, mass, at: farFromPlayer() });
    if (existing) Object.assign(existing, { ...w, id: existing.id, name, kills: existing.kills });
    else state.worms.push(w);
  }

  // Başlangıç
  state.player = makeWorm({ name: playerName, skinDef: skin, mass: START_MASS, isPlayer: true, at: randomPoint(300) });
  state.worms.push(state.player);
  for (let k = 0; k < bots; k++) spawnBot();
  for (let k = 0; k < FOOD_TARGET; k++) spawnFood();

  // ---------- Uzamsal ızgara ----------
  let segGrid = new Map();
  let foodGrid = new Map();

  function buildGrids() {
    segGrid = new Map();
    for (const w of state.worms) {
      if (!w.alive) continue;
      w.pts.forEach((p, i) => {
        const key = cellKey(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
        let list = segGrid.get(key);
        if (!list) segGrid.set(key, (list = []));
        list.push({ w, i, x: p.x, y: p.y });
      });
    }
    foodGrid = new Map();
    for (const f of state.food) {
      const key = cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
      let list = foodGrid.get(key);
      if (!list) foodGrid.set(key, (list = []));
      list.push(f);
    }
  }

  function query(grid, x, y, radius, fn) {
    const x0 = Math.floor((x - radius) / CELL);
    const x1 = Math.floor((x + radius) / CELL);
    const y0 = Math.floor((y - radius) / CELL);
    const y1 = Math.floor((y + radius) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const list = grid.get(cellKey(cx, cy));
        if (list) for (const item of list) fn(item);
      }
    }
  }

  /** (x,y) noktasında başka solucanlara ve duvara olan boşluk (me hariç) */
  function clearance(me, x, y, radius) {
    let best = WORLD_R - Math.hypot(x, y);
    query(segGrid, x, y, radius, (s) => {
      if (s.w === me) return;
      const d = Math.hypot(s.x - x, s.y - y) - s.w.r;
      if (d < best) best = d;
    });
    return best;
  }

  // ---------- Bot aklı ----------
  const OFFSETS = [0, -0.35, 0.35, -0.75, 0.75, -1.25, 1.25, -1.9, 1.9];

  function think(w) {
    const head = w.pts[0];
    const look = w.r * 3 + 55 + w.ai.skill * 45;
    const probe = (a) => {
      let worst = Infinity;
      for (const f of [0.2, 0.45, 0.75, 1]) {
        const c = clearance(w, head.x + Math.cos(a) * look * f, head.y + Math.sin(a) * look * f, 40);
        worst = Math.min(worst, c);
      }
      return worst;
    };
    const ahead = probe(w.dir);
    w.ai.danger = false;
    if (ahead < w.r * 2 + 14) {
      w.ai.danger = true;
      // Tehlike: en açık yöne kaç
      let bestA = w.dir;
      let bestC = -Infinity;
      for (const off of OFFSETS) {
        const c = probe(w.dir + off) - Math.abs(off) * 3;
        if (c > bestC) {
          bestC = c;
          bestA = w.dir + off;
        }
      }
      w.target = bestA;
      w.wantBoost = false;
      return;
    }

    // Avlanma: küçük bir solucanın önünü kes
    if (w.ai.skill > 0.6 && w.mass > 45) {
      let prey = null;
      for (const o of state.worms) {
        if (o === w || !o.alive || o.mass * 1.1 > w.mass) continue;
        const d = Math.hypot(o.pts[0].x - head.x, o.pts[0].y - head.y);
        if (d < 260 && (!prey || d < prey.d)) prey = { o, d };
      }
      if (prey && rng.next() < w.ai.aggression) {
        const o = prey.o;
        const tx = o.pts[0].x + Math.cos(o.dir) * 110;
        const ty = o.pts[0].y + Math.sin(o.dir) * 110;
        w.target = Math.atan2(ty - head.y, tx - head.x);
        w.wantBoost = prey.d < 200 && w.mass > 40;
        return;
      }
    }

    // Şeker: değer / uzaklık en iyi olan
    let best = null;
    query(foodGrid, head.x, head.y, 300, (f) => {
      const d = Math.hypot(f.x - head.x, f.y - head.y);
      if (d > 300) return;
      const value = (f.kind ? 6 : f.v) / (d + 40);
      if (!best || value > best.value) best = { f, value, d };
    });
    w.wantBoost = false;
    if (best) {
      w.target = Math.atan2(best.f.y - head.y, best.f.x - head.x);
      // Ölen solucanın şekerlerine koş
      if (best.f.v >= 3 && best.d > 90 && w.mass > 35 && w.ai.skill > 0.5) w.wantBoost = true;
      return;
    }
    // Dolaş; kenara yaklaştıysa merkeze dön
    const dist = Math.hypot(head.x, head.y);
    if (dist > WORLD_R * 0.75) w.target = Math.atan2(-head.y, -head.x);
    else {
      w.ai.wander += (rng.next() - 0.5) * 0.8;
      w.target = w.ai.wander;
    }
  }

  // ---------- Hareket ----------
  function turnToward(w, dt) {
    let d = w.target - w.dir;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const max = turnRateOf(w.mass) * dt;
    w.dir += Math.max(-max, Math.min(max, d));
  }

  function move(w, dt) {
    turnToward(w, dt);
    const turbo = w.effects.turbo > 0;
    w.boosting = (w.wantBoost && w.mass > 15) || turbo;
    const v = speedOf(w);
    const head = w.pts[0];
    head.x += Math.cos(w.dir) * v * dt;
    head.y += Math.sin(w.dir) * v * dt;

    if (w.boosting && !turbo) {
      const lost = Math.min(w.mass - 15, 7 * dt);
      w.mass -= lost;
      w.dropAcc += lost;
      if (w.dropAcc >= 1.5) {
        const tail = w.pts[w.pts.length - 1];
        addFood(tail.x + rand(-4, 4), tail.y + rand(-4, 4), w.dropAcc * 0.6, w.skin.a);
        w.dropAcc = 0;
      }
    }

    w.r = radiusOf(w.mass);
    const spacing = w.r * 0.55;
    const want = segCount(w.mass);
    while (w.pts.length < want) {
      const t = w.pts[w.pts.length - 1];
      w.pts.push({ x: t.x, y: t.y });
    }
    while (w.pts.length > want && w.pts.length > 2) w.pts.pop();
    for (let i = 1; i < w.pts.length; i++) {
      const a = w.pts[i - 1];
      const b = w.pts[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > spacing) {
        b.x = a.x + (dx / d) * spacing;
        b.y = a.y + (dy / d) * spacing;
      }
    }
  }

  function kill(w, killer, events) {
    w.alive = false;
    w.diedAt = state.t;
    w.boosting = false;
    if (killer) killer.kills += 1;
    // Gövde şekere dönüşür
    const share = (w.mass * 0.8) / w.pts.length;
    w.pts.forEach((p, i) => {
      if (i % 2) return;
      addFood(p.x + rand(-w.r, w.r), p.y + rand(-w.r, w.r), Math.max(1, share * 2), i % 6 < 3 ? w.skin.a : w.skin.b);
    });
    events.push({ type: 'death', worm: w, killer, x: w.pts[0].x, y: w.pts[0].y });
    if (!w.isPlayer) w.respawnAt = state.t + 2.5;
  }

  function eat(w, events) {
    const head = w.pts[0];
    const suck = w.r * 2.2 + (w.effects.magnet > 0 ? 130 : 0);
    const eaten = new Set();
    query(foodGrid, head.x, head.y, suck, (f) => {
      const d = Math.hypot(f.x - head.x, f.y - head.y);
      if (d > suck) return;
      if (d < w.r + f.r) {
        eaten.add(f);
        if (f.kind) {
          w.effects[f.kind] = POWERS[f.kind].duration;
          events.push({ type: 'power', worm: w, kind: f.kind });
        } else {
          w.mass += f.v;
          if (w.isPlayer) events.push({ type: 'eat', color: f.color, v: f.v });
        }
      } else {
        // Emme: yakındaki şeker başa doğru kayar
        const pull = Math.min(d, 320 * (1 / 60));
        f.x -= ((f.x - head.x) / d) * pull;
        f.y -= ((f.y - head.y) / d) * pull;
      }
    });
    if (eaten.size) state.food = state.food.filter((f) => !eaten.has(f));
  }

  function collide(events) {
    for (const w of state.worms) {
      if (!w.alive) continue;
      const head = w.pts[0];
      if (Math.hypot(head.x, head.y) > WORLD_R - w.r * 0.5) {
        kill(w, null, events);
        continue;
      }
      if (w.effects.shield > 0) continue;
      let hit = null;
      query(segGrid, head.x, head.y, w.r + 30, (s) => {
        if (hit || s.w === w || !s.w.alive) return;
        if (Math.hypot(s.x - head.x, s.y - head.y) < w.r * 0.5 + s.w.r * 0.8) hit = s.w;
      });
      if (hit) kill(w, hit, events);
    }
  }

  function step(dt) {
    const events = [];
    state.t += dt;
    buildGrids();
    for (const w of state.worms) {
      if (!w.alive) {
        if (!w.isPlayer && state.t >= w.respawnAt) spawnBot(w);
        continue;
      }
      for (const k of POWER_KINDS) w.effects[k] = Math.max(0, w.effects[k] - dt);
      if (!w.isPlayer && state.t >= w.ai.next) {
        think(w);
        w.ai.next = state.t + (w.ai.danger ? 0.05 : 0.2 - w.ai.skill * 0.1);
      }
      move(w, dt);
    }
    buildGrids();
    collide(events);
    for (const w of state.worms) if (w.alive) eat(w, events);

    while (state.food.filter((f) => !f.kind).length < FOOD_TARGET) spawnFood();
    // Eski, bırakılmış şekerler de oyun alanını doldurmasın
    if (state.food.length > FOOD_TARGET * 2.2) state.food.splice(0, state.food.length - FOOD_TARGET * 2.2);
    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      state.powerTimer = 6;
      if (state.food.filter((f) => f.kind).length < POWER_MAX) {
        const p = randomPoint(WORLD_R * 0.85);
        addFood(p.x, p.y, 0, POWERS.magnet.color, POWER_KINDS[Math.floor(rand(POWER_KINDS.length))]);
      }
    }

    let leader = null;
    for (const w of state.worms) if (w.alive && (!leader || w.mass > leader.mass)) leader = w;
    state.leader = leader;

    if (!state.over) {
      if (!state.player.alive) {
        state.over = true;
        state.reason = 'dead';
        events.push({ type: 'over', reason: 'dead' });
      } else if (state.t >= ROUND_S) {
        state.over = true;
        state.reason = 'time';
        events.push({ type: 'over', reason: 'time' });
      }
    }
    return events;
  }

  return {
    state,
    /** Oyuncunun yönü (radyan) ve hızlanma isteği */
    steer(angle, boost) {
      const p = state.player;
      if (angle !== null && angle !== undefined) p.target = angle;
      p.wantBoost = Boolean(boost);
    },
    update(dt) {
      const events = [];
      let rest = Math.min(dt, 0.1);
      while (rest > 1e-6) {
        const h = Math.min(rest, 1 / 60);
        events.push(...step(h));
        rest -= h;
        if (state.over) break;
      }
      return events;
    },
    /** Uzunluğa göre sıralama (1 = en büyük) */
    ranking() {
      return state.worms.filter((w) => w.alive || w.isPlayer).sort((a, b) => b.mass - a.mass);
    },
    result() {
      const p = state.player;
      const rank = this.ranking().indexOf(p) + 1;
      return {
        score: Math.floor(p.mass),
        kills: p.kills,
        rank,
        crowned: p.alive && state.leader === p,
        durationMs: Math.round(Math.min(state.t, ROUND_S) * 1000),
      };
    },
    /** Botlarla aynı akılla oyuncuyu da oynatır (testlerde ve dengelemede) */
    autopilot() {
      think(state.player);
    },
  };
}
