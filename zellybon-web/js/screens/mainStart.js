// Jöle Atış bölüm öncesi ekranı: bölümün jöle şekli, yeni karakter tanıtımı,
// sonraki sandık ve güçlendirici seçimi.

import { getMainLevel } from '../shooter/levels.js';
import { renderGummy, drawAbilityBadge, ABILITIES, SHAPES } from '../shooter/shapes.js';
import { BOOSTERS, CHEST_NAMES } from '../economy.js';

const selected = new Set();

export function selectedBoosters() {
  return [...selected];
}

function drawPreview(canvas, level) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const css = 96;
  canvas.width = css * dpr;
  canvas.height = css * dpr;
  canvas.style.width = `${css}px`;
  canvas.style.height = `${css}px`;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  // Bölümün resmindeki renklerden üç jöle yan yana
  const colors = [...new Set(level.art.join('').replace(/\./g, ''))].slice(0, 3);
  const size = canvas.width * 0.62;
  const spots = colors.length === 1 ? [[0.5, 0.5]] : colors.length === 2
    ? [[0.34, 0.5], [0.66, 0.5]]
    : [[0.26, 0.56], [0.74, 0.56], [0.5, 0.42]];
  colors.forEach((color, i) => {
    const img = renderGummy({ shape: level.shape, color, size });
    const [x, y] = spots[i];
    g.drawImage(img, x * canvas.width - size / 2, y * canvas.height - size / 2, size, size);
  });
}

function drawIntroBadge(canvas, ability) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = 48 * dpr;
  canvas.height = 48 * dpr;
  canvas.style.width = '48px';
  canvas.style.height = '48px';
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  drawAbilityBadge(g, ability, canvas.width / 2, canvas.height / 2, canvas.width * 0.42);
}

export function renderMainStart(user, levelId) {
  const level = getMainLevel(levelId);
  selected.clear();

  document.getElementById('ms-title').textContent = `Bölüm ${level.id}`;
  document.getElementById('ms-name').textContent = level.name;
  document.getElementById('ms-shape').textContent = `Bu bölümün jöleleri: ${SHAPES[level.shape].name}`;
  drawPreview(document.getElementById('ms-preview'), level);

  const intro = document.getElementById('ms-intro');
  intro.hidden = !level.intro;
  if (level.intro) {
    const info = ABILITIES[level.intro];
    drawIntroBadge(document.getElementById('ms-intro-badge'), level.intro);
    document.getElementById('ms-intro-name').textContent = `Yeni karakter: ${info.name}`;
    document.getElementById('ms-intro-desc').textContent = info.desc;
  }

  const chestEl = document.getElementById('ms-chest');
  const chest = user.nextChest;
  chestEl.hidden = !chest || level.id !== user.mainLevel;
  if (chest) {
    const c = CHEST_NAMES[chest.tier];
    const left = chest.level - level.id;
    chestEl.textContent = left === 0
      ? `${c.icon} Bu bölümü geçersen ${c.name} kazanırsın!`
      : `${c.icon} ${c.name}: ${left} bölüm sonra (Bölüm ${chest.level})`;
    chestEl.classList.toggle('chest-now', left === 0);
  }

  const list = document.getElementById('ms-boosters');
  list.replaceChildren();
  for (const b of BOOSTERS) {
    const count = user.boosters?.[b.id] ?? 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'booster-card';
    btn.disabled = count < 1;
    btn.setAttribute('aria-pressed', 'false');
    const icon = document.createElement('span');
    icon.className = 'booster-icon';
    icon.textContent = b.icon;
    const text = document.createElement('span');
    text.className = 'booster-text';
    const name = document.createElement('strong');
    name.textContent = b.name;
    const desc = document.createElement('small');
    desc.textContent = b.desc;
    text.append(name, desc);
    const badge = document.createElement('span');
    badge.className = 'booster-count';
    badge.textContent = count > 0 ? `x${count}` : 'Yok';
    btn.append(icon, text, badge);
    btn.addEventListener('click', () => {
      if (selected.has(b.id)) selected.delete(b.id);
      else selected.add(b.id);
      const on = selected.has(b.id);
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    list.appendChild(btn);
  }
}
