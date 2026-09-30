import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, iceCells, goalsMet } from '../js/game/levels.js';
import { playMatchLevel, measureMatch } from '../js/game/bot.js';
import { measureShooter } from '../js/shooter/bot.js';
import { measureNakis } from '../js/nakis/bot.js';
import { MAIN_LEVELS } from '../js/shooter/levels.js';
import { NAKIS_LEVELS } from '../js/nakis/levels.js';

test('Jöle Patlat buz hedefi: buz katmanı okunur, hepsi kırılınca hedef tamamlanır', () => {
  const level = { id: 99, colors: 5, moves: 30, goals: [{ type: 'ice' }], stars: [1000, 2000], ice: ['x.......', '........', '........', '........', '........', '........', '........', '.......x'] };
  assert.deepEqual(iceCells(level), [0, 63]);
  assert.equal(goalsMet(level, 0, {}, 2), false);
  assert.equal(goalsMet(level, 0, {}, 0), true);
  const r = playMatchLevel(level);
  assert.equal(typeof r.won, 'boolean');
});

test('ölçüm araçları: bilinen bölümlerde makul sonuç verir', () => {
  const m = measureMatch(LEVELS[0], { runs: 5 });
  assert.ok(m.winRate >= 0 && m.winRate <= 1);
  const s = measureShooter(MAIN_LEVELS[0], { runs: 3 });
  assert.equal(s.solvable, true);
  const n = measureNakis(NAKIS_LEVELS[0], { runs: 3 });
  assert.equal(n.solvable, true);
});
