// Nakış bölüm haritası: tamamlanan tablolar renkli, sıradaki soluk izleriyle, kilitli olanlar
// gri siluet olarak görünür (sonraki tablolar önceden görülebilir ama oynanamaz).

import { NAKIS_LEVELS } from '../nakis/levels.js';
import { PALETTE, rgba } from '../palette.js';
import { chestMilestones, paintChestCanvas } from '../chest.js';
import { showChestInfo } from './chests.js';

const THUMB = 84;

function drawThumb(canvas, art, state) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = THUMB * dpr;
  canvas.height = THUMB * dpr;
  canvas.style.width = `${THUMB}px`;
  canvas.style.height = `${THUMB}px`;
  const g = canvas.getContext('2d');
  const H = art.length;
  const W = art[0].length;
  const cell = Math.floor(Math.min(canvas.width / W, canvas.height / H));
  const ox = (canvas.width - W * cell) / 2;
  const oy = (canvas.height - H * cell) / 2;
  g.clearRect(0, 0, canvas.width, canvas.height);
  art.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const pal = PALETTE[ch];
    if (state === 'done') g.fillStyle = pal.base;
    else if (state === 'current') g.fillStyle = rgba(pal.base, 0.45);
    else g.fillStyle = 'rgba(255, 255, 255, 0.22)';
    g.fillRect(ox + x * cell, oy + y * cell, cell - (cell > 4 ? 1 : 0), cell - (cell > 4 ? 1 : 0));
  }));
}

export function mapChest(tier) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'map-chest';
  b.setAttribute('aria-label', 'Sandık: içinde ne var?');
  const c = document.createElement('canvas');
  paintChestCanvas(c, tier, 38, { time: 500 });
  b.appendChild(c);
  b.addEventListener('click', () => showChestInfo(tier));
  return b;
}

export function renderNakisMap(user, onPick) {
  const current = user.nakisLevel ?? 1;
  const done = Math.min(current - 1, NAKIS_LEVELS.length);
  document.getElementById('nakis-progress').textContent = `${done} / ${NAKIS_LEVELS.length}`;
  const grid = document.getElementById('nakis-grid');
  grid.replaceChildren();
  const chests = new Map(chestMilestones(NAKIS_LEVELS.length).map((m) => [m.level, m.tier]));
  for (const level of NAKIS_LEVELS) {
    const state = level.id < current ? 'done' : level.id === current ? 'current' : 'locked';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `nakis-tile ${state}`;
    btn.disabled = state === 'locked';
    btn.setAttribute('aria-label', `Tablo ${level.id}, ${level.name}${state === 'locked' ? ', kilitli' : ''}`);
    const canvas = document.createElement('canvas');
    drawThumb(canvas, level.art, state);
    const label = document.createElement('span');
    label.className = 'nakis-tile-label';
    label.textContent = `${level.id} · ${level.name}`;
    btn.append(canvas, label);
    if (state === 'locked') {
      const lock = document.createElement('span');
      lock.className = 'nakis-lock';
      lock.textContent = '🔒';
      btn.appendChild(lock);
    } else if (state === 'done') {
      const check = document.createElement('span');
      check.className = 'nakis-check';
      check.textContent = '✓';
      btn.appendChild(check);
    }
    if (state !== 'locked') btn.addEventListener('click', () => onPick(level.id));
    const tile = document.createElement('div');
    tile.className = 'map-tile-wrap';
    tile.appendChild(btn);
    // Sandık veren tablo: köşede sandık (dokununca içeriği görünür)
    if (chests.has(level.id) && state !== 'done') tile.appendChild(mapChest(chests.get(level.id)));
    grid.appendChild(tile);
  }
  grid.querySelector('.nakis-tile.current')?.scrollIntoView({ block: 'center' });
}
