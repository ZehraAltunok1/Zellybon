// Jöle Solucan kontrolcüsü: motor + çizim + dokunma/fare/klavye + HUD (süre, boy, sıra, liderlik).

import { createWormEngine, ROUND_S, POWERS } from './engine.js';
import { WormRenderer } from './renderer.js';

export class WormGame {
  /**
   * @param {{ canvas: HTMLCanvasElement,
   *   hud: { time: HTMLElement, length: HTMLElement, rank: HTMLElement, board: HTMLElement,
   *          boost: HTMLElement, powers: HTMLElement, hint: HTMLElement },
   *   skin: object, playerName: string, seed: string,
   *   onEnd: (r: { score: number, kills: number, rank: number, crowned: boolean, durationMs: number, reason: string }) => void }} opts
   */
  constructor({ canvas, hud, skin, playerName, seed, onEnd }) {
    this.canvas = canvas;
    this.hud = hud;
    this.onEnd = onEnd;
    this.opts = { skin, playerName, seed };
    this.angle = null;
    this.boost = false;
    this.keys = { left: false, right: false };
    this._onResize = () => this.renderer.resize();
    this._onMove = (e) => {
      if (e.pointerType !== 'mouse' && !this.touching) return;
      const rect = this.canvas.getBoundingClientRect();
      this.angle = this.renderer.angleFromScreen(e.clientX - rect.left, e.clientY - rect.top);
    };
    this._onDown = (e) => {
      e.preventDefault();
      this.touching = true;
      this._onMove(e);
      if (e.pointerType === 'mouse') this.boost = true;
    };
    this._onUp = (e) => {
      this.touching = false;
      if (e.pointerType === 'mouse') this.boost = false;
    };
    this._onBoostDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.boost = true;
      hud.boost.classList.add('active');
    };
    this._onBoostUp = () => {
      this.boost = false;
      hud.boost.classList.remove('active');
    };
    this._onKey = (e) => {
      const down = e.type === 'keydown';
      if (e.code === 'Space') {
        e.preventDefault();
        this.boost = down;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = down;
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = down;
    };
  }

  start() {
    this.engine = createWormEngine(this.opts);
    this.renderer = new WormRenderer(this.canvas, this.engine);
    this.renderer.resize();
    this.ended = false;
    this.hudTimer = 0;
    this._hint('Parmağını kaydırarak yön ver, ⚡ ile hızlan. Başını başka solucanlara çarpma!', 3500);
    window.addEventListener('resize', this._onResize);
    this.canvas.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    this.hud.boost.addEventListener('pointerdown', this._onBoostDown);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.hud.boost.addEventListener(ev, this._onBoostUp);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKey);
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
    this.canvas.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    this.hud.boost.removeEventListener('pointerdown', this._onBoostDown);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) this.hud.boost.removeEventListener(ev, this._onBoostUp);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKey);
    this.hud.boost.classList.remove('active');
  }

  _tick(dt, now) {
    const s = this.engine.state;
    if (this.keys.left || this.keys.right) {
      this.angle = s.player.dir + (this.keys.right ? 0.6 : -0.6);
    }
    this.engine.steer(this.angle, this.boost);
    const events = this.ended ? [] : this.engine.update(dt);
    this.renderer.handle(events);
    this.renderer.draw(dt, now);
    for (const ev of events) {
      if (ev.type === 'power' && ev.worm.isPlayer) this._hint(`${POWERS[ev.kind].icon} ${POWERS[ev.kind].name} aldın!`, 1600);
    }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.25;
      this._updateHud();
    }
    if (s.over && !this.ended) {
      this.ended = true;
      this._updateHud();
      this._hint(s.reason === 'time' ? '⏰ Süre doldu!' : '💥 Çarptın!', 1500);
      const result = { ...this.engine.result(), reason: s.reason };
      this.endTimer = setTimeout(() => {
        this.destroy();
        this.onEnd(result);
      }, 1400);
    }
  }

  _updateHud() {
    const s = this.engine.state;
    const left = Math.max(0, Math.ceil(ROUND_S - s.t));
    this.hud.time.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    this.hud.time.classList.toggle('hud-urgent', left <= 10);
    this.hud.length.textContent = String(Math.floor(s.player.mass));
    const ranking = this.engine.ranking();
    this.hud.rank.textContent = `${ranking.indexOf(s.player) + 1}/${ranking.length}`;
    const board = this.hud.board;
    board.replaceChildren();
    ranking.slice(0, 5).forEach((wm, i) => {
      const li = document.createElement('li');
      li.className = wm.isPlayer ? 'me' : '';
      li.textContent = `${i === 0 ? '👑' : `${i + 1}.`} ${wm.name} · ${Math.floor(wm.mass)}`;
      board.appendChild(li);
    });
    if (!ranking.slice(0, 5).includes(s.player)) {
      const li = document.createElement('li');
      li.className = 'me';
      li.textContent = `${ranking.indexOf(s.player) + 1}. ${s.player.name} · ${Math.floor(s.player.mass)}`;
      board.appendChild(li);
    }
    const active = Object.entries(s.player.effects).filter(([, t]) => t > 0);
    this.hud.powers.textContent = active.map(([k, t]) => `${POWERS[k].icon} ${Math.ceil(t)}`).join('  ');
  }

  _hint(text, ms = 2500) {
    const el = this.hud.hint;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => el.classList.remove('visible'), ms);
  }
}
