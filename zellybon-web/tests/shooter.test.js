import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_LEVELS, CUBE_COLORS } from '../js/shooter/levels.js';
import {
  parseArt, parseMods, buildColumns, createEngine, firstCubeInLane, laneInfo,
} from '../js/shooter/engine.js';
import { playSmart as autoplay } from '../js/shooter/bot.js';

test('tüm resimler dikdörtgen ve sadece tanımlı renkleri kullanıyor', () => {
  for (const level of MAIN_LEVELS) {
    const widths = new Set(level.art.map((r) => r.length));
    assert.equal(widths.size, 1, `bölüm ${level.id} satır uzunlukları farklı`);
    for (const ch of level.art.join('')) {
      assert.ok(ch === '.' || CUBE_COLORS[ch], `bölüm ${level.id}: bilinmeyen renk '${ch}'`);
    }
  }
});

test('her rengin toplam mermisi o renkteki vuruş sayısına eşit (zırhlı küp 2) ve üretim deterministik', () => {
  for (const level of MAIN_LEVELS) {
    const { hp } = parseMods(level);
    const counts = {};
    level.art.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') counts[ch] = (counts[ch] ?? 0) + hp[y][x];
    }));
    const cols = buildColumns(level);
    assert.equal(cols.length, level.columns);
    const ammo = {};
    for (const s of cols.flat()) ammo[s.color] = (ammo[s.color] ?? 0) + s.ammo;
    assert.deepEqual(ammo, counts, `bölüm ${level.id}`);
    assert.deepEqual(buildColumns(level), cols);
  }
});

test('şeritler ve ilk küp doğru bulunuyor', () => {
  const grid = parseArt(['ab.', '.c.', 'd..']);
  // W=3, H=3: 0-2 alt, 3-5 sağ, 6-8 üst, 9-11 sol
  assert.deepEqual(laneInfo(3, 3, 0), { side: 'bottom', x: 0 });
  assert.deepEqual(laneInfo(3, 3, 3), { side: 'right', y: 2 });
  assert.deepEqual(laneInfo(3, 3, 6), { side: 'top', x: 2 });
  assert.deepEqual(laneInfo(3, 3, 9), { side: 'left', y: 0 });
  assert.deepEqual(firstCubeInLane(grid, 0), { x: 0, y: 2 }); // alttan sütun 0 → d
  assert.deepEqual(firstCubeInLane(grid, 1), { x: 1, y: 1 }); // alttan sütun 1 → c
  assert.equal(firstCubeInLane(grid, 2), null);               // sütun 2 boş
  assert.deepEqual(firstCubeInLane(grid, 4), { x: 1, y: 1 }); // sağdan satır 1 → c
  assert.deepEqual(firstCubeInLane(grid, 9), { x: 0, y: 0 }); // soldan satır 0 → a
});

test('jöle sadece kendi rengini vurur, mermisi bitince kaybolur, tur sonunda kutuya iner', () => {
  const level = { id: 99, art: ['rb'], slots: 2, columns: 1, belt: 3, ammo: [10], shuffle: 0 };
  const e = createEngine(level);
  const { state } = e;
  state.columns = [[{ id: 1, color: 'r', ammo: 1 }, { id: 2, color: 'b', ammo: 2 }]];
  state.cubesLeft = 2;
  state.grid[0][1] = 'b';

  e.launchFromColumn(0); // kırmızı: 1 mermi
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(...e.step(50));
  assert.ok(ev.some((x) => x.type === 'hit' && x.color === 'r'));
  assert.ok(ev.some((x) => x.type === 'empty'));
  assert.equal(state.grid[0][0], null);
  assert.equal(state.grid[0][1], 'b');

  // mavi 2 mermili ama tek mavi küp var → vurur, tur sonunda 1 mermiyle kutuya iner
  state.grid[0][1] = null; // önce mavi küpü kaldırıp "vuramayan" jöle senaryosu
  state.cubesLeft = 1;
  state.grid[0][0] = 'r';
  e.launchFromColumn(0);
  const ev2 = [];
  for (let i = 0; i < 40; i++) ev2.push(...e.step(50));
  assert.ok(ev2.some((x) => x.type === 'toSlot'));
  assert.equal(state.slots[0].color, 'b');
  assert.equal(state.slots[0].ammo, 2);
});

test('kutular doluyken tur bitiren jöle bölümü kaybettirir', () => {
  const level = { id: 98, art: ['rr'], slots: 1, columns: 1, belt: 3, ammo: [10], shuffle: 0 };
  const e = createEngine(level);
  const { state } = e;
  state.columns = [[{ id: 1, color: 'b', ammo: 1 }]];
  state.slots = [{ id: 2, color: 'b', ammo: 1 }];
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 60 && state.status === 'playing'; i++) ev.push(...e.step(50));
  assert.equal(state.status, 'lost');
  assert.ok(ev.some((x) => x.type === 'lose'));
});

test('yol kapasitesi aşılamaz', () => {
  const level = MAIN_LEVELS[0];
  const e = createEngine(level);
  let launched = 0;
  for (let i = 0; i < 10; i++) if (e.launchFromColumn(i % level.columns)) launched++;
  assert.equal(launched, level.belt);
  assert.equal(e.canLaunch(), false);
});

function oneShooter(art, shooter, extra = {}) {
  const level = { id: 97, art, slots: 2, columns: 1, belt: 3, ammo: [10], shuffle: 0, ...extra };
  const e = createEngine(level);
  e.state.columns = [[{ id: 1, ...shooter }]];
  e.launchFromColumn(0);
  const ev = [];
  // alt kenardaki ilk şeridi (sütun 0) geçecek kadar ilerlet
  for (let i = 0; i < 3; i++) ev.push(...e.step(50));
  return { e, ev };
}

test('Zıplayan: bir şeritte en fazla 2 küp vurur', () => {
  const { e, ev } = oneShooter(['r', 'r', 'r'], { color: 'r', ammo: 3, ability: 'bounce' });
  assert.equal(ev.filter((x) => x.type === 'hit' && x.lane === 0).length, 2);
  assert.equal(e.state.grid[0][0], 'r');
});

test('Delici: art arda gelen aynı renk küplerin hepsini deler, farklı renkte durur', () => {
  const { e, ev } = oneShooter(['b', 'r', 'r', 'r'], { color: 'r', ammo: 5, ability: 'pierce' });
  assert.equal(ev.filter((x) => x.type === 'hit' && x.lane === 0).length, 3);
  assert.equal(e.state.grid[0][0], 'b');
});

test('Bomba: vurduğu küpün komşularındaki aynı renk küpleri de patlatır', () => {
  // alttan sütun 1'deki ilk küp (1,2); komşuları (0,2),(2,2),(1,1)
  const { e } = oneShooter(['.r.', 'rrr', 'rrr'], { color: 'r', ammo: 20, ability: 'bomb' });
  for (let i = 0; i < 2; i++) e.step(50);
  assert.equal(e.state.grid[1][1], null, 'içerideki küpe ulaştı');
});

test('Roket: aynı sürede diğerlerinden daha uzağa gider', () => {
  const level = { id: 96, art: ['.'.repeat(8) + 'k'], slots: 2, columns: 2, belt: 3, ammo: [10], shuffle: 0 };
  const e = createEngine(level);
  e.state.columns = [[{ id: 1, color: 'r', ammo: 1, ability: 'fast' }], [{ id: 2, color: 'r', ammo: 1 }]];
  e.launchFromColumn(0);
  for (let i = 0; i < 4; i++) e.step(50);
  e.launchFromColumn(1);
  for (let i = 0; i < 6; i++) e.step(50);
  const [fast, normal] = e.state.belt;
  assert.ok(fast.traveled - normal.traveled > 1);
});

test('güçlendiriciler: Ekstra Kutu +1 kutu, Süper Başlangıç ilk jöleleri Delici yapar', () => {
  const level = MAIN_LEVELS[4];
  const e = createEngine(level, { boosters: { extraSlot: true, superStart: true } });
  assert.equal(e.state.slots.length, level.slots + 1);
  for (const col of e.state.columns) assert.equal(col[0].ability, 'pierce');
});

test('karakterler bölümün izin verdiği yeteneklerden seçilir', () => {
  for (const level of MAIN_LEVELS) {
    const abilities = buildColumns(level).flat().map((s) => s.ability).filter(Boolean);
    for (const a of abilities) assert.ok(level.abilities.includes(a), `bölüm ${level.id}: ${a}`);
    if (level.intro) assert.ok(abilities.includes(level.intro), `bölüm ${level.id} tanıttığı karakteri içermeli`);
  }
});

test('zırhlı küp iki vuruşta kırılır ve mermi hesabında iki sayılır', () => {
  const level = { id: 95, art: ['rr'], mods: ['a.'], slots: 2, columns: 1, belt: 3, ammo: [10], shuffle: 0 };
  const ammo = buildColumns(level).flat().reduce((n, s) => n + s.ammo, 0);
  assert.equal(ammo, 3);
  const e = createEngine(level);
  e.state.columns = [[{ id: 1, color: 'r', ammo: 1 }]];
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 10; i++) ev.push(...e.step(50));
  // alt şerit 0 (sütun 0): zırhlı küp; ilk vuruş zırhı düşürür, küp kalır
  assert.ok(ev.some((x) => x.type === 'armor'));
  assert.equal(e.state.grid[0][0], 'r');
  assert.equal(e.state.hp[0][0], 1);
});

test('kilitli küp komşusu patlayana kadar vurulamaz, sonra kilidi açılır', () => {
  const level = { id: 94, art: ['rb'], mods: ['l.'], slots: 2, columns: 1, belt: 3, ammo: [10], shuffle: 0 };
  const e = createEngine(level);
  assert.equal(e.canHit('r'), false, 'kilitli kırmızı vurulamaz');
  assert.equal(e.canHit('b'), true);
  e.state.columns = [[{ id: 1, color: 'b', ammo: 1 }]];
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 20; i++) ev.push(...e.step(50));
  assert.ok(ev.some((x) => x.type === 'unlock'));
  assert.equal(e.canHit('r'), true);
});

test('her bölüm kazanılabilir (otomatik oyuncu tüm resimleri temizliyor)', () => {
  for (const level of MAIN_LEVELS) {
    const state = autoplay(level);
    assert.equal(state.status, 'won', `bölüm ${level.id} (${level.name}) kazanılamadı: ${state.loseReason}`);
    assert.equal(state.cubesLeft, 0);
  }
});
