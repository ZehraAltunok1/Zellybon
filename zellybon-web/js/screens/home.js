import { MAIN_LEVELS } from '../shooter/levels.js';
import { NAKIS_LEVELS } from '../nakis/levels.js';
import { CHEST_NAMES } from '../economy.js';

export function renderHome(user) {
  document.getElementById('home-username').textContent = user.username;
  document.querySelectorAll('[data-coins]').forEach((el) => {
    el.textContent = (user.coins ?? 0).toLocaleString('tr-TR');
  });

  const el = document.getElementById('home-main-level');
  if (user.mainLevel > MAIN_LEVELS.length) {
    el.textContent = `🏆 ${MAIN_LEVELS.length} bölümün hepsi tamam! Yeni bölümler yakında.`;
  } else {
    const level = MAIN_LEVELS[user.mainLevel - 1];
    el.textContent = `Bölüm ${level.id} · ${level.name}`;
  }

  const nakisEl = document.getElementById('home-nakis-level');
  const nakis = user.nakisLevel ?? 1;
  nakisEl.textContent = nakis > NAKIS_LEVELS.length
    ? `🏆 ${NAKIS_LEVELS.length} tablonun hepsi işlendi!`
    : `Tablo ${nakis} · ${NAKIS_LEVELS[nakis - 1].name}`;

  // Sonraki sandığa ilerleme
  const chestEl = document.getElementById('home-chest');
  const chest = user.nextChest;
  chestEl.hidden = !chest;
  if (chest) {
    const c = CHEST_NAMES[chest.tier];
    const left = chest.level - user.mainLevel;
    chestEl.textContent = left === 0
      ? `${c.icon} Bu bölümde ${c.name} seni bekliyor!`
      : `${c.icon} ${c.name}: ${left + 1} bölüm kaldı`;
  }
}

/** Oynanacak ana oyun bölümü: açılmış en yüksek bölüm (hepsi bittiyse sonuncusu). */
export function currentMainLevelId(user) {
  return Math.min(user.mainLevel, MAIN_LEVELS.length);
}

/** Oynanacak Nakış tablosu. */
export function currentNakisLevelId(user) {
  return Math.min(user.nakisLevel ?? 1, NAKIS_LEVELS.length);
}
