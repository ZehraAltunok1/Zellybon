// Nakış çizimi: kanaviçe kumaşı üzerinde soluk tablo, bükümlü iplikten çarpı işi ilmekler,
// ucunda iğneyle labirentte ilerleyen ip ve ip makaraları. Yol, kutular ve sütunlar Jöle Atış ile ortaktır.

import { ShooterRenderer } from '../shooter/renderer.js';
import { PALETTE, rgba } from '../palette.js';

const FABRIC = '#F4EEE3';
const FABRIC_DARK = '#D9CDB8';
const THREAD_MS_PER_CELL = 38;
const TAU = Math.PI * 2;

function fabric(g, s) {
  g.fillStyle = FABRIC;
  g.fillRect(0, 0, s, s);
  // kanaviçe delikleri
  g.fillStyle = FABRIC_DARK;
  const r = Math.max(0.6, s * 0.045);
  for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    g.beginPath();
    g.arc(fx * s, fy * s, r, 0, TAU);
    g.fill();
  }
}

/**
 * Bükümlü iplik teli: gölge → koyu kenar → ana renk → büküm çizgileri (açık) ve oyukları (koyu).
 * Aynı fonksiyon hem ilmekler hem de ilerleyen ip için kullanılır.
 */
export function strand(g, x1, y1, x2, y2, w, pal, { shadow = true, twistPhase = 0 } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  g.lineCap = 'round';
  const line = (width, style, ox = 0, oy = 0) => {
    g.lineWidth = width;
    g.strokeStyle = style;
    g.beginPath();
    g.moveTo(x1 + ox, y1 + oy);
    g.lineTo(x2 + ox, y2 + oy);
    g.stroke();
  };
  if (shadow) line(w, 'rgba(20, 30, 40, 0.28)', w * 0.12, w * 0.18);
  line(w, pal.dark);
  line(w * 0.74, pal.base);
  // Büküm: tele çapraz kısa çizgiler (ipliğin katları)
  const step = w * 0.52;
  const nx = -uy;
  const ny = ux;
  const half = w * 0.3;
  for (let t = (twistPhase % step) + step * 0.3; t < len - step * 0.2; t += step) {
    const cx = x1 + ux * t;
    const cy = y1 + uy * t;
    // çizgi, tele dik yönle ilerleme yönü arasında eğik durur
    const ax = nx * half - ux * half * 0.8;
    const ay = ny * half - uy * half * 0.8;
    g.lineWidth = Math.max(0.8, w * 0.16);
    g.strokeStyle = rgba(pal.light, 0.85);
    g.beginPath();
    g.moveTo(cx - ax, cy - ay);
    g.lineTo(cx + ax, cy + ay);
    g.stroke();
    g.lineWidth = Math.max(0.6, w * 0.08);
    g.strokeStyle = rgba(pal.dark, 0.55);
    g.beginPath();
    g.moveTo(cx - ax + ux * step * 0.45, cy - ay + uy * step * 0.45);
    g.lineTo(cx + ax + ux * step * 0.45, cy + ay + uy * step * 0.45);
    g.stroke();
  }
}

/** Henüz işlenmemiş hücre: kumaş + olması gereken rengin soluk izi (alt plan) */
export function renderHint(color, size) {
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

/** İşlenmiş hücre: renk almış kumaş üzerinde bükümlü iplikten çarpı işi */
export function renderStitch(color, size) {
  const pal = PALETTE[color];
  const s = Math.max(4, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  fabric(g, s);
  g.fillStyle = rgba(pal.base, 0.55);
  g.fillRect(0, 0, s, s);
  const a = s * 0.16;
  const b = s * 0.84;
  const w = s * 0.34;
  // Alt tel (\) önce, üst tel (/) üstte: gerçek çarpı işindeki gibi
  strand(g, a, a, b, b, w, pal);
  strand(g, b, a, a, b, w, pal);
  return c;
}

/** İp makarası: ahşap başlıklar arasında sıra sıra sarılı ip ve sarkan ip ucu */
export function renderSpool(color, size) {
  const pal = PALETTE[color];
  const s = Math.max(8, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  const wood = PALETTE.n;
  const cx = s * 0.47;
  const top = s * 0.14;
  const bottom = s * 0.78;
  const bodyW = s * 0.5;

  g.fillStyle = 'rgba(12, 30, 48, 0.28)';
  g.beginPath();
  g.ellipse(cx, bottom + s * 0.07, s * 0.36, s * 0.06, 0, 0, TAU);
  g.fill();

  // sarılı ip: her sıra ayrı bir ip tur
  const rows = 8;
  const rowH = (bottom - top) / rows;
  for (let i = 0; i < rows; i++) {
    const y = top + rowH * (i + 0.5);
    strand(g, cx - bodyW / 2, y, cx + bodyW / 2, y + rowH * 0.25, rowH * 1.35, pal, { shadow: false, twistPhase: i * 3 });
  }
  // gövdeye gölge/ışık: silindir hissi
  const shade = g.createLinearGradient(cx - bodyW / 2, 0, cx + bodyW / 2, 0);
  shade.addColorStop(0, 'rgba(0,0,0,0.3)');
  shade.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  shade.addColorStop(0.7, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = shade;
  g.fillRect(cx - bodyW / 2 - rowH * 0.6, top, bodyW + rowH * 1.2, bottom - top);

  // sarkan ip ucu
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.5, s * 0.045);
  g.strokeStyle = pal.base;
  g.beginPath();
  g.moveTo(cx + bodyW / 2, top + rowH * 2);
  g.bezierCurveTo(cx + bodyW * 0.8, top + rowH * 3, cx + bodyW * 0.6, top + rowH * 5, cx + bodyW * 0.95, top + rowH * 6.5);
  g.stroke();

  // ahşap başlıklar
  const flange = (y) => {
    const grad = g.createLinearGradient(0, y - s * 0.06, 0, y + s * 0.06);
    grad.addColorStop(0, wood.light);
    grad.addColorStop(1, wood.base);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, y, s * 0.36, s * 0.078, 0, 0, TAU);
    g.fill();
    g.strokeStyle = wood.dark;
    g.lineWidth = Math.max(1, s * 0.03);
    g.stroke();
  };
  flange(top);
  flange(bottom);
  g.fillStyle = wood.dark;
  g.beginPath();
  g.ellipse(cx, top, s * 0.06, s * 0.022, 0, 0, TAU);
  g.fill();
  return c;
}

/** Gümüş iğne: (x, y) ucunda, (ux, uy) yönünde */
export function drawNeedle(ctx, x, y, ux, uy, len) {
  const bx = x - ux * len;
  const by = y - uy * len;
  const grad = ctx.createLinearGradient(bx, by, x, y);
  grad.addColorStop(0, '#9AA3B5');
  grad.addColorStop(0.5, '#FFFFFF');
  grad.addColorStop(1, '#B8C0D0');
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, len * 0.12);
  ctx.strokeStyle = '#6B7385';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, len * 0.07);
  ctx.strokeStyle = grad;
  ctx.stroke();
  // iğne deliği
  ctx.fillStyle = '#4A3A78';
  ctx.beginPath();
  ctx.ellipse(bx + ux * len * 0.15, by + uy * len * 0.15, len * 0.03, len * 0.07, Math.atan2(uy, ux) + Math.PI / 2, 0, TAU);
  ctx.fill();
}

export class NakisRenderer extends ShooterRenderer {
  constructor(canvas, engine) {
    super(canvas, engine);
    this.threads = [];         // ilerleyen ipler: { points, color, t0, dur }
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
        // İp makaradan (ya da Sihirli İğne'de şerit girişinden) çıkar, labirent gibi hedefe ilerler
        const start = ev.shooter ? this.trackPoint(ev.shooter.traveled) : this.trackPoint(ev.lane + 0.5);
        const points = [start, ...ev.path.map((c) => this.cubeCenter(c.x, c.y))];
        const dur = 140 + ev.path.length * THREAD_MS_PER_CELL;
        this.threads.push({ points, color: ev.color, t0: this.time, dur });
        this.arriving.set(ev.cube.y * this.engine.state.W + ev.cube.x, this.time + dur);
      } else if (ev.type === 'retire') {
        const sp = ev.shooter;
        let p = null;
        if (sp.traveled !== undefined) p = this.trackPoint(sp.traveled);
        else if (ev.from) p = this.sourcePoint(ev.from);
        if (p) this._burst(p.x, p.y, sp.color, 10);
      } else {
        rest.push(ev);
      }
    }
    super.handle(rest);
  }

  update(dt) {
    super.update(dt);
    const W = this.engine.state.W;
    for (const [k, at] of this.arriving) {
      if (this.time >= at) {
        this.arriving.delete(k);
        const c = this.cubeCenter(k % W, Math.floor(k / W));
        this._burst(c.x, c.y, this.engine.state.grid[Math.floor(k / W)][k % W], 3);
      }
    }
    this.threads = this.threads.filter((t) => this.time - t.t0 < t.dur + 300);
  }

  /** Nakış engel çizimleri: 'double' (×2 rozeti) ve 'knot' (ipten düğüm) */
  _nakisOverlay(kind) {
    this.nakisOverlayCache ??= {};
    const key = `${kind}-${this.L.cube}`;
    if (this.nakisOverlayCache[key]) return this.nakisOverlayCache[key];
    const s = Math.max(6, Math.ceil(this.L.cube * this.dpr));
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const g = c.getContext('2d');
    if (kind === 'double') {
      g.fillStyle = '#22364A';
      g.beginPath();
      g.arc(s * 0.72, s * 0.28, s * 0.22, 0, TAU);
      g.fill();
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = s * 0.05;
      g.stroke();
      g.fillStyle = '#FFFFFF';
      g.font = `800 ${s * 0.26}px "Baloo 2", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('×2', s * 0.72, s * 0.3);
    } else {
      // ipten düğüm: iç içe iki ilmek
      g.lineCap = 'round';
      for (const [w, col] of [[s * 0.16, '#6B3A1E'], [s * 0.09, '#D9A27A']]) {
        g.lineWidth = w;
        g.strokeStyle = col;
        g.beginPath();
        g.ellipse(s * 0.42, s * 0.5, s * 0.2, s * 0.13, 0.6, 0, TAU);
        g.stroke();
        g.beginPath();
        g.ellipse(s * 0.58, s * 0.5, s * 0.2, s * 0.13, -0.6, 0, TAU);
        g.stroke();
      }
    }
    this.nakisOverlayCache[key] = c;
    return c;
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
        const px = x0 + x * cube;
        const py = y0 + y * cube;
        ctx.drawImage(done ? this.cubeCache[c] : this.hintCache[c], px, py, cube, cube);
        if (done) continue;
        // Çift ilmek: ilk ilmekten sonra tek çapraz tel; henüz başlanmadıysa ×2 rozeti
        if (state.need?.[y][x] > 1) {
          if (state.done[y][x] >= 1) {
            strand(ctx, px + cube * 0.16, py + cube * 0.16, px + cube * 0.84, py + cube * 0.84, cube * 0.34, PALETTE[c]);
          } else {
            ctx.drawImage(this._nakisOverlay('double'), px, py, cube, cube);
          }
        }
        if (state.locked?.[y][x]) ctx.drawImage(this._nakisOverlay('knot'), px, py, cube, cube);
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

  // İlerleyen ipler: bükümlü iplik, büküm deseni akar, ucunda iğne
  _drawHits() {
    const { ctx } = this;
    const { cube } = this.L;
    const w = Math.max(3, cube * 0.34);
    for (const t of this.threads) {
      const elapsed = this.time - t.t0;
      const k = Math.min(1, elapsed / t.dur);
      const fade = elapsed > t.dur ? Math.max(0, 1 - (elapsed - t.dur) / 300) : 1;
      const pal = PALETTE[t.color];
      const segs = t.points.length - 1;
      const pos = k * segs;
      const full = Math.floor(pos);

      // İpin görünen kısmı: tam segmentler + yarım segment
      const pts = t.points.slice(0, full + 1);
      if (full < segs) {
        const a = t.points[full];
        const b = t.points[full + 1];
        const f = pos - full;
        pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      }
      ctx.globalAlpha = fade;
      let phase = -elapsed * 0.05; // büküm deseni ip boyunca akar
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        strand(ctx, a.x, a.y, b.x, b.y, w, pal, { shadow: true, twistPhase: phase });
        phase += Math.hypot(b.x - a.x, b.y - a.y);
      }
      // köşelerde ipi yuvarlat
      ctx.fillStyle = pal.base;
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, w * 0.37, 0, TAU);
        ctx.fill();
      }
      // uçta iğne
      if (k < 1 && pts.length >= 2) {
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        drawNeedle(ctx, b.x, b.y, (b.x - a.x) / len, (b.y - a.y) / len, cube * 1.1);
      }
      ctx.globalAlpha = 1;
    }
  }
}
