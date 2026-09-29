// Nakış bölüm haritası: tamamlanan tablolar renkli, sıradaki soluk izleriyle, kilitli olanlar
// gri siluet olarak görünür (sonraki tablolar önceden görülebilir ama oynanamaz).

import { NAKIS_LEVELS } from '../nakis/levels.js';
import { PALETTE, rgba } from '../palette.js';

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

export function renderNakisMap(user, onPick) {
  const current = user.nakisLevel ?? 1;
  const done = Math.min(current - 1, NAKIS_LEVELS.length);
  document.getElementById('nakis-progress').textContent = `${done} / ${NAKIS_LEVELS.length}`;
  const grid = document.getElementById('nakis-grid');
  grid.replaceChildren();
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
    grid.appendChild(btn);
  }
  grid.querySelector('.nakis-tile.current')?.scrollIntoView({ block: 'center' });
}
