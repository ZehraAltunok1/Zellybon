// Günlük ödüller: 7 günlük giriş takvimi ve günlük görevler (anahtar kazandırır).

import { Api } from '../api.js';
import { setUser, renderRewards } from '../session.js';
import { REWARD_LABELS } from '../economy.js';
import { CHEST_INFO, paintChestCanvas } from '../chest.js';

function rewardText(r) {
  if (r.type === 'chest') return CHEST_INFO[r.tier]?.name ?? 'Sandık';
  const l = REWARD_LABELS[r.type] ?? { icon: '🎁' };
  return `${l.icon} ${r.count}`;
}

// Türkiye saatiyle gece yarısına kalan süre
function untilMidnight() {
  const now = new Date();
  const tr = new Date(now.getTime() + 3 * 3600 * 1000);
  const next = Date.UTC(tr.getUTCFullYear(), tr.getUTCMonth(), tr.getUTCDate() + 1);
  const ms = next - tr.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} sa ${m} dk`;
}

function renderCalendar(login, onClaim) {
  const el = document.getElementById('daily-calendar');
  el.replaceChildren();
  for (const { day, rewards } of login.calendar) {
    const card = document.createElement('div');
    const done = login.claimedToday ? day <= login.day : day < login.day;
    const today = !login.claimedToday && day === login.day;
    card.className = `day-card${done ? ' done' : ''}${today ? ' today' : ''}${day === 7 ? ' big' : ''}`;
    const label = document.createElement('span');
    label.className = 'day-label';
    label.textContent = `${day}. gün`;
    card.appendChild(label);
    const chest = rewards.find((r) => r.type === 'chest');
    if (chest) {
      const c = document.createElement('canvas');
      paintChestCanvas(c, chest.tier, 56);
      card.appendChild(c);
    }
    const list = document.createElement('span');
    list.className = 'day-rewards';
    list.textContent = rewards.filter((r) => r.type !== 'chest').map(rewardText).join('  ');
    card.appendChild(list);
    if (done) {
      const check = document.createElement('span');
      check.className = 'day-check';
      check.textContent = '✓';
      card.appendChild(check);
    }
    if (today) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary btn-claim';
      btn.textContent = 'AL';
      btn.addEventListener('click', () => onClaim(btn));
      card.appendChild(btn);
    }
    el.appendChild(card);
  }
}

function renderQuests(quests, onClaim, onBonus) {
  const el = document.getElementById('daily-quests');
  el.replaceChildren();
  for (const q of quests.items) {
    const row = document.createElement('div');
    row.className = `quest${q.claimed ? ' claimed' : ''}`;
    const text = document.createElement('div');
    text.className = 'quest-text';
    const title = document.createElement('strong');
    title.textContent = q.text;
    const bar = document.createElement('div');
    bar.className = 'quest-bar';
    const fill = document.createElement('div');
    fill.className = 'quest-fill';
    fill.style.transform = `scaleX(${Math.min(1, q.progress / q.target)})`;
    const count = document.createElement('span');
    count.className = 'quest-count';
    count.textContent = `${q.progress}/${q.target}`;
    bar.append(fill, count);
    text.append(title, bar);
    const action = document.createElement('div');
    action.className = 'quest-action';
    const reward = document.createElement('span');
    reward.className = 'quest-reward';
    reward.textContent = rewardText(q.reward);
    action.appendChild(reward);
    if (q.claimed) {
      const done = document.createElement('span');
      done.className = 'quest-done';
      done.textContent = '✓';
      action.appendChild(done);
    } else if (q.progress >= q.target) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-primary btn-claim';
      btn.textContent = 'AL';
      btn.addEventListener('click', () => onClaim(q.id, btn));
      action.appendChild(btn);
    }
    row.append(text, action);
    el.appendChild(row);
  }
  const bonus = document.getElementById('daily-bonus');
  bonus.replaceChildren();
  const label = document.createElement('span');
  label.textContent = `Üç görevin hepsi: ${rewardText(quests.bonus)}`;
  bonus.appendChild(label);
  if (quests.bonusClaimed) {
    const d = document.createElement('span');
    d.className = 'quest-done';
    d.textContent = '✓';
    bonus.appendChild(d);
  } else if (quests.bonusReady) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary btn-claim';
    btn.textContent = 'AL';
    btn.addEventListener('click', () => onBonus(btn));
    bonus.appendChild(btn);
  }
}

export async function showDaily() {
  const status = document.getElementById('daily-status');
  const got = document.getElementById('daily-got');
  document.getElementById('daily-reset').textContent = `Yeni görevlere: ${untilMidnight()}`;
  status.textContent = 'Yükleniyor…';
  renderRewards(got, []);

  const apply = (res) => {
    setUser(res.user);
    status.textContent = '';
    renderCalendar(res.login, claimLogin);
    renderQuests(res.quests, claimQuest, claimBonus);
  };
  const run = async (btn, call) => {
    if (btn) btn.disabled = true;
    try {
      const res = await call();
      apply(res);
      if (res.rewards) renderRewards(got, res.rewards);
    } catch (err) {
      status.textContent = err.message;
      if (btn) btn.disabled = false;
    }
  };
  const claimLogin = (btn) => run(btn, () => Api.claimLogin());
  const claimQuest = (id, btn) => run(btn, () => Api.claimQuest(id));
  const claimBonus = (btn) => run(btn, () => Api.claimQuestBonus());

  await run(null, () => Api.daily());
}
