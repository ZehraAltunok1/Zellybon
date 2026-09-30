// Canvas 2D çizimi ve animasyonlar. Oyun mantığını bilmez; sadece kendisine verilen adımları oynatır.

import { PALETTE, MATCH_KEYS } from '../palette.js';
import { renderGummy } from '../shooter/shapes.js';

export const JELLY_COLORS = MATCH_KEYS.map((k) => PALETTE[k].base);
// Renk → şeker şekli: kırmızı kalp, turuncu yıldız, sarı kola, yeşil ayıcık, mavi halka, mor çilek
const MATCH_SHAPES = ['heart', 'star', 'cola', 'bear', 'ring', 'strawberry'];

const easing = {
  linear: (t) => t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inBack: (t) => 2.7 * t * t * t - 1.7 * t * t,
  // Hafif zıplamalı iniş
  outBounce: (t) => {
    if (t < 0.7) return (t / 0.7) ** 2;
    const u = (t - 0.7) / 0.3;
    return 1 - 0.08 * Math.sin(u * Math.PI);
  },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas, size = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = size;
    this.cell = 40;
    this.dpr = 1;
    this.grid = [];      // index → sprite
    this.dying = [];     // patlayan jöleler (animasyon bitene kadar çizilir)
    this.particles = [];
    this.texts = [];
    this.tweens = [];
    this.ice = new Set(); // buzlu hücre indeksleri (oyun kontrolcüsü verir)
    this.selected = -1;
    this.storm = false;
    this.lowEffects = false;
    this.jellyCache = [];
    this.time = 0;
    this._raf = 0;
    this._last = 0;
    this._onFrame = null;
  }

  resize() {
    const parent = this.canvas.parentElement;
    const maxW = parent.clientWidth;
    const maxH = parent.clientHeight || maxW;
    const css = Math.floor(Math.min(maxW, maxH, 560));
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.width = `${css}px`;
    this.canvas.style.height = `${css}px`;
    this.canvas.width = Math.round(css * this.dpr);
    this.canvas.height = Math.round(css * this.dpr);
    this.cssSize = css;
    this.pad = Math.round(css * 0.025);
    this.cell = (css - this.pad * 2) / this.size;
    this._buildJellyCache();
  }

  // Her renk için jöleyi bir kez ekran dışı canvas'a çizer; karelerde sadece kopyalanır.
  // Her renk kendi şeker şekliyle çizilir (renkleri şekilden de ayırt etmek kolaylaşır).
  _buildJellyCache() {
    const px = Math.ceil(this.cell * this.dpr);
    this.jellyCache = MATCH_KEYS.map((key, i) => renderGummy({ shape: MATCH_SHAPES[i], color: key, size: px }));
  }

  _sprite(color, col, row) {
    return { color, x: col, y: row, scale: 1, alpha: 1, wobbleAt: -1e9, wobbleAmp: 0 };
  }

  setBoard(board) {
    this.dying = [];
    this.particles = [];
    this.texts = [];
    this.tweens = [];
    this.grid = board.cells.map((color, i) => this._sprite(color, i % this.size, Math.floor(i / this.size)));
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min(100, now - this._last);
      this._last = now;
      this.time += dt;
      this._update(dt);
      if (this._onFrame) this._onFrame(dt);
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._onFrame = null;
  }

  /** Ekran koordinatından hücre indeksini bulur; tahta dışındaysa -1. */
  cellFromPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.pad;
    const y = clientY - rect.top - this.pad;
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    if (c < 0 || r < 0 || c >= this.size || r >= this.size) return -1;
    return r * this.size + c;
  }

  // ---------- Animasyon yardımcıları ----------

  tween(target, props, duration, ease = easing.outCubic) {
    return new Promise((resolve) => {
      const from = {};
      for (const k in props) from[k] = target[k];
      this.tweens.push({ target, from, to: props, duration, ease, t: 0, resolve });
    });
  }

  wait(ms) {
    return this.tween({ v: 0 }, { v: 1 }, ms, easing.linear);
  }

  setSelected(i) {
    this.selected = i;
  }

  jiggle(i, amp = 0.14) {
    const s = this.grid[i];
    if (!s) return;
    s.wobbleAt = this.time;
    s.wobbleAmp = amp;
  }

  async swap(a, b, valid) {
    const sa = this.grid[a];
    const sb = this.grid[b];
    const pa = { x: sa.x, y: sa.y };
    const pb = { x: sb.x, y: sb.y };
    await Promise.all([this.tween(sa, pb, 150), this.tween(sb, pa, 150)]);
    if (valid) {
      this.grid[a] = sb;
      this.grid[b] = sa;
      return;
    }
    this.jiggle(a, 0.1);
    this.jiggle(b, 0.1);
    await Promise.all([this.tween(sa, pa, 150), this.tween(sb, pb, 150)]);
  }

  /** Bir çözüm adımını oynatır: patlama, puan yazısı, düşme ve yeni jöleler. */
  async playStep(step, result) {
    const size = this.size;

    // 1) Patlama
    const pops = [];
    for (const { index } of step.cleared) {
      const s = this.grid[index];
      if (!s) continue;
      this.grid[index] = null;
      this.dying.push(s);
      this._burst(s);
      pops.push(this.tween(s, { scale: 0, alpha: 0 }, 180, easing.inBack));
    }
    if (step.blast && result.total > 0) {
      const o = step.origin ?? step.cleared[0].index;
      this._floatText(`+${result.total}`, o % size, Math.floor(o / size), '#FFFFFF', 1.1);
    }
    step.groups.forEach((g, k) => {
      const cx = g.cells.reduce((a, i) => a + (i % size), 0) / g.cells.length;
      const cy = g.cells.reduce((a, i) => a + Math.floor(i / size), 0) / g.cells.length;
      this._floatText(`+${result.perGroup[k]}`, cx, cy, result.storm ? '#FFFFFF' : JELLY_COLORS[g.color]);
    });
    if (step.comboLevel > 0) {
      this._floatText(`KOMBO x${step.comboLevel + 1}!`, (size - 1) / 2, (size - 1) / 2, '#FFFFFF', 1.25);
    }
    await Promise.all(pops);
    this.dying = this.dying.filter((s) => s.alpha > 0);

    // 2) Düşme ve doğan jöleler (aynı anda)
    const moves = [];
    const landed = [];
    for (const f of step.falls) {
      const s = this.grid[f.from];
      this.grid[f.from] = null;
      this.grid[f.to] = s;
      landed.push(f.to);
    }
    for (const f of step.falls) {
      const s = this.grid[f.to];
      const dist = Math.floor(f.to / size) - s.y;
      moves.push(this.tween(s, { y: Math.floor(f.to / size) }, 160 + 45 * dist, easing.outBounce));
    }
    for (const sp of step.spawns) {
      const col = sp.to % size;
      const row = Math.floor(sp.to / size);
      const s = this._sprite(sp.color, col, sp.startRow);
      this.grid[sp.to] = s;
      landed.push(sp.to);
      moves.push(this.tween(s, { y: row }, 160 + 45 * (row - sp.startRow), easing.outBounce));
    }
    await Promise.all(moves);
    for (const i of landed) this.jiggle(i, 0.07);
  }

  async reshuffle(board) {
    await Promise.all(this.grid.map((s) => s && this.tween(s, { scale: 0 }, 200, easing.inBack)));
    this.grid = board.cells.map((color, i) => {
      const s = this._sprite(color, i % this.size, Math.floor(i / this.size));
      s.scale = 0;
      return s;
    });
    this._floatText('KARIŞTIRILDI', (this.size - 1) / 2, (this.size - 1) / 2, '#FFFFFF', 1.1);
    await Promise.all(this.grid.map((s) => this.tween(s, { scale: 1 }, 260, easing.outCubic)));
  }

  /** Buz kırılınca parlak buz kıymıkları saçılır */
  crackIce(index) {
    const x = (index % this.size) + 0.5;
    const y = Math.floor(index / this.size) + 0.5;
    for (let k = 0; k < 9; k++) {
      const a = (Math.PI * 2 * k) / 9 + Math.random() * 0.5;
      const v = 2 + Math.random() * 2.5;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5,
        life: 1, size: 0.07 + Math.random() * 0.07, color: k % 2 ? '#FFFFFF' : '#9BEFF5',
      });
    }
  }

  _iceImage() {
    const px = Math.ceil(this.cell * this.dpr);
    if (this._ice?.width === px) return this._ice;
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    const g = c.getContext('2d');
    const o = px * 0.04;
    const s = px - o * 2;
    const grad = g.createLinearGradient(0, 0, px, px);
    grad.addColorStop(0, 'rgba(230, 250, 255, 0.72)');
    grad.addColorStop(0.5, 'rgba(155, 239, 245, 0.45)');
    grad.addColorStop(1, 'rgba(76, 141, 220, 0.55)');
    roundRect(g, o, o, s, s, s * 0.2);
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = Math.max(1.5, px * 0.05);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.stroke();
    // parlama ve çatlak çizgileri
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = Math.max(1, px * 0.035);
    g.beginPath();
    g.moveTo(px * 0.2, px * 0.35);
    g.lineTo(px * 0.35, px * 0.2);
    g.moveTo(px * 0.2, px * 0.55);
    g.lineTo(px * 0.55, px * 0.2);
    g.stroke();
    g.strokeStyle = 'rgba(30, 136, 184, 0.45)';
    g.lineWidth = Math.max(1, px * 0.02);
    g.beginPath();
    g.moveTo(px * 0.62, px * 0.9);
    g.lineTo(px * 0.7, px * 0.7);
    g.lineTo(px * 0.85, px * 0.62);
    g.stroke();
    this._ice = c;
    return c;
  }

  _burst(s) {
    const count = this.lowEffects ? 3 : 8;
    const color = JELLY_COLORS[s.color];
    for (let k = 0; k < count; k++) {
      const a = (Math.PI * 2 * k) / count + Math.random() * 0.6;
      const v = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: s.x + 0.5, y: s.y + 0.5,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5,
        life: 1, size: 0.08 + Math.random() * 0.08, color,
      });
    }
  }

  _floatText(text, col, row, color, scale = 1) {
    this.texts.push({ text, x: col + 0.5, y: row + 0.5, life: 1, color, scale });
  }

  // ---------- Kare güncelleme ve çizim ----------

  _update(dt) {
    for (const tw of this.tweens) {
      tw.t = Math.min(1, tw.t + dt / tw.duration);
      const e = tw.ease(tw.t);
      for (const k in tw.to) tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    }
    const done = this.tweens.filter((tw) => tw.t >= 1);
    if (done.length) {
      this.tweens = this.tweens.filter((tw) => tw.t < 1);
      done.forEach((tw) => tw.resolve());
    }

    const sec = dt / 1000;
    for (const p of this.particles) {
      p.vy += 9 * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.life -= sec * 1.6;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const t of this.texts) {
      t.y -= sec * 1.1;
      t.life -= sec * 1.25;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  _draw() {
    const { ctx, cell, pad, size } = this;
    const W = this.cssSize;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);

    // Tahta zemini
    ctx.save();
    if (this.storm) {
      const hue = (this.time / 8) % 360;
      ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
      ctx.shadowBlur = 18;
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    roundRect(ctx, 2, 2, W - 4, W - 4, cell * 0.35);
    ctx.fill();
    ctx.restore();
    if (this.storm) {
      const hue = (this.time / 8) % 360;
      const grad = ctx.createLinearGradient(0, 0, W, W);
      for (let k = 0; k <= 4; k++) grad.addColorStop(k / 4, `hsl(${(hue + k * 72) % 360}, 100%, 65%)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      roundRect(ctx, 2, 2, W - 4, W - 4, cell * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r + c) % 2 === 0) ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell);
      }
    }

    // Jöleler (tahta dışından düşenler kırpılır)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, cell * size, cell * size);
    ctx.clip();
    const drawSprite = (s, selected) => {
      const img = this.jellyCache[s.color];
      if (!img) return;
      let sx = s.scale;
      let sy = s.scale;
      let squash = 0; // esnemede jöle alt kenarına oturur
      const since = (this.time - s.wobbleAt) / 1000;
      if (since < 0.6) {
        const w = Math.sin(since * 28) * s.wobbleAmp * (1 - since / 0.6);
        sx *= 1 + w;
        sy *= 1 - w;
        squash = (cell * s.scale * w) / 2;
      }
      if (selected) {
        const pulse = 1.1 + Math.sin(this.time / 120) * 0.03;
        sx *= pulse;
        sy *= pulse;
      }
      const cx = pad + (s.x + 0.5) * cell;
      const cy = pad + (s.y + 0.5) * cell + squash * 0.84;
      ctx.globalAlpha = s.alpha;
      ctx.drawImage(img, cx - (cell * sx) / 2, cy - (cell * sy) / 2, cell * sx, cell * sy);
      ctx.globalAlpha = 1;
    };
    this.grid.forEach((s, i) => s && i !== this.selected && drawSprite(s, false));
    for (const s of this.dying) drawSprite(s, false);
    if (this.selected >= 0 && this.grid[this.selected]) drawSprite(this.grid[this.selected], true);
    ctx.restore();

    // Buz tabakası: şekerin üstünde yarı saydam, parlak buz
    if (this.ice.size) {
      const img = this._iceImage();
      for (const i of this.ice) {
        ctx.drawImage(img, pad + (i % size) * cell, pad + Math.floor(i / size) * cell, cell, cell);
      }
    }

    // Parçacıklar
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pad + p.x * cell, pad + p.y * cell, p.size * cell, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Yüzen puan yazıları
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const fs = cell * 0.5 * t.scale * (1 + (1 - t.life) * 0.2);
      ctx.font = `800 ${fs}px "Baloo 2", "Fredoka", system-ui, sans-serif`;
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.lineWidth = Math.max(2, fs * 0.16);
      ctx.strokeStyle = '#22364A';
      const x = pad + t.x * cell;
      const y = pad + t.y * cell;
      ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
}
