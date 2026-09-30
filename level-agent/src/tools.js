// Ajanın araçları: bölümü doğrula ve ölç, kaydet, mevcut bölümleri listele.
// Kaydetme her seferinde bölümü yeniden doğrular ve ölçer; hedefi tutmayan bölüm oyuna giremez.

import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { GAMES } from './games.js';
import { saveLevel, readGenerated } from './store.js';

const pct = (v) => `%${Math.round(v * 100)}`;

/**
 * Bir bölümü değerlendirir: kurallara uygun mu, çözülebilir mi, zorluk hedefin içinde mi?
 * @param {string} game  'shooter' | 'nakis' | 'match'
 * @param {object} level  ajanın önerdiği bölüm (id atanır)
 * @param {{ id: number, target: { value: number, tolerance: number, minObstacles: number } }} session
 */
export function evaluate(game, level, session) {
  const def = GAMES[game];
  const candidate = { ...level, id: session.id };
  const { errors, obstacles } = def.validate(candidate);
  if (errors.length) return { ok: false, errors };

  const m = def.measure(candidate);
  const { value, tolerance, minObstacles } = session.target;
  const diff = m.value - value;
  const withinTarget = Math.abs(diff) <= tolerance;
  const enoughObstacles = obstacles >= minObstacles;
  let verdict;
  if (!m.solvable) verdict = 'ÇÖZÜLEMİYOR: akıllı oyuncu bile kazanamadı. Kolaylaştır (daha fazla kutu, engelleri dış katmana al, düğüm/kilit bağımlılıklarını gevşet).';
  else if (!enoughObstacles) verdict = `Engel az: en az ${minObstacles} engel hücresi gerekiyor (şu an ${obstacles}).`;
  else if (diff > tolerance) verdict = `ÇOK KOLAY (${pct(m.value)} > hedef ${pct(value)}). Zorlaştır.`;
  else if (diff < -tolerance) verdict = `ÇOK ZOR (${pct(m.value)} < hedef ${pct(value)}). Biraz kolaylaştır.`;
  else verdict = 'HEDEFTE: kaydedebilirsin.';

  return {
    ok: m.solvable && withinTarget && enoughObstacles,
    solvable: m.solvable,
    metric: def.metric,
    measured: m.value,
    target: value,
    tolerance,
    obstacles,
    minObstacles,
    verdict,
    detail: m.detail,
  };
}

export function createTools(game, session) {
  const def = GAMES[game];
  const levelSchema = {
    type: 'object',
    description: `Önerilen ${def.title} bölümü (id verme; otomatik atanır).`,
    additionalProperties: true,
  };

  const evaluateTool = betaTool({
    name: 'evaluate_level',
    description: `Bir ${def.title} bölümünü doğrular ve otomatik oyuncularla onlarca kez oynatarak zorluğunu ölçer. `
      + 'Hata varsa listeler; yoksa ölçülen değer, hedef ve ne yapman gerektiğini (verdict) döndürür. '
      + 'Her tasarım değişikliğinden sonra çağır.',
    inputSchema: {
      type: 'object',
      properties: { level: levelSchema },
      required: ['level'],
      additionalProperties: false,
    },
    run: async ({ level }) => {
      session.evaluations++;
      const result = evaluate(game, level, session);
      session.last = result;
      return JSON.stringify(result);
    },
  });

  const saveTool = betaTool({
    name: 'save_level',
    description: 'Bölümü oyuna ekler. Yalnızca evaluate_level "HEDEFTE" dediyse çağır; bölüm yeniden ölçülür ve '
      + 'hedef tutmazsa kaydedilmez. Başarılı kayıttan sonra iş biter.',
    inputSchema: {
      type: 'object',
      properties: {
        level: levelSchema,
        design_notes: { type: 'string', description: 'Bu bölümün oyuncudan istediği strateji (1–2 cümle, Türkçe).' },
      },
      required: ['level', 'design_notes'],
      additionalProperties: false,
    },
    run: async ({ level, design_notes: notes }) => {
      const result = evaluate(game, level, session);
      if (!result.ok) return JSON.stringify({ saved: false, reason: result.errors ?? result.verdict });
      const saved = { ...level, id: session.id, designNotes: notes };
      const total = saveLevel(game, saved);
      session.saved = { level: saved, result };
      return JSON.stringify({ saved: true, id: session.id, totalLevels: total });
    },
  });

  const listTool = betaTool({
    name: 'list_levels',
    description: `Oyundaki mevcut ${def.title} bölümlerinin kısa listesi ve ajanın daha önce ürettiği son bölümlerin `
      + 'tam tanımı (tekrar etmemek ve devamlılık için).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const summary = def.existing().map((l) => def.describe(l));
      const recent = readGenerated(game).slice(-3);
      return JSON.stringify({ levels: summary, recentGenerated: recent });
    },
  });

  return [evaluateTool, saveTool, listTool];
}
