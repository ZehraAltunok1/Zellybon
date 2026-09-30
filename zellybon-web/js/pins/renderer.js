// İğnedenlik çizimi: domates biçimli, dönen iğnedenlik; renkli başlı toplu iğneler; ipli bölümlerde
// iğneler arası ipler (ip sanatı) ve ipin güvenle gidebileceği parlayan yaylar.

import { PALETTE, rgba } from '../palette.js';
import { CUSHION_R, PIN_R, HEAD_R, LAND_ANGLE, norm, threadWindows } from './engine.js';

const TAU = Math.PI * 2;

export function drawPinHead(g, x, y, r, colorKey, num = null) {
  const pal = PALETTE[colorKey] ?? PALETTE.w;
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(0.55, pal.base);
  grad.addColorStop(1, pal.dark);
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(1, r * 0.12);
  g.strokeStyle = rgba(pal.dark, 0.9);
  g.stroke();
  // parlama
  g.beginPath();
  g.ellipse(x - r * 0.3, y - r * 0.38, r * 0.34, r * 0.2, -0.6, 0, TAU);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fill();
  if (num !== null) {
    g.fillStyle = colorKey === 'w' || colorKey === 'y' || colorKey === 'l' ? '#22364A' : '#FFFFFF';
    g.font = `800 ${Math.round(r * 1.05)}px "Baloo 2", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(num), x, y + r * 0.08);
  }
}

/** İğne gövdesi: (x1,y1) sivri uç → (x2,y2) başın dibi */
export function drawShaft(g, x1, y1, x2, y2, width) {
  const grad = g.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, '#8C99A6');
  grad.addColorStop(1, '#E8EEF3');
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineWidth = width;
  g.lineCap = 'round';
  g.strokeStyle = grad;
  g.stroke();
}

/** Domates iğnedenlik: dilim çizgileri ve yaprak başlık iğnedenlikle döner */
export function drawCushion(g, cx, cy, r, colorKey, rotation, time = 0) {
  const pal = PALETTE[colorKey] ?? PALETTE.r;
  // gölge
  g.beginPath();
  g.ellipse(cx, cy + r * 0.12, r * 1.02, r * 0.98, 0, 0, TAU);
  g.fillStyle = 'rgba(12,30,48,0.28)';
  g.fill();
  const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(0.5, pal.base);
  grad.addColorStop(1, pal.dark);
  g.beginPath();
  g.arc(cx, cy, r, 0, TAU);
  g.fillStyle = grad;
  g.fill();

  g.save();
  g.translate(cx, cy);
  g.rotate(rotation);
  // dilim dikişleri
  g.strokeStyle = rgba(pal.dark, 0.55);
  g.lineWidth = Math.max(1.5, r * 0.035);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
    g.quadraticCurveTo(
      Math.cos(a + 0.35) * r * 0.7, Math.sin(a + 0.35) * r * 0.7,
      Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98,
    );
    g.stroke();
  }
  // kesik çizgi teyel dikişi
  g.setLineDash([r * 0.08, r * 0.07]);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = Math.max(1, r * 0.025);
  g.beginPath();
  g.arc(0, 0, r * 0.84, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  // yaprak başlık
  const leaf = PALETTE.g;
  g.fillStyle = leaf.base;
  g.strokeStyle = leaf.dark;
  g.lineWidth = Math.max(1, r * 0.03);
  g.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    const b = a + TAU / 10;
    g.lineTo(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36);
    g.lineTo(Math.cos(b) * r * 0.12, Math.sin(b) * r * 0.12);
  }
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * 0.1, 0, TAU);
  g.fillStyle = leaf.light;
  g.fill();
  g.restore();

  // sabit parlama (ışık dönmez)
  g.beginPath();
  g.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.3, r * 0.15, -0.6, 0, TAU);
  g.fillStyle = `rgba(255,255,255,${0.35 + Math.sin(time / 700) * 0.05})`;
  g.fill();
}

export class PinsRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.engine = engine;
    this.shake = 0;
    this.flash = 0;
    this.sparks = [];
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.max(200, wrap.clientWidth);
    const h = Math.max(300, Math.min(wrap.clientHeight || 600, window.innerHeight - 150));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.u = Math.min(w / (2 * (PIN_R + 0.45)), h / 6.2);
    this.cx = w / 2;
    this.cy = Math.min(h * 0.4, (PIN_R + 0.5) * this.u + 10);
  }

  /** Oyun olaylarına görsel tepki */
  handle(events) {
    for (const ev of events) {
      if (ev.type === 'stick') {
        const [x, y] = this.headPos(ev.angle);
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * TAU;
          this.sparks.push({ x, y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.4, color: PALETTE[ev.color].light });
        }
      } else if (ev.type === 'clash' || ev.type === 'tangle') {
        this.shake = 0.45;
        this.flash = 0.5;
      }
    }
  }

  headPos(localAngle) {
    const a = localAngle + this.engine.state.rotation;
    return [this.cx + Math.cos(a) * PIN_R * this.u, this.cy + Math.sin(a) * PIN_R * this.u];
  }

  draw(dt, time) {
    const { g, u, engine } = this;
    const s = engine.state;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    if (this.shake > 0) {
      g.translate((Math.random() - 0.5) * 14 * this.shake, (Math.random() - 0.5) * 14 * this.shake);
    }
    const { cx, cy } = this;
    const rot = s.rotation;

    // arkadaki ışık halkası
    const glow = g.createRadialGradient(cx, cy, u * 0.8, cx, cy, u * (PIN_R + 0.7));
    glow.addColorStop(0, 'rgba(255,255,255,0.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, cy, u * (PIN_R + 0.7), 0, TAU);
    g.fill();
    // iğne başlarının yörüngesi
    g.beginPath();
    g.arc(cx, cy, PIN_R * u, 0, TAU);
    g.strokeStyle = 'rgba(255,255,255,0.14)';
    g.lineWidth = HEAD_R * u * 2;
    g.stroke();

    // ipli bölüm: ipin gidebileceği güvenli yaylar
    if (s.thread && s.status === 'play') {
      const pulse = 0.45 + Math.sin(time / 180) * 0.2;
      for (const [a, b] of threadWindows(s.threadAngles)) {
        g.beginPath();
        g.arc(cx, cy, PIN_R * u, a + rot, a + rot + norm(b - a));
        g.strokeStyle = `rgba(239,205,67,${pulse})`;
        g.lineWidth = HEAD_R * u * 2.2;
        g.lineCap = 'butt';
        g.stroke();
      }
    }

    // iğne gövdeleri (iğnedenliğin altında kalan uçlar örtülür)
    const shaftW = Math.max(2, u * 0.05);
    for (const p of s.pins) {
      const a = p.a + rot;
      const c = Math.cos(a);
      const si = Math.sin(a);
      drawShaft(g, cx + c * CUSHION_R * 0.7 * u, cy + si * CUSHION_R * 0.7 * u,
        cx + c * (PIN_R - HEAD_R) * u, cy + si * (PIN_R - HEAD_R) * u, shaftW);
    }

    drawCushion(g, cx, cy, CUSHION_R * u, engine.level.cushion, rot, time);

    // ipler: fırlatılan iğneler sırayla bağlı
    if (s.thread) {
      const pts = s.threadAngles.map((a) => this.headPos(a));
      const f = s.flying;
      if (f && pts.length) pts.push(this.flyingHead());
      if (s.status === 'lost' && s.reason === 'tangle') pts.push(this.headPos(s.clashAngle));
      g.lineCap = 'round';
      for (let k = 1; k < pts.length; k++) {
        const bad = s.status === 'lost' && s.reason === 'tangle' && k === pts.length - 1;
        g.beginPath();
        g.moveTo(pts[k - 1][0], pts[k - 1][1]);
        g.lineTo(pts[k][0], pts[k][1]);
        g.strokeStyle = 'rgba(12,30,48,0.35)';
        g.lineWidth = Math.max(3, u * 0.06);
        g.stroke();
        g.strokeStyle = bad ? '#EA5249' : '#FFF6E0';
        g.lineWidth = Math.max(1.5, u * 0.03);
        g.stroke();
      }
    }

    // iğne başları
    for (const p of s.pins) {
      const [x, y] = this.headPos(p.a);
      if (p.bad) {
        g.beginPath();
        g.arc(x, y, HEAD_R * u * 1.7, 0, TAU);
        g.fillStyle = `rgba(234,82,73,${0.35 + Math.sin(time / 60) * 0.25})`;
        g.fill();
      }
      drawPinHead(g, x, y, HEAD_R * u, p.color, p.thrown ? p.num : null);
    }

    // uçan iğne
    if (s.flying) {
      const [x, y] = this.flyingHead();
      drawShaft(g, x, y - (PIN_R - CUSHION_R * 0.7 - HEAD_R) * u, x, y - HEAD_R * u, shaftW);
      drawPinHead(g, x, y, HEAD_R * u, s.flying.pin.color, s.flying.pin.num);
    }

    // sıradaki iğneler
    const qy = this.queueY();
    const gap = HEAD_R * u * 2.6;
    const shown = s.queue.slice(0, 5);
    shown.forEach((pin, k) => {
      const y = qy + k * gap;
      const r = HEAD_R * u * (k === 0 ? 1.25 : 1.05);
      g.globalAlpha = 1 - k * 0.13;
      if (k === 0) drawShaft(g, cx, y - (PIN_R - CUSHION_R * 0.7) * u * 0.8, cx, y - r, shaftW);
      drawPinHead(g, cx, y, r, pin.color, pin.num);
      g.globalAlpha = 1;
    });

    // kıvılcımlar
    this.sparks = this.sparks.filter((p) => (p.life -= dt) > 0);
    for (const p of this.sparks) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, 2.5, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;

    if (this.flash > 0) {
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.fillStyle = `rgba(234,82,73,${this.flash * 0.5})`;
      g.fillRect(0, 0, this.w, this.h);
    }
  }

  queueY() {
    return Math.min(this.h - HEAD_R * this.u * 2, this.cy + (PIN_R + 1.15) * this.u);
  }

  flyingHead() {
    const p = this.engine.flightProgress();
    const from = this.queueY();
    const to = this.cy + Math.sin(LAND_ANGLE) * PIN_R * this.u;
    return [this.cx, from + (to - from) * p];
  }
}
