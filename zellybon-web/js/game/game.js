// Jöle Patlat kontrolcüsü: tahta + puan + çizim + giriş + jokerler.
// İki mod: 'quick' (süreli Hızlı Tur) ve 'level' (hamle sınırlı bölüm).

import { createRng } from './rng.js';
import {
  createBoard, trySwap, resolve, hasPossibleMove, shuffle, isAdjacent, blast, cellsOfColor,
} from './board.js';
import { createScoring } from './scoring.js';
import { Renderer, JELLY_COLORS } from './renderer.js';
import { attachInput } from './input.js';
import { goalsMet, starsFor, isCollectLevel, MOVE_BONUS } from './levels.js';
import {
  JOKERS, getJoker, HOURGLASS_SECONDS, HOURGLASS_MOVES, HOURGLASS_MAX_PER_QUICK_ROUND,
} from './jokers.js';

export class Game {
  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   hud: {
   *     primaryLabel: HTMLElement, primaryValue: HTMLElement, score: HTMLElement,
   *     heatBar: HTMLElement, heatFill: HTMLElement, goals: HTMLElement,
   *     jokerBar: HTMLElement, hint: HTMLElement,
   *   },
   *   mode: 'quick' | 'level',
   *   level?: object,
   *   seed: string,
   *   durationMs?: number,
   *   jokers: { inventory: () => Record<string, number>, consume: (type: string) => Promise<void> },
   *   onEnd: (result: object) => void,
   * }} opts
   */
  constructor({ canvas, hud, mode, level = null, seed, durationMs = 60000, jokers, onEnd }) {
    this.canvas = canvas;
    this.hud = hud;
    this.mode = mode;
    this.level = level;
    this.seed = seed;
    this.durationMs = durationMs;
    this.jokers = jokers;
    this.onEnd = onEnd;
    this.renderer = new Renderer(canvas);
    this._onResize = () => this.renderer.resize();
  }

  get isLevel() {
    return this.mode === 'level';
  }

  start() {
    this.rng = createRng(this.seed);
    this.board = createBoard(this.rng, { colors: this.level?.colors ?? 6 });
    this.scoring = createScoring({ heat: !this.isLevel });
    this.clock = 0;
    this.busy = false;
    this.ended = false;
    this.timeUp = false;
    this.selected = -1;
    this.targeting = null;
    this.hourglassUsed = 0;
    this.movesLeft = this.level?.moves ?? 0;
    this.collected = {};
    this._shownScore = 0;

    this.renderer.resize();
    this.renderer.setBoard(this.board);
    this.renderer.start((dt) => this._tick(dt));
    window.addEventListener('resize', this._onResize);
    this._detachInput = attachInput(this.canvas, this.renderer, {
      onSwipe: (a, b) => this._swap(a, b),
      onTap: (i) => this._tap(i),
    });

    this.hud.heatBar.hidden = this.isLevel;
    this.hud.goals.hidden = !this.isLevel;
    this.hud.primaryLabel.textContent = this.isLevel ? 'Hamle' : 'Süre';
    this._buildJokerBar();
    this._renderGoals();
    this._renderHud();
    this._showHint(this.isLevel ? this._goalText() : '');
  }

  destroy() {
    this.ended = true;
    this.renderer.stop();
    window.removeEventListener('resize', this._onResize);
    this._detachInput?.();
    clearTimeout(this._hintTimer);
  }

  // ---------- Kare döngüsü ve HUD ----------

  _tick(dt) {
    if (this.ended) return;
    this.clock += dt;
    this.scoring.update(this.clock);
    this.renderer.storm = this.scoring.isStorm(this.clock);
    if (!this.isLevel && this.clock >= this.durationMs && !this.timeUp) {
      this.timeUp = true;
      this._cancelTargeting();
      this._select(-1);
      if (!this.busy) this._finish();
    }
    this._renderHud();
  }

  _renderHud() {
    const { hud } = this;
    if (this.isLevel) {
      hud.primaryValue.textContent = String(this.movesLeft);
      hud.primaryValue.classList.toggle('hud-urgent', this.movesLeft <= 3 && this.movesLeft > 0);
    } else {
      const secs = Math.ceil(Math.max(0, this.durationMs - this.clock) / 1000);
      hud.primaryValue.textContent = String(secs);
      hud.primaryValue.classList.toggle('hud-urgent', secs <= 10 && secs > 0);
      hud.heatFill.style.transform = `scaleX(${this.scoring.heat.toFixed(3)})`;
      hud.heatBar.classList.toggle('storm', this.renderer.storm);
    }

    const target = this.scoring.score;
    if (this._shownScore < target) {
      this._shownScore = Math.min(target, this._shownScore + Math.max(1, Math.ceil((target - this._shownScore) * 0.2)));
    }
    hud.score.textContent = this._shownScore.toLocaleString('tr-TR');
  }

  _goalText() {
    return this.level.goals
      .map((g) => (g.type === 'score' ? `${g.value.toLocaleString('tr-TR')} puan yap` : `${g.count} jöle topla`))
      .join(' · ')
      .replace(/^/, 'Hedef: ');
  }

  _renderGoals() {
    if (!this.isLevel) return;
    const el = this.hud.goals;
    el.replaceChildren();
    for (const g of this.level.goals) {
      const chip = document.createElement('div');
      chip.className = 'goal-chip';
      if (g.type === 'score') {
        const done = this.scoring.score >= g.value;
        chip.classList.toggle('done', done);
        chip.textContent = `🎯 ${Math.min(this.scoring.score, g.value).toLocaleString('tr-TR')} / ${g.value.toLocaleString('tr-TR')}`;
      } else {
        const have = Math.min(this.collected[g.color] ?? 0, g.count);
        chip.classList.toggle('done', have >= g.count);
        const dot = document.createElement('span');
        dot.className = 'goal-dot';
        dot.style.background = JELLY_COLORS[g.color];
        chip.append(dot, `${have} / ${g.count}`);
      }
      el.appendChild(chip);
    }
  }

  _showHint(text, ms = 2500) {
    const el = this.hud.hint;
    clearTimeout(this._hintTimer);
    el.textContent = text;
    el.classList.toggle('visible', Boolean(text));
    if (text && ms) this._hintTimer = setTimeout(() => el.classList.remove('visible'), ms);
  }

  // ---------- Jokerler ----------

  _buildJokerBar() {
    const bar = this.hud.jokerBar;
    bar.replaceChildren();
    this._jokerButtons = {};
    for (const j of JOKERS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'joker-btn';
      btn.title = `${j.name}: ${j.desc}`;
      btn.setAttribute('aria-label', j.name);
      const icon = document.createElement('span');
      icon.className = 'joker-icon';
      icon.textContent = j.icon;
      const count = document.createElement('span');
      count.className = 'joker-count';
      btn.append(icon, count);
      btn.addEventListener('click', () => this.activateJoker(j.id));
      bar.appendChild(btn);
      this._jokerButtons[j.id] = { btn, count };
    }
    this._refreshJokerBar();
  }

  _refreshJokerBar() {
    const inv = this.jokers.inventory();
    for (const [id, { btn, count }] of Object.entries(this._jokerButtons ?? {})) {
      const n = inv[id] ?? 0;
      count.textContent = String(n);
      btn.classList.toggle('empty', n <= 0);
      btn.classList.toggle('active', this.targeting === id);
    }
  }

  _cancelTargeting() {
    if (!this.targeting) return;
    this.targeting = null;
    this._refreshJokerBar();
    this._showHint('');
  }

  async activateJoker(id) {
    if (this.ended || this.timeUp || this.busy) return;
    const joker = getJoker(id);
    if (this.targeting === id) {
      this._cancelTargeting();
      return;
    }
    if ((this.jokers.inventory()[id] ?? 0) <= 0) {
      this._showHint(`${joker.name} kalmadı. Hızlı Tur ve bölümlerde kazanabilirsin!`);
      return;
    }
    if (id === 'hourglass' && !this.isLevel && this.hourglassUsed >= HOURGLASS_MAX_PER_QUICK_ROUND) {
      this._showHint(`Bir turda en fazla ${HOURGLASS_MAX_PER_QUICK_ROUND} Kum Saati kullanılabilir.`);
      return;
    }
    this._select(-1);
    if (joker.targeted) {
      this.targeting = id;
      this._refreshJokerBar();
      this._showHint(joker.hint, 0);
      return;
    }
    await this._runJoker(id, -1);
  }

  async _runJoker(id, index) {
    this.targeting = null;
    this._showHint('');
    this.busy = true;
    try {
      try {
        await this.jokers.consume(id);
      } catch (err) {
        this._showHint(err.message);
        return;
      }
      this._refreshJokerBar();
      if (this.ended) return;

      if (id === 'hammer') {
        await this._playSteps(blast(this.board, this.rng, [index]));
      } else if (id === 'colorBomb') {
        const color = this.board.cells[index];
        await this._playSteps(blast(this.board, this.rng, cellsOfColor(this.board, color), index));
      } else if (id === 'shuffle') {
        shuffle(this.board, this.rng);
        await this.renderer.reshuffle(this.board);
      } else if (id === 'hourglass') {
        if (this.isLevel) {
          this.movesLeft += HOURGLASS_MOVES;
          this._showHint(`⏳ +${HOURGLASS_MOVES} hamle!`);
        } else {
          this.hourglassUsed++;
          this.durationMs += HOURGLASS_SECONDS * 1000;
          this._showHint(`⏳ +${HOURGLASS_SECONDS} saniye!`);
        }
      }
      await this._afterAction();
    } finally {
      this.busy = false;
      this._refreshJokerBar();
      this._checkEnd();
    }
  }

  // ---------- Hamleler ----------

  _select(i) {
    this.selected = i;
    this.renderer.setSelected(i);
  }

  _tap(i) {
    if (this.timeUp || this.busy || this.ended) return;
    if (this.targeting) {
      this._runJoker(this.targeting, i);
      return;
    }
    this.renderer.jiggle(i);
    if (this.selected === -1) {
      this._select(i);
    } else if (this.selected === i) {
      this._select(-1);
    } else if (isAdjacent(this.board, this.selected, i)) {
      const a = this.selected;
      this._select(-1);
      this._swap(a, i);
    } else {
      this._select(i);
    }
  }

  async _swap(a, b) {
    if (this.timeUp || this.busy || this.ended) return;
    if (this.targeting) {
      this._cancelTargeting();
      return;
    }
    if (!isAdjacent(this.board, a, b)) return;
    this._select(-1);
    this.busy = true;
    try {
      const ok = trySwap(this.board, a, b);
      await this.renderer.swap(a, b, ok);
      if (!ok) return;

      if (this.isLevel) this.movesLeft--;
      else this.scoring.registerMove(this.clock);
      const steps = resolve(this.board, this.rng);
      await this._playSteps(steps);
      this.scoring.endMove(steps.length);
      await this._afterAction();
    } finally {
      this.busy = false;
      this._checkEnd();
    }
  }

  async _playSteps(steps) {
    for (const step of steps) {
      const result = this.scoring.scoreStep(step, this.clock);
      for (const c of step.cleared) this.collected[c.color] = (this.collected[c.color] ?? 0) + 1;
      this._renderGoals();
      await this.renderer.playStep(step, result);
      if (this.ended) return;
    }
  }

  async _afterAction() {
    if (this.ended) return;
    this._renderGoals();
    if (!hasPossibleMove(this.board)) {
      shuffle(this.board, this.rng);
      await this.renderer.reshuffle(this.board);
    }
  }

  _checkEnd() {
    if (this.ended) return;
    if (!this.isLevel) {
      if (this.timeUp) this._finish();
      return;
    }
    const met = goalsMet(this.level, this.scoring.score, this.collected);
    if (met && isCollectLevel(this.level)) this._finish(true);
    else if (this.movesLeft <= 0) this._finish(met);
  }

  _finish(won = false) {
    if (this.ended) return;
    this.ended = true;
    this._cancelTargeting();
    this.renderer.storm = false;

    let bonus = 0;
    if (this.isLevel && won && this.movesLeft > 0) {
      bonus = this.movesLeft * MOVE_BONUS;
      this.scoring.addBonus(bonus);
    }
    this._shownScore = this.scoring.score;
    this._renderHud();
    this._detachInput?.();

    const summary = this.scoring.summary();
    const result = this.isLevel
      ? {
        mode: 'level',
        levelId: this.level.id,
        won,
        score: summary.score,
        bonus,
        movesLeft: this.movesLeft,
        stars: starsFor(this.level, summary.score, won),
      }
      : {
        mode: 'quick',
        score: summary.score,
        maxCombo: summary.maxCombo,
        jelliesPopped: summary.jelliesPopped,
        durationMs: Math.round(this.durationMs),
      };

    if (this.isLevel) this._showHint(won ? 'Bölüm tamamlandı!' : 'Hamlen bitti!', 0);
    setTimeout(() => {
      this.renderer.stop();
      window.removeEventListener('resize', this._onResize);
      this.onEnd(result);
    }, this.isLevel ? 1100 : 600);
  }
}
