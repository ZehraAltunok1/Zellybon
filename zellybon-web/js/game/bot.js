// Jöle Patlat bölümleri için otomatik oyuncu: bölüm planlayan ajan ve testler zorluğu ölçmek için kullanır.
// Açgözlü oyuncu: her hamlede, hedefe en çok katkı yapan eşleşmeyi seçer (jokersiz). Çizim yok; Node'da çalışır.

import { createRng } from './rng.js';
import { createBoard, cloneBoard, trySwap, findMatches, resolve, hasPossibleMove, shuffle } from './board.js';
import { createScoring } from './scoring.js';
import { goalsMet, starsFor, isCollectLevel, iceCells, MOVE_BONUS } from './levels.js';

function candidateMoves(board) {
  const { size } = board;
  const moves = [];
  for (let i = 0; i < size * size; i++) {
    if (i % size < size - 1) moves.push([i, i + 1]);
    if (i < size * (size - 1)) moves.push([i, i + size]);
  }
  return moves;
}

// Hamlenin ilk adımda ne kadar işe yarayacağı (hedef rengi, buz ve patlayan jöle sayısı)
function moveValue(board, [a, b], level, collected, ice) {
  const copy = cloneBoard(board);
  if (!trySwap(copy, a, b)) return -1;
  const cells = new Set();
  for (const g of findMatches(copy)) for (const i of g.cells) cells.add(i);
  let value = cells.size;
  for (const i of cells) {
    if (ice.has(i)) value += 6;
    for (const goal of level.goals) {
      if (goal.type === 'collect' && goal.color === copy.cells[i]
        && (collected[goal.color] ?? 0) < goal.count) value += 4;
    }
  }
  // biraz aşağıdaki hamleler zincirleme ihtimalini artırır
  value += Math.max(a, b) / (board.size * board.size);
  return value;
}

/** Bir bölümü baştan sona oynar. @returns {{ won: boolean, score: number, stars: number, movesLeft: number }} */
export function playMatchLevel(level, seed = 'bot') {
  const rng = createRng(`${seed}-${level.id}`);
  const board = createBoard(rng, { colors: level.colors ?? 6 });
  const scoring = createScoring({ heat: false });
  const collected = {};
  const ice = new Set(iceCells(level));
  let movesLeft = level.moves;

  while (movesLeft > 0) {
    let best = null;
    for (const m of candidateMoves(board)) {
      const v = moveValue(board, m, level, collected, ice);
      if (v > (best?.v ?? 0)) best = { m, v };
    }
    if (!best) {
      shuffle(board, rng);
      continue;
    }
    trySwap(board, best.m[0], best.m[1]);
    movesLeft--;
    const steps = resolve(board, rng);
    for (const step of steps) {
      scoring.scoreStep(step, 0);
      for (const c of step.cleared) {
        collected[c.color] = (collected[c.color] ?? 0) + 1;
        ice.delete(c.index);
      }
    }
    if (!hasPossibleMove(board)) shuffle(board, rng);
    if (isCollectLevel(level) && goalsMet(level, scoring.score, collected, ice.size)) break;
  }

  const won = goalsMet(level, scoring.score, collected, ice.size);
  if (won && movesLeft > 0) scoring.addBonus(movesLeft * MOVE_BONUS);
  return { won, score: scoring.score, stars: starsFor(level, scoring.score, won), movesLeft };
}

/** Zorluk ölçümü: farklı tahtalarda kazanma oranı ve ortalama yıldız */
export function measureMatch(level, { runs = 30 } = {}) {
  let wins = 0;
  let stars = 0;
  for (let i = 0; i < runs; i++) {
    const r = playMatchLevel(level, `run${i}`);
    if (r.won) wins++;
    stars += r.stars;
  }
  return { winRate: wins / runs, avgStars: stars / runs };
}
