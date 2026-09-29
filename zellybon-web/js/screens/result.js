// Jöle Patlat sonuç ekranları: Hızlı Tur ve bölüm.

import { Api } from '../api.js';
import { getUser, setUser, renderRewards } from '../session.js';
import { LEVELS } from '../game/levels.js';
import { launchConfetti } from './confetti.js';

const fmt = (n) => (n ?? 0).toLocaleString('tr-TR');

function animateCount(el, to) {
  const start = performance.now();
  const dur = Math.min(1200, 300 + to / 10);
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    el.textContent = fmt(Math.round(to * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Hızlı Tur sonucu: skoru kaydeder, rekoru ve ödülleri gösterir. */
export async function showQuickResult(result, { cameFromNoLives = false } = {}) {
  const user = getUser();
  const bestEl = document.getElementById('result-best');
  const badge = document.getElementById('result-badge');
  const statusEl = document.getElementById('result-status');
  const retryBtn = document.getElementById('result-retry-save');
  const rewardsEl = document.getElementById('result-rewards');
  const toMain = document.getElementById('result-to-main');
  const confetti = document.getElementById('confetti');

  animateCount(document.getElementById('result-score'), result.score);
  document.getElementById('result-combo').textContent = fmt(result.maxCombo);
  document.getElementById('result-jellies').textContent = fmt(result.jelliesPopped);
  bestEl.textContent = fmt(user.bestScore);
  badge.hidden = true;
  confetti.replaceChildren();
  retryBtn.hidden = true;
  toMain.hidden = true;
  renderRewards(rewardsEl, []);

  const save = async () => {
    statusEl.textContent = 'Skor kaydediliyor…';
    retryBtn.hidden = true;
    try {
      const res = await Api.saveScore({
        score: result.score,
        maxCombo: result.maxCombo,
        jelliesPopped: result.jelliesPopped,
        durationMs: result.durationMs,
      });
      setUser(res.user);
      statusEl.textContent = 'Skor kaydedildi ✓';
      bestEl.textContent = fmt(res.bestScore);
      renderRewards(rewardsEl, res.rewards);
      if (res.isNewBest) {
        badge.hidden = false;
        launchConfetti(confetti);
      }
      const gotLife = res.rewards.some((r) => r.type === 'life');
      toMain.hidden = !(gotLife || cameFromNoLives) || res.user.lives.lives < 1;
    } catch (err) {
      statusEl.textContent = `Skor kaydedilemedi: ${err.message}`;
      retryBtn.hidden = false;
    }
  };
  retryBtn.onclick = save;
  await save();
}

/** Bölüm sonucu: yıldızlar, bonus, ödüller. */
export async function showLevelResult(result, { onNext, onRetry }) {
  const level = LEVELS.find((l) => l.id === result.levelId);
  const statusEl = document.getElementById('lr-status');
  const rewardsEl = document.getElementById('lr-rewards');
  const nextBtn = document.getElementById('lr-next');
  const retryBtn = document.getElementById('lr-retry');
  const confetti = document.getElementById('level-confetti');

  document.getElementById('lr-title').textContent = result.won
    ? `Bölüm ${level.id} geçildi!`
    : `Bölüm ${level.id}: hamlen bitti`;
  animateCount(document.getElementById('lr-score'), result.score);
  document.getElementById('lr-bonus').textContent = result.won
    ? (result.bonus ? `Artan ${result.movesLeft} hamle bonusu: +${fmt(result.bonus)}` : '')
    : 'Hedefe ulaşamadın. Jokerlerle tekrar dene!';

  const starsEl = document.getElementById('lr-stars');
  starsEl.replaceChildren();
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = i < result.stars ? 'star on' : 'star';
    s.style.animationDelay = `${0.25 + i * 0.25}s`;
    s.textContent = '★';
    starsEl.appendChild(s);
  }

  confetti.replaceChildren();
  if (result.won) launchConfetti(confetti);
  renderRewards(rewardsEl, []);
  nextBtn.hidden = true;
  retryBtn.hidden = result.won && result.stars === 3;
  retryBtn.onclick = onRetry;
  nextBtn.onclick = onNext;

  statusEl.textContent = 'Kaydediliyor…';
  try {
    const res = await Api.levelResult(result.levelId, result);
    setUser(res.user);
    renderRewards(rewardsEl, res.rewards);
    statusEl.textContent = '';
    nextBtn.hidden = !(result.won && level.id < LEVELS.length);
  } catch (err) {
    statusEl.textContent = `Sonuç kaydedilemedi: ${err.message}`;
  }
}
