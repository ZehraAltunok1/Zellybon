import { JOKERS, HOW_TO_EARN } from '../game/jokers.js';
import { LEVELS, isUnlocked, totalStars } from '../game/levels.js';

export function renderHub(user) {
  document.getElementById('hub-best').textContent = (user.bestScore ?? 0).toLocaleString('tr-TR');
  document.getElementById('hub-stars').textContent = String(totalStars(user.levels));

  const inv = document.getElementById('hub-jokers');
  inv.replaceChildren();
  for (const j of JOKERS) {
    const item = document.createElement('div');
    item.className = 'joker-item';
    item.title = j.desc;
    const icon = document.createElement('span');
    icon.className = 'joker-icon';
    icon.textContent = j.icon;
    const name = document.createElement('small');
    name.textContent = j.name;
    const count = document.createElement('strong');
    count.textContent = `x${user.jokers[j.id] ?? 0}`;
    item.append(icon, count, name);
    inv.appendChild(item);
  }

  const how = document.getElementById('hub-how');
  how.replaceChildren(...HOW_TO_EARN.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
}

export function renderLevelMap(user, onPick) {
  document.getElementById('levels-stars').textContent = String(totalStars(user.levels));
  const map = document.getElementById('level-map');
  map.replaceChildren();
  for (const level of LEVELS) {
    const li = document.createElement('li');
    const unlocked = isUnlocked(user.levels, level.id);
    const stars = user.levels[level.id]?.stars ?? 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `level-node${unlocked ? '' : ' locked'}${stars ? ' done' : ''}`;
    btn.disabled = !unlocked;
    btn.setAttribute('aria-label', unlocked ? `Bölüm ${level.id}, ${stars} yıldız` : `Bölüm ${level.id}, kilitli`);
    const num = document.createElement('span');
    num.className = 'level-num';
    num.textContent = unlocked ? String(level.id) : '🔒';
    const starRow = document.createElement('span');
    starRow.className = 'level-stars';
    starRow.textContent = unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    btn.append(num, starRow);
    if (unlocked) btn.addEventListener('click', () => onPick(level.id));
    li.appendChild(btn);
    map.appendChild(li);
  }
  // Açık olan en son bölümü görünür yap
  const lastOpen = [...map.querySelectorAll('.level-node:not(.locked)')].pop();
  lastOpen?.scrollIntoView({ block: 'center' });
}
