import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIN_LEVELS } from '../js/pins/levels.js';
import {
  createPinsEngine, solvePins, threadOk, checkLanding, landingAngle, MIN_GAP, FLIGHT, norm,
} from '../js/pins/engine.js';
import { createWormEngine, ROUND_S, START_MASS } from '../js/worm/engine.js';

test('İğnedenlik: 35 bölümün hepsi çözülebilir (±35 ms zamanlama hatasıyla bile)', () => {
  assert.equal(PIN_LEVELS.length, 35);
  for (const level of PIN_LEVELS) {
    assert.ok(solvePins(level).won, `bölüm ${level.id}`);
  }
});

test('İğnedenlik: bölümler zorlaşıyor (daha çok iğne, daha hızlı dönüş)', () => {
  const first = PIN_LEVELS[0];
  const last = PIN_LEVELS[PIN_LEVELS.length - 1];
  assert.ok(Math.abs(last.speed) > Math.abs(first.speed));
  const load = (l) => l.start.length + l.throws;
  assert.ok(load(PIN_LEVELS[24]) > load(first));
  assert.ok(PIN_LEVELS.some((l) => l.thread), 'ipli bölümler var');
});

test('İğnedenlik: iğnenin üstüne iğne saplanırsa çarpışır', () => {
  const level = { ...PIN_LEVELS[0], start: [], throws: 2 };
  const e = createPinsEngine(level);
  e.throwPin();
  e.update(FLIGHT + 0.001);
  assert.equal(e.state.pins.length, 1);
  // Aynı ana denk gelen ikinci atış: tam bir tur sonra aynı açıya düşer mi? Açıyı doğrudan dene
  const a = e.state.pins[0].a;
  assert.equal(checkLanding(e.state, a + MIN_GAP * 0.5), 'clash');
  assert.equal(checkLanding(e.state, a + MIN_GAP * 2), null);
});

test('İğnedenlik: ip kuralı — yeni ip eski ipi kesemez', () => {
  // İpler 0 → 90° → 180° sırasıyla bağlı; son iğne 180°
  const path = [0, Math.PI / 2, Math.PI].map(norm);
  assert.equal(threadOk(path, norm(Math.PI * 1.25)), true, 'son iğnenin yanındaki boşluk');
  assert.equal(threadOk(path, norm(Math.PI * 0.75)), true, 'diğer yandaki boşluk');
  assert.equal(threadOk(path, norm(Math.PI * 0.25)), false, '0-90 ipini keser');
});

test('İğnedenlik: motor ile iniş açısı hesabı tutarlı', () => {
  const level = PIN_LEVELS[10];
  const e = createPinsEngine({ ...level, start: [] });
  e.update(0.7);
  e.throwPin();
  e.update(FLIGHT + 0.0001);
  const expected = landingAngle(level, 0.7);
  const got = e.state.pins[0].a;
  assert.ok(Math.abs(norm(got - expected + 0.5) - 0.5) < 1e-6);
});

test('Jöle Solucan: tur 3 dakika sürer ya da oyuncu ölünce biter; sonuç tutarlı', () => {
  for (let s = 0; s < 3; s++) {
    const e = createWormEngine({ seed: `test-${s}` });
    let guard = 0;
    while (!e.state.over && guard++ < ROUND_S * 60 + 10) {
      e.autopilot();
      e.update(1 / 60);
    }
    assert.ok(e.state.over);
    const r = e.result();
    assert.ok(Number.isInteger(r.score) && r.score >= 0);
    assert.ok(r.durationMs <= ROUND_S * 1000);
    assert.ok(r.rank >= 1 && r.rank <= e.state.worms.length);
    // sunucudaki sınır: boy saniyede ~15'ten hızlı artamaz
    assert.ok(r.score <= 20 + Math.ceil(r.durationMs / 1000) * 15, `skor ${r.score}`);
    if (e.state.reason === 'time') assert.ok(e.state.player.alive);
  }
});

test('Jöle Solucan: şeker yiyen büyür, duvara çarpan ölür', () => {
  const e = createWormEngine({ seed: 'grow', bots: 0 });
  const p = e.state.player;
  const head = p.pts[0];
  e.state.food.push({ x: head.x + Math.cos(p.dir) * 5, y: head.y + Math.sin(p.dir) * 5, v: 3, color: 'r', kind: null, r: 8, id: 999999 });
  e.update(1 / 60);
  assert.ok(p.mass > START_MASS);

  const w = createWormEngine({ seed: 'wall', bots: 0 });
  w.state.player.pts.forEach((pt) => { pt.x = 1290; pt.y = 0; });
  w.steer(0, false);
  w.state.player.dir = 0;
  for (let k = 0; k < 30 && !w.state.over; k++) w.update(1 / 60);
  assert.equal(w.state.reason, 'dead');
});
