// Seed'li, deterministik rastgele sayı üreteci.
// Aynı seed her cihazda aynı sayı dizisini üretir. Oyun mantığında Math.random() kullanılmaz.

// Metni 32 bitlik bir tohuma çevirir (xmur3 karma fonksiyonu).
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string} seedString
 * @returns {{ next: () => number, int: (n: number) => number }}
 */
export function createRng(seedString) {
  const next = mulberry32(hashSeed(String(seedString)));
  return {
    next,
    int: (n) => Math.floor(next() * n),
  };
}

// Hızlı Tur için yeni bir seed üretir (tahtanın kendisi yine seed'den türetilir).
export function randomSeed() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
