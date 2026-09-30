// İğnedenlik oyun mantığı (çizimden bağımsız, testlerde de kullanılır).
//
// İğnedenlik dönüyor; iğneler hep alttan fırlatılır ve alttaki noktaya saplanır. Açılar
// iğnedenliğe göredir (iğnedenlikle birlikte döner). Birimler: iğnedenlik yarıçapı 1.

const TAU = Math.PI * 2;

export const CUSHION_R = 1;      // iğnedenlik yarıçapı
export const PIN_R = 1.9;        // iğne başlarının merkezden uzaklığı
export const HEAD_R = 0.13;      // iğne başı yarıçapı
export const FLIGHT = 0.12;      // fırlatılan iğnenin uçuş süresi (sn)
export const LAND_ANGLE = Math.PI / 2; // ekranda alt nokta (y aşağı)
// İki iğne başı bu açıdan yakınsa çarpışır (baş çapından biraz hoşgörülü)
export const MIN_GAP = 2 * Math.asin(HEAD_R / PIN_R) * 0.92;

export const norm = (a) => ((a % TAU) + TAU) % TAU;
/** İki açı arasındaki en kısa fark (0..π) */
export const angleDist = (a, b) => {
  const d = norm(a - b);
  return d > Math.PI ? TAU - d : d;
};

/** Dönüş biçiminin t anındaki toplam dönüşü (hız çarpanlarının integrali), birim: "hız × sn". */
function motionIntegral(def, t) {
  if (def.type === 'wave') {
    // hız = 1 + amp·sin(freq·t)
    return t + (def.amp * (1 - Math.cos(def.freq * t))) / def.freq;
  }
  const cycle = def.steps.reduce((s, [d]) => s + d, 0);
  const perCycle = def.steps.reduce((s, [d, f]) => s + d * f, 0);
  const n = Math.floor(t / cycle);
  let rest = t - n * cycle;
  let sum = n * perCycle;
  for (const [d, f] of def.steps) {
    const part = Math.min(d, rest);
    sum += part * f;
    rest -= part;
    if (rest <= 0) break;
  }
  return sum;
}

/** Bölümün t anındaki dönüş açısı */
export function rotationAt(level, t) {
  return level.speed * motionIntegral(level.motionDef, t);
}

/** t anında fırlatılan iğnenin saplanacağı (iğnedenliğe göre) açı */
export function landingAngle(level, t) {
  return norm(LAND_ANGLE - rotationAt(level, t + FLIGHT));
}

/** Açı a, b'den saat yönünün tersine (artan açı) c'ye giden yayın içinde mi? */
function inArc(a, from, to) {
  return norm(a - from) < norm(to - from);
}

/**
 * İp kuralı: fırlatılan iğneler sırayla iple bağlanır. Yeni ip (son iğne → yeni iğne) eski iplerle
 * kesişmemeli; bu ancak diğer bütün ipli iğneler yeni ipin aynı tarafında kalırsa olur.
 */
export function threadOk(threadAngles, angle) {
  if (threadAngles.length < 2) return true;
  const last = threadAngles[threadAngles.length - 1];
  const others = threadAngles.slice(0, -1);
  const inside = others.filter((p) => inArc(p, last, angle)).length;
  return inside === 0 || inside === others.length;
}

/**
 * Yeni ipin güvenle gidebileceği yaylar: son iğnenin iki yanındaki boşluklar.
 * @returns {[number, number][]} [başlangıç, bitiş] açıları (artan yönde); ip yoksa boş dizi
 */
export function threadWindows(threadAngles) {
  if (threadAngles.length < 2) return [];
  const last = threadAngles[threadAngles.length - 1];
  const others = threadAngles.slice(0, -1).map((a) => norm(a - last)).sort((x, y) => x - y);
  const next = norm(last + others[0]);
  const prev = norm(last + others[others.length - 1]);
  return [[prev, last], [last, next]];
}

/** Bu açıya saplanan iğne ne olur? null = sorun yok, 'clash' = iğnelere çarpar, 'tangle' = ip dolaşır */
export function checkLanding(state, angle) {
  if (state.pins.some((p) => angleDist(p.a, angle) < MIN_GAP)) return 'clash';
  if (state.thread && !threadOk(state.threadAngles, angle)) return 'tangle';
  return null;
}

const HEAD_COLORS = ['r', 'y', 'b', 'g', 'o', 'p', 'c', 'i', 'e', 'm'];

export function createPinsEngine(level) {
  const state = {
    t: 0,
    rotation: 0,
    pins: level.start.map((a) => ({ a: norm(a), color: 'w', thrown: false })),
    queue: Array.from({ length: level.throws }, (_, k) => ({
      num: level.throws - k,
      color: HEAD_COLORS[k % HEAD_COLORS.length],
    })),
    flying: null, // { pin, launchedAt }
    thread: level.thread,
    threadAngles: [],
    status: 'play', // 'play' | 'won' | 'lost'
    reason: null,
    clashAngle: null,
  };

  return {
    level,
    state,

    /** Sıradaki iğneyi fırlatır. Uçuşta bir iğne varken fırlatılamaz. */
    throwPin() {
      if (state.status !== 'play' || state.flying || !state.queue.length) return false;
      state.flying = { pin: state.queue.shift(), launchedAt: state.t };
      return true;
    },

    /** Zamanı ilerletir; olay listesi döner ({type:'stick'|'clash'|'tangle'|'won'}) */
    update(dt) {
      const events = [];
      if (state.status === 'lost') return events;
      state.t += dt;
      state.rotation = rotationAt(level, state.t);
      const f = state.flying;
      if (f && state.status === 'play' && state.t - f.launchedAt >= FLIGHT) {
        state.flying = null;
        const angle = landingAngle(level, f.launchedAt);
        const problem = checkLanding(state, angle);
        if (problem) {
          state.status = 'lost';
          state.reason = problem;
          state.clashAngle = angle;
          state.pins.push({ a: angle, color: f.pin.color, thrown: true, num: f.pin.num, bad: true });
          events.push({ type: problem, angle });
          return events;
        }
        state.pins.push({ a: angle, color: f.pin.color, thrown: true, num: f.pin.num });
        if (state.thread) state.threadAngles.push(angle);
        events.push({ type: 'stick', angle, color: f.pin.color });
        if (!state.queue.length) {
          state.status = 'won';
          events.push({ type: 'won' });
        }
      }
      return events;
    },

    /** Uçan iğnenin ilerleme oranı (0..1) — çizim için */
    flightProgress() {
      return state.flying ? Math.min(1, (state.t - state.flying.launchedAt) / FLIGHT) : 0;
    },
  };
}

/**
 * Bölümü çözen bot: her iğne için önümüzdeki birkaç saniyede, fırlatma biraz erken/geç kalsa bile
 * güvenle saplanacağı anları bulur ve iğneyi en geniş boşluğa yerleştireni seçer (düşünen bir oyuncu
 * gibi). Bölümlerin insan için de çözülebilir olduğunu testlerde doğrular.
 * @returns {{ won: boolean, waited: number[] }}
 */
export function solvePins(level, { tolerance = 0.035, step = 1 / 240, maxWait = 7 } = {}) {
  const engine = createPinsEngine(level);
  const s = engine.state;
  const waited = [];
  const safe = (t) => {
    for (const dt of [-tolerance, 0, tolerance]) {
      if (t + dt < 0 || checkLanding(s, landingAngle(level, t + dt))) return false;
    }
    return true;
  };
  const score = (angle) => {
    const room = Math.min(Math.PI, ...s.pins.map((p) => angleDist(p.a, angle)));
    if (!s.thread || s.threadAngles.length < 1) return room;
    // İpli bölümde: yeni iğneden sonra ipin gidebileceği yaylar geniş kalsın
    const windows = threadWindows([...s.threadAngles, angle]);
    const free = windows.length ? Math.max(...windows.map(([a, b]) => norm(b - a))) : TAU;
    return room + free * 0.5;
  };
  while (s.status === 'play') {
    let best = null;
    for (let t = s.t; t < s.t + maxWait; t += step) {
      if (!safe(t)) continue;
      const value = score(landingAngle(level, t)) - (t - s.t) * 0.01; // eşit iyiyse erken olanı seç
      if (!best || value > best.value) best = { t, value };
    }
    if (!best) return { won: false, waited };
    waited.push(best.t - s.t);
    engine.update(best.t - s.t);
    engine.throwPin();
    engine.update(FLIGHT + 1e-6);
  }
  return { won: s.status === 'won', waited };
}
