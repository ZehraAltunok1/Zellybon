// İğnedenlik (bölüm haritası, sonuç) ve Jöle Solucan (lobi, solucan seçimi, sonuç) ekranları.

import { Api } from '../api.js';
import { getUser, setUser, renderRewards } from '../session.js';
import { PIN_LEVELS } from '../pins/levels.js';
import { drawCushion, drawPinHead, drawShaft } from '../pins/renderer.js';
import { CUSHION_R, PIN_R, HEAD_R } from '../pins/engine.js';
import { SKINS } from '../worm/engine.js';
import { PALETTE } from '../palette.js';
import { drawFace, drawCrown } from '../worm/renderer.js';
import { launchConfetti } from './confetti.js';

const TAU = Math.PI * 2;

function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return g;
}

/** Küçük iğnedenlik resmi: bölümün kumaş rengi ve saplı iğneleri */
export function paintCushion(canvas, level, size, { locked = false, done = false } = {}) {
  const g = setupCanvas(canvas, size, size);
  const u = size / (2 * (PIN_R + 0.3));
  const c = size / 2;
  g.globalAlpha = locked ? 0.45 : 1;
  const pins = done ? [...level.start, ...Array.from({ length: level.throws }, (_, k) => (k / level.throws) * TAU + 0.2)] : level.start;
  for (const a of pins) {
    drawShaft(g, c + Math.cos(a) * u * 0.7, c + Math.sin(a) * u * 0.7,
      c + Math.cos(a) * (PIN_R - HEAD_R) * u, c + Math.sin(a) * (PIN_R - HEAD_R) * u, Math.max(1, u * 0.06));
  }
  drawCushion(g, c, c, CUSHION_R * u, locked ? 'k' : level.cushion, 0.3);
  pins.forEach((a, k) => {
    drawPinHead(g, c + Math.cos(a) * PIN_R * u, c + Math.sin(a) * PIN_R * u, HEAD_R * u * 1.2,
      k < level.start.length ? 'w' : ['r', 'y', 'b', 'g', 'o'][k % 5]);
  });
  if (level.thread && !locked) {
    g.globalAlpha = 1;
    g.font = `${Math.round(size * 0.2)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('🧵', size * 0.84, size * 0.16);
  }
  g.globalAlpha = 1;
}

export function renderPinsMap(user, onPick) {
  const current = user.pinLevel ?? 1;
  document.getElementById('pins-progress').textContent = `${Math.min(current - 1, PIN_LEVELS.length)} / ${PIN_LEVELS.length}`;
  const grid = document.getElementById('pins-grid');
  grid.replaceChildren();
  for (const level of PIN_LEVELS) {
    const state = level.id < current ? 'done' : level.id === current ? 'current' : 'locked';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `nakis-tile ${state}`;
    btn.disabled = state === 'locked';
    btn.setAttribute('aria-label', `Bölüm ${level.id}, ${level.name}${state === 'locked' ? ', kilitli' : ''}`);
    const canvas = document.createElement('canvas');
    paintCushion(canvas, level, 84, { locked: state === 'locked', done: state === 'done' });
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

export async function showPinsResult(result) {
  const level = PIN_LEVELS.find((l) => l.id === result.levelId);
  const nextBtn = document.getElementById('pr-next');
  const retryBtn = document.getElementById('pr-retry');
  const statusEl = document.getElementById('pr-status');
  const rewardsEl = document.getElementById('pr-rewards');
  const confetti = document.getElementById('pins-confetti');
  confetti.replaceChildren();
  nextBtn.dataset.level = String(result.levelId + 1);
  retryBtn.dataset.level = String(result.levelId);
  nextBtn.hidden = true;
  retryBtn.hidden = true;
  renderRewards(rewardsEl, []);
  paintCushion(document.getElementById('pr-art'), level, 150, { done: result.won });

  if (result.won) {
    document.getElementById('pr-title').textContent = 'Harika! 🎉';
    document.getElementById('pr-text').textContent = `${level.name}: bütün iğneler yerinde!`;
    launchConfetti(confetti);
  } else {
    document.getElementById('pr-title').textContent = result.reason === 'tangle' ? 'İp dolaştı!' : 'Çat! İğneler çarpıştı';
    document.getElementById('pr-text').textContent = result.reason === 'tangle'
      ? 'İpucu: yeni iğneyi hep sarı parlayan yaya sapla.'
      : 'İpucu: acele etme, boşluk alta gelince dokun.';
  }

  statusEl.textContent = 'Kaydediliyor…';
  try {
    const res = await Api.pinsResult(result.levelId, result.won);
    setUser(res.user);
    statusEl.textContent = '';
    renderRewards(rewardsEl, res.rewards);
  } catch (err) {
    statusEl.textContent = `Sonuç kaydedilemedi: ${err.message}`;
  }
  if (result.won) nextBtn.hidden = result.levelId >= PIN_LEVELS.length;
  else retryBtn.hidden = false;
}

// ---------- Jöle Solucan ----------

const SKIN_KEY = 'zellybon_worm_skin';

export function selectedSkin() {
  let id = null;
  try {
    id = localStorage.getItem(SKIN_KEY);
  } catch {
    // yok say
  }
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

function saveSkin(id) {
  try {
    localStorage.setItem(SKIN_KEY, id);
  } catch {
    // yok say
  }
}

/** Kıvrılan bir solucan çizer (lobi önizlemesi ve ana sayfa kartı için) */
export function paintWorm(g, skin, { x, y, len = 22, r = 12, t = 0, crown = false, dir = 0 }) {
  const pts = [];
  for (let i = 0; i < len; i++) {
    pts.push([x - Math.cos(dir) * i * r * 0.75 + Math.sin(i * 0.35 - t / 400) * r * 1.4 * Math.sin(dir + Math.PI / 2),
      y - Math.sin(dir) * i * r * 0.75 + Math.sin(i * 0.35 - t / 400) * r * 1.4 * Math.cos(dir)]);
  }
  for (let i = len - 1; i >= 0; i--) {
    const [px, py] = pts[i];
    const pal = PALETTE[Math.floor(i / 3) % 2 ? skin.b : skin.a];
    const rr = (i === 0 ? r * 1.15 : r) * Math.max(0.55, 1 - Math.max(0, i - len + 7) * 0.07);
    g.beginPath();
    g.arc(px, py, rr, 0, TAU);
    g.fillStyle = pal.dark;
    g.fill();
    const grad = g.createRadialGradient(px - rr * 0.3, py - rr * 0.35, rr * 0.1, px, py, rr * 0.9);
    grad.addColorStop(0, pal.light);
    grad.addColorStop(0.5, pal.base);
    grad.addColorStop(1, pal.dark);
    g.beginPath();
    g.arc(px, py, rr * 0.9, 0, TAU);
    g.fillStyle = grad;
    g.fill();
    g.beginPath();
    g.ellipse(px - rr * 0.28, py - rr * 0.36, rr * 0.3, rr * 0.16, -0.6, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fill();
  }
  const [hx, hy] = pts[0];
  const [nx, ny] = pts[1];
  const hd = Math.atan2(hy - ny, hx - nx);
  drawFace(g, hx, hy, r * 1.2, hd, hd);
  if (crown) drawCrown(g, hx, hy - r * 2.4, r * 0.95, t);
}

let lobbyRaf = 0;

export function renderWormLobby(user) {
  document.getElementById('worm-best').textContent = String(user.wormBest ?? 0);
  const skinsEl = document.getElementById('worm-skins');
  skinsEl.replaceChildren();
  const current = selectedSkin();
  for (const skin of SKINS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `worm-skin${skin.id === current.id ? ' selected' : ''}`;
    btn.style.setProperty('--a', PALETTE[skin.a].base);
    btn.style.setProperty('--b', PALETTE[skin.b].base);
    btn.innerHTML = '<span class="worm-skin-dot"></span>';
    const name = document.createElement('small');
    name.textContent = skin.name;
    btn.appendChild(name);
    btn.addEventListener('click', () => {
      saveSkin(skin.id);
      renderWormLobby(getUser());
    });
    skinsEl.appendChild(btn);
  }
  const canvas = document.getElementById('worm-preview');
  cancelAnimationFrame(lobbyRaf);
  const w = Math.min(360, canvas.parentElement.clientWidth || 320);
  const tick = (t) => {
    if (document.body.dataset.screen !== 'worm-lobby') return;
    const g = setupCanvas(canvas, w, 130);
    paintWorm(g, selectedSkin(), { x: w * 0.78, y: 72, len: 20, r: 13, t, crown: true });
    lobbyRaf = requestAnimationFrame(tick);
  };
  lobbyRaf = requestAnimationFrame(tick);
}

export async function showWormResult(result) {
  const statusEl = document.getElementById('wr-status');
  const rewardsEl = document.getElementById('wr-rewards');
  const confetti = document.getElementById('worm-confetti');
  confetti.replaceChildren();
  renderRewards(rewardsEl, []);
  document.getElementById('wr-title').textContent = result.crowned
    ? 'Taç senin! 👑'
    : result.reason === 'time' ? 'Süre doldu!' : 'Çarptın! 💥';
  document.getElementById('wr-score').textContent = String(result.score);
  document.getElementById('wr-rank').textContent = `${result.rank}.`;
  document.getElementById('wr-kills').textContent = String(result.kills);
  document.getElementById('wr-best').textContent = String(getUser()?.wormBest ?? 0);
  document.getElementById('wr-badge').hidden = true;
  if (result.crowned) launchConfetti(confetti);

  statusEl.textContent = 'Kaydediliyor…';
  try {
    const res = await Api.wormResult(result);
    setUser(res.user);
    statusEl.textContent = '';
    document.getElementById('wr-best').textContent = String(res.best);
    document.getElementById('wr-badge').hidden = !res.isNewBest;
    if (res.isNewBest && !result.crowned) launchConfetti(confetti);
    renderRewards(rewardsEl, res.rewards);
  } catch (err) {
    statusEl.textContent = `Sonuç kaydedilemedi: ${err.message}`;
  }
}
