// Başlatma ve ekranlar arası geçiş.

import { Api, getToken, setUnauthorizedHandler } from './api.js';
import { initAuth, logout } from './auth.js';
import { Game } from './game/game.js';
import { randomSeed } from './game/rng.js';
import { renderMenu } from './screens/menu.js';
import { showResult } from './screens/result.js';
import { showRecords } from './screens/records.js';

const screens = [...document.querySelectorAll('.screen')];
let user = null;
let game = null;

function show(name) {
  for (const s of screens) s.hidden = s.dataset.screen !== name;
  document.body.dataset.screen = name;
}

function goMenu() {
  if (game) {
    game.destroy();
    game = null;
  }
  renderMenu(user);
  show('menu');
}

function startGame() {
  if (game) game.destroy();
  show('game');
  game = new Game({
    canvas: document.getElementById('board'),
    hud: {
      time: document.getElementById('hud-time'),
      score: document.getElementById('hud-score'),
      heatFill: document.getElementById('heat-fill'),
      heatBar: document.getElementById('heat-bar'),
    },
    seed: randomSeed(),
    durationMs: 60000,
    onEnd: async (result) => {
      game = null;
      show('result');
      const best = await showResult(result, user);
      if (best !== null) user.bestScore = best;
    },
  });
  // Ekran görünür olduktan sonra boyut hesaplanmalı
  requestAnimationFrame(() => game?.start());
}

const auth = initAuth({
  onLoggedIn(u) {
    user = u;
    goMenu();
  },
});

setUnauthorizedHandler((message) => {
  if (game) {
    game.destroy();
    game = null;
  }
  user = null;
  auth.reset(message || 'Oturumun sona erdi, tekrar giriş yap.');
  show('auth');
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'play':
      startGame();
      break;
    case 'records':
      show('records');
      showRecords();
      break;
    case 'menu':
      goMenu();
      break;
    case 'quit-game':
      goMenu();
      break;
    case 'logout':
      logout();
      user = null;
      auth.reset('');
      show('auth');
      break;
  }
});

async function boot() {
  if (!getToken()) {
    show('auth');
    return;
  }
  show('loading');
  try {
    const data = await Api.me();
    user = data.user;
    goMenu();
  } catch (err) {
    if (err.status !== 401) auth.reset(err.message);
    show('auth');
  }
}

boot();
