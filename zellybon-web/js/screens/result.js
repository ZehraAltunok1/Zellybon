import { Api } from '../api.js';

const CONFETTI_COLORS = ['#FF3B5C', '#FF8C1A', '#FFD60A', '#3DDC84', '#2D9CFF', '#A259FF', '#FFFFFF'];

function fmt(n) {
  return n.toLocaleString('tr-TR');
}

function launchConfetti(container) {
  container.replaceChildren();
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    container.appendChild(piece);
  }
}

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

/**
 * Sonuç ekranını gösterir ve skoru sunucuya gönderir.
 * @returns {Promise<number|null>} güncel en iyi skor (kaydedilemezse null)
 */
export async function showResult(result, user) {
  const scoreEl = document.getElementById('result-score');
  const bestEl = document.getElementById('result-best');
  const badge = document.getElementById('result-badge');
  const statusEl = document.getElementById('result-status');
  const retryBtn = document.getElementById('result-retry-save');
  const confetti = document.getElementById('confetti');

  animateCount(scoreEl, result.score);
  document.getElementById('result-combo').textContent = fmt(result.maxCombo);
  document.getElementById('result-jellies').textContent = fmt(result.jelliesPopped);
  bestEl.textContent = fmt(user.bestScore ?? 0);
  badge.hidden = true;
  confetti.replaceChildren();
  retryBtn.hidden = true;

  const celebrate = (best) => {
    bestEl.textContent = fmt(best);
    badge.hidden = false;
    launchConfetti(confetti);
  };

  const save = async () => {
    statusEl.textContent = 'Skor kaydediliyor…';
    retryBtn.hidden = true;
    try {
      const { isNewBest, bestScore } = await Api.saveScore(result);
      statusEl.textContent = 'Skor kaydedildi ✓';
      bestEl.textContent = fmt(bestScore);
      if (isNewBest) celebrate(bestScore);
      return bestScore;
    } catch (err) {
      statusEl.textContent = `Skor kaydedilemedi: ${err.message}`;
      retryBtn.hidden = false;
      return null;
    }
  };

  retryBtn.onclick = async () => {
    const best = await save();
    if (best !== null) user.bestScore = best;
  };

  return save();
}
