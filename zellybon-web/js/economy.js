// Ekonominin istemci tarafı: güçlendirici tanımları, sandık adları ve ödül etiketleri.
// Kurallar sunucudadır (zellybon-api/src/rewards.js); burada sadece gösterim bilgisi var.

export const BOOSTERS = [
  {
    id: 'extraSlot',
    name: 'Ekstra Kutu',
    icon: '📦',
    desc: 'Bölüme +1 bekleme kutusuyla başla.',
  },
  {
    id: 'superStart',
    name: 'Süper Başlangıç',
    icon: '⭐',
    desc: 'Her sütunun ilk jölesi Delici olur.',
  },
];

export const CHEST_NAMES = {
  bronze: { name: 'Bronz Sandık', icon: '🎁' },
  silver: { name: 'Gümüş Sandık', icon: '🎁' },
  gold: { name: 'Altın Sandık', icon: '🎁' },
  diamond: { name: 'Elmas Sandık', icon: '💎' },
  legend: { name: 'Efsane Sandık', icon: '👑' },
};

export const REWARD_LABELS = {
  coins: { icon: '🪙', name: 'Para' },
  life: { icon: '❤️', name: 'Can' },
  extraSlot: { icon: '📦', name: 'Ekstra Kutu' },
  superStart: { icon: '⭐', name: 'Süper Başlangıç' },
  hammer: { icon: '🔨', name: 'Çekiç' },
  colorBomb: { icon: '🌈', name: 'Renk Bombası' },
  shuffle: { icon: '🔀', name: 'Karıştır' },
  hourglass: { icon: '⏳', name: 'Kum Saati' },
};

export const SHOP_GROUPS = [
  { title: 'Canlar', ids: ['life1', 'lifeFull'] },
  { title: 'Jöle Atış güçlendiricileri', ids: ['extraSlot', 'superStart'] },
  { title: 'Jöle Patlat jokerleri', ids: ['hammer', 'shuffle', 'hourglass', 'colorBomb'] },
];

export const SHOP_ICONS = {
  life1: '❤️', lifeFull: '💖', extraSlot: '📦', superStart: '⭐',
  hammer: '🔨', shuffle: '🔀', hourglass: '⏳', colorBomb: '🌈',
};
