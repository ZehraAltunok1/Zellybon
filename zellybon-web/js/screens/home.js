import { MAIN_LEVELS } from '../shooter/levels.js';

export function renderHome(user) {
  document.getElementById('home-username').textContent = user.username;
  const el = document.getElementById('home-main-level');
  const next = Math.min(user.mainLevel, MAIN_LEVELS.length);
  if (user.mainLevel > MAIN_LEVELS.length) {
    el.textContent = `🏆 ${MAIN_LEVELS.length} bölümün hepsi tamam! Yeni bölümler yakında.`;
  } else {
    const level = MAIN_LEVELS[next - 1];
    el.textContent = `Bölüm ${level.id} · ${level.name}`;
  }
}

/** Oynanacak ana oyun bölümü: açılmış en yüksek bölüm (hepsi bittiyse sonuncusu). */
export function currentMainLevelId(user) {
  return Math.min(user.mainLevel, MAIN_LEVELS.length);
}
