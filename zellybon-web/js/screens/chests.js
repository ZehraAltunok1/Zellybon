// Sandıklarım: kazanılan sandıklar anahtarla açılır. Her kademe rengiyle ayırt edilir.

import { Api } from '../api.js';
import { getUser, setUser, renderRewards } from '../session.js';
import { CHEST_INFO, CHEST_ORDER, paintChestCanvas } from '../chest.js';

let animRaf = 0;
let infoRaf = 0;
let tierInfo = null;

/** Sandığın içinden neler çıkacağını açmadan gösterir */
export async function showChestInfo(tier) {
  const modal = document.getElementById('chest-info-modal');
  const info = CHEST_INFO[tier];
  const list = document.getElementById('chest-info-rewards');
  document.getElementById('chest-info-title').textContent = `${info.name} içinde neler var?`;
  document.getElementById('chest-info-keys').textContent = `Açmak için 🔑 ${info.keys} anahtar gerekir`;
  renderRewards(list, []);
  modal.hidden = false;
  const canvas = document.getElementById('chest-info-canvas');
  const size = Math.min(150, window.innerWidth - 80);
  cancelAnimationFrame(infoRaf);
  const tick = (t) => {
    if (modal.hidden) return;
    paintChestCanvas(canvas, tier, size, { time: t });
    infoRaf = requestAnimationFrame(tick);
  };
  infoRaf = requestAnimationFrame(tick);
  document.getElementById('chest-info-close').onclick = () => {
    modal.hidden = true;
    cancelAnimationFrame(infoRaf);
  };
  try {
    tierInfo ??= (await Api.chestInfo()).tiers;
  } catch (err) {
    document.getElementById('chest-info-keys').textContent = err.message;
    return;
  }
  const t = tierInfo.find((x) => x.id === tier);
  if (!t) return;
  const items = [{ type: 'coins', count: t.coins }];
  if (t.lives) items.push({ type: 'life', count: t.lives });
  if (t.jokers) items.push({ type: 'randomJoker', count: t.jokers });
  if (t.boosters) items.push({ type: 'randomBooster', count: t.boosters });
  renderRewards(list, items);
}
let listRaf = 0;

// Sandıklarım ekranı açıkken kart sandıkları canlanır (aura nabzı, parlama geçişi); ekran kapanınca durur
function animateList() {
  cancelAnimationFrame(listRaf);
  const tick = (now) => {
    if (document.body.dataset.screen !== 'chests') return;
    document.querySelectorAll('#chests-grid canvas[data-tier], #chests-legend canvas[data-tier]').forEach((c) => {
      paintChestCanvas(c, c.dataset.tier, Number(c.dataset.size), { time: now + Number(c.dataset.offset) });
    });
    listRaf = requestAnimationFrame(tick);
  };
  listRaf = requestAnimationFrame(tick);
}

function chestCanvas(tier, size, offset) {
  const c = document.createElement('canvas');
  c.dataset.tier = tier;
  c.dataset.size = String(size);
  c.dataset.offset = String(offset);
  paintChestCanvas(c, tier, size, { time: offset });
  return c;
}

export function renderChests() {
  const user = getUser();
  if (!user) return;
  document.getElementById('chests-keys').textContent = String(user.keys ?? 0);

  const grid = document.getElementById('chests-grid');
  grid.replaceChildren();
  const empty = document.getElementById('chests-empty');
  empty.hidden = user.chests.length > 0;

  // Değerli sandıklar önce
  const chests = [...user.chests].sort((a, b) => CHEST_ORDER.indexOf(b.tier) - CHEST_ORDER.indexOf(a.tier));
  for (const chest of chests) {
    const info = CHEST_INFO[chest.tier];
    const card = document.createElement('div');
    card.className = `chest-card tier-${chest.tier}`;
    const canvas = chestCanvas(chest.tier, 104, grid.children.length * 700);
    const name = document.createElement('strong');
    name.textContent = info.name;
    const source = document.createElement('small');
    source.textContent = chest.source || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-open';
    btn.textContent = `🔑 ${info.keys} ile aç`;
    btn.disabled = (user.keys ?? 0) < info.keys;
    btn.addEventListener('click', () => openChestFlow(chest));
    const peek = document.createElement('button');
    peek.type = 'button';
    peek.className = 'btn-peek';
    peek.textContent = '🔍 İçinde ne var?';
    peek.addEventListener('click', () => showChestInfo(chest.tier));
    canvas.addEventListener('click', () => showChestInfo(chest.tier));
    card.append(canvas, name, source, btn, peek);
    grid.appendChild(card);
  }

  // Kademe rehberi: sandıklar renklerinden tanınır
  const legend = document.getElementById('chests-legend');
  legend.replaceChildren();
  for (const tier of CHEST_ORDER) {
    const info = CHEST_INFO[tier];
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'legend-item';
    item.setAttribute('aria-label', `${info.name}: içinde ne var?`);
    item.addEventListener('click', () => showChestInfo(tier));
    const canvas = chestCanvas(tier, 52, CHEST_ORDER.indexOf(tier) * 500);
    const label = document.createElement('small');
    label.textContent = `${info.name.replace(' Sandık', '')} · 🔑${info.keys}`;
    item.append(canvas, label);
    legend.appendChild(item);
  }
  animateList();
}

// Açma animasyonu: sallanma → kapak açılır, ışık → ödüller
async function openChestFlow(chest) {
  const modal = document.getElementById('chest-modal');
  const canvas = document.getElementById('chest-modal-canvas');
  const title = document.getElementById('chest-modal-title');
  const list = document.getElementById('chest-modal-rewards');
  const closeBtn = document.getElementById('chest-modal-close');
  const info = CHEST_INFO[chest.tier];

  title.textContent = `${info.name} açılıyor…`;
  renderRewards(list, []);
  closeBtn.hidden = true;
  modal.hidden = false;

  const start = performance.now();
  let openAt = null;
  let result = null;
  let error = null;
  Api.openChest(chest.id)
    .then((res) => { result = res; })
    .catch((err) => { error = err; });

  cancelAnimationFrame(animRaf);
  const size = Math.min(260, window.innerWidth - 60);
  const frame = (now) => {
    const t = now - start;
    let open = 0;
    let shake = 0;
    if (!openAt && t > 900 && (result || error)) openAt = now;
    if (!openAt) {
      shake = Math.sin(t / 45) * Math.min(1, t / 400) * 6;
    } else {
      open = Math.min(1, (now - openAt) / 600);
    }
    canvas.style.transform = `translateX(${shake}px) rotate(${shake * 0.6}deg)`;
    paintChestCanvas(canvas, chest.tier, size, { open: error ? 0 : open, time: t });
    if (openAt && (error || open >= 1)) finish();
    animRaf = requestAnimationFrame(frame);
  };
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    closeBtn.hidden = false;
    if (error) {
      title.textContent = error.message;
      return;
    }
    setUser(result.user);
    title.textContent = `${info.name} açıldı! 🎉`;
    renderRewards(list, result.opened.items);
  };
  animRaf = requestAnimationFrame(frame);

  closeBtn.onclick = () => {
    cancelAnimationFrame(animRaf);
    modal.hidden = true;
    canvas.style.transform = '';
    renderChests();
  };
}
