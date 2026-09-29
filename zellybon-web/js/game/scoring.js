// Puan, kombo ve Isı Barı. Zaman değerleri oyun saatinden (ms) gelir; DOM'a dokunmaz.

export const HEAT = {
  quickWindowMs: 1500, // bu süre içinde yapılan hamle "hızlı" sayılır
  quickGain: 0.22,     // hızlı hamle barı bu kadar doldurur
  slowGain: 0.08,      // yavaş hamle
  cascadeGain: 0.05,   // her zincirleme adımı
  decayPerSec: 0.08,   // bar zamanla boşalır
  stormMs: 5000,       // Şeker Fırtınası süresi
  stormMultiplier: 2,
};

export function groupPoints(length) {
  if (length >= 5) return 100;
  if (length === 4) return 60;
  return 30;
}

export function comboMultiplier(comboLevel) {
  return 1 + 0.5 * comboLevel;
}

export const BLAST_POINTS_PER_JELLY = 10;

/** @param {{ heat?: boolean }} [opts] heat=false: Isı Barı ve Şeker Fırtınası kapalı (bölüm modu) */
export function createScoring({ heat = true } = {}) {
  const s = {
    score: 0,
    maxCombo: 0,
    jelliesPopped: 0,
    heat: 0,
    storms: 0,
    stormUntil: -Infinity,
    lastMoveAt: -Infinity,
    lastUpdate: 0,
  };

  const isStorm = (now) => now < s.stormUntil;

  function addHeat(amount, now) {
    if (!heat || isStorm(now)) return;
    s.heat = Math.min(1, s.heat + amount);
    if (s.heat >= 1) {
      s.stormUntil = now + HEAT.stormMs;
      s.storms++;
    }
  }

  return {
    get score() { return s.score; },
    get maxCombo() { return s.maxCombo; },
    get jelliesPopped() { return s.jelliesPopped; },
    get heat() { return s.heat; },
    get storms() { return s.storms; },
    isStorm,

    /** Her karede çağrılır: bar boşalması ve fırtına süresi. */
    update(now) {
      const dt = Math.max(0, now - s.lastUpdate) / 1000;
      s.lastUpdate = now;
      if (isStorm(now)) {
        s.heat = (s.stormUntil - now) / HEAT.stormMs;
      } else if (s.stormUntil > -Infinity && now - s.stormUntil < 50) {
        s.heat = 0;
      } else {
        s.heat = Math.max(0, s.heat - HEAT.decayPerSec * dt);
      }
    },

    /** Geçerli bir hamle yapıldığında (eşleşme oluştuğunda) çağrılır. */
    registerMove(now) {
      const quick = now - s.lastMoveAt <= HEAT.quickWindowMs;
      s.lastMoveAt = now;
      addHeat(quick ? HEAT.quickGain : HEAT.slowGain, now);
      return quick;
    },

    /** Bir çözüm adımını puanlar; grup başına puanları da döndürür (yüzen yazılar için). */
    scoreStep(step, now) {
      const mult = comboMultiplier(step.comboLevel) * (isStorm(now) ? HEAT.stormMultiplier : 1);
      const perGroup = step.groups.map((g) => Math.round(groupPoints(g.cells.length) * mult));
      const total = step.blast
        ? Math.round(step.cleared.length * BLAST_POINTS_PER_JELLY * mult)
        : perGroup.reduce((a, b) => a + b, 0);
      s.score += total;
      s.jelliesPopped += step.cleared.length;
      if (step.comboLevel > 0) addHeat(HEAT.cascadeGain, now);
      return { total, perGroup, storm: isStorm(now) };
    },

    /** Bölüm sonu bonusu gibi doğrudan eklenen puan. */
    addBonus(points) {
      s.score += points;
    },

    /** Bir hamlenin tüm zinciri bitince: kombo = zincirdeki adım sayısı. */
    endMove(stepCount) {
      s.maxCombo = Math.max(s.maxCombo, stepCount);
    },

    summary() {
      return { score: s.score, maxCombo: s.maxCombo, jelliesPopped: s.jelliesPopped, storms: s.storms };
    },
  };
}
