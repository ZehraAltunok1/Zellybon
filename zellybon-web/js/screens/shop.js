// Dükkân: oyunda kazanılan paralarla can, güçlendirici ve joker alınır.

import { Api } from '../api.js';
import { getUser, setUser } from '../session.js';
import { SHOP_GROUPS, SHOP_ICONS } from '../economy.js';

let catalog = null;

function ownedCount(user, id) {
  if (id === 'life1' || id === 'lifeFull') return `${user.lives.lives}/${user.lives.max}`;
  return String(user.boosters?.[id] ?? user.nakisJokers?.[id] ?? user.jokers?.[id] ?? 0);
}

export async function showShop() {
  const root = document.getElementById('shop-groups');
  const status = document.getElementById('shop-status');
  status.textContent = '';
  if (!catalog) {
    status.textContent = 'Yükleniyor…';
    try {
      catalog = (await Api.shop()).items;
      status.textContent = '';
    } catch (err) {
      status.textContent = err.message;
      return;
    }
  }
  renderShop();
}

export function renderShop() {
  const user = getUser();
  if (!catalog || !user) return;
  document.getElementById('shop-coins').textContent = user.coins.toLocaleString('tr-TR');
  const root = document.getElementById('shop-groups');
  root.replaceChildren();

  for (const group of SHOP_GROUPS) {
    const h = document.createElement('h3');
    h.className = 'subtitle';
    h.textContent = group.title;
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    for (const id of group.ids) {
      const item = catalog.find((i) => i.id === id);
      if (!item) continue;
      const card = document.createElement('div');
      card.className = 'shop-card';
      const icon = document.createElement('span');
      icon.className = 'shop-icon';
      icon.textContent = SHOP_ICONS[id] ?? '🎁';
      const name = document.createElement('strong');
      name.textContent = item.name;
      const owned = document.createElement('small');
      owned.textContent = `Sende: ${ownedCount(user, id)}`;
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'btn btn-primary btn-buy';
      buy.textContent = `🪙 ${item.price}`;
      const livesFull = item.grant.life && user.lives.lives >= user.lives.max;
      buy.disabled = user.coins < item.price || livesFull;
      if (livesFull) buy.title = 'Canların zaten dolu';
      buy.addEventListener('click', () => purchase(item, buy));
      card.append(icon, name, owned, buy);
      grid.appendChild(card);
    }
    root.append(h, grid);
  }
}

async function purchase(item, btn) {
  const status = document.getElementById('shop-status');
  btn.disabled = true;
  try {
    const res = await Api.buy(item.id);
    setUser(res.user);
    status.textContent = `${item.name} alındı ✓`;
  } catch (err) {
    status.textContent = err.message;
  }
  renderShop();
}
