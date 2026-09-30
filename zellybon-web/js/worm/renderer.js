// Jöle Solucan çizimi: parlak jöle boncuklardan solucanlar (gözlü, gülen yüzlü), ışıldayan şekerler,
// güç şekerleri, liderin tacı, arena sınırı ve mini harita. Kamera oyuncunun başını izler.

import { PALETTE, rgba } from '../palette.js';
import { WORLD_R, POWERS } from './engine.js';

const TAU = Math.PI * 2;
const sprites = new Map();

/** Parlak jöle boncuğu (önceden çizilip önbelleğe alınır, her karede sadece kopyalanır) */
function ballSprite(key, kind = 'body') {
  const id = `${kind}-${key}`;
  if (sprites.has(id)) return sprites.get(id);
  const pal = PALETTE[key] ?? PALETTE.o;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d');
  const m = S / 2;
  if (kind === 'food') {
    const glow = g.createRadialGradient(m, m, 0, m, m, m);
    glow.addColorStop(0, rgba(pal.light, 0.9));
    glow.addColorStop(0.35, rgba(pal.base, 0.75));
    glow.addColorStop(1, rgba(pal.base, 0));
    g.fillStyle = glow;
    g.fillRect(0, 0, S, S);
    g.beginPath();
    g.arc(m, m, m * 0.36, 0, TAU);
    g.fillStyle = pal.base;
    g.fill();
    g.beginPath();
    g.arc(m - m * 0.1, m - m * 0.12, m * 0.13, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fill();
  } else {
    const r = m - 2;
    g.beginPath();
    g.arc(m, m, r, 0, TAU);
    g.fillStyle = pal.dark;
    g.fill();
    const grad = g.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r * 0.92);
    grad.addColorStop(0, pal.light);
    grad.addColorStop(0.5, pal.base);
    grad.addColorStop(1, pal.dark);
    g.beginPath();
    g.arc(m, m, r * 0.9, 0, TAU);
    g.fillStyle = grad;
    g.fill();
    g.beginPath();
    g.ellipse(m - r * 0.28, m - r * 0.36, r * 0.32, r * 0.18, -0.6, 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fill();
  }
  sprites.set(id, c);
  return c;
}

export function drawCrown(g, x, y, s, time = 0) {
  g.save();
  g.translate(x, y + Math.sin(time / 300) * s * 0.06);
  g.beginPath();
  g.moveTo(-s, s * 0.45);
  g.lineTo(-s, -s * 0.2);
  g.lineTo(-s * 0.5, s * 0.15);
  g.lineTo(0, -s * 0.55);
  g.lineTo(s * 0.5, s * 0.15);
  g.lineTo(s, -s * 0.2);
  g.lineTo(s, s * 0.45);
  g.closePath();
  const grad = g.createLinearGradient(0, -s * 0.6, 0, s * 0.5);
  grad.addColorStop(0, '#FFF0A0');
  grad.addColorStop(0.5, '#EFCD43');
  grad.addColorStop(1, '#C98A10');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(1, s * 0.1);
  g.strokeStyle = '#8A5A00';
  g.stroke();
  for (const [px, py] of [[-s, -s * 0.25], [0, -s * 0.6], [s, -s * 0.25]]) {
    g.beginPath();
    g.arc(px, py, s * 0.16, 0, TAU);
    g.fillStyle = '#FFF6D0';
    g.fill();
  }
  g.beginPath();
  g.arc(0, s * 0.18, s * 0.14, 0, TAU);
  g.fillStyle = '#EA5249';
  g.fill();
  g.restore();
}

/** Solucan yüzü: iri gözler (bakış yönüne bakar), yanaklar, gülümseme */
export function drawFace(g, x, y, r, dir, look = dir, dead = false) {
  const fx = Math.cos(dir);
  const fy = Math.sin(dir);
  const px = -fy;
  const py = fx;
  for (const side of [-1, 1]) {
    const ex = x + fx * r * 0.3 + px * side * r * 0.45;
    const ey = y + fy * r * 0.3 + py * side * r * 0.45;
    g.beginPath();
    g.arc(ex, ey, r * 0.4, 0, TAU);
    g.fillStyle = '#FFFFFF';
    g.fill();
    g.lineWidth = Math.max(1, r * 0.06);
    g.strokeStyle = 'rgba(34,54,74,0.5)';
    g.stroke();
    if (dead) {
      g.strokeStyle = '#22364A';
      g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath();
      g.moveTo(ex - r * 0.18, ey - r * 0.18);
      g.lineTo(ex + r * 0.18, ey + r * 0.18);
      g.moveTo(ex + r * 0.18, ey - r * 0.18);
      g.lineTo(ex - r * 0.18, ey + r * 0.18);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(ex + Math.cos(look) * r * 0.14, ey + Math.sin(look) * r * 0.14, r * 0.22, 0, TAU);
      g.fillStyle = '#22364A';
      g.fill();
      g.beginPath();
      g.arc(ex + Math.cos(look) * r * 0.14 - r * 0.07, ey + Math.sin(look) * r * 0.14 - r * 0.08, r * 0.07, 0, TAU);
      g.fillStyle = '#FFFFFF';
      g.fill();
    }
  }
  // yanaklar
  g.fillStyle = 'rgba(255,120,150,0.45)';
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(x + fx * r * 0.62 + px * side * r * 0.62, y + fy * r * 0.62 + py * side * r * 0.62, r * 0.14, 0, TAU);
    g.fill();
  }
  // gülümseme
  g.beginPath();
  g.arc(x + fx * r * 0.55, y + fy * r * 0.55, r * 0.2, dir - 1.1, dir + 1.1);
  g.strokeStyle = '#22364A';
  g.lineWidth = Math.max(1, r * 0.09);
  g.lineCap = 'round';
  g.stroke();
}

export class WormRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.engine = engine;
    this.cam = { x: 0, y: 0, scale: 1 };
    this.popups = [];
    const p = engine.state.player.pts[0];
    this.cam.x = p.x;
    this.cam.y = p.y;
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, wrap.clientWidth);
    const h = Math.max(300, wrap.clientHeight || window.innerHeight - 140);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
  }

  handle(events) {
    for (const ev of events) {
      if (ev.type === 'power' && ev.worm.isPlayer) {
        const p = ev.worm.pts[0];
        this.popups.push({ x: p.x, y: p.y, text: `${POWERS[ev.kind].icon} ${POWERS[ev.kind].name}!`, life: 1.2 });
      } else if (ev.type === 'death' && ev.killer?.isPlayer) {
        this.popups.push({ x: ev.x, y: ev.y, text: `💥 ${ev.worm.name} yenildi!`, life: 1.5 });
      }
    }
  }

  /** Ekrandaki bir noktanın, oyuncunun başına göre açısı (dokunmayla yön vermek için) */
  angleFromScreen(sx, sy) {
    const p = this.engine.state.player.pts[0];
    const hx = (p.x - this.cam.x) * this.cam.scale + this.w / 2;
    const hy = (p.y - this.cam.y) * this.cam.scale + this.h / 2;
    return Math.atan2(sy - hy, sx - hx);
  }

  draw(dt, time) {
    const { g, w, h } = this;
    const s = this.engine.state;
    const player = s.player;
    const head = player.pts[0];
    // Kamera: başı yumuşakça izler, solucan büyüdükçe uzaklaşır
    const view = 200 + player.r * 8;
    const target = Math.min(w, h) / view;
    this.cam.scale += (target - this.cam.scale) * Math.min(1, dt * 2);
    if (player.alive) {
      this.cam.x += (head.x - this.cam.x) * Math.min(1, dt * 10);
      this.cam.y += (head.y - this.cam.y) * Math.min(1, dt * 10);
    }
    const sc = this.cam.scale;
    const toX = (x) => (x - this.cam.x) * sc + w / 2;
    const toY = (y) => (y - this.cam.y) * sc + h / 2;
    const visible = (x, y, r) => Math.abs(x - this.cam.x) * sc < w / 2 + r * sc + 20
      && Math.abs(y - this.cam.y) * sc < h / 2 + r * sc + 20;

    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // arena dışı
    g.fillStyle = '#16304A';
    g.fillRect(0, 0, w, h);
    // arena
    const ax = toX(0);
    const ay = toY(0);
    const bg = g.createRadialGradient(ax, ay, 0, ax, ay, WORLD_R * sc);
    bg.addColorStop(0, '#3F7BA8');
    bg.addColorStop(1, '#24507A');
    g.beginPath();
    g.arc(ax, ay, WORLD_R * sc, 0, TAU);
    g.fillStyle = bg;
    g.fill();
    // petek deseni (noktalar)
    g.save();
    g.beginPath();
    g.arc(ax, ay, WORLD_R * sc, 0, TAU);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.09)';
    const step = 44;
    const x0 = Math.floor((this.cam.x - w / 2 / sc) / step) * step;
    const y0 = Math.floor((this.cam.y - h / 2 / sc) / step) * step;
    for (let y = y0; y < this.cam.y + h / 2 / sc + step; y += step) {
      const odd = Math.round(y / step) % 2 ? step / 2 : 0;
      for (let x = x0 - step; x < this.cam.x + w / 2 / sc + step; x += step) {
        g.beginPath();
        g.arc(toX(x + odd), toY(y), Math.max(1.2, 2.4 * sc), 0, TAU);
        g.fill();
      }
    }
    g.restore();
    // sınır: kırmızı ışıltı
    g.beginPath();
    g.arc(ax, ay, WORLD_R * sc, 0, TAU);
    g.lineWidth = 10 * sc + 4;
    g.strokeStyle = `rgba(234,82,73,${0.55 + Math.sin(time / 250) * 0.15})`;
    g.stroke();

    // şekerler
    for (const f of s.food) {
      if (!visible(f.x, f.y, f.r * 3)) continue;
      const x = toX(f.x);
      const y = toY(f.y);
      if (f.kind) {
        const pr = f.r * sc * (1 + Math.sin(time / 200 + f.id) * 0.08);
        const pal = PALETTE[POWERS[f.kind].color];
        const glow = g.createRadialGradient(x, y, 0, x, y, pr * 2.2);
        glow.addColorStop(0, rgba(pal.light, 0.8));
        glow.addColorStop(1, rgba(pal.base, 0));
        g.fillStyle = glow;
        g.beginPath();
        g.arc(x, y, pr * 2.2, 0, TAU);
        g.fill();
        g.beginPath();
        g.arc(x, y, pr, 0, TAU);
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = pal.base;
        g.stroke();
        g.font = `${Math.round(pr * 1.2)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(POWERS[f.kind].icon, x, y + 1);
        continue;
      }
      const size = f.r * 3.4 * sc * (1 + Math.sin(time / 300 + f.id) * 0.1);
      g.drawImage(ballSprite(f.color, 'food'), x - size / 2, y - size / 2, size, size);
    }

    // solucanlar (küçükler altta)
    const worms = s.worms.filter((x) => x.alive).sort((a, b) => a.mass - b.mass);
    for (const wm of worms) this._drawWorm(wm, toX, toY, sc, time, visible, wm === s.leader);
    if (!player.alive) this._drawWorm(player, toX, toY, sc, time, visible, false, true);

    // puan yazıları
    this.popups = this.popups.filter((p) => (p.life -= dt) > 0);
    g.textAlign = 'center';
    g.font = '800 16px "Baloo 2", system-ui, sans-serif';
    for (const p of this.popups) {
      g.globalAlpha = Math.min(1, p.life * 2);
      g.fillStyle = '#FFFFFF';
      g.strokeStyle = 'rgba(22,44,66,0.8)';
      g.lineWidth = 4;
      const y = toY(p.y) - 40 - (1.5 - p.life) * 30;
      g.strokeText(p.text, toX(p.x), y);
      g.fillText(p.text, toX(p.x), y);
    }
    g.globalAlpha = 1;

    this._minimap(time);
  }

  _drawWorm(wm, toX, toY, sc, time, visible, isLeader, dead = false) {
    const { g } = this;
    const r = wm.r * sc;
    const head = wm.pts[0];
    if (!wm.pts.some((p, i) => i % 4 === 0 && visible(p.x, p.y, wm.r))) return;
    g.globalAlpha = dead ? 0.55 : 1;
    // hız parıltısı
    if (wm.boosting) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = wm.pts.length - 1; i >= 0; i -= 2) {
        const p = wm.pts[i];
        g.beginPath();
        g.arc(toX(p.x), toY(p.y), r * 1.5, 0, TAU);
        g.fillStyle = rgba(PALETTE[wm.skin.a].light, 0.12);
        g.fill();
      }
      g.restore();
    }
    // gövde: kuyruktan başa, iki renkli şerit
    const sa = ballSprite(wm.skin.a);
    const sb = ballSprite(wm.skin.b);
    for (let i = wm.pts.length - 1; i >= 1; i--) {
      const p = wm.pts[i];
      const tail = Math.max(0.55, 1 - Math.max(0, i - wm.pts.length + 8) * 0.06);
      const size = r * 2.1 * tail;
      g.drawImage(Math.floor(i / 3) % 2 ? sb : sa, toX(p.x) - size / 2, toY(p.y) - size / 2, size, size);
    }
    const hx = toX(head.x);
    const hy = toY(head.y);
    const hs = r * 2.35;
    g.drawImage(sa, hx - hs / 2, hy - hs / 2, hs, hs);
    drawFace(g, hx, hy, r * 1.1, wm.dir, wm.target, dead);

    if (wm.effects.shield > 0) {
      g.beginPath();
      g.arc(hx, hy, r * 2.1, 0, TAU);
      g.fillStyle = `rgba(155,239,245,${0.18 + Math.sin(time / 120) * 0.06})`;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(155,239,245,0.9)';
      g.stroke();
    }
    if (wm.effects.magnet > 0) {
      g.beginPath();
      g.arc(hx, hy, (wm.r * 2.2 + 130) * sc, 0, TAU);
      g.setLineDash([6, 8]);
      g.lineWidth = 1.5;
      g.strokeStyle = 'rgba(247,168,232,0.6)';
      g.stroke();
      g.setLineDash([]);
    }
    g.globalAlpha = 1;
    if (isLeader) drawCrown(g, hx, hy - r * 2.3, Math.max(8, r * 0.95), time);
    if (!wm.isPlayer && !dead) {
      g.font = '700 12px "Baloo 2", system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillText(wm.name, hx, hy + r * 2.4 + 10);
    }
  }

  _minimap(time) {
    const { g, h } = this;
    const s = this.engine.state;
    const R = 42;
    const cx = R + 10;
    const cy = h - R - 10;
    g.beginPath();
    g.arc(cx, cy, R, 0, TAU);
    g.fillStyle = 'rgba(22,44,66,0.6)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(234,82,73,0.7)';
    g.stroke();
    for (const wm of s.worms) {
      if (!wm.alive) continue;
      const p = wm.pts[0];
      const x = cx + (p.x / WORLD_R) * R;
      const y = cy + (p.y / WORLD_R) * R;
      if (wm === s.leader) drawCrown(g, x, y - 6, 5, time);
      g.beginPath();
      g.arc(x, y, wm.isPlayer ? 3.5 : 2, 0, TAU);
      g.fillStyle = wm.isPlayer ? '#FFFFFF' : rgba(PALETTE[wm.skin.a].light, 0.8);
      g.fill();
    }
  }
}
