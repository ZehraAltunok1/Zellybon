// Jöle Atış (ana oyun) kontrolcüsü: motor + çizim + dokunma + HUD.

import { createEngine } from './engine.js';
import { ShooterRenderer } from './renderer.js';

export class ShooterGame {
  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   hud: { title: HTMLElement, progressFill: HTMLElement, progressText: HTMLElement,
   *          belt: HTMLElement, hint: HTMLElement },
   *   level: object,
   *   onEnd: (result: { levelId: number, won: boolean, reason: string|null, durationMs: number }) => void,
   * }} opts
   */
  constructor({ canvas, hud, level, onEnd }) {
    this.canvas = canvas;
    this.hud = hud;
    this.level = level;
    this.onEnd = onEnd;
    this._onResize = () => this.renderer.resize();
    this._onPointer = (e) => this._pointer(e);
  }

  start() {
    this.engine = createEngine(this.level);
    this.renderer = new ShooterRenderer(this.canvas, this.engine);
    this.renderer.resize();
    this.ended = false;
    this.clock = 0;

    this.hud.title.textContent = `Bölüm ${this.level.id} · ${this.level.name}`;
    this._hint('Bir jöleye dokun: yola çıkar ve kendi rengindeki küpleri vurur!', 3500);
    this.canvas.addEventListener('pointerdown', this._onPointer);
    window.addEventListener('resize', this._onResize);

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(100, now - last);
      last = now;
      this._frame(dt);
      if (!this._stopped) this._raf = requestAnimationFrame(loop);
    };
    this._stopped = false;
    this._raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.ended = true;
    this._stopped = true;
    cancelAnimationFrame(this._raf);
    clearTimeout(this._endTimer);
    clearTimeout(this._hintTimer);
    this.canvas.removeEventListener('pointerdown', this._onPointer);
    window.removeEventListener('resize', this._onResize);
  }

  _frame(dt) {
    if (!this.ended) {
      this.clock += dt;
      const events = this.engine.step(dt);
      this.renderer.handle(events);
      for (const ev of events) {
        if (ev.type === 'toSlot' && this.engine.state.slots.every(Boolean)) {
          this._hint('Dikkat: bekleme kutuları doldu!', 2200);
        }
      }
      const { status } = this.engine.state;
      if (status !== 'playing') this._finish(status === 'won');
    }
    this.renderer.update(dt);
    this.renderer.draw();
    this._renderHud();
  }

  _renderHud() {
    const { state } = this.engine;
    const done = 1 - state.cubesLeft / state.totalCubes;
    this.hud.progressFill.style.transform = `scaleX(${done.toFixed(3)})`;
    this.hud.progressText.textContent = `%${Math.round(done * 100)}`;
    this.hud.belt.textContent = `${this.engine.beltCount()}/${state.level.belt}`;
  }

  _hint(text, ms = 2500) {
    const el = this.hud.hint;
    clearTimeout(this._hintTimer);
    el.textContent = text;
    el.classList.toggle('visible', Boolean(text));
    if (text && ms) this._hintTimer = setTimeout(() => el.classList.remove('visible'), ms);
  }

  _pointer(e) {
    if (this.ended) return;
    const target = this.renderer.hitTest(e.clientX, e.clientY);
    if (!target) return;
    e.preventDefault();
    if (!this.engine.canLaunch()) {
      this._hint('Yol dolu, biraz bekle!', 1500);
      return;
    }
    if (target.type === 'column') this.engine.launchFromColumn(target.index);
    else this.engine.launchFromSlot(target.index);
  }

  _finish(won) {
    if (this.ended) return;
    this.ended = true;
    const reason = this.engine.state.loseReason;
    if (won) this._hint(`${this.level.name} tamamlandı!`, 0);
    else if (reason === 'stuck') this._hint('Hiçbir jöle küp vuramıyor!', 0);
    else this._hint('Bekleme kutuları taştı!', 0);
    this._endTimer = setTimeout(() => {
      this.destroy();
      this.onEnd({ levelId: this.level.id, won, reason, durationMs: Math.round(this.clock) });
    }, won ? 1800 : 1400);
  }
}
