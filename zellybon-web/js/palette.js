// Oyunun ortak renk paleti — Car Parking Jam'in renk dilinden türetildi (ekran görüntülerinden ölçüldü):
// temiz, canlı "oyuncak araba" renkleri + çelik mavisi ortam + arduvaz yazı rengi.
// Her renk üç tondan oluşur: light (ışık alan yüzey), base (ana renk), dark (gölge ve kontur).
// Tonlar üç boyutlu gölgelendirmede kullanılır: üst yüzey light, ön yüz base, yan/alt yüz dark.

export const PALETTE = {
  // Ölçülen araba renkleri
  r: { name: 'Kırmızı', light: '#FF9A93', base: '#EA5249', dark: '#A82F2A' },
  y: { name: 'Sarı', light: '#FFF0A0', base: '#EFCD43', dark: '#A78828' },
  g: { name: 'Yeşil', light: '#A8F0AA', base: '#58C95B', dark: '#2F8A34' },
  b: { name: 'Mavi', light: '#9CC6F5', base: '#4C8DDC', dark: '#25579A' },
  i: { name: 'Pembe', light: '#FFC6D6', base: '#ED8DAA', dark: '#B8567A' },
  c: { name: 'Turkuaz', light: '#9BEFF5', base: '#32D4E0', dark: '#13919A' },
  t: { name: 'Şeftali', light: '#FFDCCF', base: '#ECB1A0', dark: '#B97A68' },
  w: { name: 'Beyaz', light: '#FFFFFF', base: '#F4F3F1', dark: '#BBB9C3' },
  k: { name: 'Antrasit', light: '#918F94', base: '#616064', dark: '#3A393B' },
  d: { name: 'Lacivert', light: '#6F93B8', base: '#31679A', dark: '#1E4B71' },
  a: { name: 'Bebek mavisi', light: '#D3E8F8', base: '#7AA7CC', dark: '#4A7AA0' },
  // Aynı canlılıkta tamamlayıcı renkler (renk çeşitliliği için)
  o: { name: 'Turuncu', light: '#FFC48A', base: '#F58A3A', dark: '#B85A1C' },
  p: { name: 'Mor', light: '#D2B0F2', base: '#9B5FD6', dark: '#5E2E91' },
  n: { name: 'Kahve', light: '#D9A27A', base: '#A8643B', dark: '#6B3A1E' },
  l: { name: 'Fıstık', light: '#F2F8B0', base: '#C9E052', dark: '#88A020' },
  m: { name: 'Nane', light: '#C5F5E3', base: '#6FD9B4', dark: '#2E9E7A' },
  e: { name: 'Eflatun', light: '#F7A8E8', base: '#D64FB9', dark: '#8E2479' },
};

// Arayüz renkleri (CSS'teki :root ile aynı)
export const UI = {
  sky: '#4A84B0',
  deep: '#24507A',
  ink: '#22364A',
  coin: '#EFCD43',
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
