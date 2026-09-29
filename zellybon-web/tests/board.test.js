import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/game/rng.js';
import {
  createBoard, findMatches, trySwap, resolve, hasPossibleMove, findPossibleMove, shuffle, cloneBoard,
} from '../js/game/board.js';
import { createScoring, groupPoints, comboMultiplier, HEAT } from '../js/game/scoring.js';

test('aynı seed aynı sayı dizisini üretir', () => {
  const a = createRng('zelly');
  const b = createRng('zelly');
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
  const c = createRng('bon');
  assert.notEqual(createRng('zelly').next(), c.next());
});

test('aynı seed aynı tahtayı üretir', () => {
  const b1 = createBoard(createRng('a8f3k2'));
  const b2 = createBoard(createRng('a8f3k2'));
  assert.deepEqual(b1.cells, b2.cells);
  const b3 = createBoard(createRng('baska'));
  assert.notDeepEqual(b1.cells, b3.cells);
});

test('başlangıçta eşleşme yok ve en az bir hamle var', () => {
  for (let i = 0; i < 200; i++) {
    const board = createBoard(createRng(`seed-${i}`));
    assert.equal(board.cells.length, 64);
    assert.ok(board.cells.every((c) => c >= 0 && c < 6));
    assert.equal(findMatches(board).length, 0);
    assert.ok(hasPossibleMove(board));
  }
});

test('geçersiz swap reddedilir ve tahta değişmez', () => {
  const board = createBoard(createRng('swap'));
  const before = board.cells.slice();
  assert.equal(trySwap(board, 0, 2), false, 'komşu olmayan');
  assert.equal(trySwap(board, 7, 8), false, 'satır sonundan sonraki satıra');
  assert.equal(trySwap(board, 0, 64), false, 'tahta dışı');
  // Eşleşme oluşturmayan komşu bir swap bul
  let tested = false;
  for (let i = 0; i < 63 && !tested; i++) {
    if (i % 8 === 7) continue;
    const copy = cloneBoard(board);
    if (!trySwap(copy, i, i + 1)) {
      assert.equal(trySwap(board, i, i + 1), false);
      tested = true;
    }
  }
  assert.ok(tested);
  assert.deepEqual(board.cells, before);
});

test('geçerli swap uygulanır, resolve tahtayı eşleşmesiz ve dolu bırakır', () => {
  const rng = createRng('resolve');
  const board = createBoard(rng);
  const move = findPossibleMove(board);
  assert.ok(move);
  assert.equal(trySwap(board, move.a, move.b), true);
  assert.ok(findMatches(board).length > 0);
  const steps = resolve(board, rng);
  assert.ok(steps.length >= 1);
  assert.equal(steps[0].comboLevel, 0);
  steps.forEach((s, i) => {
    assert.equal(s.comboLevel, i);
    // her temizlenen hücre sayısı kadar yeni jöle doğar
    assert.equal(s.spawns.length, s.cleared.length);
  });
  assert.equal(findMatches(board).length, 0);
  assert.ok(board.cells.every((c) => c !== null));
});

test('düşme doğru çalışır', () => {
  // Sütun 0'ın alt 3 hücresi aynı renk; üstündekiler aşağı kaymalı.
  const size = 8;
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) cells.push((r * 3 + c * 2 + (r % 2)) % 6);
  }
  const board = { size, colors: 6, cells };
  // Önce var olan eşleşmeleri kontrol et: bu desende eşleşme olmamalı
  assert.equal(findMatches(board).length, 0);
  cells[5 * 8] = 9; cells[6 * 8] = 9; cells[7 * 8] = 9; // özel renk: 9
  const above = [0, 1, 2, 3, 4].map((r) => cells[r * 8]);
  let k = 0;
  const cyclingRng = { int: (n) => k++ % n, next: () => 0 };
  const steps = resolve(board, cyclingRng);
  // İlk adımda 3 hücre temizlenir, 5 hücre 3 satır aşağı iner
  assert.equal(steps[0].cleared.length, 3);
  assert.equal(steps[0].falls.length, 5);
  for (const f of steps[0].falls) assert.equal(f.to - f.from, 3 * 8);
  assert.deepEqual([3, 4, 5, 6, 7].map((r) => board.cells[r * 8]), above);
});

test('karıştırma sonrası eşleşme yok ve hamle var', () => {
  const rng = createRng('shuffle');
  const board = createBoard(rng);
  const counts = (cells) => cells.reduce((m, c) => ((m[c] = (m[c] || 0) + 1), m), {});
  const before = counts(board.cells);
  shuffle(board, rng);
  assert.equal(findMatches(board).length, 0);
  assert.ok(hasPossibleMove(board));
  assert.deepEqual(counts(board.cells), before);
});

test('puanlama: temel puan, kombo çarpanı ve Şeker Fırtınası', () => {
  assert.equal(groupPoints(3), 30);
  assert.equal(groupPoints(4), 60);
  assert.equal(groupPoints(5), 100);
  assert.equal(groupPoints(6), 100);
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(2), 2);

  const sc = createScoring();
  const step = (len, comboLevel) => ({
    groups: [{ cells: Array.from({ length: len }, (_, i) => i) }],
    cleared: Array.from({ length: len }, (_, i) => ({ index: i })),
    comboLevel,
  });
  assert.equal(sc.scoreStep(step(3, 0), 0).total, 30);
  assert.equal(sc.scoreStep(step(4, 1), 0).total, 90);
  assert.equal(sc.score, 120);
  assert.equal(sc.jelliesPopped, 7);

  // Hızlı hamlelerle barı doldur → fırtına
  let t = 1000;
  while (!sc.isStorm(t)) {
    sc.registerMove(t);
    t += 1000;
  }
  assert.equal(sc.storms, 1);
  assert.equal(sc.scoreStep(step(3, 0), t).total, 60);
  assert.equal(sc.isStorm(t + HEAT.stormMs + 1), false);
});
