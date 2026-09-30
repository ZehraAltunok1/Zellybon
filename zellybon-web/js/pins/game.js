// İğnedenlik kontrolcüsü: motor + çizim + dokunma + HUD.

import { createPinsEngine } from './engine.js';
import { PinsRenderer } from './renderer.js';
import { MOTION_NAMES } from './levels.js';

export class PinsGame {
  /**
   * @param {{ canvas: HTMLCanvasElement, hud: { title: HTMLElement, left: HTMLElement, hint: HTMLElement },
   *   level: object, onEnd: (r: { levelId: number, won: boolean, reason: string|null, durationMs: number }) => void }} opts
   */
  constructor({ canvas, hud, level, onEnd }) {
    this.canvas = canvas;
    this.hud = hud;
    this.level = level;
    this.onEnd = onEnd;
    this._onResize = () => this.renderer.resize();
    this._onPointer = (e) => {
      e.preventDefault();
      this._throw();
    };
    this._onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this._throw();
      }
    };
  }

  start() {
    this.engine = createPinsEngine(this.level);
    this.renderer = new PinsRenderer(this.canvas, this.engine);
    this.renderer.resize();
    this.ended = false;
    this.endTimer = 0;
    this.startedAt = performance.now();
    const l = this.level;
    this.hud.title.textContent = `Bölüm ${l.id} · ${l.name}`;
    this._hint(l.thread
      ? 'İpli bölüm! Yeni iğne parlayan sarı yaylardan birine saplanmalı, yoksa ip dolaşır.'
      : l.id === 1
        ? 'Ekrana dokun: iğne fırlar. İğnelere çarpmadan hepsini sapla!'
        : `${MOTION_NAMES[l.motion]} · ${l.throws} iğne`);
    this._updateHud();
    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onPointer);
    window.addEventListener('keydown', this._onKey);
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this._tick(dt, now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.hintTimer);
    clearTimeout(this.endTimer);
    window.removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onPointer);
    window.removeEventListener('keydown', this._onKey);
  }

  _throw() {
    if (this.engine.throwPin()) this._updateHud();
  }

  _tick(dt, now) {
    const events = this.engine.update(dt);
    this.renderer.handle(events);
    this.renderer.draw(dt, now);
    const s = this.engine.state;
    for (const ev of events) {
      if (ev.type === 'clash') this._hint('Çat! İğneler çarpıştı.');
      if (ev.type === 'tangle') this._hint('İp dolaştı! Yeni ip eski bir ipin üstünden geçti.');
      if (ev.type === 'won') this._hint('Harika! Hepsi saplandı!');
    }
    if (events.length) this._updateHud();
    if (s.status !== 'play' && !this.ended) {
      this.ended = true;
      this.endTimer = setTimeout(() => {
        this.destroy();
        this.onEnd({
          levelId: this.level.id,
          won: s.status === 'won',
          reason: s.reason,
          durationMs: Math.round(performance.now() - this.startedAt),
        });
      }, s.status === 'won' ? 900 : 1300);
    }
  }

  _updateHud() {
    const s = this.engine.state;
    this.hud.left.textContent = String(s.queue.length + (s.flying ? 1 : 0));
  }

  _hint(text) {
    const el = this.hud.hint;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => el.classList.remove('visible'), 2600);
  }
}
