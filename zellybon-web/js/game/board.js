// Tahta mantığı: eşleşme, düşme, doldurma. Çizim yok; tarayıcıda ve Node'da çalışır.
// Tahta düz bir dizidir: index = satır * size + sütun, değer = renk (0..colors-1) ya da null.

export const SIZE = 8;
export const COLORS = 6;

export const rowOf = (board, i) => Math.floor(i / board.size);
export const colOf = (board, i) => i % board.size;

export function isAdjacent(board, a, b) {
  const n = board.size * board.size;
  if (a < 0 || b < 0 || a >= n || b >= n) return false;
  const dr = Math.abs(rowOf(board, a) - rowOf(board, b));
  const dc = Math.abs(colOf(board, a) - colOf(board, b));
  return dr + dc === 1;
}

function swapCells(board, a, b) {
  const t = board.cells[a];
  board.cells[a] = board.cells[b];
  board.cells[b] = t;
}

// (r, c) hücresine `color` konursa soldaki ya da üstteki iki hücreyle 3'lü oluşur mu?
function wouldMatchOnFill(cells, size, r, c, color) {
  if (c >= 2 && cells[r * size + c - 1] === color && cells[r * size + c - 2] === color) return true;
  if (r >= 2 && cells[(r - 1) * size + c] === color && cells[(r - 2) * size + c] === color) return true;
  return false;
}

/** Başlangıçta hiç hazır eşleşme olmayan ve en az bir hamlesi olan tahta üretir. */
export function createBoard(rng, { size = SIZE, colors = COLORS } = {}) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const cells = new Array(size * size).fill(null);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const allowed = [];
        for (let k = 0; k < colors; k++) {
          if (!wouldMatchOnFill(cells, size, r, c, k)) allowed.push(k);
        }
        cells[r * size + c] = allowed[rng.int(allowed.length)];
      }
    }
    const board = { size, colors, cells };
    if (hasPossibleMove(board)) return board;
  }
  throw new Error('Oynanabilir tahta üretilemedi.');
}

export function cloneBoard(board) {
  return { size: board.size, colors: board.colors, cells: board.cells.slice() };
}

/**
 * Yatay/dikey 3+ aynı renk grupları.
 * @returns {{ color: number, dir: 'h'|'v', cells: number[] }[]}
 */
export function findMatches(board) {
  const { size, cells } = board;
  const groups = [];
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      const color = cells[r * size + c];
      let end = c + 1;
      while (end < size && color !== null && cells[r * size + end] === color) end++;
      if (color !== null && end - c >= 3) {
        const run = [];
        for (let k = c; k < end; k++) run.push(r * size + k);
        groups.push({ color, dir: 'h', cells: run });
      }
      c = end;
    }
  }
  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      const color = cells[r * size + c];
      let end = r + 1;
      while (end < size && color !== null && cells[end * size + c] === color) end++;
      if (color !== null && end - r >= 3) {
        const run = [];
        for (let k = r; k < end; k++) run.push(k * size + c);
        groups.push({ color, dir: 'v', cells: run });
      }
      r = end;
    }
  }
  return groups;
}

// i hücresi yatay ya da dikey bir 3+ dizinin parçası mı?
function hasMatchAt(board, i) {
  const { size, cells } = board;
  const color = cells[i];
  if (color === null) return false;
  const r = rowOf(board, i);
  const c = colOf(board, i);
  let left = c, right = c, up = r, down = r;
  while (left > 0 && cells[r * size + left - 1] === color) left--;
  while (right < size - 1 && cells[r * size + right + 1] === color) right++;
  if (right - left + 1 >= 3) return true;
  while (up > 0 && cells[(up - 1) * size + c] === color) up--;
  while (down < size - 1 && cells[(down + 1) * size + c] === color) down++;
  return down - up + 1 >= 3;
}

/**
 * Komşu iki jöleyi değiştirir. Komşu değilse ya da eşleşme oluşmuyorsa tahtayı değiştirmeden false döner.
 */
export function trySwap(board, a, b) {
  if (!isAdjacent(board, a, b)) return false;
  if (board.cells[a] === null || board.cells[b] === null) return false;
  swapCells(board, a, b);
  if (hasMatchAt(board, a) || hasMatchAt(board, b)) return true;
  swapCells(board, a, b);
  return false;
}

/**
 * Eşleşmeleri temizler, jöleleri düşürür, boşlukları rng ile doldurur; zincirleme bitene kadar tekrarlar.
 * Her adım animasyon için kaydedilir.
 * @returns {{
 *   groups: { color: number, dir: string, cells: number[] }[],
 *   cleared: { index: number, color: number }[],
 *   falls: { from: number, to: number, color: number }[],
 *   spawns: { to: number, color: number, startRow: number }[],
 *   comboLevel: number
 * }[]}
 */
export function resolve(board, rng) {
  const { size, colors, cells } = board;
  const steps = [];
  let comboLevel = 0;

  while (comboLevel < 50) {
    const groups = findMatches(board);
    if (groups.length === 0) break;

    const clearedSet = new Set();
    for (const g of groups) for (const i of g.cells) clearedSet.add(i);
    const cleared = [...clearedSet].sort((a, b) => a - b).map((index) => ({ index, color: cells[index] }));
    for (const i of clearedSet) cells[i] = null;

    const falls = [];
    const spawns = [];
    for (let c = 0; c < size; c++) {
      let write = size - 1;
      for (let r = size - 1; r >= 0; r--) {
        const i = r * size + c;
        if (cells[i] === null) continue;
        if (r !== write) {
          const to = write * size + c;
          cells[to] = cells[i];
          cells[i] = null;
          falls.push({ from: i, to, color: cells[to] });
        }
        write--;
      }
      const missing = write + 1;
      for (let r = 0; r < missing; r++) {
        const to = r * size + c;
        const color = rng.int(colors);
        cells[to] = color;
        spawns.push({ to, color, startRow: r - missing });
      }
    }

    steps.push({ groups, cleared, falls, spawns, comboLevel });
    comboLevel++;
  }
  return steps;
}

/** Eşleşme oluşturan ilk hamleyi döndürür ({a, b}) ya da hiç yoksa null. */
export function findPossibleMove(board) {
  const { size } = board;
  for (let i = 0; i < size * size; i++) {
    const c = colOf(board, i);
    const r = rowOf(board, i);
    const neighbors = [];
    if (c < size - 1) neighbors.push(i + 1);
    if (r < size - 1) neighbors.push(i + size);
    for (const j of neighbors) {
      if (board.cells[i] === board.cells[j]) continue;
      swapCells(board, i, j);
      const ok = hasMatchAt(board, i) || hasMatchAt(board, j);
      swapCells(board, i, j);
      if (ok) return { a: i, b: j };
    }
  }
  return null;
}

export function hasPossibleMove(board) {
  return findPossibleMove(board) !== null;
}

/** Jöleleri karıştırır; sonuçta hazır eşleşme olmaz ve en az bir hamle bulunur. */
export function shuffle(board, rng) {
  const { cells } = board;
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = cells.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      const t = cells[i];
      cells[i] = cells[j];
      cells[j] = t;
    }
    if (findMatches(board).length === 0 && hasPossibleMove(board)) return board;
  }
  // Çok nadir: renk dağılımı elverişsizse tahtayı baştan üret.
  const fresh = createBoard(rng, { size: board.size, colors: board.colors });
  board.cells.splice(0, board.cells.length, ...fresh.cells);
  return board;
}
