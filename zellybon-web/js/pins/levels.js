// İğnedenlik bölümleri: dönen bir iğnedenliğe toplu iğneleri çarpıştırmadan sapla.
// Bölümler bir formülle üretilir: hız, önceden saplı iğneler, fırlatılacak iğne sayısı ve dönüş
// biçimi bölüm ilerledikçe zorlaşır. "İp" bölümlerinde fırlatılan iğneler sırayla iple bağlanır;
// yeni ip eski bir ipin üstünden geçerse ip dolaşır ve bölüm kaybedilir (ip sanatı).

import { createRng } from '../game/rng.js';

export const PIN_LEVEL_COUNT = 35;

const NAMES = [
  'İlk Dikiş', 'Domates', 'Düğme Kutusu', 'Makara', 'Yüksük', 'İlk İp', 'Kanaviçe', 'Fırfır',
  'Ters Dikiş', 'Örgü Şişi', 'Dantel', 'İpek Yol', 'Pıtırcık', 'Kurdele', 'Ponpon', 'Teyel',
  'Zikzak', 'Yama', 'Fermuar', 'Nakış Kasnağı', 'Keçe', 'Yün Yumağı', 'Tığ', 'Terzi Tebeşiri',
  'Gergef', 'Sim', 'Pullu Elbise', 'Kadife', 'Altın Yüksük', 'Usta Terzi',
  'Boncuklu Kese', 'Gelinlik', 'Sırma', 'İpek Halı', 'Terzi Ustası',
];

// İğnedenlik kumaşının rengi (bölümden bölüme değişir)
const CUSHION_COLORS = ['r', 'b', 'g', 'p', 'o', 'c', 'i', 'e', 'd', 'm'];

// Dönüş biçimleri: [süre (sn), hız çarpanı] adımları tekrar eder ya da dalga gibi hızlanıp yavaşlar
const MOTIONS = {
  steady: { type: 'steps', steps: [[1, 1]] },
  reverse: { type: 'steps', steps: [[2.4, 1], [1.4, -1]] },
  wave: { type: 'wave', amp: 0.75, freq: 1.6 },
  stopGo: { type: 'steps', steps: [[1.3, 1.5], [0.7, 0.12]] },
  flip: { type: 'steps', steps: [[1.0, 1.5], [0.6, -1.2]] },
};
const LATER_MOTIONS = ['steady', 'reverse', 'wave', 'stopGo', 'flip'];

export const MOTION_NAMES = {
  steady: 'Sabit dönüş', reverse: 'Geri döner', wave: 'Hızlanıp yavaşlar', stopGo: 'Durup kalkar', flip: 'Sağa sola döner',
};

function buildLevel(id) {
  const rng = createRng(`pins-${id}`);
  const thread = id >= 6 && (id % 3 === 0 || id === 35);
  const motion = id <= 3 ? 'steady' : id <= 5 ? 'reverse' : LATER_MOTIONS[id % LATER_MOTIONS.length];
  const pre = thread ? Math.min(6, 1 + Math.floor(id / 5)) : Math.min(id > 30 ? 8 : 7, 2 + Math.floor(id / 3));
  const throws = thread ? Math.min(id > 30 ? 11 : 10, 5 + Math.floor(id / 5)) : Math.min(13, 6 + Math.floor(id / 2.5));
  const start = [];
  const offset = rng.next() * Math.PI * 2;
  for (let k = 0; k < pre; k++) {
    const jitter = (rng.next() - 0.5) * (Math.PI / pre) * 0.6;
    start.push(offset + (k / pre) * Math.PI * 2 + jitter);
  }
  return {
    id,
    name: NAMES[id - 1],
    speed: (1.45 + id * 0.02) * (id % 2 === 0 ? -1 : 1), // rad/sn; işaret dönüş yönü
    motion,
    motionDef: MOTIONS[motion],
    start,
    throws,
    thread,
    cushion: CUSHION_COLORS[(id - 1) % CUSHION_COLORS.length],
  };
}

export const PIN_LEVELS = Array.from({ length: PIN_LEVEL_COUNT }, (_, i) => buildLevel(i + 1));

export function getPinLevel(id) {
  return PIN_LEVELS[Math.max(0, Math.min(PIN_LEVELS.length - 1, id - 1))];
}
