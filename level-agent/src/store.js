// Ajanın planladığı bölümleri saklar: zellybon-web/js/generated/{oyun}.json (kaynak) ve .js (oyunun okuduğu
// modül), ayrıca sunucunun bölüm sayılarını (zellybon-api/src/level-counts.json) günceller.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from './games.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GEN_DIR = path.join(ROOT, 'zellybon-web', 'js', 'generated');
const COUNTS_FILE = path.join(ROOT, 'zellybon-api', 'src', 'level-counts.json');
const COUNT_KEYS = { shooter: 'main', nakis: 'nakis', match: 'match' };
const EXPORT_NAMES = { shooter: 'GENERATED_SHOOTER', nakis: 'GENERATED_NAKIS', match: 'GENERATED_MATCH' };

const jsonPath = (game) => path.join(GEN_DIR, `${game}.json`);

export function readGenerated(game) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath(game), 'utf8'));
  } catch {
    return [];
  }
}

// Başlangıçta oyunun yüklediği bölüm sayısı (el yapımı + o anda kayıtlı üretilmiş)
const startCounts = Object.fromEntries(
  Object.keys(GAMES).map((g) => [g, { total: GAMES[g].existing().length, generated: readGenerated(g).length }]),
);

/** Toplam bölüm sayısı (bu çalışmada kaydedilenler dahil) */
export function levelCount(game) {
  const s = startCounts[game];
  return s.total + (readGenerated(game).length - s.generated);
}

/** Üretilmiş bölümlerin kaçıncısı (0'dan) planlanacak — zorluk eğrisi buna göre */
export const generatedIndex = (game) => readGenerated(game).length;

export function saveLevel(game, level) {
  const list = readGenerated(game);
  list.push(level);
  fs.mkdirSync(GEN_DIR, { recursive: true });
  fs.writeFileSync(jsonPath(game), `${JSON.stringify(list, null, 2)}\n`);
  const js = `// Bu dosya bölüm planlayan ajan (level-agent) tarafından yazılır; elle düzenleme.\n`
    + `// Kaynak: generated/${game}.json\n`
    + `export const ${EXPORT_NAMES[game]} = ${JSON.stringify(list, null, 2)};\n`;
  fs.writeFileSync(path.join(GEN_DIR, `${game}.js`), js);

  const counts = JSON.parse(fs.readFileSync(COUNTS_FILE, 'utf8'));
  counts[COUNT_KEYS[game]] = levelCount(game);
  fs.writeFileSync(COUNTS_FILE, `${JSON.stringify(counts, null, 2)}\n`);
  return counts[COUNT_KEYS[game]];
}
