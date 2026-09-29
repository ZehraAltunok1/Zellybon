// Yol tabanlı oyunların kontrolcüsü: motor + çizim + dokunma + HUD.
// Jöle Atış varsayılandır; Nakış kendi motorunu, çizimini ve metinlerini verir.

import { createEngine } from './engine.js';
import { ShooterRenderer } from './renderer.js';
import { PALETTE } from '../palette.js';

const SHOOTER_TEXTS = {
  firstHint: 'Bir jöleye dokun: yola çıkar ve kendi rengindeki küpleri vurur!',
  levelHint: (level) => `Bölüm ${level.id}: tüm küpleri temizle!`,
  stuck: 'Hiçbir jöle küp vuramıyor!',
  slots: 'Bekleme kutuları taştı!',
};

export class ShooterGame {
  /**
   * @param {{
   *   canvas: HTMLCanvasElement,
   *   hud: { title: HTMLElement, progressFill: HTMLElement, progressText: HTMLElement,
   *          belt: HTMLElement, hint: HTMLElement },
   *   level: object,
   *   boosters?: object,
   *   engineFactory?: (level: object, opts: object) => object,
   *   RendererClass?: typeof ShooterRenderer,
   *   texts?: Partial<typeof SHOOTER_TEXTS>,
   *   jokers?: {
   *     list: { id: string, name: string, icon: string, targeted: boolean, desc: string, hint?: string }[],
   *     inventory: () => Record<string, number>,
   *     consume: (id: string) => Promise<void>,
   *     apply: (id: string, engine: object, target?: object) => { events: object[], message: string, relayout?: boolean },
   *   } | null,
   *   onEnd: (result: { levelId: number, won: boolean, reason: string|null, durationMs: number }) => void,
   * }} opts
   */
  constructor({
    canvas, hud, level, boosters = {}, engineFactory = createEngine, RendererClass = ShooterRenderer,
    texts = {}, jokers = null, onEnd,
  }) {
    this.jokers = jokers;
    this.targeting = null;
    this.busy = false;
    this.canvas = canvas;
    this.hud = hud;
    this.level = level;
    this.boosters = boosters;
    this.engineFactory = engineFactory;
    this.RendererClass = RendererClass;
    this.texts = { ...SHOOTER_TEXTS, ...texts };
    this.onEnd = onEnd;
    this._onResize = () => this.renderer.resize();
    this._onPointer = (e) => this._pointer(e);
  }

  start() {
    this.engine = this.engineFactory(this.level, { boosters: this.boosters });
    this.renderer = new this.RendererClass(this.canvas, this.engine);
    this.renderer.resize();
    this.ended = false;
    this.clock = 0;

    this.hud.title.textContent = `Bölüm ${this.level.id} · ${this.level.name}`;
    this._hint(this.level.tip ?? (this.level.id === 1 ? this.texts.firstHint : this.texts.levelHint(this.level)), 3500);
    this.canvas.addEventListener('pointerdown', this._onPointer);
    window.addEventListener('resize', this._onResize);
    this._buildJokerBar();

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
        } else if (ev.type === 'colorDone') {
          this._hint(`${PALETTE[ev.color]?.name ?? 'Renk'} tamamlandı ✓`, 1500);
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

  // ---------- Jokerler ----------

  _buildJokerBar() {
    const bar = this.hud.jokerBar;
    if (!bar) return;
    bar.replaceChildren();
    bar.hidden = !this.jokers;
    if (!this.jokers) return;
    this._jokerButtons = {};
    for (const j of this.jokers.list) {
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
      btn.addEventListener('click', () => this.activateJoker(j));
      bar.appendChild(btn);
      this._jokerButtons[j.id] = { btn, count };
    }
    this._refreshJokers();
  }

  _refreshJokers() {
    if (!this.jokers) return;
    const inv = this.jokers.inventory();
    for (const [id, { btn, count }] of Object.entries(this._jokerButtons)) {
      const n = inv[id] ?? 0;
      count.textContent = String(n);
      btn.classList.toggle('empty', n <= 0);
      btn.classList.toggle('active', this.targeting?.id === id);
    }
  }

  async activateJoker(joker) {
    if (this.ended || this.busy) return;
    if (this.targeting?.id === joker.id) {
      this.targeting = null;
      this._refreshJokers();
      this._hint('');
      return;
    }
    if ((this.jokers.inventory()[joker.id] ?? 0) <= 0) {
      this._hint(`${joker.name} kalmadı. Dükkândan ya da ödüllerden kazanabilirsin.`, 2500);
      return;
    }
    if (joker.targeted) {
      this.targeting = joker;
      this._refreshJokers();
      this._hint(joker.hint, 0);
      return;
    }
    await this._useJoker(joker);
  }

  async _useJoker(joker, target) {
    this.targeting = null;
    this.busy = true;
    try {
      await this.jokers.consume(joker.id);
    } catch (err) {
      this._hint(err.message, 2500);
      this.busy = false;
      this._refreshJokers();
      return;
    }
    this.busy = false;
    if (this.ended) return;
    const { events, message, relayout } = this.jokers.apply(joker.id, this.engine, target);
    if (relayout) this.renderer.resize();
    this.renderer.handle(events);
    this._hint(message, 1800);
    this._refreshJokers();
  }

  _pointer(e) {
    if (this.ended) return;
    const target = this.renderer.hitTest(e.clientX, e.clientY);
    if (this.targeting) {
      if (target) {
        e.preventDefault();
        this._useJoker(this.targeting, target);
      }
      return;
    }
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
    this.targeting = null;
    const reason = this.engine.state.loseReason;
    if (won) this._hint(`${this.level.name} tamamlandı!`, 0);
    else this._hint(reason === 'stuck' ? this.texts.stuck : this.texts.slots, 0);
    this._endTimer = setTimeout(() => {
      this.destroy();
      this.onEnd({ levelId: this.level.id, won, reason, durationMs: Math.round(this.clock) });
    }, won ? 1800 : 1400);
  }
}
