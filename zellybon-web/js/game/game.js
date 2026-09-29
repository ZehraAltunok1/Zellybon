// Hızlı Tur kontrolcüsü: tahta + puan + çizim + giriş + süre.

import { createRng } from './rng.js';
import { createBoard, trySwap, resolve, hasPossibleMove, shuffle, isAdjacent } from './board.js';
import { createScoring } from './scoring.js';
import { Renderer } from './renderer.js';
import { attachInput } from './input.js';

export class Game {
  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   hud: { time: HTMLElement, score: HTMLElement, heatFill: HTMLElement, heatBar: HTMLElement },
   *   seed: string,
   *   durationMs?: number,
   *   onEnd: (result: { score: number, maxCombo: number, jelliesPopped: number, durationMs: number }) => void,
   * }} opts
   */
  constructor({ canvas, hud, seed, durationMs = 60000, onEnd }) {
    this.canvas = canvas;
    this.hud = hud;
    this.seed = seed;
    this.durationMs = durationMs;
    this.onEnd = onEnd;
    this.renderer = new Renderer(canvas);
    this._onResize = () => this.renderer.resize();
  }

  start() {
    this.rng = createRng(this.seed);
    this.board = createBoard(this.rng);
    this.scoring = createScoring();
    this.clock = 0;
    this.busy = false;
    this.ended = false;
    this.timeUp = false;
    this.selected = -1;
    this._shownScore = 0;

    this.renderer.resize();
    this.renderer.setBoard(this.board);
    this.renderer.start((dt) => this._tick(dt));
    window.addEventListener('resize', this._onResize);
    this._detachInput = attachInput(this.canvas, this.renderer, {
      onSwipe: (a, b) => this._swap(a, b),
      onTap: (i) => this._tap(i),
    });
    this._renderHud();
  }

  destroy() {
    this.ended = true;
    this.renderer.stop();
    window.removeEventListener('resize', this._onResize);
    this._detachInput?.();
  }

  _tick(dt) {
    if (this.ended) return;
    this.clock += dt;
    this.scoring.update(this.clock);
    this.renderer.storm = this.scoring.isStorm(this.clock);
    if (this.clock >= this.durationMs && !this.timeUp) {
      this.timeUp = true;
      this._select(-1);
      if (!this.busy) this._finish();
    }
    this._renderHud();
  }

  _renderHud() {
    const { hud } = this;
    const remaining = Math.max(0, this.durationMs - this.clock);
    const secs = Math.ceil(remaining / 1000);
    hud.time.textContent = String(secs);
    hud.time.classList.toggle('hud-urgent', secs <= 10 && secs > 0);

    // Skor sayacı hedefe doğru hızla sayar
    const target = this.scoring.score;
    if (this._shownScore < target) {
      this._shownScore = Math.min(target, this._shownScore + Math.max(1, Math.ceil((target - this._shownScore) * 0.2)));
    }
    hud.score.textContent = this._shownScore.toLocaleString('tr-TR');

    hud.heatFill.style.transform = `scaleX(${this.scoring.heat.toFixed(3)})`;
    hud.heatBar.classList.toggle('storm', this.renderer.storm);
  }

  _select(i) {
    this.selected = i;
    this.renderer.setSelected(i);
  }

  _tap(i) {
    if (this.timeUp || this.busy) return;
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
    if (!isAdjacent(this.board, a, b)) return;
    this._select(-1);
    this.busy = true;
    try {
      const ok = trySwap(this.board, a, b);
      await this.renderer.swap(a, b, ok);
      if (!ok) return;

      this.scoring.registerMove(this.clock);
      const steps = resolve(this.board, this.rng);
      for (const step of steps) {
        const result = this.scoring.scoreStep(step, this.clock);
        await this.renderer.playStep(step, result);
        if (this.ended) return;
      }
      this.scoring.endMove(steps.length);

      if (!hasPossibleMove(this.board)) {
        shuffle(this.board, this.rng);
        await this.renderer.reshuffle(this.board);
      }
    } finally {
      this.busy = false;
      if (this.timeUp && !this.ended) this._finish();
    }
  }

  _finish() {
    if (this.ended) return;
    this.ended = true;
    this.renderer.storm = false;
    this._shownScore = this.scoring.score;
    this._renderHud();
    this._detachInput?.();
    const { score, maxCombo, jelliesPopped } = this.scoring.summary();
    // Kısa bir bekleme: son patlama ekranda görünsün
    setTimeout(() => {
      this.renderer.stop();
      window.removeEventListener('resize', this._onResize);
      this.onEnd({ score, maxCombo, jelliesPopped, durationMs: this.durationMs });
    }, 600);
  }
}
