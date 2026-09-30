// Ekonominin istemci tarafı: güçlendirici tanımları, sandık adları ve ödül etiketleri.
// Kurallar sunucudadır (zellybon-api/src/rewards.js); burada sadece gösterim bilgisi var.

import { CHEST_INFO } from './chest.js';

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

export const CHEST_NAMES = Object.fromEntries(
  Object.entries(CHEST_INFO).map(([id, c]) => [id, { name: c.name, icon: '🎁', keys: c.keys }]),
);

export const REWARD_LABELS = {
  coins: { icon: '🪙', name: 'Para' },
  key: { icon: '🔑', name: 'Anahtar' },
  chest: { icon: '🎁', name: 'Sandık' },
  randomJoker: { icon: '🃏', name: 'Rastgele joker' },
  randomBooster: { icon: '🚀', name: 'Güçlendirici' },
  life: { icon: '❤️', name: 'Can' },
  extraSlot: { icon: '📦', name: 'Ekstra Kutu' },
  superStart: { icon: '⭐', name: 'Süper Başlangıç' },
  hammer: { icon: '🔨', name: 'Çekiç' },
  colorBomb: { icon: '🌈', name: 'Renk Bombası' },
  shuffle: { icon: '🔀', name: 'Karıştır' },
  hourglass: { icon: '⏳', name: 'Kum Saati' },
  scissors: { icon: '✂️', name: 'Makas' },
  needle: { icon: '🪡', name: 'Sihirli İğne' },
  box: { icon: '📦', name: 'Ekstra Kutu (Nakış)' },
  magnet: { icon: '🧲', name: 'Mıknatıs' },
};

export const SHOP_GROUPS = [
  { title: 'Canlar', theme: 'lives', ids: ['life1', 'lifeFull'] },
  { title: 'Jöle Atış güçlendiricileri', theme: 'main', ids: ['extraSlot', 'superStart'] },
  { title: 'Nakış jokerleri', theme: 'nakis', ids: ['scissors', 'needle', 'box', 'magnet'] },
  { title: 'Jöle Patlat jokerleri', theme: 'match', ids: ['hammer', 'shuffle', 'hourglass', 'colorBomb'] },
];

export const SHOP_ICONS = {
  life1: '❤️', lifeFull: '💖', extraSlot: '📦', superStart: '⭐',
  hammer: '🔨', shuffle: '🔀', hourglass: '⏳', colorBomb: '🌈',
  scissors: '✂️', needle: '🪡', box: '📦', magnet: '🧲',
};
