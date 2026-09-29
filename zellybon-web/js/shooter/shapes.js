// Jöle şekerlerin vektörel çizimi. Her şekil bir kez ekran dışı canvas'a çizilir, oyunda kopyalanır.
// Katmanlar: yumuşak gölge → koyu kontur → derinlik gradyanı → iç kenar gölgesi → alttan yansıyan
// ışık → parlak vurgu → süsler (yaprak, çekirdek) → yüz.

import { PALETTE, rgba } from '../palette.js';

const TAU = Math.PI * 2;

function circle(g, s, cx, cy, r) {
  g.moveTo((cx + r) * s, cy * s);
  g.arc(cx * s, cy * s, r * s, 0, TAU);
}

function ellipse(g, s, cx, cy, rx, ry, rot = 0) {
  g.moveTo(cx * s + Math.cos(rot) * rx * s, cy * s + Math.sin(rot) * rx * s);
  g.ellipse(cx * s, cy * s, rx * s, ry * s, rot, 0, TAU);
}

// Köşeleri yumuşatılmış yıldız: kenar ortalarından geçip köşeleri kontrol noktası yapar
function softStar(g, s, cx, cy, outer, inner, points = 5) {
  const pts = [];
  for (let k = 0; k < points * 2; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / points;
    const r = k % 2 === 0 ? outer : inner;
    pts.push([(cx + Math.cos(a) * r) * s, (cy + Math.sin(a) * r) * s]);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[pts.length - 1], pts[0]);
  g.moveTo(start[0], start[1]);
  for (let k = 0; k < pts.length; k++) {
    const m = mid(pts[k], pts[(k + 1) % pts.length]);
    g.quadraticCurveTo(pts[k][0], pts[k][1], m[0], m[1]);
  }
  g.closePath();
}

export const SHAPES = {
  bear: {
    name: 'Ayıcık',
    path(g, s) {
      circle(g, s, 0.5, 0.33, 0.22);
      circle(g, s, 0.3, 0.15, 0.085);
      circle(g, s, 0.7, 0.15, 0.085);
      ellipse(g, s, 0.5, 0.68, 0.25, 0.25);
      ellipse(g, s, 0.25, 0.6, 0.08, 0.13, -0.5);
      ellipse(g, s, 0.75, 0.6, 0.08, 0.13, 0.5);
      ellipse(g, s, 0.35, 0.9, 0.11, 0.075);
      ellipse(g, s, 0.65, 0.9, 0.11, 0.075);
    },
    highlight: { x: 0.4, y: 0.2, rx: 0.1, ry: 0.05, rot: -0.5 },
    face: { x: 0.5, y: 0.35, k: 0.85 },
  },
  heart: {
    name: 'Kalp',
    path(g, s) {
      g.moveTo(0.5 * s, 0.9 * s);
      g.bezierCurveTo(0.1 * s, 0.64 * s, 0.02 * s, 0.4 * s, 0.17 * s, 0.22 * s);
      g.bezierCurveTo(0.31 * s, 0.07 * s, 0.47 * s, 0.13 * s, 0.5 * s, 0.28 * s);
      g.bezierCurveTo(0.53 * s, 0.13 * s, 0.69 * s, 0.07 * s, 0.83 * s, 0.22 * s);
      g.bezierCurveTo(0.98 * s, 0.4 * s, 0.9 * s, 0.64 * s, 0.5 * s, 0.9 * s);
      g.closePath();
    },
    highlight: { x: 0.3, y: 0.27, rx: 0.1, ry: 0.055, rot: -0.7 },
    face: { x: 0.5, y: 0.5, k: 1 },
  },
  cola: {
    name: 'Kola şişesi',
    path(g, s) {
      const P = (x, y) => [x * s, y * s];
      g.moveTo(...P(0.38, 0.11));
      g.quadraticCurveTo(...P(0.38, 0.05), ...P(0.44, 0.05));
      g.lineTo(...P(0.56, 0.05));
      g.quadraticCurveTo(...P(0.62, 0.05), ...P(0.62, 0.11));
      g.lineTo(...P(0.62, 0.2));
      g.bezierCurveTo(...P(0.62, 0.3), ...P(0.75, 0.33), ...P(0.75, 0.45));
      g.bezierCurveTo(...P(0.75, 0.55), ...P(0.68, 0.58), ...P(0.68, 0.64));
      g.bezierCurveTo(...P(0.68, 0.7), ...P(0.77, 0.74), ...P(0.77, 0.84));
      g.quadraticCurveTo(...P(0.77, 0.95), ...P(0.65, 0.95));
      g.lineTo(...P(0.35, 0.95));
      g.quadraticCurveTo(...P(0.23, 0.95), ...P(0.23, 0.84));
      g.bezierCurveTo(...P(0.23, 0.74), ...P(0.32, 0.7), ...P(0.32, 0.64));
      g.bezierCurveTo(...P(0.32, 0.58), ...P(0.25, 0.55), ...P(0.25, 0.45));
      g.bezierCurveTo(...P(0.25, 0.33), ...P(0.38, 0.3), ...P(0.38, 0.2));
      g.closePath();
    },
    // Kola şişesi jelibonları iki tonludur: üst kısım daha açık
    tint(g, s, pal) {
      g.fillStyle = rgba(pal.light, 0.5);
      g.fillRect(0, 0, s, 0.47 * s);
    },
    highlight: { x: 0.43, y: 0.3, rx: 0.045, ry: 0.13, rot: 0.15 },
    face: { x: 0.5, y: 0.8, k: 0.7 },
  },
  star: {
    name: 'Yıldız',
    path(g, s) {
      softStar(g, s, 0.5, 0.54, 0.46, 0.24);
    },
    highlight: { x: 0.36, y: 0.4, rx: 0.08, ry: 0.045, rot: -0.6 },
    face: { x: 0.5, y: 0.58, k: 0.8 },
  },
  ring: {
    name: 'Halka',
    fillRule: 'evenodd',
    path(g, s) {
      circle(g, s, 0.5, 0.52, 0.42);
      circle(g, s, 0.5, 0.52, 0.15);
    },
    highlight: { x: 0.3, y: 0.3, rx: 0.12, ry: 0.05, rot: -0.8 },
    // Halka üzerine şeker tozu
    decorate(g, s) {
      const dots = [[0.24, 0.52], [0.3, 0.72], [0.5, 0.84], [0.7, 0.74], [0.77, 0.5], [0.66, 0.24], [0.4, 0.2]];
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (const [x, y] of dots) {
        g.beginPath();
        g.ellipse(x * s, y * s, 0.018 * s, 0.03 * s, x * 3, 0, TAU);
        g.fill();
      }
    },
    face: null,
  },
  strawberry: {
    name: 'Çilek',
    path(g, s) {
      g.moveTo(0.5 * s, 0.95 * s);
      g.bezierCurveTo(0.2 * s, 0.86 * s, 0.1 * s, 0.56 * s, 0.19 * s, 0.39 * s);
      g.bezierCurveTo(0.27 * s, 0.25 * s, 0.42 * s, 0.26 * s, 0.5 * s, 0.31 * s);
      g.bezierCurveTo(0.58 * s, 0.26 * s, 0.73 * s, 0.25 * s, 0.81 * s, 0.39 * s);
      g.bezierCurveTo(0.9 * s, 0.56 * s, 0.8 * s, 0.86 * s, 0.5 * s, 0.95 * s);
      g.closePath();
    },
    highlight: { x: 0.3, y: 0.43, rx: 0.07, ry: 0.04, rot: -0.9 },
    decorate(g, s) {
      // çekirdekler
      const seeds = [[0.3, 0.55], [0.45, 0.46], [0.62, 0.5], [0.72, 0.62], [0.38, 0.72], [0.56, 0.8], [0.27, 0.66], [0.66, 0.77]];
      g.fillStyle = 'rgba(255, 241, 166, 0.85)';
      for (const [x, y] of seeds) {
        g.beginPath();
        g.ellipse(x * s, y * s, 0.014 * s, 0.024 * s, 0, 0, TAU);
        g.fill();
      }
      // yapraklar
      const leaf = PALETTE.g;
      g.save();
      g.translate(0.5 * s, 0.28 * s);
      for (let k = 0; k < 5; k++) {
        g.rotate(TAU / 5);
        g.beginPath();
        g.ellipse(0, -0.07 * s, 0.045 * s, 0.1 * s, 0, 0, TAU);
        g.fillStyle = leaf.base;
        g.fill();
        g.lineWidth = 0.015 * s;
        g.strokeStyle = leaf.dark;
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, 0.04 * s, 0, TAU);
      g.fillStyle = leaf.dark;
      g.fill();
      g.restore();
    },
    face: { x: 0.5, y: 0.62, k: 0.8 },
  },
};

export const SHAPE_ORDER = ['bear', 'heart', 'cola', 'star', 'ring', 'strawberry'];

function drawFace(g, s, { x, y, k }) {
  const ink = PALETTE.k.dark;
  const ex = 0.085 * k;
  for (const dx of [-ex, ex]) {
    g.beginPath();
    g.ellipse((x + dx) * s, (y - 0.01) * s, 0.04 * k * s, 0.05 * k * s, 0, 0, TAU);
    g.fillStyle = '#FFFFFF';
    g.fill();
    g.beginPath();
    g.arc((x + dx + 0.008 * k) * s, (y - 0.002) * s, 0.027 * k * s, 0, TAU);
    g.fillStyle = ink;
    g.fill();
    g.beginPath();
    g.arc((x + dx + 0.017 * k) * s, (y - 0.018 * k) * s, 0.01 * k * s, 0, TAU);
    g.fillStyle = '#FFFFFF';
    g.fill();
  }
  // yanaklar
  g.fillStyle = 'rgba(255, 110, 150, 0.35)';
  for (const dx of [-0.15 * k, 0.15 * k]) {
    g.beginPath();
    g.ellipse((x + dx) * s, (y + 0.045 * k) * s, 0.035 * k * s, 0.02 * k * s, 0, 0, TAU);
    g.fill();
  }
  // gülümseme
  g.beginPath();
  g.arc(x * s, (y + 0.03 * k) * s, 0.04 * k * s, 0.15 * Math.PI, 0.85 * Math.PI);
  g.lineWidth = Math.max(1, 0.018 * k * s);
  g.lineCap = 'round';
  g.strokeStyle = ink;
  g.stroke();
}

/** Bir jöle şekeri çizer ve canvas olarak döndürür (size: piksel). */
export function renderGummy({ shape, color, size, face = true }) {
  const def = SHAPES[shape] ?? SHAPES.heart;
  const pal = PALETTE[color];
  const c = document.createElement('canvas');
  const s = Math.max(8, Math.ceil(size));
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  const rule = def.fillRule ?? 'nonzero';
  const path = () => {
    g.beginPath();
    def.path(g, s);
  };

  // Şekli biraz küçültüp ortala: kontur ve gölge için yer kalsın
  g.translate(s * 0.05, s * 0.03);
  g.scale(0.9, 0.9);

  // 1) Yumuşak gölge
  g.save();
  g.translate(0, s * 0.045);
  path();
  g.fillStyle = 'rgba(20, 8, 40, 0.3)';
  g.fill(rule);
  g.restore();

  // 2) Kontur (dolgunun altında kalan yarısı gizlenir → temiz dış çizgi)
  path();
  g.lineJoin = 'round';
  g.lineWidth = s * 0.075;
  g.strokeStyle = pal.dark;
  g.stroke();

  // 3) Gövde: ışık sol üstten gelir
  path();
  const body = g.createRadialGradient(s * 0.36, s * 0.3, s * 0.03, s * 0.52, s * 0.58, s * 0.62);
  body.addColorStop(0, pal.light);
  body.addColorStop(0.42, pal.base);
  body.addColorStop(1, pal.dark);
  g.fillStyle = body;
  g.fill(rule);

  g.save();
  path();
  g.clip(rule);
  def.tint?.(g, s, pal);

  // 4) İç kenar gölgesi: jöleye kalınlık hissi verir
  path();
  g.lineWidth = s * 0.11;
  g.strokeStyle = rgba(pal.dark, 0.32);
  g.stroke();

  // 5) Alttan yansıyan ışık (yarı saydamlık)
  const bounce = g.createRadialGradient(s * 0.62, s * 0.86, 0, s * 0.62, s * 0.86, s * 0.34);
  bounce.addColorStop(0, rgba(pal.light, 0.6));
  bounce.addColorStop(1, rgba(pal.light, 0));
  g.fillStyle = bounce;
  g.fillRect(0, 0, s, s);

  // 6) Parlak vurgu + küçük ışık noktası
  const h = def.highlight;
  const hl = g.createRadialGradient(h.x * s, h.y * s, 0, h.x * s, h.y * s, Math.max(h.rx, h.ry) * s);
  hl.addColorStop(0, 'rgba(255,255,255,0.9)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl;
  g.beginPath();
  g.ellipse(h.x * s, h.y * s, h.rx * s, h.ry * s, h.rot, 0, TAU);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.arc((h.x + h.rx * 1.3) * s, (h.y - h.ry * 0.2) * s, 0.018 * s, 0, TAU);
  g.fill();
  g.restore();

  // 7) Süsler ve yüz
  def.decorate?.(g, s, pal);
  if (face && def.face) drawFace(g, s, def.face);
  return c;
}

/** Resimdeki şeker küp. */
export function renderCube(color, size) {
  const pal = PALETTE[color];
  const s = Math.max(4, Math.ceil(size));
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d');
  const inset = s * 0.05;
  const w = s - inset * 2;
  const r = w * 0.24;
  const rr = () => {
    g.beginPath();
    g.moveTo(inset + r, inset);
    g.arcTo(inset + w, inset, inset + w, inset + w, r);
    g.arcTo(inset + w, inset + w, inset, inset + w, r);
    g.arcTo(inset, inset + w, inset, inset, r);
    g.arcTo(inset, inset, inset + w, inset, r);
    g.closePath();
  };
  rr();
  const grad = g.createLinearGradient(0, inset, 0, inset + w);
  grad.addColorStop(0, pal.light);
  grad.addColorStop(0.35, pal.base);
  grad.addColorStop(1, pal.dark);
  g.fillStyle = grad;
  g.fill();
  g.save();
  rr();
  g.clip();
  rr();
  g.lineWidth = s * 0.14;
  g.strokeStyle = rgba(pal.dark, 0.35);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath();
  g.ellipse(s * 0.38, s * 0.26, s * 0.2, s * 0.08, -0.2, 0, TAU);
  g.fill();
  g.restore();
  g.lineWidth = Math.max(1, s * 0.04);
  g.strokeStyle = pal.dark;
  rr();
  g.stroke();
  return c;
}

// ---------- Karakter rozetleri ----------

export const ABILITIES = {
  bounce: { name: 'Zıplayan', desc: 'Her şeritte 2 küp vurur.', color: PALETTE.b },
  fast: { name: 'Roket', desc: 'Yolda iki kat hızlı gider.', color: PALETTE.o },
  pierce: { name: 'Delici', desc: 'Şeritteki art arda gelen aynı renk küplerin hepsini deler.', color: PALETTE.r },
  bomb: { name: 'Bomba', desc: 'Vurduğu küpün çevresindeki aynı renk küpleri de patlatır.', color: PALETTE.k },
};

/** Jölenin sağ üstündeki yetenek rozeti (r: yarıçap, piksel). */
export function drawAbilityBadge(g, ability, x, y, r) {
  const info = ABILITIES[ability];
  if (!info) return;
  g.save();
  g.translate(x, y);
  const grad = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, info.color.light);
  grad.addColorStop(1, info.color.dark);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(1.5, r * 0.18);
  g.strokeStyle = '#FFFFFF';
  g.stroke();

  g.fillStyle = '#FFFFFF';
  g.strokeStyle = '#FFFFFF';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const u = r * 0.55;
  g.beginPath();
  if (ability === 'bounce') {
    // iki yukarı ok başı
    g.lineWidth = r * 0.22;
    g.moveTo(-u * 0.7, -u * 0.05);
    g.lineTo(0, -u * 0.7);
    g.lineTo(u * 0.7, -u * 0.05);
    g.moveTo(-u * 0.7, u * 0.65);
    g.lineTo(0, 0);
    g.lineTo(u * 0.7, u * 0.65);
    g.stroke();
  } else if (ability === 'fast') {
    // şimşek
    g.moveTo(u * 0.25, -u);
    g.lineTo(-u * 0.55, u * 0.1);
    g.lineTo(-u * 0.02, u * 0.1);
    g.lineTo(-u * 0.25, u);
    g.lineTo(u * 0.55, -u * 0.15);
    g.lineTo(u * 0.02, -u * 0.15);
    g.closePath();
    g.fill();
  } else if (ability === 'pierce') {
    // yukarı ok
    g.lineWidth = r * 0.22;
    g.moveTo(0, u);
    g.lineTo(0, -u * 0.6);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -u * 1.05);
    g.lineTo(-u * 0.55, -u * 0.25);
    g.lineTo(u * 0.55, -u * 0.25);
    g.closePath();
    g.fill();
  } else if (ability === 'bomb') {
    g.arc(-u * 0.1, u * 0.15, u * 0.62, 0, TAU);
    g.fill();
    g.beginPath();
    g.lineWidth = r * 0.14;
    g.moveTo(u * 0.3, -u * 0.3);
    g.quadraticCurveTo(u * 0.55, -u * 0.8, u * 0.85, -u * 0.7);
    g.stroke();
    g.fillStyle = PALETTE.y.base;
    g.beginPath();
    g.arc(u * 0.88, -u * 0.72, r * 0.16, 0, TAU);
    g.fill();
  }
  g.restore();
}
