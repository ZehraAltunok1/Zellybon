// Ödüllerin 3B görünümlü simgeleri ve değer kademeleri (sıradan / nadir / epik / efsanevi).
// Ödül kartları kademe rengiyle dolu (saydam değil) çizilir, böylece ödülün önemi bir bakışta anlaşılır.

import { renderGummy } from './shooter/shapes.js';
import { drawChest } from './chest.js';

const TAU = Math.PI * 2;
const cache = new Map();

export const RARITY = {
  common: { name: 'Sıradan', from: '#6D8FB3', to: '#3A5F84', ink: '#FFFFFF' },
  rare: { name: 'Nadir', from: '#5BA3F0', to: '#2358A8', ink: '#FFFFFF' },
  epic: { name: 'Epik', from: '#B77BF0', to: '#5E2E91', ink: '#FFFFFF' },
  legendary: { name: 'Efsanevi', from: '#FFE27A', to: '#E08A00', ink: '#3A2600' },
};

/** Ödülün değer kademesi */
export function rarityOf(r) {
  if (r.type === 'chest') return ['diamond', 'legend', 'gold'].includes(r.tier) ? 'legendary' : 'epic';
  if (r.type === 'coins') return r.count >= 150 ? 'epic' : r.count >= 60 ? 'rare' : 'common';
  if (r.type === 'life') return r.count >= 5 ? 'epic' : 'rare';
  if (r.type === 'key') return r.count >= 2 ? 'epic' : 'rare';
  return r.count >= 2 ? 'epic' : 'rare';
}

function coin(g, s) {
  const cx = s / 2;
  const cy = s * 0.46;
  const r = s * 0.36;
  const depth = s * 0.08;
  // kalınlık
  for (let k = depth; k > 0; k -= 1) {
    g.fillStyle = '#B07800';
    g.beginPath();
    g.ellipse(cx, cy + k, r, r * 0.92, 0, 0, TAU);
    g.fill();
  }
  const face = g.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
  face.addColorStop(0, '#FFF6C0');
  face.addColorStop(0.45, '#FFD23F');
  face.addColorStop(1, '#D99400');
  g.fillStyle = face;
  g.beginPath();
  g.ellipse(cx, cy, r, r * 0.92, 0, 0, TAU);
  g.fill();
  g.lineWidth = s * 0.035;
  g.strokeStyle = '#B07800';
  g.stroke();
  g.beginPath();
  g.ellipse(cx, cy, r * 0.72, r * 0.66, 0, 0, TAU);
  g.strokeStyle = 'rgba(176, 120, 0, 0.7)';
  g.stroke();
  // kabartma yıldız
  g.fillStyle = '#E8A800';
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.2 : r * 0.44;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.28, r * 0.1, -0.6, 0, TAU);
  g.fill();
}

function key(g, s) {
  const gold = (y0, y1) => {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, '#FFF3B0');
    grad.addColorStop(0.5, '#FFC933');
    grad.addColorStop(1, '#C28A00');
    return grad;
  };
  g.save();
  g.translate(s / 2, s / 2);
  g.rotate(-0.7);
  g.translate(-s / 2, -s / 2);
  // gövde (yan yüz + ön yüz)
  for (const [dy, style] of [[s * 0.05, '#9A6A00'], [0, null]]) {
    g.fillStyle = style ?? gold(s * 0.44, s * 0.56);
    g.fillRect(s * 0.42, s * 0.45 + dy, s * 0.46, s * 0.1);
    g.fillRect(s * 0.72, s * 0.55 + dy, s * 0.07, s * 0.12);
    g.fillRect(s * 0.82, s * 0.55 + dy, s * 0.06, s * 0.09);
    g.beginPath();
    g.arc(s * 0.3, s * 0.5 + dy, s * 0.19, 0, TAU);
    g.fillStyle = style ?? gold(s * 0.31, s * 0.69);
    g.fill();
  }
  g.fillStyle = '#6B4A00';
  g.beginPath();
  g.arc(s * 0.3, s * 0.5, s * 0.07, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath();
  g.ellipse(s * 0.25, s * 0.4, s * 0.07, s * 0.03, -0.6, 0, TAU);
  g.fill();
  g.restore();
}

function badge(g, s, emoji, from, to) {
  const cx = s / 2;
  const cy = s * 0.46;
  const r = s * 0.38;
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath();
  g.arc(cx, cy + s * 0.07, r, 0, TAU);
  g.fill();
  const grad = g.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.25, from);
  grad.addColorStop(1, to);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fill();
  g.lineWidth = s * 0.05;
  g.strokeStyle = '#FFFFFF';
  g.stroke();
  g.font = `${s * 0.42}px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, cx, cy + s * 0.03);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath();
  g.ellipse(cx - r * 0.3, cy - r * 0.55, r * 0.45, r * 0.16, -0.3, 0, TAU);
  g.fill();
}

const BADGES = {
  hammer: ['🔨', '#FFB26B', '#C75A12'],
  colorBomb: ['🌈', '#D2B0F2', '#6523C7'],
  shuffle: ['🔀', '#9CC6F5', '#25579A'],
  hourglass: ['⏳', '#FFE27A', '#B07800'],
  extraSlot: ['📦', '#D9A27A', '#6B3A1E'],
  superStart: ['⭐', '#FFF0A0', '#C79A1A'],
  scissors: ['✂️', '#FF9A93', '#A82F2A'],
  needle: ['🪡', '#C4EEFF', '#1E88B8'],
  box: ['📦', '#D9A27A', '#6B3A1E'],
  magnet: ['🧲', '#FFC6D6', '#B8567A'],
};

/** Ödül simgesi: canvas (css boyutu `size`, dpr ile net) */
export function rewardIcon(r, size = 64) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const k = `${r.type}-${r.tier ?? ''}-${size}-${dpr}`;
  const c = document.createElement('canvas');
  c.width = Math.round(size * dpr);
  c.height = Math.round(size * dpr);
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const g = c.getContext('2d');
  if (cache.has(k)) {
    g.drawImage(cache.get(k), 0, 0);
    return c;
  }
  const s = c.width;
  if (r.type === 'coins') coin(g, s);
  else if (r.type === 'key') key(g, s);
  else if (r.type === 'life') g.drawImage(renderGummy({ shape: 'heart', color: 'r', size: s, face: false }), 0, 0, s, s);
  else if (r.type === 'chest') drawChest(g, r.tier, s / 2, s * 0.58, s * 0.95, { time: 300 });
  else {
    const [emoji, from, to] = BADGES[r.type] ?? ['🎁', '#FFFFFF', '#888888'];
    badge(g, s, emoji, from, to);
  }
  const copy = document.createElement('canvas');
  copy.width = c.width;
  copy.height = c.height;
  copy.getContext('2d').drawImage(c, 0, 0);
  cache.set(k, copy);
  return c;
}
