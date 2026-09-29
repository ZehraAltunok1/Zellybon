// Nakış çizimi: kanaviçe kumaşı üzerinde soluk tablo, çarpı işi ilmekler, labirentte ilerleyen ip
// ve ip makaraları. Yol, kutular ve sütunlar Jöle Atış çizimiyle ortaktır.

import { ShooterRenderer } from '../shooter/renderer.js';
import { PALETTE, rgba } from '../palette.js';

const FABRIC = '#F4EEE3';
const FABRIC_DARK = '#D9CDB8';
const THREAD_MS_PER_CELL = 38;

function fabric(g, s) {
  g.fillStyle = FABRIC;
  g.fillRect(0, 0, s, s);
  // kanaviçe delikleri
  g.fillStyle = FABRIC_DARK;
  const r = Math.max(0.6, s * 0.045);
  for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    g.beginPath();
    g.arc(fx * s, fy * s, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Henüz işlenmemiş hücre: kumaş + olması gereken rengin soluk izi (alt plan) */
function renderHint(color, size) {
  const s = Math.max(4, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  fabric(g, s);
  // İz, rengi okunacak kadar belirgin ama işlenmiş hücrelerden açıkça soluk
  g.fillStyle = rgba(PALETTE[color].base, 0.42);
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(120, 100, 80, 0.18)';
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, s - 1, s - 1);
  return c;
}

/** İşlenmiş hücre: renkli zemin üstünde kalın çarpı işi ilmek */
function renderStitch(color, size) {
  const pal = PALETTE[color];
  const s = Math.max(4, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = pal.base;
  g.fillRect(0, 0, s, s);
  g.fillStyle = rgba(pal.dark, 0.25);
  g.fillRect(0, 0, s, s);
  g.lineCap = 'round';
  const a = s * 0.18;
  const b = s * 0.82;
  const cross = (w, style) => {
    g.lineWidth = w;
    g.strokeStyle = style;
    g.beginPath();
    g.moveTo(a, a);
    g.lineTo(b, b);
    g.moveTo(b, a);
    g.lineTo(a, b);
    g.stroke();
  };
  cross(s * 0.36, pal.dark);
  cross(s * 0.26, pal.base);
  // ipliğin parlak sırtı
  g.lineWidth = s * 0.07;
  g.strokeStyle = rgba(pal.light, 0.9);
  g.beginPath();
  g.moveTo(a + s * 0.04, a - s * 0.02);
  g.lineTo(b - s * 0.1, b - s * 0.16);
  g.stroke();
  return c;
}

/** İp makarası: ahşap başlıklar arasında sarılı renkli ip */
function renderSpool(color, size) {
  const pal = PALETTE[color];
  const s = Math.max(8, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  const wood = PALETTE.n;
  const cx = s / 2;
  const top = s * 0.12;
  const bottom = s * 0.8;
  const bodyW = s * 0.5;

  // gölge
  g.fillStyle = 'rgba(20, 8, 40, 0.28)';
  g.beginPath();
  g.ellipse(cx, bottom + s * 0.06, s * 0.36, s * 0.06, 0, 0, Math.PI * 2);
  g.fill();

  // sarılı ip gövdesi
  const body = g.createLinearGradient(cx - bodyW / 2, 0, cx + bodyW / 2, 0);
  body.addColorStop(0, pal.dark);
  body.addColorStop(0.35, pal.light);
  body.addColorStop(0.6, pal.base);
  body.addColorStop(1, pal.dark);
  g.fillStyle = body;
  g.fillRect(cx - bodyW / 2, top, bodyW, bottom - top);
  // ip sarımları
  g.strokeStyle = rgba(pal.dark, 0.45);
  g.lineWidth = Math.max(1, s * 0.022);
  for (let y = top + s * 0.05; y < bottom; y += s * 0.065) {
    g.beginPath();
    g.moveTo(cx - bodyW / 2, y);
    g.quadraticCurveTo(cx, y + s * 0.03, cx + bodyW / 2, y - s * 0.01);
    g.stroke();
  }

  // ahşap başlıklar
  const flange = (y) => {
    const grad = g.createLinearGradient(0, y - s * 0.06, 0, y + s * 0.06);
    grad.addColorStop(0, wood.light);
    grad.addColorStop(1, wood.base);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, y, s * 0.36, s * 0.075, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = wood.dark;
    g.lineWidth = Math.max(1, s * 0.03);
    g.stroke();
  };
  flange(top);
  flange(bottom);
  // ahşap delik
  g.fillStyle = wood.dark;
  g.beginPath();
  g.ellipse(cx, top, s * 0.06, s * 0.022, 0, 0, Math.PI * 2);
  g.fill();
  return c;
}

export class NakisRenderer extends ShooterRenderer {
  constructor(canvas, engine) {
    super(canvas, engine);
    this.threads = [];        // ilerleyen ipler: { points, color, t0, dur }
    this.arriving = new Map(); // hücre anahtarı → ipin varacağı an (o ana kadar soluk görünür)
  }

  _buildCaches() {
    const { cube, token } = this.L;
    const dpr = this.dpr;
    this.hintCache = {};
    this.cubeCache = {};
    this.tokenCache = {};
    for (const key of Object.keys(PALETTE)) {
      this.hintCache[key] = renderHint(key, cube * dpr);
      this.cubeCache[key] = renderStitch(key, cube * dpr);
      this.tokenCache[key] = renderSpool(key, token * dpr);
    }
  }

  handle(events) {
    const rest = [];
    for (const ev of events) {
      if (ev.type === 'hit') {
        // İp makaradan çıkar, girişten labirent gibi hedef hücreye ilerler
        const start = this.trackPoint(ev.shooter.traveled);
        const points = [start, ...ev.path.map((c) => this.cubeCenter(c.x, c.y))];
        const dur = 120 + ev.path.length * THREAD_MS_PER_CELL;
        this.threads.push({ points, color: ev.color, t0: this.time, dur });
        this.arriving.set(ev.cube.y * this.engine.state.W + ev.cube.x, this.time + dur);
      } else if (ev.type === 'retire') {
        const sp = ev.shooter;
        const p = sp.traveled !== undefined ? this.trackPoint(sp.traveled) : null;
        if (p) this._burst(p.x, p.y, sp.color, 8);
      } else {
        rest.push(ev);
      }
    }
    super.handle(rest);
  }

  update(dt) {
    super.update(dt);
    for (const [k, at] of this.arriving) {
      if (this.time >= at) {
        this.arriving.delete(k);
        const W = this.engine.state.W;
        const c = this.cubeCenter(k % W, Math.floor(k / W));
        const color = this.engine.state.grid[Math.floor(k / W)][k % W];
        this._burst(c.x, c.y, color, 3);
      }
    }
    this.threads = this.threads.filter((t) => this.time - t.t0 < t.dur + 260);
  }

  _drawBoard() {
    const { ctx } = this;
    const { state } = this.engine;
    const { x0, y0, cube } = this.L;
    const reveal = this.revealAt !== null;
    for (let y = 0; y < state.H; y++) {
      for (let x = 0; x < state.W; x++) {
        const c = state.grid[y][x];
        if (!c) continue;
        const done = (state.painted[y][x] && !this.arriving.has(y * state.W + x)) || reveal;
        ctx.drawImage(done ? this.cubeCache[c] : this.hintCache[c], x0 + x * cube, y0 + y * cube, cube, cube);
      }
    }
    if (reveal) {
      // Tablo tamamlanınca üzerinden bir parıltı geçer
      const k = Math.min(1, (this.time - this.revealAt) / 900);
      const w = state.W * cube;
      const h = state.H * cube;
      const gx = x0 - w * 0.3 + k * w * 1.6;
      const grad = ctx.createLinearGradient(gx - w * 0.2, 0, gx + w * 0.2, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, y0, w, h);
    }
  }

  _drawHits() {
    const { ctx } = this;
    const { cube } = this.L;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const t of this.threads) {
      const elapsed = this.time - t.t0;
      const k = Math.min(1, elapsed / t.dur);
      const fade = elapsed > t.dur ? 1 - (elapsed - t.dur) / 260 : 1;
      // ipin ucu yol boyunca ilerler
      const segs = t.points.length - 1;
      const pos = k * segs;
      const full = Math.floor(pos);
      const pal = PALETTE[t.color];
      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(t.points[0].x, t.points[0].y);
        for (let i = 1; i <= full && i <= segs; i++) ctx.lineTo(t.points[i].x, t.points[i].y);
        if (full < segs) {
          const a = t.points[full];
          const b = t.points[full + 1];
          const f = pos - full;
          ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
        }
      };
      ctx.globalAlpha = Math.max(0, fade);
      trace();
      ctx.lineWidth = Math.max(2.5, cube * 0.3);
      ctx.strokeStyle = pal.dark;
      ctx.stroke();
      trace();
      ctx.lineWidth = Math.max(1.5, cube * 0.18);
      ctx.strokeStyle = pal.base;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
