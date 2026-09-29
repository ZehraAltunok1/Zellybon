// Günlük giriş ödülü (7 günlük takvim) ve günlük görevler. Gün, Türkiye saatine göre değişir.
// Buradan kazanılan anahtarlarla sandıklar açılır.

const TIME_ZONE = 'Europe/Istanbul';

/** 'YYYY-MM-DD' (Türkiye saatiyle bugün) */
export function todayStr(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

function shiftDay(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- Giriş takvimi ----------
// Arka arkaya giriş yapıldıkça ödül büyür; bir gün kaçırılırsa takvim 1. günden başlar.

export const LOGIN_CALENDAR = [
  [{ type: 'key', count: 1 }, { type: 'coins', count: 20 }],
  [{ type: 'coins', count: 40 }],
  [{ type: 'key', count: 1 }, { type: 'scissors', count: 1 }],
  [{ type: 'hammer', count: 1 }, { type: 'coins', count: 40 }],
  [{ type: 'key', count: 2 }],
  [{ type: 'needle', count: 1 }, { type: 'extraSlot', count: 1 }, { type: 'coins', count: 60 }],
  [{ type: 'chest', tier: 'silver', count: 1 }, { type: 'key', count: 2 }],
];

/** Bugün alınacak takvim günü (1..7) ve bugün zaten alınıp alınmadığı */
export function loginStatus(user, now = new Date()) {
  const today = todayStr(now);
  const last = user.daily?.lastClaim ?? null;
  const lastDay = user.daily?.day ?? 0;
  if (last === today) return { claimedToday: true, day: lastDay, nextDay: (lastDay % 7) + 1 };
  const continues = last === shiftDay(today, -1);
  const day = continues ? (lastDay % 7) + 1 : 1;
  return { claimedToday: false, day, nextDay: day };
}

// ---------- Günlük görevler ----------

export const QUEST_POOL = [
  { id: 'main_win', kind: 'main_win', target: 2, text: "Jöle Atış'ta 2 bölüm geç", reward: { type: 'key', count: 1 } },
  { id: 'nakis_win', kind: 'nakis_win', target: 1, text: "Nakış'ta 1 tablo tamamla", reward: { type: 'key', count: 1 } },
  { id: 'nakis_win3', kind: 'nakis_win', target: 3, text: "Nakış'ta 3 tablo tamamla", reward: { type: 'key', count: 2 } },
  { id: 'quick_score', kind: 'quick_score', target: 1, text: "Hızlı Tur'da 1.500 puan yap", reward: { type: 'key', count: 1 } },
  { id: 'match_win', kind: 'match_win', target: 1, text: "Jöle Patlat'ta 1 bölüm geç", reward: { type: 'key', count: 1 } },
  { id: 'play5', kind: 'play', target: 5, text: 'Herhangi bir oyunda 5 kez oyna', reward: { type: 'coins', count: 40 } },
  { id: 'jokers3', kind: 'use_joker', target: 3, text: '3 joker kullan', reward: { type: 'key', count: 1 } },
];
export const QUEST_BONUS = { type: 'key', count: 1 }; // üç görev de tamamlanınca

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Günün 3 görevi: tarihe göre belirlenir (herkes için aynı), aynı türden iki görev gelmez. */
export function questsForDate(date) {
  const pool = [...QUEST_POOL];
  const out = [];
  let h = hash(date);
  while (out.length < 3 && pool.length) {
    const i = h % pool.length;
    const q = pool.splice(i, 1)[0];
    if (!out.some((o) => o.kind === q.kind)) out.push(q);
    h = hash(`${date}-${h}`);
  }
  return out;
}

/** Gün değiştiyse görevleri yeniler. Kullanıcı belgesini değiştirir (kaydetmez). */
export function ensureQuests(user, now = new Date()) {
  const today = todayStr(now);
  if (user.quests?.date === today && user.quests.items?.length) return;
  user.quests = {
    date: today,
    bonusClaimed: false,
    items: questsForDate(today).map((q) => ({ id: q.id, progress: 0, claimed: false })),
  };
}

/** Bir oyun olayı görev ilerlemesini artırır (kind: main_win, nakis_win, quick_score, match_win, play, use_joker). */
export function bumpQuest(user, kind, amount = 1, now = new Date()) {
  ensureQuests(user, now);
  for (const item of user.quests.items) {
    const def = QUEST_POOL.find((q) => q.id === item.id);
    if (def?.kind === kind && !item.claimed) item.progress = Math.min(def.target, item.progress + amount);
  }
  user.markModified('quests');
}

export function publicQuests(user) {
  const items = (user.quests?.items ?? []).map((item) => {
    const def = QUEST_POOL.find((q) => q.id === item.id);
    return {
      id: item.id,
      text: def?.text ?? item.id,
      target: def?.target ?? 1,
      progress: item.progress,
      claimed: item.claimed,
      reward: def?.reward,
    };
  });
  const allClaimed = items.length > 0 && items.every((i) => i.claimed);
  return {
    date: user.quests?.date ?? null,
    items,
    bonus: QUEST_BONUS,
    bonusReady: allClaimed && !user.quests?.bonusClaimed,
    bonusClaimed: Boolean(user.quests?.bonusClaimed),
  };
}

/** Ana menüdeki bildirim noktası için: alınabilecek ödül var mı? */
export function dailySummary(user, now = new Date()) {
  const login = loginStatus(user, now);
  const q = user.quests?.date === todayStr(now) ? publicQuests(user) : { items: [], bonusReady: false };
  const questsReady = q.items.filter((i) => !i.claimed && i.progress >= i.target).length + (q.bonusReady ? 1 : 0);
  return { loginReady: !login.claimedToday, questsReady };
}
