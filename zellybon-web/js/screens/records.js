import { Api } from '../api.js';

const fmt = (n) => (n ?? 0).toLocaleString('tr-TR');

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export async function showRecords() {
  const list = document.getElementById('records-list');
  const statusEl = document.getElementById('records-status');
  list.replaceChildren();
  statusEl.textContent = 'Yükleniyor…';
  statusEl.hidden = false;

  try {
    const { records, stats } = await Api.records('quick');
    document.getElementById('stat-games').textContent = fmt(stats.gamesPlayed);
    document.getElementById('stat-jellies').textContent = fmt(stats.totalJellies);
    document.getElementById('stat-combo').textContent = fmt(stats.longestCombo);
    document.getElementById('stat-best').textContent = fmt(stats.bestScore);

    if (records.length === 0) {
      statusEl.textContent = 'Henüz oynanmış tur yok. Hadi ilk rekorunu kır!';
      return;
    }
    statusEl.hidden = true;
    records.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'record';
      const rank = document.createElement('span');
      rank.className = 'record-rank';
      rank.textContent = String(i + 1);
      const main = document.createElement('div');
      main.className = 'record-main';
      const score = document.createElement('strong');
      score.textContent = fmt(r.score);
      const meta = document.createElement('small');
      meta.textContent = `Kombo x${r.maxCombo} · ${fmt(r.jelliesPopped)} jöle · ${dateFmt.format(new Date(r.createdAt))}`;
      main.append(score, meta);
      li.append(rank, main);
      list.appendChild(li);
    });
  } catch (err) {
    statusEl.textContent = err.message;
  }
}
