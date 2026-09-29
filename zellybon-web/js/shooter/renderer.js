// Jöle Atış çizimi: resim, kaykay yolu, jöleler, bekleme kutuları, sütunlar ve animasyonlar.

import { CUBE_COLORS } from './levels.js';
import { renderGummy, renderCube, drawAbilityBadge } from './shapes.js';
import { PALETTE } from '../palette.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;

const VISIBLE_IN_COLUMN = 3;

export class ShooterRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.time = 0;
    this.dying = [];     // vurulan küpler: { x, y, color, t0, from: {x,y} }
    this.particles = [];
    this.moving = new Map(); // shooter id → { fromX, fromY, t0, dur } (giriş/kutuya iniş animasyonu)
    this.popping = [];   // mermisi biten jöleler
    this.revealAt = null;
    this.shakeAt = -1e9;
    this.lowEffects = false;
  }

  resize() {
    const { W, H, level } = this.engine.state;
    const parent = this.canvas.parentElement;
    const cssW = Math.min(parent.clientWidth, 520);
    const availH = parent.clientHeight || cssW * 1.6;

    // Kutu sayısı Ekstra Kutu güçlendiricisiyle bölüm ayarından fazla olabilir
    const tokenCount = Math.max(this.engine.state.slots.length, level.columns * 1.3);
    const token = Math.max(32, Math.min(54, cssW / (tokenCount + 1.2)));
    const bottomH = token * 1.3 + 14 + VISIBLE_IN_COLUMN * token * 0.95 + 8;
    const band = 1.9; // yol bandı, küp boyutu cinsinden
    const cube = Math.max(8, Math.min((cssW - 8) / (W + 2 * band), (availH - bottomH - 8) / (H + 2 * band)));
    const t = cube * band;

    const frameW = W * cube + 2 * t;
    this.L = {
      cssW,
      token,
      cube,
      t,
      x0: (cssW - frameW) / 2 + t,
      y0: 4 + t,
      boardW: W * cube,
      boardH: H * cube,
    };
    this.L.slotsY = this.L.y0 + this.L.boardH + t + 10;
    this.L.queueY = this.L.slotsY + token * 1.3 + 4;
    const cssH = Math.ceil(this.L.queueY + VISIBLE_IN_COLUMN * token * 0.95 + 4);
    this.L.cssH = cssH;

    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this._buildCaches();
  }

  _buildCaches() {
    const { cube, token } = this.L;
    const dpr = this.dpr;
    const { shape } = this.engine.state.level;
    this.cubeCache = {};
    this.tokenCache = {};
    for (const key of Object.keys(CUBE_COLORS)) {
      this.cubeCache[key] = renderCube(key, cube * dpr);
      // Jöleler bölümün şeklinde çizilir (ayıcık, kalp, kola şişesi …)
      this.tokenCache[key] = renderGummy({ shape, color: key, size: token * dpr });
    }
  }

  // ---------- Konumlar ----------

  trackPoint(traveled) {
    const { W, H } = this.engine.state;
    const { x0, y0, boardW, boardH, cube, t } = this.L;
    const half = t / 2;
    const p = Math.max(0, traveled);
    if (p < W) return { x: x0 + p * cube, y: y0 + boardH + half };
    if (p < W + H) return { x: x0 + boardW + half, y: y0 + boardH - (p - W) * cube };
    if (p < 2 * W + H) return { x: x0 + boardW - (p - W - H) * cube, y: y0 - half };
    return { x: x0 - half, y: y0 + (p - 2 * W - H) * cube };
  }

  cubeCenter(x, y) {
    const { x0, y0, cube } = this.L;
    return { x: x0 + (x + 0.5) * cube, y: y0 + (y + 0.5) * cube };
  }

  slotRect(i) {
    const slots = this.engine.state.slots.length;
    const { cssW, token, slotsY } = this.L;
    // Kutular ekran genişliğine sığmalı (gap = kutunun %22'si)
    const size = Math.min(token * 1.15, (cssW - 8) / (slots + (slots - 1) * 0.22));
    const gap = size * 0.22;
    const total = slots * size + (slots - 1) * gap;
    return { x: (cssW - total) / 2 + i * (size + gap), y: slotsY, w: size, h: size };
  }

  columnPoint(c, depth) {
    const { columns } = this.engine.state.level;
    const { cssW, token, queueY } = this.L;
    const spacing = Math.min(token * 1.4, (cssW - 16) / columns);
    const startX = cssW / 2 - ((columns - 1) * spacing) / 2;
    return { x: startX + c * spacing, y: queueY + token / 2 + depth * token * 0.95 };
  }

  sourcePoint(from) {
    if (from?.type === 'slot') {
      const r = this.slotRect(from.index);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    }
    if (from?.type === 'column') return this.columnPoint(from.index, 0);
    return this.trackPoint(0);
  }

  /** Dokunulan noktadaki seçilebilir hedef: { type: 'slot'|'column', index } ya da null */
  hitTest(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { state } = this.engine;
    for (let i = 0; i < state.slots.length; i++) {
      const r = this.slotRect(i);
      if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) {
        return state.slots[i] ? { type: 'slot', index: i } : null;
      }
    }
    const reach = this.L.token * 0.65;
    for (let c = 0; c < state.columns.length; c++) {
      const p = this.columnPoint(c, 0);
      if (Math.abs(x - p.x) <= reach && y >= p.y - reach && y <= p.y + reach) {
        return state.columns[c].length ? { type: 'column', index: c } : null;
      }
    }
    return null;
  }

  // ---------- Olaylar ----------

  handle(events) {
    for (const ev of events) {
      if (ev.type === 'enter') {
        const src = this.sourcePoint(ev.shooter.from);
        this.moving.set(ev.shooter.id, { fromX: src.x, fromY: src.y, t0: this.time, dur: 220 });
      } else if (ev.type === 'hit') {
        const from = this.trackPoint(ev.shooter.traveled);
        this.dying.push({ ...ev.cube, color: ev.color, t0: this.time, from });
      } else if (ev.type === 'empty') {
        const p = this.trackPoint(ev.shooter.traveled);
        this.popping.push({ ...p, color: ev.shooter.color, t0: this.time });
        this._burst(p.x, p.y, ev.shooter.color, 10);
      } else if (ev.type === 'toSlot') {
        const end = this.trackPoint(this.engine.state.L - 0.001);
        this.moving.set(ev.shooter.id, { fromX: end.x, fromY: end.y, t0: this.time, dur: 280 });
      } else if (ev.type === 'overflow' || ev.type === 'lose') {
        this.shakeAt = this.time;
      } else if (ev.type === 'win') {
        this.revealAt = this.time;
      }
    }
  }

  _burst(x, y, color, count) {
    const n = this.lowEffects ? Math.ceil(count / 3) : count;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 110;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
        life: 1, size: 1.5 + Math.random() * 2.5, color: CUBE_COLORS[color],
      });
    }
  }

  // ---------- Çizim ----------

  update(dt) {
    this.time += dt;
    const sec = dt / 1000;
    for (const p of this.particles) {
      p.vy += 260 * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.life -= sec * 1.8;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const d of this.dying) {
      if (!d.burst && this.time - d.t0 >= 110) {
        d.burst = true;
        const c = this.cubeCenter(d.x, d.y);
        this._burst(c.x, c.y, d.color, 4);
      }
    }
    this.dying = this.dying.filter((d) => this.time - d.t0 < 320);
    this.popping = this.popping.filter((p) => this.time - p.t0 < 250);
    for (const [id, m] of this.moving) if (this.time - m.t0 > m.dur) this.moving.delete(id);
  }

  /** Jöle: şekil + (varsa) karakter rozeti + alt kısımda mermi etiketi */
  _drawToken(sh, x, y, scale = 1, alpha = 1, showAmmo = true) {
    const { ctx } = this;
    const { token } = this.L;
    const img = this.tokenCache[sh.color];
    const s = token * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s);

    if (sh.ability) drawAbilityBadge(ctx, sh.ability, x + s * 0.34, y - s * 0.32, Math.max(6, s * 0.17));

    if (showAmmo && sh.ammo !== undefined) {
      const label = String(sh.ammo);
      const fs = Math.max(9, s * 0.27);
      ctx.font = `800 ${fs}px "Baloo 2", system-ui, sans-serif`;
      const w = Math.max(fs * 1.5, ctx.measureText(label).width + fs * 0.8);
      const h = fs * 1.15;
      const py = y + s * 0.38;
      roundRect(ctx, x - w / 2, py - h / 2, w, h, h / 2);
      ctx.fillStyle = PALETTE.k.dark;
      ctx.fill();
      ctx.lineWidth = Math.max(1, fs * 0.12);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(label, x, py + fs * 0.05);
    }
    ctx.globalAlpha = 1;
  }

  _tokenPos(sh, target) {
    const m = this.moving.get(sh.id);
    if (!m) return target;
    const k = easeOut(Math.min(1, (this.time - m.t0) / m.dur));
    return { x: lerp(m.fromX, target.x, k), y: lerp(m.fromY, target.y, k) };
  }

  draw() {
    const { ctx } = this;
    const { x0, y0, boardW, boardH, cube, t, cssW, cssH, token } = this.L;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Sarsıntı (kaybedince)
    const since = (this.time - this.shakeAt) / 1000;
    if (since < 0.45) {
      const amp = 7 * (1 - since / 0.45);
      ctx.translate(Math.sin(since * 70) * amp, 0);
    }

    // Yol bandı
    ctx.fillStyle = 'rgba(22, 44, 66, 0.35)';
    roundRect(ctx, x0 - t, y0 - t, boardW + 2 * t, boardH + 2 * t, t * 0.9);
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(2, t * 0.12);
    ctx.setLineDash([t * 0.35, t * 0.35]);
    ctx.lineDashOffset = -this.time * 0.02 * cube; // yol akıyor hissi
    roundRect(ctx, x0 - t / 2, y0 - t / 2, boardW + t, boardH + t, t * 0.6);
    ctx.stroke();
    ctx.restore();

    // Resim zemini
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(ctx, x0 - 3, y0 - 3, boardW + 6, boardH + 6, cube * 0.4);
    ctx.fill();

    this._drawBoard();
    this._drawHits();

    // Yoldaki ve yola girmeyi bekleyen jöleler
    const tokenScale = Math.min(1, (t * 1.05) / token);
    this._drawMovers(tokenScale);
    this._drawSlotsAndColumns();

    // Parçacıklar
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Resim: kalan küpler; kazanınca resmin tamamı parlayarak geri gelir
  _drawBoard() {
    const { ctx } = this;
    const { state } = this.engine;
    const { x0, y0, cube } = this.L;
    let revealAlpha = 0;
    if (this.revealAt !== null) revealAlpha = Math.min(1, (this.time - this.revealAt) / 700);

    for (let y = 0; y < state.H; y++) {
      for (let x = 0; x < state.W; x++) {
        const c = state.grid[y][x];
        if (c) ctx.drawImage(this.cubeCache[c], x0 + x * cube, y0 + y * cube, cube, cube);
      }
    }
    if (revealAlpha > 0) {
      ctx.globalAlpha = revealAlpha;
      state.level.art.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch !== '.') ctx.drawImage(this.cubeCache[ch], x0 + x * cube, y0 + y * cube, cube, cube);
      }));
      ctx.globalAlpha = 1;
    }
  }

  // Vurulan küpler: mermi uçar, küp küçülerek patlar
  _drawHits() {
    const { ctx } = this;
    const { x0, y0, cube } = this.L;
    for (const d of this.dying) {
      const k = (this.time - d.t0) / 110;
      const c = this.cubeCenter(d.x, d.y);
      if (k < 1) {
        ctx.drawImage(this.cubeCache[d.color], x0 + d.x * cube, y0 + d.y * cube, cube, cube);
        const px = lerp(d.from.x, c.x, k);
        const py = lerp(d.from.y, c.y, k);
        ctx.fillStyle = CUBE_COLORS[d.color];
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, cube * 0.22), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        const s = cube * Math.max(0, 1 - (k - 1) / 1.9) * 1.1;
        ctx.drawImage(this.cubeCache[d.color], c.x - s / 2, c.y - s / 2, s, s);
      }
    }
  }

  // Yoldaki ve yola girmeyi bekleyen jöleler
  _drawMovers(tokenScale) {
    const { state } = this.engine;
    for (const sh of state.pending) {
      const p = this.sourcePoint(sh.from);
      this._drawToken(sh, p.x, p.y, 1 + Math.sin(this.time / 90) * 0.05, 1);
    }
    for (const sh of state.belt) {
      const target = this.trackPoint(sh.traveled);
      const p = this._tokenPos(sh, target);
      const bob = Math.sin(this.time / 110 + sh.id) * 1.5;
      this._drawToken(sh, p.x, p.y + bob, tokenScale, 1);
    }
    for (const p of this.popping) {
      const k = (this.time - p.t0) / 250;
      this._drawToken({ color: p.color }, p.x, p.y, tokenScale * (1 + k * 0.6), 1 - k, false);
    }
  }

  // Bekleme kutuları ve sütunlar (öndeki seçilebilir)
  _drawSlotsAndColumns() {
    const { ctx } = this;
    const { state } = this.engine;
    const { token } = this.L;
    const fullSlots = state.slots.every(Boolean);
    state.slots.forEach((sh, i) => {
      const r = this.slotRect(i);
      ctx.fillStyle = fullSlots ? 'rgba(255, 59, 92, 0.28)' : 'rgba(22, 44, 66, 0.35)';
      roundRect(ctx, r.x, r.y, r.w, r.h, r.w * 0.25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (sh) {
        const target = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        const p = this._tokenPos(sh, target);
        this._drawToken(sh, p.x, p.y, 0.95, 1);
      }
    });

    // Jöle sütunları (öndeki seçilebilir)
    const canLaunch = this.engine.canLaunch();
    state.columns.forEach((col, c) => {
      for (let d = Math.min(col.length, VISIBLE_IN_COLUMN) - 1; d >= 0; d--) {
        const p = this.columnPoint(c, d);
        const front = d === 0;
        const scale = front ? 1 + Math.sin(this.time / 200 + c) * 0.03 : 0.85 - d * 0.05;
        const alpha = front ? (canLaunch ? 1 : 0.55) : 0.5 - d * 0.1;
        this._drawToken(col[d], p.x, p.y, scale, alpha, front);
      }
      if (col.length > VISIBLE_IN_COLUMN) {
        const p = this.columnPoint(c, VISIBLE_IN_COLUMN - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = `700 ${Math.max(10, token * 0.26)}px "Baloo 2", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`+${col.length - VISIBLE_IN_COLUMN}`, p.x, p.y + token * 0.55);
      }
    });
  }
}
