import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAKIS_LEVELS } from '../js/nakis/levels.js';
import { createNakisEngine, buildSpoolColumns, computeDepth } from '../js/nakis/engine.js';
import { parseArt } from '../js/shooter/engine.js';
import { PALETTE } from '../js/palette.js';
import { playSmartNakis as autoplayNakis } from '../js/nakis/bot.js';

test('Nakış: çift ilmek iki ip ister, ilk ilmekten sonra hücre hâlâ açık', () => {
  const level = { id: 89, art: ['bbb', 'byb', 'bbb'], mods: ['...', '.a.', '...'], spool: 20, slots: 2, columns: 1, belt: 3, shuffle: 0, slack: 0 };
  const total = buildSpoolColumns(level).flat().filter((s) => s.color === 'y').length * level.spool;
  assert.ok(total >= 2);
  const e = createNakisEngine(level);
  assert.equal(e.state.left.y, 2);
  e.state.columns = [[{ id: 1, color: 'y', ammo: 5 }]];
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 40 && e.state.left.y > 0; i++) ev.push(...e.step(50));
  const hits = ev.filter((x) => x.type === 'hit');
  assert.equal(hits[0].partial, true, 'ilk ilmek yarım');
  assert.equal(hits[1].partial, false, 'ikinci ilmek tamamlar');
  assert.equal(e.state.painted[1][1], true);
});

test('Nakış: düğümlü hücre komşusu işlenene kadar işlenemez', () => {
  const level = { id: 88, art: ['bbbb', 'byyb', 'bbbb'], mods: ['....', '.l..', '....'], spool: 20, slots: 2, columns: 1, belt: 3, shuffle: 0, slack: 0 };
  const e = createNakisEngine(level);
  e.state.columns = [[{ id: 1, color: 'y', ammo: 5 }]];
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 60 && e.state.left.y > 0; i++) ev.push(...e.step(50));
  const hits = ev.filter((x) => x.type === 'hit').map((x) => `${x.cube.x},${x.cube.y}`);
  assert.equal(hits[0], '2,1', 'önce düğümsüz sarı');
  assert.ok(ev.some((x) => x.type === 'unlock'));
  assert.equal(hits[1], '1,1', 'sonra çözülen düğüm');
});
test('Nakış: tablolar dikdörtgen ve sadece paletteki renkleri kullanıyor', () => {
  for (const level of NAKIS_LEVELS) {
    assert.equal(new Set(level.art.map((r) => r.length)).size, 1, `bölüm ${level.id}`);
    for (const ch of level.art.join('')) assert.ok(ch === '.' || PALETTE[ch], `bölüm ${level.id}: '${ch}'`);
  }
});

test('Nakış: her makara aynı uzunlukta ve her rengin ipi o rengin hücrelerine yetiyor', () => {
  for (const level of NAKIS_LEVELS) {
    const counts = {};
    // çift ilmekli hücre ('a') iki ip ister
    level.art.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.') counts[ch] = (counts[ch] ?? 0) + (level.mods?.[y]?.[x] === 'a' ? 2 : 1);
    }));
    const spools = buildSpoolColumns(level).flat();
    assert.ok(spools.every((s) => s.ammo === level.spool));
    for (const [color, n] of Object.entries(counts)) {
      const total = spools.filter((s) => s.color === color).length * level.spool;
      assert.ok(total >= n && total < n + level.spool, `bölüm ${level.id} renk ${color}`);
    }
  }
});

test('Nakış: derinlik dıştan içe artar', () => {
  const depth = computeDepth(parseArt(['aaaaa', 'abbba', 'abcba', 'abbba', 'aaaaa']));
  assert.equal(depth[0][0], 0);
  assert.equal(depth[1][1], 1);
  assert.equal(depth[2][2], 2);
});

function tinyEngine(art, spools, extra = {}) {
  const level = { id: 90, art, spool: 20, slots: 2, columns: 1, belt: 3, shuffle: 0, slack: 0, ...extra };
  const e = createNakisEngine(level);
  e.state.columns = [spools.map((s, i) => ({ id: 1000 + i, ...s }))];
  return e;
}

test('Nakış: yanlış renk (dıştaki) hiçbir şey işleyemez, ipi kalır ve kutuya iner', () => {
  const e = tinyEngine(['bbbbb', 'bbbbb', 'bbybb', 'bbbbb', 'bbbbb'], [{ color: 'b', ammo: 20 }]);
  assert.equal(e.canStitchColor('b'), false);
  assert.equal(e.canStitchColor('y'), true);
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 80 && !ev.some((x) => x.type === 'toSlot'); i++) ev.push(...e.step(50));
  assert.equal(ev.filter((x) => x.type === 'hit').length, 0);
  assert.equal(e.state.slots[0].color, 'b');
  assert.equal(e.state.slots[0].ammo, 20);
});

test('Nakış: doğru renk en içten başlar ve ip labirent gibi girişten hedefe yol bulur', () => {
  const e = tinyEngine(['bbbbb', 'bbbbb', 'bbybb', 'bbbbb', 'bbbbb'], [{ color: 'y', ammo: 20 }, { color: 'b', ammo: 30 }]);
  e.launchFromColumn(0);
  const ev = [];
  for (let i = 0; i < 20; i++) ev.push(...e.step(50));
  const hit = ev.find((x) => x.type === 'hit');
  assert.deepEqual(hit.cube, { x: 2, y: 2 });
  // yol girişten başlar, komşu hücrelerden geçer ve hedefte biter
  assert.deepEqual(hit.path.at(-1), { x: 2, y: 2 });
  for (let k = 1; k < hit.path.length; k++) {
    const a = hit.path[k - 1];
    const b = hit.path[k];
    assert.equal(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 1);
  }
  // sarı bitti → kalan sarı ip kalkar
  assert.ok(ev.some((x) => x.type === 'colorDone' && x.color === 'y'));
  assert.equal(e.state.belt.some((s) => s.color === 'y'), false);
});

test('Nakış: hiçbir hücre, diğerlerinin dışarıyla bağlantısını kesecek şekilde işlenmez', () => {
  // Ortadaki sarıya giden tek yol mavi hücreden geçiyor; mavi, sarı bitmeden kapatılamaz
  const e = tinyEngine(['kkkkk', 'kkbkk', 'kkykk', 'kkkkk'], [{ color: 'b', ammo: 5 }], { slack: 5 });
  // koyu (k) çerçeveyi elle işlenmiş say: sadece mavi hücre açık kalsın
  const { grid, painted } = e.state;
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'k') { painted[y][x] = true; e.state.cubesLeft--; e.state.left.k--; }
  }));
  // üst kenardaki mavi girişi açmak için üst orta hücreyi aç
  painted[0][2] = false; e.state.cubesLeft++; e.state.left.k++;
  assert.equal(e.canStitchColor('b'), false, 'mavi, sarının tek yolu');
  assert.equal(e.canStitchColor('y'), true);
});

test('Nakış jokerleri: Makas, Ekstra Kutu, Sihirli İğne ve Mıknatıs', () => {
  const level = NAKIS_LEVELS[1]; // Hedef: iç içe halkalar
  const e = createNakisEngine(level);
  const { state } = e;

  // Makas: sütun başındaki makarayı atar
  const front = state.columns[0][0];
  const ev = e.discard({ type: 'column', index: 0 });
  assert.equal(ev[0].type, 'retire');
  assert.notEqual(state.columns[0][0], front);

  // Ekstra Kutu
  const slots = state.slots.length;
  e.addSlot();
  assert.equal(state.slots.length, slots + 1);

  // Sihirli İğne: en içteki hücreler doğru renkle işlenir (merkez turuncu önce)
  const before = state.cubesLeft;
  const hits = e.autoStitch(5).filter((x) => x.type === 'hit');
  assert.equal(hits.length, 5);
  assert.equal(state.cubesLeft, before - 5);
  assert.deepEqual(hits[0].cube, { x: 4, y: 4 });
  for (const h of hits) assert.equal(state.grid[h.cube.y][h.cube.x], h.color);

  // Mıknatıs: her sütunun başına işe yarayan makara gelir
  e.sortColumns();
  for (const col of state.columns) {
    if (col.some((sp) => e.canStitchColor(sp.color))) assert.ok(e.canStitchColor(col[0].color));
  }
});

test('Nakış: her tablo kazanılabilir (otomatik oyuncu tüm tabloyu işliyor)', () => {
  for (const level of NAKIS_LEVELS) {
    const state = autoplayNakis(level);
    assert.equal(state.status, 'won', `bölüm ${level.id} (${level.name}) kazanılamadı: ${state.loseReason}`);
  }
});
