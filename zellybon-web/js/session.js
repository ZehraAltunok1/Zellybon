// Giriş yapan kullanıcının durumu (can, joker, ilerleme) ve can sayacı.

import { REWARD_LABELS } from './economy.js';
import { CHEST_INFO } from './chest.js';

let user = null;
let syncedAt = 0;
const listeners = new Set();

export function getUser() {
  return user;
}

/** Sunucudan gelen kullanıcıyı kaydeder ve dinleyicilere haber verir. */
export function setUser(next) {
  user = next;
  syncedAt = Date.now();
  listeners.forEach((fn) => fn(user));
}

export function patchUser(patch) {
  if (!user) return;
  setUser({ ...user, ...patch });
}

export function onUserChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Bir sonraki cana kalan süre (ms), sunucudan son veri alındığından beri geçen süre düşülerek. */
export function nextLifeInMs() {
  const ms = user?.lives?.nextLifeInMs;
  if (ms === null || ms === undefined) return null;
  return Math.max(0, ms - (Date.now() - syncedAt));
}

export function formatCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Can göstergesini (kalpler + sayaç) bir elemana çizer. */
export function renderLives(el) {
  if (!user || !el) return;
  const { lives, max } = user.lives;
  const hearts = el.querySelector('.hearts') ?? el;
  hearts.textContent = '';
  for (let i = 0; i < max; i++) {
    const h = document.createElement('span');
    h.className = i < lives ? 'heart' : 'heart empty';
    h.textContent = i < lives ? '❤️' : '🤍';
    hearts.appendChild(h);
  }
  const timer = el.querySelector('.lives-timer');
  if (timer) {
    const ms = nextLifeInMs();
    timer.textContent = ms === null ? 'Canların dolu' : `Sonraki can: ${formatCountdown(ms)}`;
  }
}

/** Ödül listesini (❤️ +1 Can · Bölüm geçildi …) bir listeye çizer. */
export function renderRewards(listEl, rewards = []) {
  listEl.replaceChildren();
  listEl.hidden = rewards.length === 0;
  for (const r of rewards) {
    const label = r.type === 'chest'
      ? { icon: '🎁', name: CHEST_INFO[r.tier]?.name ?? 'Sandık' }
      : REWARD_LABELS[r.type] ?? { icon: '🎁', name: r.type };
    const li = document.createElement('li');
    li.className = 'reward';
    const icon = document.createElement('span');
    icon.className = 'reward-icon';
    icon.textContent = label.icon;
    const text = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = `+${r.count} ${label.name}`;
    const small = document.createElement('small');
    small.textContent = r.reason;
    text.append(strong, small);
    li.append(icon, text);
    listEl.appendChild(li);
  }
}
