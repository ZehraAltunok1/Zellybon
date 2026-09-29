// Oyunun ortak renk paleti. Her renk üç tondan oluşur: light (ışık alan yüzey), base (ana renk),
// dark (gölge ve kontur). Tonlar aynı ton ailesinden seçildi; doygunluk ve parlaklık dengeli,
// böylece yan yana gelen renkler birbirini bastırmaz ve tüm jöleler aynı ışık altında görünür.

export const PALETTE = {
  r: { name: 'Çilek', light: '#FF9EAA', base: '#FF4D6D', dark: '#C9184A' },
  o: { name: 'Portakal', light: '#FFC98B', base: '#FF8C42', dark: '#D9480F' },
  y: { name: 'Limon', light: '#FFF1A6', base: '#FFD43B', dark: '#E09F00' },
  g: { name: 'Elma', light: '#A7F3C9', base: '#38D39F', dark: '#0B9A6D' },
  b: { name: 'Yaban mersini', light: '#A5CCFF', base: '#4C8DFF', dark: '#1D4ED8' },
  p: { name: 'Üzüm', light: '#D6B8FF', base: '#9D5CFF', dark: '#6523C7' },
  i: { name: 'Pembe şeker', light: '#FFC2E2', base: '#FF6FB5', dark: '#C2185B' },
  w: { name: 'Süt', light: '#FFFFFF', base: '#F3EEFF', dark: '#B9ABD9' },
  n: { name: 'Kola', light: '#D9A27A', base: '#A8643B', dark: '#6B3A1E' },
  k: { name: 'Mürdüm', light: '#8A77B8', base: '#4A3A78', dark: '#261A45' },
  c: { name: 'Gök', light: '#C4EEFF', base: '#5CC8F2', dark: '#1E88B8' },
  d: { name: 'Gece', light: '#7D8CE0', base: '#2F3F9E', dark: '#18215E' },
};

// Jöle Patlat'ın 6 rengi (0..5) paletteki bu anahtarlara karşılık gelir
export const MATCH_KEYS = ['r', 'o', 'y', 'g', 'b', 'p'];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
