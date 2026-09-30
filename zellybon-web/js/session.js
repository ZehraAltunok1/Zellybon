// Giriş yapan kullanıcının durumu (can, joker, ilerleme) ve can sayacı.

import { REWARD_LABELS } from './economy.js';
import { CHEST_INFO } from './chest.js';
import { RARITY, rarityOf, rewardIcon } from './rewardArt.js';

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

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

/**
 * Ödülleri değer kademesine göre renklenen kartlar olarak çizer: 3B simge, büyük miktar, ad ve kademe.
 * Aynı türden ödüller tek kartta toplanır; en değerli ödül önce gelir.
 */
export function renderRewards(listEl, rewards = []) {
  listEl.replaceChildren();
  listEl.hidden = rewards.length === 0;
  listEl.classList.add('reward-grid');

  const merged = new Map();
  for (const r of rewards) {
    const key = `${r.type}-${r.tier ?? ''}`;
    const m = merged.get(key);
    if (m) {
      m.count += r.count;
      if (r.reason && !m.reasons.includes(r.reason)) m.reasons.push(r.reason);
    } else {
      merged.set(key, { ...r, reasons: r.reason ? [r.reason] : [] });
    }
  }
  const items = [...merged.values()]
    .map((r) => ({ ...r, rarity: rarityOf(r) }))
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

  items.forEach((r, i) => {
    const name = r.type === 'chest'
      ? CHEST_INFO[r.tier]?.name ?? 'Sandık'
      : REWARD_LABELS[r.type]?.name ?? r.type;
    const li = document.createElement('li');
    li.className = `reward-tile rarity-${r.rarity}`;
    li.style.animationDelay = `${i * 0.12}s`;
    const ribbon = document.createElement('span');
    ribbon.className = 'reward-ribbon';
    ribbon.textContent = RARITY[r.rarity].name;
    const amount = document.createElement('strong');
    amount.className = 'reward-amount';
    amount.textContent = `+${r.count.toLocaleString('tr-TR')}`;
    const label = document.createElement('span');
    label.className = 'reward-name';
    label.textContent = name;
    const why = document.createElement('small');
    why.className = 'reward-why';
    why.textContent = r.reasons.join(' · ');
    li.append(ribbon, rewardIcon(r, 58), amount, label, why);
    listEl.appendChild(li);
  });
}
