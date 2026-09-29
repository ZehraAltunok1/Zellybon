// Jöle Patlat jokerleri. Satın alınmaz; ödül olarak kazanılır.

export const JOKERS = [
  {
    id: 'hammer',
    name: 'Çekiç',
    icon: '🔨',
    targeted: true,
    desc: 'Seçtiğin tek bir jöleyi patlatır.',
    hint: 'Patlatmak istediğin jöleye dokun.',
  },
  {
    id: 'colorBomb',
    name: 'Renk Bombası',
    icon: '🌈',
    targeted: true,
    desc: 'Seçtiğin renkteki tüm jöleleri patlatır.',
    hint: 'Hangi rengi patlatmak istiyorsan o renkte bir jöleye dokun.',
  },
  {
    id: 'shuffle',
    name: 'Karıştır',
    icon: '🔀',
    targeted: false,
    desc: 'Tahtadaki jöleleri karıştırır.',
  },
  {
    id: 'hourglass',
    name: 'Kum Saati',
    icon: '⏳',
    targeted: false,
    desc: 'Hızlı Tur: +10 saniye (turda en fazla 3). Bölüm: +5 hamle.',
  },
];

export const getJoker = (id) => JOKERS.find((j) => j.id === id);

export const HOURGLASS_SECONDS = 10;
export const HOURGLASS_MOVES = 5;
export const HOURGLASS_MAX_PER_QUICK_ROUND = 3;

// Kazanma yolları (sunucudaki kurallarla aynı; sadece gösterim için)
export const HOW_TO_EARN = [
  'Hızlı Tur: 1.500+ puan → ❤️ +1 can, 3.000+ puan → ❤️ +2 can',
  'Hızlı Tur: yeni rekor → 🔨 Çekiç, x6 veya üstü kombo → 🔀 Karıştır',
  'Her bölüm galibiyeti → ❤️ +1 can',
  'Bölümü ilk kez geçmek → bir joker; her 5. bölüm → hazine sandığı (her jokerden 1)',
  'Bir bölümde ilk kez 3 yıldız → 🌈 Renk Bombası',
  'Jokerleri Jöle Atış\'ta kazandığın paralarla 🛒 Dükkân\'dan da alabilirsin',
];

