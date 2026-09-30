import { MAIN_LEVELS } from '../shooter/levels.js';
import { NAKIS_LEVELS } from '../nakis/levels.js';
import { PIN_LEVELS } from '../pins/levels.js';
import { CHEST_NAMES } from '../economy.js';
import { CHEST_INFO, CHEST_ORDER, paintChestCanvas } from '../chest.js';

export function renderHome(user) {
  document.getElementById('home-username').textContent = user.username;
  document.querySelectorAll('[data-coins]').forEach((el) => {
    el.textContent = (user.coins ?? 0).toLocaleString('tr-TR');
  });
  document.querySelectorAll('[data-keys]').forEach((el) => { el.textContent = String(user.keys ?? 0); });

  // Kısayol rozetleri: alınabilecek günlük ödül / açılabilecek sandık
  const daily = user.daily ?? {};
  const dailyCount = (daily.loginReady ? 1 : 0) + (daily.questsReady ?? 0);
  const badgeDaily = document.getElementById('badge-daily');
  badgeDaily.hidden = dailyCount === 0;
  badgeDaily.textContent = String(dailyCount);
  const openable = (user.chests ?? []).filter((c) => (user.keys ?? 0) >= (CHEST_INFO[c.tier]?.keys ?? 99)).length;
  const badgeChests = document.getElementById('badge-chests');
  badgeChests.hidden = (user.chests ?? []).length === 0;
  badgeChests.textContent = String(user.chests?.length ?? 0);
  badgeChests.classList.toggle('ready', openable > 0);
  const best = [...(user.chests ?? [])].map((c) => c.tier)
    .sort((a, b) => CHEST_ORDER.indexOf(b) - CHEST_ORDER.indexOf(a))[0] ?? 'bronze';
  paintChestCanvas(document.getElementById('shortcut-chest'), best, 34);

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

  const pins = user.pinLevel ?? 1;
  document.getElementById('home-pins-level').textContent = pins > PIN_LEVELS.length
    ? `🏆 ${PIN_LEVELS.length} bölümün hepsi tamam!`
    : `Bölüm ${pins} · ${PIN_LEVELS[pins - 1].name}`;
  document.getElementById('home-worm-best').textContent = user.wormBest ? `🏆 Rekor: ${user.wormBest}` : 'Yeni!';

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

/** Oynanacak İğnedenlik bölümü. */
export function currentPinLevelId(user) {
  return Math.min(user.pinLevel ?? 1, PIN_LEVELS.length);
}

/** Oynanacak Nakış tablosu. */
export function currentNakisLevelId(user) {
  return Math.min(user.nakisLevel ?? 1, NAKIS_LEVELS.length);
}
