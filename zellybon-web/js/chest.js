// Sandık çizimi: her kademe kendi renk takımıyla ayırt edilir.
// Kubbeli kapak, metal şeritler, anahtar delikli kilit, 3B yan yüz; açılırken kapak kalkar, içinden ışık çıkar.

import { rgba } from './palette.js';

export const CHEST_INFO = {
  bronze: {
    name: 'Bronz Sandık', keys: 1,
    body: '#A8643B', bodyLight: '#D08A57', bodyDark: '#6B3A1E',
    trim: '#E0955A', trimLight: '#FFC896', trimDark: '#8E4E22', gem: null,
  },
  silver: {
    name: 'Gümüş Sandık', keys: 2,
    body: '#8FA3B8', bodyLight: '#C4D2E0', bodyDark: '#56687B',
    trim: '#E3E9F0', trimLight: '#FFFFFF', trimDark: '#8C99A8', gem: null,
  },
  gold: {
    name: 'Altın Sandık', keys: 3,
    body: '#E6B21E', bodyLight: '#FFE07A', bodyDark: '#9A6E00',
    trim: '#FFF3B0', trimLight: '#FFFFFF', trimDark: '#C79A1A', gem: '#EA5249',
  },
  diamond: {
    name: 'Elmas Sandık', keys: 4,
    body: '#4C8DDC', bodyLight: '#9CC6F5', bodyDark: '#25579A',
    trim: '#9BEFF5', trimLight: '#FFFFFF', trimDark: '#13919A', gem: '#9BEFF5',
  },
  legend: {
    name: 'Efsane Sandık', keys: 5,
    body: '#9B5FD6', bodyLight: '#D2B0F2', bodyDark: '#5E2E91',
    trim: '#EFCD43', trimLight: '#FFF0A0', trimDark: '#A78828', gem: 'rainbow',
  },
};

export const CHEST_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'legend'];

/**
 * Sandık veren bölümler (sunucudaki kuralla aynı: 2, 4, 7, 11, 16, 22, 29 …; aralar büyür, sandık değerlenir).
 * @returns {{ level: number, tier: string }[]}
 */
export function chestMilestones(upTo) {
  const out = [];
  for (let level = 2, gap = 2, i = 0; level <= upTo; gap++, i++) {
    out.push({ level, tier: CHEST_ORDER[Math.min(i, CHEST_ORDER.length - 1)] });
    level += gap;
  }
  return out;
}

// Sandığın arkasındaki ışık halkası (kademe rengi)
const AURA = { bronze: '#FFB26B', silver: '#E3F0FF', gold: '#FFE07A', diamond: '#9BEFF5', legend: '#F7A8E8' };

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function vGrad(g, y0, y1, a, b, c) {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, a);
  grad.addColorStop(0.5, b);
  grad.addColorStop(1, c);
  return grad;
}

function gemFill(g, info, x, y, r) {
  if (info.gem === 'rainbow') {
    const grad = g.createLinearGradient(x - r, y - r, x + r, y + r);
    ['#EA5249', '#F58A3A', '#EFCD43', '#58C95B', '#4C8DDC', '#9B5FD6'].forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
    return grad;
  }
  const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.35, info.gem);
  grad.addColorStop(1, rgba('#000000', 0.35));
  return grad;
}

/**
 * Sandığı çizer.
 * @param {CanvasRenderingContext2D} g
 * @param {string} tier
 * @param {number} cx  merkez x
 * @param {number} cy  merkez y
 * @param {number} s   boyut (genişlik ~ s)
 * @param {{ open?: number, time?: number }} [opts] open: 0 kapalı … 1 açık
 */
export function drawChest(g, tier, cx, cy, s, { open = 0, time = 0 } = {}) {
  const info = CHEST_INFO[tier] ?? CHEST_INFO.bronze;
  const x = cx - s * 0.42;
  const w = s * 0.84;
  const baseTop = cy - s * 0.02;
  const baseH = s * 0.36;
  const lidH = s * 0.3;
  const side = s * 0.085; // 3B yan yüz kalınlığı
  const trimW = s * 0.07;

  g.save();

  // Işık ve ışınlar (açılırken)
  if (open > 0) {
    g.save();
    g.translate(cx, baseTop);
    g.rotate(time / 1400);
    // Işınlar canvas içinde kalır ve uçlarına doğru söner (kare kenar görünmez)
    const rayLen = s * 0.52;
    for (let k = 0; k < 12; k++) {
      g.rotate((Math.PI * 2) / 12);
      const ray = g.createLinearGradient(0, 0, 0, -rayLen);
      ray.addColorStop(0, rgba('#FFF0A0', 0.4 * open));
      ray.addColorStop(1, rgba('#FFF0A0', 0));
      g.fillStyle = ray;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-s * 0.05, -rayLen);
      g.lineTo(s * 0.05, -rayLen);
      g.closePath();
      g.fill();
    }
    g.restore();
    const glow = g.createRadialGradient(cx, baseTop, 0, cx, baseTop, s * 0.5);
    glow.addColorStop(0, rgba('#FFF6C8', 0.9 * open));
    glow.addColorStop(1, rgba('#FFF6C8', 0));
    g.fillStyle = glow;
    g.beginPath();
    g.arc(cx, baseTop, s * 0.5, 0, Math.PI * 2);
    g.fill();
  }

  // Kademe aurası: değerli sandık daha güçlü parlar
  const auraPower = { bronze: 0.35, silver: 0.45, gold: 0.65, diamond: 0.75, legend: 0.9 }[tier] ?? 0.4;
  const pulse = 0.75 + Math.sin(time / 420) * 0.25;
  const aura = g.createRadialGradient(cx, baseTop, s * 0.1, cx, baseTop, s * 0.55);
  aura.addColorStop(0, rgba(AURA[tier] ?? '#FFFFFF', auraPower * pulse));
  aura.addColorStop(1, rgba(AURA[tier] ?? '#FFFFFF', 0));
  g.fillStyle = aura;
  g.beginPath();
  g.arc(cx, baseTop, s * 0.55, 0, Math.PI * 2);
  g.fill();

  // Zemin gölgesi
  g.fillStyle = 'rgba(12, 30, 48, 0.3)';
  g.beginPath();
  g.ellipse(cx + side * 0.5, baseTop + baseH + s * 0.05, s * 0.46, s * 0.06, 0, 0, Math.PI * 2);
  g.fill();

  // ---- Gövde (alt kutu) ----
  // yan yüz
  rrect(g, x + side, baseTop + side * 0.4, w, baseH, s * 0.05);
  g.fillStyle = info.bodyDark;
  g.fill();
  // ön yüz
  rrect(g, x, baseTop, w, baseH, s * 0.05);
  g.fillStyle = vGrad(g, baseTop, baseTop + baseH, info.bodyLight, info.body, info.bodyDark);
  g.fill();
  g.lineWidth = Math.max(1.5, s * 0.02);
  g.strokeStyle = info.bodyDark;
  g.stroke();
  // tahta/metal çizgileri
  g.strokeStyle = rgba(info.bodyDark, 0.35);
  g.lineWidth = Math.max(1, s * 0.01);
  for (let k = 1; k < 3; k++) {
    g.beginPath();
    g.moveTo(x + s * 0.03, baseTop + (baseH * k) / 3);
    g.lineTo(x + w - s * 0.03, baseTop + (baseH * k) / 3);
    g.stroke();
  }

  // İç kısım (açıkken görünür)
  if (open > 0) {
    rrect(g, x + s * 0.04, baseTop - s * 0.05 * open, w - s * 0.08, s * 0.08 * open + s * 0.02, s * 0.02);
    g.fillStyle = rgba('#FFE680', 0.95);
    g.fill();
  }

  // Dikey metal şeritler (gövde)
  const bands = [x + w * 0.18, x + w * 0.82];
  for (const bx of bands) {
    rrect(g, bx - trimW / 2, baseTop, trimW, baseH, s * 0.015);
    g.fillStyle = vGrad(g, baseTop, baseTop + baseH, info.trimLight, info.trim, info.trimDark);
    g.fill();
    g.strokeStyle = info.trimDark;
    g.lineWidth = Math.max(1, s * 0.012);
    g.stroke();
    for (const ry of [baseTop + baseH * 0.25, baseTop + baseH * 0.75]) {
      g.fillStyle = info.trimLight;
      g.beginPath();
      g.arc(bx, ry, s * 0.014, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = info.trimDark;
      g.lineWidth = Math.max(0.8, s * 0.006);
      g.stroke();
    }
  }

  // ---- Kapak ----
  const lift = open * s * 0.26;
  const squash = 1 - open * 0.55; // kapak geriye yatınca kısalır
  g.save();
  g.translate(0, baseTop - lift);
  g.scale(1, squash);
  const lidTop = -lidH;
  const lid = () => {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, lidTop + lidH * 0.45);
    g.bezierCurveTo(x, lidTop - lidH * 0.05, x + w, lidTop - lidH * 0.05, x + w, lidTop + lidH * 0.45);
    g.lineTo(x + w, 0);
    g.closePath();
  };
  // yan yüz
  g.save();
  g.translate(side, side * 0.4);
  lid();
  g.fillStyle = info.bodyDark;
  g.fill();
  g.restore();
  lid();
  g.fillStyle = vGrad(g, lidTop, 0, info.bodyLight, info.body, info.bodyDark);
  g.fill();
  g.lineWidth = Math.max(1.5, s * 0.02);
  g.strokeStyle = info.bodyDark;
  g.stroke();
  // kapak şeritleri
  g.save();
  lid();
  g.clip();
  for (const bx of bands) {
    g.fillStyle = vGrad(g, lidTop, 0, info.trimLight, info.trim, info.trimDark);
    g.fillRect(bx - trimW / 2, lidTop - lidH, trimW, lidH * 2);
  }
  // parlama
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(x + w * 0.35, lidTop + lidH * 0.3, w * 0.22, lidH * 0.12, -0.15, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // kapak alt kenarı (metal şerit)
  rrect(g, x - s * 0.01, -s * 0.045, w + s * 0.02, s * 0.06, s * 0.02);
  g.fillStyle = vGrad(g, -s * 0.045, s * 0.015, info.trimLight, info.trim, info.trimDark);
  g.fill();
  g.strokeStyle = info.trimDark;
  g.lineWidth = Math.max(1, s * 0.012);
  g.stroke();
  g.restore();

  // ---- Kilit ----
  if (open < 0.5) {
    const lw = s * 0.16;
    const lh = s * 0.19;
    const lx = cx - lw / 2;
    const ly = baseTop - s * 0.05 - lift;
    rrect(g, lx, ly, lw, lh, s * 0.03);
    g.fillStyle = vGrad(g, ly, ly + lh, info.trimLight, info.trim, info.trimDark);
    g.fill();
    g.strokeStyle = info.trimDark;
    g.lineWidth = Math.max(1, s * 0.014);
    g.stroke();
    if (info.gem) {
      g.fillStyle = gemFill(g, info, cx, ly + lh * 0.32, lw * 0.22);
      g.beginPath();
      g.moveTo(cx, ly + lh * 0.12);
      g.lineTo(cx + lw * 0.22, ly + lh * 0.32);
      g.lineTo(cx, ly + lh * 0.52);
      g.lineTo(cx - lw * 0.22, ly + lh * 0.32);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.stroke();
    }
    // anahtar deliği
    const ky = ly + lh * (info.gem ? 0.72 : 0.5);
    g.fillStyle = '#22364A';
    g.beginPath();
    g.arc(cx, ky - lh * 0.06, lw * 0.1, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(cx - lw * 0.07, ky + lh * 0.14);
    g.lineTo(cx + lw * 0.07, ky + lh * 0.14);
    g.lineTo(cx, ky - lh * 0.04);
    g.closePath();
    g.fill();
  }

  // Üzerinden geçen parlama (kapalıyken, ~2.6 sn'de bir)
  if (open === 0) {
    const sweep = (time % 2600) / 2600;
    if (sweep < 0.45) {
      const k = sweep / 0.45;
      g.save();
      rrect(g, x, baseTop - lidH * 0.95, w, baseH + lidH * 0.95, s * 0.08);
      g.clip();
      const bx = x - w * 0.3 + k * w * 1.6;
      const band = g.createLinearGradient(bx - s * 0.12, 0, bx + s * 0.12, 0);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = band;
      g.translate(bx, baseTop);
      g.rotate(0.35);
      g.translate(-bx, -baseTop);
      g.fillRect(bx - s * 0.12, baseTop - s, s * 0.24, s * 2);
      g.restore();
    }
  }

  // Açılırken fışkıran altın paralar ve yıldızlar
  if (open > 0) {
    for (let k = 0; k < 10; k++) {
      const t = ((time / 900 + k * 0.137) % 1);
      const a = -Math.PI / 2 + (k - 4.5) * 0.22;
      const dist = t * s * 0.55 * open;
      const px = cx + Math.cos(a) * dist;
      const py = baseTop - s * 0.05 + Math.sin(a) * dist + t * t * s * 0.25;
      const alpha = (1 - t) * open;
      if (k % 2) {
        g.fillStyle = rgba('#FFD23F', alpha);
        g.beginPath();
        g.ellipse(px, py, s * 0.035, s * 0.025, t * 6, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = rgba('#B07800', alpha);
        g.lineWidth = Math.max(1, s * 0.008);
        g.stroke();
      } else {
        const r = s * 0.03;
        g.fillStyle = rgba('#FFFFFF', alpha);
        g.beginPath();
        g.moveTo(px, py - r * 1.6);
        g.quadraticCurveTo(px, py, px + r * 1.6, py);
        g.quadraticCurveTo(px, py, px, py + r * 1.6);
        g.quadraticCurveTo(px, py, px - r * 1.6, py);
        g.quadraticCurveTo(px, py, px, py - r * 1.6);
        g.fill();
      }
    }
  }

  // Efsane: etrafında parıltılar
  if (tier !== 'bronze') {
    const n = { silver: 2, gold: 3, diamond: 4, legend: 6 }[tier] ?? 2;
    for (let k = 0; k < n; k++) {
      const a = time / 600 + (k * Math.PI * 2) / n;
      const px = cx + Math.cos(a) * s * 0.5;
      const py = baseTop - s * 0.1 + Math.sin(a) * s * 0.36;
      const r = s * 0.025 * (1 + Math.sin(time / 200 + k) * 0.4);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath();
      g.moveTo(px, py - r * 2);
      g.lineTo(px + r * 0.6, py);
      g.lineTo(px, py + r * 2);
      g.lineTo(px - r * 0.6, py);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

/** Bir canvas'a sandık çizer (dpr'a göre net). Animasyon için tekrar çağrılabilir. */
export function paintChestCanvas(canvas, tier, cssSize, opts = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (canvas.width !== Math.round(cssSize * dpr) || canvas.height !== Math.round(cssSize * dpr) || canvas.style.width !== `${cssSize}px`) {
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssSize, cssSize);
  drawChest(g, tier, cssSize / 2, cssSize * 0.56, cssSize * 0.9, opts);
}
