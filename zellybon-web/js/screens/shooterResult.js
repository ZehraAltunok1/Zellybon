// Jöle Atış bölüm sonucu: kazanınca ortaya çıkan resim, kaybedince can durumu.

import { Api } from '../api.js';
import { getUser, setUser } from '../session.js';
import { CUBE_COLORS, MAIN_LEVELS } from '../shooter/levels.js';
import { launchConfetti } from './confetti.js';

function drawPicture(canvas, art) {
  const ctx = canvas.getContext('2d');
  const H = art.length;
  const W = art[0].length;
  const cell = Math.floor(Math.min(canvas.width / W, canvas.height / H));
  const ox = (canvas.width - W * cell) / 2;
  const oy = (canvas.height - H * cell) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  art.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = CUBE_COLORS[ch];
    ctx.fillRect(ox + x * cell + 0.5, oy + y * cell + 0.5, cell - 1, cell - 1);
  }));
}

export async function showShooterResult(result) {
  const level = MAIN_LEVELS.find((l) => l.id === result.levelId);
  const title = document.getElementById('sr-title');
  const text = document.getElementById('sr-text');
  const statusEl = document.getElementById('sr-status');
  const picture = document.getElementById('sr-picture');
  const nextBtn = document.getElementById('sr-next');
  const retryBtn = document.getElementById('sr-retry');
  const earnBtn = document.getElementById('sr-earn');
  const confetti = document.getElementById('shooter-confetti');

  confetti.replaceChildren();
  picture.hidden = !result.won;
  nextBtn.hidden = true;
  retryBtn.hidden = true;
  earnBtn.hidden = true;

  if (result.won) {
    title.textContent = 'Harika! 🎉';
    text.textContent = `${level.name} resmini ortaya çıkardın.`;
    drawPicture(picture, level.art);
    launchConfetti(confetti);
  } else {
    title.textContent = 'Bölüm kaybedildi';
    text.textContent = result.reason === 'stuck'
      ? 'Hiçbir jöle küp vuramaz hale geldi. −1 can'
      : 'Bekleme kutuları taştı. −1 can';
  }

  statusEl.textContent = 'Kaydediliyor…';
  try {
    const res = await Api.mainResult(result.levelId, result.won);
    setUser(res.user);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.textContent = `Sonuç kaydedilemedi: ${err.message}`;
  }

  const user = getUser();
  const hasLives = user.lives.lives > 0;
  if (result.won) {
    nextBtn.hidden = result.levelId >= MAIN_LEVELS.length;
    nextBtn.textContent = 'Sonraki Bölüm';
  } else {
    retryBtn.hidden = !hasLives;
    earnBtn.hidden = hasLives;
  }
}
