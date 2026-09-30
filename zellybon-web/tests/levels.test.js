import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../js/game/rng.js';
import { createBoard, blast, cellsOfColor, findMatches } from '../js/game/board.js';
import { LEVELS, goalsMet, starsFor, isUnlocked, isCollectLevel } from '../js/game/levels.js';

test('Jöle Patlat: 25 bölüm, sıralı id ve geçerli hedefler', () => {
  assert.equal(LEVELS.length, 25);
  LEVELS.forEach((l, i) => {
    assert.equal(l.id, i + 1);
    assert.ok(l.goals.length >= 1);
    for (const g of l.goals) {
      if (g.type === 'collect') assert.ok(g.color >= 0 && g.color < l.colors, `bölüm ${l.id} renk tahtada yok`);
    }
    assert.ok(l.stars[0] < l.stars[1]);
  });
});

test('hedef, yıldız ve kilit hesapları', () => {
  const l1 = LEVELS[0];
  assert.equal(goalsMet(l1, 1199, {}), false);
  assert.equal(goalsMet(l1, 1200, {}), true);
  assert.equal(starsFor(l1, 1200, true), 1);
  assert.equal(starsFor(l1, 1900, true), 2);
  assert.equal(starsFor(l1, 5000, true), 3);
  assert.equal(starsFor(l1, 5000, false), 0);

  const l5 = LEVELS[4];
  assert.ok(isCollectLevel(l5));
  assert.equal(goalsMet(l5, 0, { 3: 18, 2: 17 }), false);
  assert.equal(goalsMet(l5, 0, { 3: 18, 2: 18 }), true);

  assert.equal(isUnlocked({}, 1), true);
  assert.equal(isUnlocked({}, 2), false);
  assert.equal(isUnlocked({ 1: { stars: 1 } }, 2), true);
  assert.equal(isUnlocked({ 1: { stars: 1 } }, 3), false);
});

test('joker patlatması: çekiç tek jöle, renk bombası tüm rengi temizler; tahta dolu ve eşleşmesiz kalır', () => {
  const rng = createRng('joker');
  const board = createBoard(rng);
  const hammer = blast(board, rng, [10]);
  assert.equal(hammer[0].blast, true);
  assert.equal(hammer[0].cleared.length, 1);
  assert.equal(hammer[0].cleared[0].index, 10);
  hammer.slice(1).forEach((s, i) => assert.equal(s.comboLevel, i + 1));

  const color = board.cells[0];
  const count = cellsOfColor(board, color).length;
  const bomb = blast(board, rng, cellsOfColor(board, color), 0);
  assert.equal(bomb[0].cleared.length, count);
  assert.ok(bomb[0].cleared.every((c) => c.color === color));
  assert.equal(findMatches(board).length, 0);
  assert.ok(board.cells.every((c) => c !== null));
  assert.deepEqual(blast(board, rng, []), []);
});
