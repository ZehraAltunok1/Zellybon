// Başlatma, ekran geçişleri ve oyunlar arası akış.
//
// Jöle Atış (ana oyun): her bölüm 1 can harcar, kazanınca can geri gelir.
// Jöle Patlat (destek oyunu): Hızlı Tur ve bölümlerle can + joker kazandırır.

import { Api, getToken, setUnauthorizedHandler } from './api.js';
import { initAuth, logout } from './auth.js';
import { getUser, setUser, patchUser, onUserChange, nextLifeInMs, renderLives } from './session.js';
import { Game } from './game/game.js';
import { getLevel } from './game/levels.js';
import { randomSeed } from './game/rng.js';
import { ShooterGame } from './shooter/game.js';
import { getMainLevel } from './shooter/levels.js';
import { renderHome, currentMainLevelId } from './screens/home.js';
import { renderHub, renderLevelMap } from './screens/hub.js';
import { showQuickResult, showLevelResult } from './screens/result.js';
import { showShooterResult } from './screens/shooterResult.js';
import { showRecords } from './screens/records.js';

const screens = [...document.querySelectorAll('.screen')];
let current = 'loading';
let previous = null;
let matchGame = null;   // Jöle Patlat oturumu
let shooterGame = null; // Jöle Atış oturumu

function show(name) {
  previous = current;
  current = name;
  for (const s of screens) s.hidden = s.dataset.screen !== name;
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
  refreshLives();
}

function stopGames() {
  matchGame?.destroy();
  matchGame = null;
  shooterGame?.destroy();
  shooterGame = null;
}

// ---------- Canlar ----------

function refreshLives() {
  document.querySelectorAll('[data-lives]').forEach(renderLives);
}

let refreshingLives = false;
setInterval(async () => {
  const user = getUser();
  if (!user) return;
  refreshLives();
  // Sayaç sıfırlandıysa sunucudan yeni can durumunu al
  if (nextLifeInMs() === 0 && !refreshingLives) {
    refreshingLives = true;
    try {
      setUser((await Api.me()).user);
    } catch {
      // bir sonraki saniye tekrar denenir
    } finally {
      refreshingLives = false;
    }
  }
}, 1000);

onUserChange(() => {
  refreshLives();
  const user = getUser();
  if (!user) return;
  if (current === 'home') renderHome(user);
  if (current === 'hub') renderHub(user);
});

// ---------- Ekranlar ----------

function goHome() {
  stopGames();
  renderHome(getUser());
  show('home');
}

function goHub() {
  stopGames();
  renderHub(getUser());
  show('hub');
}

function goLevels() {
  stopGames();
  show('levels');
  renderLevelMap(getUser(), startMatchLevel);
}

// ---------- Jöle Atış (ana oyun) ----------

async function playMain() {
  stopGames();
  const user = getUser();
  if (user.lives.lives < 1) {
    show('nolives');
    return;
  }
  const levelId = currentMainLevelId(user);
  try {
    const res = await Api.mainStart(levelId);
    setUser(res.user);
  } catch (err) {
    if (err.status === 409) {
      show('nolives');
      return;
    }
    alert(err.message);
    return;
  }

  show('shooter');
  shooterGame = new ShooterGame({
    canvas: document.getElementById('shooter-canvas'),
    hud: {
      title: document.getElementById('shooter-title'),
      progressFill: document.getElementById('shooter-progress'),
      progressText: document.getElementById('shooter-progress-text'),
      belt: document.getElementById('shooter-belt'),
      hint: document.getElementById('shooter-hint'),
    },
    level: getMainLevel(levelId),
    onEnd: (result) => {
      shooterGame = null;
      show('shooter-result');
      showShooterResult(result);
    },
  });
  requestAnimationFrame(() => shooterGame?.start());
}

// ---------- Jöle Patlat ----------

function matchHud() {
  return {
    primaryLabel: document.getElementById('hud-primary-label'),
    primaryValue: document.getElementById('hud-primary'),
    score: document.getElementById('hud-score'),
    heatBar: document.getElementById('heat-bar'),
    heatFill: document.getElementById('heat-fill'),
    goals: document.getElementById('hud-goals'),
    jokerBar: document.getElementById('joker-bar'),
    hint: document.getElementById('game-hint'),
  };
}

const jokerApi = {
  inventory: () => getUser()?.jokers ?? {},
  async consume(type) {
    const res = await Api.useJoker(type);
    patchUser({ jokers: res.jokers });
  },
};

function startQuick() {
  stopGames();
  const cameFromNoLives = ['nolives', 'shooter-result'].includes(current);
  show('game');
  matchGame = new Game({
    canvas: document.getElementById('board'),
    hud: matchHud(),
    mode: 'quick',
    seed: randomSeed(),
    durationMs: 60000,
    jokers: jokerApi,
    onEnd: (result) => {
      matchGame = null;
      show('result');
      showQuickResult(result, { cameFromNoLives });
    },
  });
  requestAnimationFrame(() => matchGame?.start());
}

function startMatchLevel(levelId) {
  stopGames();
  const level = getLevel(levelId);
  show('game');
  matchGame = new Game({
    canvas: document.getElementById('board'),
    hud: matchHud(),
    mode: 'level',
    level,
    seed: randomSeed(),
    jokers: jokerApi,
    onEnd: (result) => {
      matchGame = null;
      show('level-result');
      showLevelResult(result, {
        onRetry: () => startMatchLevel(levelId),
        onNext: () => startMatchLevel(levelId + 1),
      });
    },
  });
  requestAnimationFrame(() => matchGame?.start());
}

// ---------- Giriş ----------

const auth = initAuth({
  onLoggedIn(u) {
    setUser(u);
    goHome();
  },
});

setUnauthorizedHandler((message) => {
  stopGames();
  auth.reset(message || 'Oturumun sona erdi, tekrar giriş yap.');
  show('auth');
});

// ---------- Butonlar ----------

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  switch (btn.dataset.action) {
    case 'home':
      goHome();
      break;
    case 'hub':
      goHub();
      break;
    case 'levels':
      goLevels();
      break;
    case 'records':
      stopGames();
      show('records');
      showRecords();
      break;
    case 'main-play':
      playMain();
      break;
    case 'quick-play':
      startQuick();
      break;
    case 'game-quit':
      if (matchGame?.isLevel) goLevels();
      else goHub();
      break;
    case 'shooter-quit':
      if (window.confirm('Bölümden çıkarsan bu bölüm için harcanan can geri gelmez. Çıkılsın mı?')) goHome();
      break;
    case 'logout':
      stopGames();
      logout();
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
    setUser((await Api.me()).user);
    goHome();
  } catch (err) {
    if (err.status !== 401) auth.reset(err.message);
    show('auth');
  }
}

boot();

// Konsoldan hata ayıklamak için (sadece yerel geliştirmede)
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.__zellybon = { getUser, get matchGame() { return matchGame; }, get shooterGame() { return shooterGame; }, previous: () => previous };
}
