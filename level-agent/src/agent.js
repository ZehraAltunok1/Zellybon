// Zellybon bölüm planlama ajanı (Claude + simülasyon araçları).
//
// Kullanım:
//   node src/agent.js --game shooter --count 3     Jöle Atış için 3 yeni bölüm planla
//   node src/agent.js --game nakis                  Nakış için 1 yeni tablo
//   node src/agent.js --game match --count 2        Jöle Patlat için 2 bölüm
//   node src/agent.js --check                       API çağırmadan araçları dene
//
// Her bölüm için: Claude bir resim ve ayarlar tasarlar → evaluate_level ile ölçer → hedef zorluğa göre düzeltir →
// save_level ile kaydeder. Hedef zorluk her yeni bölümde biraz artar (games.js → target).

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { GAMES, PALETTE_DESCRIPTION } from './games.js';
import { createTools, evaluate } from './tools.js';
import { levelCount, generatedIndex } from './store.js';

const MODEL = 'claude-opus-5-5';

function parseArgs(argv) {
  const args = { game: 'shooter', count: 1, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--game') args.game = argv[++i];
    else if (argv[i] === '--count') args.count = Math.max(1, Number(argv[++i]) || 1);
    else if (argv[i] === '--check') args.check = true;
  }
  if (!GAMES[args.game]) throw new Error(`Bilinmeyen oyun: ${args.game} (shooter | nakis | match)`);
  return args;
}

function systemPrompt(game) {
  const def = GAMES[game];
  return `Sen Zellybon adlı mobil bulmaca uygulamasının bölüm tasarımcısısın. Görevin "${def.title}" oyunu için,
bir öncekinden biraz daha zor ve oyuncudan gerçek strateji isteyen YENİ bir bölüm tasarlamak.

${def.rules}

Renk paleti (art içinde bu harfleri kullan, '.' boş hücre): ${PALETTE_DESCRIPTION}

Çalışma şeklin:
1. İstersen önce list_levels ile mevcut bölümlere bak; aynı resmi/ismi tekrar etme.
2. Tanınır, sevimli ve bölümün adına uyan bir piksel resim çiz (Türkçe kısa isim). Resim, stratejiye hizmet etsin:
   renk katmanları, engellerin yeri ve sıralama bağımlılıkları bilinçli olsun.
3. evaluate_level ile ölç. "verdict" ne diyorsa ona göre değiştir ve yeniden ölç. Zorluğu ayarlamak için önce
   sayısal ayarları (slots, shuffle, ammo/spool, moves) ve engelleri kullan; resmi baştan değiştirmek son çaredir.
4. Ölçüm "HEDEFTE" olunca save_level ile kaydet ve design_notes'a oyuncudan istenen stratejiyi yaz. Kayıt başarılı
   olunca kısa bir özetle bitir.
Ölçümler otomatik oyunculara dayanır: "measured" düşükse bölüm zordur. Hedefin dışındaki bir bölümü kaydetme.`;
}

function userPrompt(game, session) {
  const def = GAMES[game];
  const { value, tolerance, minObstacles } = session.target;
  return `${def.title} için ${session.id}. bölümü tasarla.
Zorluk hedefi: ${def.metric} = %${Math.round(value * 100)} (±%${Math.round(tolerance * 100)}).
En az ${minObstacles} engel hücresi kullan.
Bu, ajanın bu oyun için ürettiği ${session.index + 1}. bölüm; öncekilerden daha fazla planlama gerektirmeli.`;
}

export async function planLevel(client, game) {
  const index = generatedIndex(game);
  const session = {
    index,
    id: levelCount(game) + 1,
    target: GAMES[game].target(index),
    evaluations: 0,
    last: null,
    saved: null,
  };
  console.log(`\n▶ ${GAMES[game].title} — ${session.id}. bölüm (hedef %${Math.round(session.target.value * 100)})`);

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    max_iterations: 16,
    output_config: { effort: 'high' },
    // Güvenlik sınıflandırıcısı reddederse istek sunucu tarafında uygun bir modelde yeniden çalışır
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: systemPrompt(game),
    tools: createTools(game, session),
    messages: [{ role: 'user', content: userPrompt(game, session) }],
  });

  for await (const message of runner) {
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) console.log(`  💬 ${block.text.trim().slice(0, 300)}`);
      if (block.type === 'tool_use') console.log(`  🔧 ${block.name}`);
    }
    if (session.last && !session.last.errors) {
      console.log(`     ölçüm: %${Math.round(session.last.measured * 100)} → ${session.last.verdict}`);
    } else if (session.last?.errors) {
      console.log(`     hata: ${session.last.errors.slice(0, 3).join(' | ')}`);
    }
    session.last = null;
    if (message.stop_reason === 'refusal') console.log('  ⚠ istek reddedildi');
  }

  if (session.saved) {
    const l = session.saved.level;
    console.log(`✔ Kaydedildi: ${l.id}. ${l.name} (%${Math.round(session.saved.result.measured * 100)}, ${session.evaluations} ölçüm)`);
    console.log(`  Strateji: ${l.designNotes}`);
  } else {
    console.log(`✖ Bölüm kaydedilemedi (${session.evaluations} ölçüm). Tekrar çalıştırabilirsin.`);
  }
  return Boolean(session.saved);
}

// API çağırmadan araçları dener: her oyunun son bölümünü yeni bölümmüş gibi ölçer
function check() {
  for (const [game, def] of Object.entries(GAMES)) {
    const sample = def.existing().at(-1);
    const session = { id: levelCount(game) + 1, target: def.target(generatedIndex(game)), index: generatedIndex(game) };
    const t0 = Date.now();
    const r = evaluate(game, sample, session);
    console.log(`${def.title}: yeni bölüm no ${session.id}, hedef %${Math.round(session.target.value * 100)} → `
      + `${r.errors ? `hatalar: ${r.errors.join(', ')}` : `ölçüm %${Math.round(r.measured * 100)}, ${r.verdict}`} (${Date.now() - t0} ms)`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.check) {
    check();
    return;
  }
  const client = new Anthropic();
  let ok = 0;
  for (let i = 0; i < args.count; i++) {
    if (await planLevel(client, args.game)) ok++;
  }
  console.log(`\n${ok}/${args.count} bölüm eklendi. Oyunu yenileyince görünür; API'yi yeniden başlat ki yeni bölüm sayısını görsün.`);
}

// Doğrudan çalıştırıldıysa başla (testler planLevel'ı içe aktarır)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error('API anahtarı geçersiz ya da yok: level-agent/.env dosyasına ANTHROPIC_API_KEY=... yaz.');
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error('Hız sınırına takıldı; biraz bekleyip tekrar dene.');
  } else {
    console.error(err);
  }
  process.exit(1);
});
