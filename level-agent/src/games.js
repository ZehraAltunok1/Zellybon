// Oyun tanımları: kurallar (ajana anlatılan), doğrulama, zorluk ölçümü ve hedef zorluk eğrisi.
// Ölçümler oyunun kendi motorlarını ve otomatik oyuncularını kullanır (zellybon-web/js/*).

import { PALETTE } from '../../zellybon-web/js/palette.js';
import { MAIN_LEVELS } from '../../zellybon-web/js/shooter/levels.js';
import { NAKIS_LEVELS } from '../../zellybon-web/js/nakis/levels.js';
import { LEVELS as MATCH_LEVELS } from '../../zellybon-web/js/game/levels.js';
import { measureShooter } from '../../zellybon-web/js/shooter/bot.js';
import { measureNakis } from '../../zellybon-web/js/nakis/bot.js';
import { measureMatch } from '../../zellybon-web/js/game/bot.js';

const COLOR_KEYS = Object.keys(PALETTE);
const PALETTE_TEXT = Object.entries(PALETTE).map(([k, v]) => `${k}=${v.name}`).join(', ');
const ABILITIES = ['bounce', 'fast', 'pierce', 'bomb'];

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// ---------- Ortak resim doğrulaması ----------

function checkArt(art, errors, { maxW = 16, maxH = 16, minCells = 20 } = {}) {
  if (!Array.isArray(art) || art.length < 4 || art.length > maxH) {
    errors.push(`art 4–${maxH} satır olmalı`);
    return;
  }
  const w = art[0]?.length;
  if (!w || w < 4 || w > maxW) errors.push(`art genişliği 4–${maxW} olmalı`);
  art.forEach((row, y) => {
    if (typeof row !== 'string' || row.length !== w) errors.push(`art satır ${y} uzunluğu ${w} olmalı`);
    for (const ch of row ?? '') if (ch !== '.' && !COLOR_KEYS.includes(ch)) errors.push(`art satır ${y}: bilinmeyen renk '${ch}'`);
  });
  const cells = art.join('').replace(/\./g, '').length;
  if (cells < minCells) errors.push(`en az ${minCells} dolu hücre olmalı (şu an ${cells})`);
}

function checkMods(level, errors) {
  if (level.mods === undefined) return 0;
  const { art, mods } = level;
  if (!Array.isArray(mods) || mods.length !== art.length) {
    errors.push('mods, art ile aynı satır sayısında olmalı');
    return 0;
  }
  let count = 0;
  mods.forEach((row, y) => {
    if (typeof row !== 'string' || row.length !== art[y]?.length) errors.push(`mods satır ${y} uzunluğu art ile aynı olmalı`);
    [...(row ?? '')].forEach((ch, x) => {
      if (ch === '.') return;
      if (ch !== 'a' && ch !== 'l') errors.push(`mods satır ${y}: sadece '.', 'a', 'l' kullanılabilir`);
      else if (art[y]?.[x] === '.') errors.push(`mods (${x},${y}): boş hücreye engel konamaz`);
      else count++;
    });
  });
  return count;
}

const countColors = (art) => new Set(art.join('').replace(/\./g, '')).size;

// ---------- Oyunlar ----------

export const GAMES = {
  shooter: {
    title: 'Jöle Atış',
    existing: () => MAIN_LEVELS,
    metric: 'randomWinRate',
    // Hedef: rastgele oynayan birinin kazanma oranı (düşük = zor). El yapımı son bölüm ~%20.
    target(k) {
      return { value: Math.max(0.06, 0.2 - 0.012 * k), tolerance: 0.07, minObstacles: Math.min(14, 2 + k) };
    },
    rules: `JÖLE ATIŞ kuralları:
- Ortada küplerden bir piksel resim (art) var. Resmin çevresinde bir kaykay yolu döner.
- Altta \`columns\` sütun jöle var; oyuncu yalnız sütunların en öndeki jölesini yola gönderebilir.
- Yoldaki jöle her şeritten geçerken o şeritteki İLK (dışarıdan görünen) küp kendi rengindeyse onu vurur (1 mermi).
- Mermisi biten jöle kaybolur; turu bitirip mermisi kalan jöle \`slots\` adet bekleme kutusundan birine iner.
  Kutu boşsa oyun sürer; boş kutu yoksa bölüm KAYBEDİLİR. Yolda aynı anda en fazla \`belt\` jöle olur.
- Jöleler otomatik üretilir: her rengin toplam mermisi o rengin vuruş sayısına eşittir, \`ammo\` listesindeki
  parçalara bölünür ve dıştan içe sıralanır; \`shuffle\` bu sırayı bozar (0 kolay, 10+ çok karışık).
- Karakterli jöleler (\`abilities\`, \`abilityRate\` olasılığıyla): bounce=şeritte 2 küp, fast=2 kat hızlı,
  pierce=art arda aynı renk küplerin hepsini deler, bomb=çevresindeki aynı renk küpleri de vurur. Karakterler
  oyuncuya YARDIM eder; zorluğu artırmak için oranı düşük tut.
- Engeller (\`mods\`, art ile aynı boyutta; '.' yok): 'a' zırhlı küp (2 vuruş ister), 'l' kilitli küp (4 komşusundan
  biri patlayana kadar vurulamaz ve şeridi kapatır).
Stratejiyi zorlaştıran şeyler: iç içe geçmiş katmanlar, dış halkada az bulunan renkler, kilitlerle korunan iç
bölgeler, zırhlı küplerin mermi ihtiyacını artırması, az kutu (slots 1–3), çok sütun (seçenek çokluğu yanıltır).
Alanlar: { name, art: string[], mods?: string[], slots 1–6, columns 2–5, belt 3–6, ammo: int[] (5–40),
shuffle 0–12, abilities?: string[], abilityRate? 0–0.5 }`,
    validate(level) {
      const errors = [];
      if (typeof level.name !== 'string' || !level.name.trim()) errors.push('name gerekli');
      checkArt(level.art, errors);
      const obstacles = errors.length ? 0 : checkMods(level, errors);
      if (!isInt(level.slots, 1, 6)) errors.push('slots 1–6 tam sayı olmalı');
      if (!isInt(level.columns, 2, 5)) errors.push('columns 2–5 olmalı');
      if (!isInt(level.belt, 3, 6)) errors.push('belt 3–6 olmalı');
      if (!Array.isArray(level.ammo) || !level.ammo.length || !level.ammo.every((a) => isInt(a, 5, 40))) {
        errors.push('ammo 5–40 arası tam sayılardan oluşan bir liste olmalı');
      }
      if (typeof level.shuffle !== 'number' || level.shuffle < 0 || level.shuffle > 12) errors.push('shuffle 0–12 olmalı');
      if (level.abilities && !level.abilities.every((a) => ABILITIES.includes(a))) errors.push(`abilities: ${ABILITIES.join(', ')}`);
      if (level.abilityRate !== undefined && !(level.abilityRate >= 0 && level.abilityRate <= 0.5)) errors.push('abilityRate 0–0.5');
      return { errors, obstacles };
    },
    measure(level) {
      const m = measureShooter(level, { runs: 30 });
      return { solvable: m.solvable, value: m.randomWinRate, detail: m };
    },
    describe(level) {
      return `${level.id}. ${level.name} ${level.art[0].length}x${level.art.length}, ${countColors(level.art)} renk, kutu ${level.slots}`;
    },
  },

  nakis: {
    title: 'Nakış',
    existing: () => NAKIS_LEVELS,
    metric: 'randomWinRate',
    // El yapımı son tablo ~%31
    target(k) {
      return { value: Math.max(0.06, 0.28 - 0.015 * k), tolerance: 0.08, minObstacles: Math.min(12, 2 + k) };
    },
    rules: `NAKIŞ kuralları:
- Renksiz bir tablo (art) var; her hücrenin olması gereken rengi soluk görünür.
- Eşit uzunlukta (\`spool\` ilmek) ip makaraları sütunlarda bekler; oyuncu sütun başındakini yola gönderir.
- Makara tablonun çevresinde dönerken her şeritten tabloya girer, BOYANMAMIŞ hücrelerin arasından yol bularak kendi
  rengindeki EN İÇTEKİ hücreyi işler (1 ilmek). Boyama içten dışa gider: yalnız en derin katman ve \`slack\` kadar
  dışı işlenebilir; bir hücre başka bir hücrenin dışarıya yolunu kesecekse işlenemez. Yanlış renk hiçbir şey
  yapamaz, turu bitince bekleme kutusuna (\`slots\`) iner; boş kutu yoksa bölüm KAYBEDİLİR. Yolda en fazla \`belt\`
  makara. Makaralar otomatik üretilir ve içten dışa sıralanır; \`shuffle\` sırayı bozar.
- Engeller (\`mods\`, art ile aynı boyutta): 'a' çift ilmek (iki ilmek ister), 'l' düğüm (4 komşusundan biri
  tamamen işlenene kadar işlenemez — derin katmanda düğüm koyarsan komşusu aynı ya da daha derin olmalı, yoksa
  bölüm çözülemez).
Stratejiyi zorlaştıran şeyler: her katmanda birden çok renk, iç içe halkalar, az kutu, küçük slack (0–1),
çift ilmeklerin ip ihtiyacını artırması, düğümlerle sıralama bağımlılıkları.
Alanlar: { name, art: string[], mods?: string[], spool 4–10, slots 2–6, columns 2–5, belt 2–5, shuffle 0–10,
slack 0–2 }`,
    validate(level) {
      const errors = [];
      if (typeof level.name !== 'string' || !level.name.trim()) errors.push('name gerekli');
      checkArt(level.art, errors);
      const obstacles = errors.length ? 0 : checkMods(level, errors);
      if (!isInt(level.spool, 4, 10)) errors.push('spool 4–10 olmalı');
      if (!isInt(level.slots, 2, 6)) errors.push('slots 2–6 olmalı');
      if (!isInt(level.columns, 2, 5)) errors.push('columns 2–5 olmalı');
      if (!isInt(level.belt, 2, 5)) errors.push('belt 2–5 olmalı');
      if (typeof level.shuffle !== 'number' || level.shuffle < 0 || level.shuffle > 10) errors.push('shuffle 0–10 olmalı');
      if (!isInt(level.slack, 0, 2)) errors.push('slack 0–2 olmalı');
      return { errors, obstacles };
    },
    measure(level) {
      const m = measureNakis(level, { runs: 16 });
      return { solvable: m.solvable, value: m.randomWinRate, detail: m };
    },
    describe(level) {
      return `${level.id}. ${level.name} ${level.art[0].length}x${level.art.length}, ${countColors(level.art)} renk`;
    },
  },

  match: {
    title: 'Jöle Patlat',
    existing: () => MATCH_LEVELS,
    metric: 'winRate',
    // Hedef: açgözlü bir oyuncunun kazanma oranı (düşük = zor)
    target(k) {
      return { value: Math.max(0.2, 0.7 - 0.03 * k), tolerance: 0.12, minObstacles: k >= 2 ? Math.min(20, 4 + k) : 0 };
    },
    rules: `JÖLE PATLAT kuralları (8x8 eşleştirme):
- \`colors\` (4–6) renkli şeker; oyuncu komşu iki şekeri yer değiştirir, 3+ aynı renk yan yana gelince patlar,
  üstteki şekerler düşer, zincirleme patlamalar kombo verir. \`moves\` hamle hakkı var.
- Hedefler (goals): { type:'score', value } (hamleler bitince skor), { type:'collect', color 0–5, count }
  (0 kırmızı,1 turuncu,2 sarı,3 yeşil,4 mavi,5 mor; toplanınca bölüm hemen biter), { type:'ice' } (bütün buzları
  kır). \`ice\`: 8 satırlık katman, 'x' buzlu hücre ('.' yok); buz, üstündeki şeker patlayınca kırılır.
- \`stars\`: [2 yıldız, 3 yıldız] puan eşikleri (geçmek 1 yıldız), artan sırada.
Stratejiyi zorlaştıran şeyler: az hamle, çok renk (6 renk eşleşmeyi zorlaştırır), köşelerde/kenarlarda buz
(ulaşması zor), birden fazla hedefin birlikte istenmesi.
Alanlar: { name, colors 4–6, moves 10–40, goals: [...], stars: [a, b], ice?: string[8] }`,
    validate(level) {
      const errors = [];
      if (typeof level.name !== 'string' || !level.name.trim()) errors.push('name gerekli');
      if (!isInt(level.colors, 4, 6)) errors.push('colors 4–6 olmalı');
      if (!isInt(level.moves, 10, 40)) errors.push('moves 10–40 olmalı');
      if (!Array.isArray(level.goals) || !level.goals.length) errors.push('en az bir hedef (goals) olmalı');
      let obstacles = 0;
      if (level.ice !== undefined) {
        if (!Array.isArray(level.ice) || level.ice.length !== 8 || !level.ice.every((r) => typeof r === 'string' && /^[.x]{8}$/.test(r))) {
          errors.push("ice 8 satır, her satır 8 karakter ('.' ya da 'x') olmalı");
        } else obstacles = level.ice.join('').replace(/\./g, '').length;
      }
      for (const g of level.goals ?? []) {
        if (g.type === 'score' && !isInt(g.value, 300, 20000)) errors.push('score hedefi 300–20000');
        else if (g.type === 'collect' && (!isInt(g.color, 0, (level.colors ?? 6) - 1) || !isInt(g.count, 5, 80))) {
          errors.push('collect: color tahtadaki renklerden biri, count 5–80');
        } else if (g.type === 'ice' && !obstacles) errors.push('ice hedefi için ice katmanında buz olmalı');
        else if (!['score', 'collect', 'ice'].includes(g.type)) errors.push(`bilinmeyen hedef: ${g.type}`);
      }
      if (!Array.isArray(level.stars) || level.stars.length !== 2 || !(level.stars[0] < level.stars[1])) {
        errors.push('stars [a, b] ve a < b olmalı');
      }
      return { errors, obstacles };
    },
    measure(level) {
      const m = measureMatch(level, { runs: 30 });
      return { solvable: m.winRate > 0, value: m.winRate, detail: m };
    },
    describe(level) {
      return `${level.id}. ${level.name ?? `Bölüm ${level.id}`} ${level.colors} renk, ${level.moves} hamle, hedef: ${level.goals.map((g) => g.type).join('+')}`;
    },
  },
};

export const PALETTE_DESCRIPTION = PALETTE_TEXT;
