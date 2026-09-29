// Jöle Atış ve Nakış bölüm sonucu: kazanınca ortaya çıkan resim, para ve (Jöle Atış'ta) sandık;
// kaybedince Jöle Atış'ta can durumu.

import { Api } from '../api.js';
import { getUser, setUser, renderRewards } from '../session.js';
import { CUBE_COLORS, MAIN_LEVELS } from '../shooter/levels.js';
import { NAKIS_LEVELS } from '../nakis/levels.js';
import { CHEST_NAMES } from '../economy.js';
import { launchConfetti } from './confetti.js';

const MODES = {
  main: {
    levels: MAIN_LEVELS,
    save: (r) => Api.mainResult(r.levelId, r.won),
    play: 'main-play',
    wonText: (l) => `${l.name} resmini ortaya çıkardın.`,
    lost: { stuck: 'Hiçbir jöle küp vuramaz hale geldi. −1 can', slots: 'Bekleme kutuları taştı. −1 can' },
    usesLives: true,
  },
  nakis: {
    levels: NAKIS_LEVELS,
    save: (r) => Api.nakisResult(r.levelId, r.won),
    play: 'nakis-play',
    wonText: (l) => `${l.name} tablosunu ipliklerle işledin.`,
    lost: {
      stuck: 'Hiçbir ip yol bulamıyor. İpucu: önce en içteki renkleri ver!',
      slots: 'Bekleme kutuları taştı. İpucu: önce en içteki renkleri ver!',
    },
    usesLives: false,
  },
};

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

function showChest(chest) {
  const box = document.getElementById('sr-chest');
  box.hidden = !chest;
  if (!chest) return;
  const info = CHEST_NAMES[chest.tier] ?? { name: chest.name, icon: '🎁' };
  box.className = `chest chest-${chest.tier}`;
  document.getElementById('sr-chest-icon').textContent = info.icon;
  document.getElementById('sr-chest-name').textContent = `${info.name} açıldı!`;
}

export async function showShooterResult(result, mode = 'main') {
  const cfg = MODES[mode];
  const level = cfg.levels.find((l) => l.id === result.levelId);
  const title = document.getElementById('sr-title');
  const text = document.getElementById('sr-text');
  const statusEl = document.getElementById('sr-status');
  const picture = document.getElementById('sr-picture');
  const nextBtn = document.getElementById('sr-next');
  const retryBtn = document.getElementById('sr-retry');
  const earnBtn = document.getElementById('sr-earn');
  const livesCard = document.getElementById('sr-lives');
  const rewardsEl = document.getElementById('sr-rewards');
  const confetti = document.getElementById('shooter-confetti');

  nextBtn.dataset.action = cfg.play;
  retryBtn.dataset.action = cfg.play;
  livesCard.hidden = !cfg.usesLives;
  confetti.replaceChildren();
  picture.hidden = !result.won;
  nextBtn.hidden = true;
  retryBtn.hidden = true;
  earnBtn.hidden = true;
  renderRewards(rewardsEl, []);
  showChest(null);

  if (result.won) {
    title.textContent = 'Harika! 🎉';
    text.textContent = cfg.wonText(level);
    drawPicture(picture, level.art);
    launchConfetti(confetti);
  } else {
    title.textContent = 'Bölüm kaybedildi';
    text.textContent = cfg.lost[result.reason] ?? cfg.lost.slots;
  }

  statusEl.textContent = 'Kaydediliyor…';
  try {
    const res = await cfg.save(result);
    setUser(res.user);
    statusEl.textContent = '';
    showChest(res.chest ?? null);
    renderRewards(rewardsEl, res.rewards);
  } catch (err) {
    statusEl.textContent = `Sonuç kaydedilemedi: ${err.message}`;
  }

  const hasLives = getUser().lives.lives > 0;
  if (result.won) {
    nextBtn.hidden = result.levelId >= cfg.levels.length;
  } else if (!cfg.usesLives || hasLives) {
    retryBtn.hidden = false;
  } else {
    earnBtn.hidden = false;
  }
}
