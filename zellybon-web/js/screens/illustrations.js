// Ana sayfadaki oyun kartlarının çizimleri. Oyunların kendi çizim parçalarını kullanır,
// böylece görseller oyunun içindekilerle aynıdır. Ana sayfa açıkken hafifçe canlanır.

import { renderGummy, renderCube } from '../shooter/shapes.js';
import { renderHint, renderStitch, renderSpool, drawNeedle, strand } from '../nakis/renderer.js';
import { PALETTE, rgba } from '../palette.js';
import { drawCushion, drawPinHead, drawShaft } from '../pins/renderer.js';
import { paintWorm } from './arcade.js';

const TAU = Math.PI * 2;
let raf = 0;
const cache = new Map();

// Aynı görüntü her karede yeniden çizilmesin
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function pill(g, x, y, text, fs) {
  g.font = `800 ${fs}px "Baloo 2", system-ui, sans-serif`;
  const w = Math.max(fs * 1.5, g.measureText(text).width + fs * 0.8);
  const h = fs * 1.2;
  rrect(g, x - w / 2, y - h / 2, w, h, h / 2);
  g.fillStyle = '#22364A';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.stroke();
  g.fillStyle = '#FFFFFF';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, y + fs * 0.05);
}

function sparkle(g, x, y, r, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = '#FFFFFF';
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
  g.restore();
}

function panel(g, w, h, top, bottom) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  rrect(g, 0, 0, w, h, 18);
  g.fillStyle = grad;
  g.fill();
  // yumuşak ışık lekeleri
  g.save();
  rrect(g, 0, 0, w, h, 18);
  g.clip();
  for (const [x, y, r] of [[0.15, 0.1, 0.5], [0.85, 0.9, 0.45]]) {
    const glow = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    glow.addColorStop(0, 'rgba(255,255,255,0.16)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
  }
  g.restore();
}

// ---------- Jöle Atış: kaykay yolunda jöleler piksel kalbe atış yapıyor ----------

const HEART = [
  '.rr...rr.',
  'riir.riir',
  'riwirrrir',
  'rirrrrrir',
  '.rrrrrrr.',
  '..rrrrr..',
  '...rrr...',
  '....r....',
];

function drawMain(g, w, h, t, dpr) {
  panel(g, w, h, '#5C9BD0', '#2F6696');
  const c = Math.floor(h * 0.078);
  const bw = 9 * c;
  const bh = 8 * c;
  const band = c * 1.9;
  const x0 = Math.round(w * 0.1 + band);
  const y0 = Math.round((h - bh) / 2);

  // yol
  rrect(g, x0 - band, y0 - band, bw + band * 2, bh + band * 2, band * 0.9);
  g.fillStyle = 'rgba(22, 44, 66, 0.45)';
  g.fill();
  g.save();
  g.setLineDash([band * 0.35, band * 0.35]);
  g.lineDashOffset = -t * 0.02;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  rrect(g, x0 - band / 2, y0 - band / 2, bw + band, bh + band, band * 0.6);
  g.stroke();
  g.restore();

  // resim: vurulan küpler 2.4 sn'de bir geri gelir
  const cycle = (t % 2400) / 2400;
  const gone = new Set(['7,4', '6,5', '8,2', '6,6']);
  const hitIndex = Math.floor(cycle * 4);
  HEART.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const key = `${x},${y}`;
    const order = [...gone].indexOf(key);
    if (order >= 0 && order < hitIndex) return;
    const img = cached(`cube-${ch}-${c}`, () => renderCube(ch, c * dpr));
    g.drawImage(img, x0 + x * c, y0 + y * c, c, c);
  }));

  // yoldaki jöleler: alt kenar boyunca kayar, sağ kenarda bekler
  const gs = band * 1.15;
  const along = (t / 1400) % 1;
  const shooters = [
    { color: 'b', x: x0 + along * bw, y: y0 + bh + band / 2, ammo: 12 },
    { color: 'r', x: x0 + bw + band / 2, y: y0 + bh * 0.35, ammo: 20 }, // atış yapan
    { color: 'r', x: x0 + bw * 0.25, y: y0 - band / 2, ammo: 8 },
  ];
  // atış: kırmızı jöle kalbe mermi gönderir
  const target = [...gone][hitIndex] ?? '7,4';
  const [tx, ty] = target.split(',').map(Number);
  const shot = (cycle * 4) % 1;
  if (shot < 0.45) {
    const sx = shooters[1].x;
    const sy = shooters[1].y;
    const ex = x0 + (tx + 0.5) * c;
    const ey = y0 + (ty + 0.5) * c;
    const k = shot / 0.45;
    g.fillStyle = PALETTE.r.base;
    g.beginPath();
    g.arc(sx + (ex - sx) * k, sy + (ey - sy) * k, c * 0.28, 0, TAU);
    g.fill();
    g.strokeStyle = '#FFFFFF';
    g.lineWidth = 1.2;
    g.stroke();
  } else if (shot < 0.75) {
    const k = (shot - 0.45) / 0.3;
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * TAU;
      g.fillStyle = rgba(PALETTE.r.base, 1 - k);
      g.beginPath();
      g.arc(x0 + (tx + 0.5) * c + Math.cos(a) * k * c * 1.4, y0 + (ty + 0.5) * c + Math.sin(a) * k * c * 1.4, c * 0.16, 0, TAU);
      g.fill();
    }
  }
  shooters.forEach((s, i) => {
    const img = cached(`gummy-bear-${s.color}-${gs}`, () => renderGummy({ shape: 'bear', color: s.color, size: gs * dpr }));
    const bob = Math.sin(t / 180 + i) * 1.5;
    g.drawImage(img, s.x - gs / 2, s.y - gs / 2 + bob, gs, gs);
    pill(g, s.x, s.y + gs * 0.42 + bob, String(s.ammo), gs * 0.28);
  });

  // sağda sırada bekleyen jöleler
  const qx = x0 + bw + band * 2.6;
  const cols = [['g', 'i', 'c'], ['o', 'p', 'y']];
  const qs = Math.min(h * 0.3, (w - qx) / 2.3);
  cols.forEach((col, ci) => {
    col.forEach((color, d) => {
      const size = qs * (d === 0 ? 1 : 0.8);
      const img = cached(`gummy-heart-${color}-${Math.round(size)}`, () => renderGummy({ shape: 'heart', color, size: size * dpr }));
      const cx = qx + ci * qs * 1.1 + qs / 2;
      const cy = h * 0.24 + d * qs * 0.85;
      g.globalAlpha = d === 0 ? 1 : 0.55 - d * 0.1;
      g.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      g.globalAlpha = 1;
      if (d === 0) pill(g, cx, cy + size * 0.42, ci ? '10' : '20', size * 0.26);
    });
  });
}

// ---------- Nakış: kasnakta yarısı işlenmiş çiçek, ipli iğne ve makaralar ----------

const FLOWER = [
  '..iii..',
  '.iiyii.',
  'iiyoyii',
  'iyoooyi',
  'iiyoyii',
  '.iiyii.',
  '..igi..',
];

function drawNakis(g, w, h, t, dpr) {
  panel(g, w, h, '#4FB8D6', '#2A6F9E');
  const R = h * 0.43;
  const cx = w * 0.34;
  const cy = h * 0.52;
  const cs = Math.floor((R * 1.35) / 7);
  const gx = cx - (7 * cs) / 2;
  const gy = cy - (7 * cs) / 2;

  // kasnağın gölgesi
  g.fillStyle = 'rgba(12, 30, 48, 0.3)';
  g.beginPath();
  g.ellipse(cx + 3, cy + R * 0.95, R * 0.9, R * 0.12, 0, 0, TAU);
  g.fill();

  // kumaş (kasnak içi)
  g.save();
  g.beginPath();
  g.arc(cx, cy, R * 0.92, 0, TAU);
  g.clip();
  g.fillStyle = '#F4EEE3';
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.fillStyle = '#E2D6C2';
  for (let y = cy - R; y < cy + R; y += cs / 2) {
    for (let x = cx - R; x < cx + R; x += cs / 2) {
      g.beginPath();
      g.arc(x, y, Math.max(0.6, cs * 0.05), 0, TAU);
      g.fill();
    }
  }
  // çiçek: içten dışa işleniyor (içteki halkalar işlenmiş, dıştakiler soluk iz)
  const done = Math.floor(((t % 6000) / 6000) * 5);
  FLOWER.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
    const stitched = ring <= 1 || ring - 2 < done - 1;
    const key = `${stitched ? 's' : 'h'}-${ch}-${cs}`;
    const img = cached(key, () => (stitched ? renderStitch(ch, cs * dpr) : renderHint(ch, cs * dpr)));
    g.drawImage(img, gx + x * cs, gy + y * cs, cs, cs);
  }));
  g.restore();

  // ahşap kasnak (iki halka) ve vida
  const wood = PALETTE.n;
  for (const [r, lw] of [[R * 0.97, R * 0.13], [R * 0.9, R * 0.05]]) {
    g.lineWidth = lw;
    const grad = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    grad.addColorStop(0, wood.light);
    grad.addColorStop(0.5, wood.base);
    grad.addColorStop(1, wood.dark);
    g.strokeStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, TAU);
    g.stroke();
  }
  g.fillStyle = '#B8C0D0';
  rrect(g, cx - R * 0.12, cy - R * 1.12, R * 0.24, R * 0.16, 3);
  g.fill();
  g.fillStyle = '#6B7385';
  g.beginPath();
  g.arc(cx, cy - R * 1.04, R * 0.05, 0, TAU);
  g.fill();

  // makaralar
  const ss = h * 0.44;
  const spools = [
    { color: 'e', x: w * 0.78, y: h * 0.62, s: ss },
    { color: 'c', x: w * 0.9, y: h * 0.7, s: ss * 0.8 },
  ];
  const needleTipX = gx + 5.5 * cs;
  const needleTipY = gy + 1.5 * cs + Math.sin(t / 350) * cs * 0.6;
  // ip: makaradan iğneye
  const sp = spools[0];
  g.save();
  const segs = 14;
  let px = sp.x - ss * 0.2;
  let py = sp.y - ss * 0.25;
  for (let k = 1; k <= segs; k++) {
    const f = k / segs;
    const nx = px + (needleTipX + cs * 1.9 - (sp.x - ss * 0.2)) / segs;
    const ny = sp.y - ss * 0.25 + (needleTipY - cs * 1.2 - (sp.y - ss * 0.25)) * f - Math.sin(f * Math.PI) * h * 0.18;
    strand(g, px, py, nx, ny, Math.max(2.5, cs * 0.28), PALETTE.e, { shadow: false, twistPhase: -t * 0.03 + k * 7 });
    px = nx;
    py = ny;
  }
  g.restore();
  // iğne kumaşa iniyor
  drawNeedle(g, needleTipX, needleTipY, -0.55, 0.83, cs * 2.4);
  spools.forEach((s) => {
    const img = cached(`spool-${s.color}-${Math.round(s.s)}`, () => renderSpool(s.color, s.s * dpr));
    g.drawImage(img, s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
  });
}

// ---------- Jöle Patlat: şeker tahtası, üçlü eşleşme ve puan ----------

const MATCH_SHAPES = { r: 'heart', o: 'star', y: 'cola', g: 'bear', b: 'ring', p: 'strawberry' };
const BOARD = [
  ['r', 'g', 'b', 'y', 'p', 'r'],
  ['b', 'o', 'o', 'o', 'g', 'y'],
  ['y', 'p', 'r', 'g', 'b', 'o'],
];

function drawMatch(g, w, h, t, dpr) {
  panel(g, w, h, '#7ED67F', '#2F8A34');
  // Tahta üstte durur; alt kısım kartın etiketine kalır
  const gs = Math.min((h - 46) / 3, (w * 0.86) / 6);
  const bx = (w - gs * 6) / 2;
  const by = 10;

  rrect(g, bx - 6, by - 6, gs * 6 + 12, gs * 3 + 12, 14);
  g.fillStyle = 'rgba(22, 44, 66, 0.28)';
  g.fill();

  const pulse = (t % 1800) / 1800; // eşleşme döngüsü
  BOARD.forEach((row, y) => row.forEach((color, x) => {
    const matched = y === 1 && x >= 1 && x <= 3;
    let scale = 1;
    let alpha = 1;
    if (matched && pulse > 0.55) {
      const k = (pulse - 0.55) / 0.3;
      scale = Math.max(0, 1 - k) * 1.1;
      alpha = Math.max(0, 1 - k);
    }
    const bob = Math.sin(t / 260 + x * 0.8 + y) * 1.2;
    const img = cached(`m-${color}-${Math.round(gs)}`, () => renderGummy({ shape: MATCH_SHAPES[color], color, size: gs * dpr }));
    const s = gs * scale;
    const cxp = bx + (x + 0.5) * gs;
    const cyp = by + (y + 0.5) * gs + bob;
    if (matched && pulse < 0.55) {
      // eşleşen üçlü parlıyor
      const glow = g.createRadialGradient(cxp, cyp, 0, cxp, cyp, gs * 0.7);
      glow.addColorStop(0, `rgba(255, 240, 160, ${0.5 + Math.sin(t / 120) * 0.2})`);
      glow.addColorStop(1, 'rgba(255, 240, 160, 0)');
      g.fillStyle = glow;
      g.fillRect(cxp - gs, cyp - gs, gs * 2, gs * 2);
    }
    g.globalAlpha = alpha;
    if (s > 0.5) g.drawImage(img, cxp - s / 2, cyp - s / 2, s, s);
    g.globalAlpha = 1;
  }));

  // parıltılar ve puan
  if (pulse > 0.55) {
    const k = (pulse - 0.55) / 0.45;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.4;
      sparkle(g, bx + 2.5 * gs + Math.cos(a) * k * gs * 1.8, by + 1.5 * gs + Math.sin(a) * k * gs * 1.1, gs * 0.14 * (1 - k * 0.5), 1 - k);
    }
    g.save();
    g.globalAlpha = Math.min(1, (1 - k) * 2);
    const fs = gs * 0.55;
    g.font = `800 ${fs}px "Baloo 2", system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = fs * 0.18;
    g.strokeStyle = '#22364A';
    const ty = by + 1.5 * gs - k * gs * 1.2;
    g.strokeText('+60', bx + 2.5 * gs, ty);
    g.fillStyle = '#FFF0A0';
    g.fillText('+60', bx + 2.5 * gs, ty);
    g.restore();
  }
  for (let i = 0; i < 3; i++) {
    sparkle(g, w * (0.08 + i * 0.42), h * (0.2 + (i % 2) * 0.6), 5, 0.5 + Math.sin(t / 300 + i * 2) * 0.4);
  }
}

// ---------- İğnedenlik: dönen domates iğnedenlik, ipli iğneler, alttan fırlayan iğne ----------

const PIN_ANGLES = [0.2, 0.95, 1.7, 2.6, 3.3, 4.1, 4.9, 5.6];
const PIN_HEADS = ['w', 'r', 'y', 'b', 'w', 'g', 'p', 'o'];

function drawPins(g, w, h, t) {
  panel(g, w, h, '#F2A7B8', '#B8567A');
  const u = h * 0.19;
  const cx = w * 0.38;
  const cy = h * 0.5;
  const rot = t / 900;
  const cycle = (t % 1800) / 1800;
  const angles = [...PIN_ANGLES];
  // çizgili ip: iğneleri sırayla bağlar
  const head = (a) => [cx + Math.cos(a + rot) * 1.9 * u, cy + Math.sin(a + rot) * 1.9 * u];
  for (const a of angles) {
    const [hx, hy] = head(a);
    drawShaft(g, cx + Math.cos(a + rot) * u * 0.7, cy + Math.sin(a + rot) * u * 0.7, hx, hy, Math.max(1.5, u * 0.06));
  }
  drawCushion(g, cx, cy, u, 'r', rot, t);
  g.strokeStyle = '#FFF6E0';
  g.lineWidth = 1.6;
  g.beginPath();
  angles.slice(1, 6).forEach((a, i) => {
    const [x, y] = head(a);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.stroke();
  angles.forEach((a, i) => {
    const [x, y] = head(a);
    drawPinHead(g, x, y, u * 0.16, PIN_HEADS[i]);
  });
  // alttan fırlayan iğne
  const fly = Math.min(1, cycle / 0.35);
  const fy = h * 1.02 - (h * 1.02 - (cy + 1.9 * u)) * fly;
  if (cycle < 0.35) {
    drawShaft(g, cx, fy - u * 0.9, cx, fy - u * 0.16, Math.max(1.5, u * 0.06));
    drawPinHead(g, cx, fy, u * 0.16, 'c', 7);
  }
  // sağda sırada bekleyen numaralı iğneler
  const qx = w * 0.78;
  for (let k = 0; k < 4; k++) {
    const y = h * 0.2 + k * u * 0.6;
    g.globalAlpha = 1 - k * 0.18;
    drawShaft(g, qx - u * 0.9, y, qx - u * 0.2, y, Math.max(1.5, u * 0.06));
    drawPinHead(g, qx, y, u * 0.22, ['c', 'e', 'y', 'm'][k], 7 - k);
    g.globalAlpha = 1;
  }
  sparkle(g, w * 0.62, h * 0.18, 6, 0.5 + Math.sin(t / 250) * 0.4);
  sparkle(g, w * 0.1, h * 0.82, 5, 0.5 + Math.sin(t / 300 + 2) * 0.4);
}

// ---------- Jöle Solucan: taçlı solucan, şekerler ----------

function drawWorm(g, w, h, t) {
  panel(g, w, h, '#6F93B8', '#31679A');
  // arka plan petek noktaları
  g.fillStyle = 'rgba(255,255,255,0.12)';
  for (let y = 10; y < h; y += 18) {
    for (let x = (y / 18) % 2 ? 9 : 0; x < w; x += 18) {
      g.beginPath();
      g.arc(x, y, 1.6, 0, TAU);
      g.fill();
    }
  }
  // parlayan şekerler
  const colors = ['r', 'y', 'g', 'p', 'c', 'e', 'o', 'b'];
  for (let i = 0; i < 16; i++) {
    const x = ((i * 97 + 30) % 100) / 100 * w;
    const y = ((i * 57 + 20) % 90) / 100 * h + 8;
    const pal = PALETTE[colors[i % colors.length]];
    const r = 3.5 + (i % 3) * 1.5 + Math.sin(t / 300 + i) * 0.6;
    const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
    glow.addColorStop(0, rgba(pal.light, 0.9));
    glow.addColorStop(1, rgba(pal.base, 0));
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y, r * 2.6, 0, TAU);
    g.fill();
    g.fillStyle = pal.base;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // küçük rakip solucan ve taçlı büyük solucan
  paintWorm(g, { a: 'm', b: 'g' }, { x: w * 0.2, y: h * 0.3, len: 10, r: 7, t: t + 800, dir: Math.PI });
  paintWorm(g, { a: 'o', b: 'y' }, { x: w * 0.8, y: h * 0.6, len: 20, r: h * 0.085, t, crown: true });
  sparkle(g, w * 0.55, h * 0.15, 6, 0.5 + Math.sin(t / 250) * 0.4);
}

const ARTS = { main: drawMain, nakis: drawNakis, match: drawMatch, pins: drawPins, worm: drawWorm };

function paint(canvas, time) {
  const draw = ARTS[canvas.dataset.art];
  if (!draw) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  draw(g, w, h, time, dpr);
}

/** Ana sayfa çizimlerini başlatır (hafif animasyon). */
export function startHomeArt() {
  stopHomeArt();
  const canvases = [...document.querySelectorAll('canvas.game-art')];
  const loop = (now) => {
    for (const c of canvases) paint(c, now);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function stopHomeArt() {
  cancelAnimationFrame(raf);
  raf = 0;
}
