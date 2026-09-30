// Ajan döngüsü testi: gerçek API yerine sahte bir fetch kullanılır. Claude'un önce evaluate_level, sonra
// save_level çağırdığı taklit edilir; istek biçimi, araç çalıştırma ve kaydetme koruması doğrulanır.
// (Hedefi tutmayan bölüm kaydedilmez, bu yüzden test hiçbir dosya yazmaz.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { planLevel } from '../src/agent.js';
import { evaluate } from '../src/tools.js';
import { readGenerated } from '../src/store.js';

const LEVEL = {
  name: 'Deneme Kalbi',
  art: ['.rr...rr.', 'rwrr.rrrr', 'rwrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
  mods: ['.........', '.a.......', '.........', '....l....', '.........', '.........', '.........', '.........'],
  slots: 5, columns: 2, belt: 4, ammo: [10, 20], shuffle: 0,
};

function reply(content, stop_reason) {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content,
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

test('evaluate: kurallara aykırı bölüm hata listesi döndürür', () => {
  const session = { id: 99, target: { value: 0.2, tolerance: 0.07, minObstacles: 2 } };
  const r = evaluate('shooter', { ...LEVEL, slots: 9, art: ['rz'] }, session);
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 2);
});

test('ajan döngüsü: ölçer, hedef dışı bölümü kaydetmez ve istekleri doğru kurar', async () => {
  const requests = [];
  const script = [
    reply([{ type: 'tool_use', id: 'tu_1', name: 'evaluate_level', input: { level: LEVEL } }], 'tool_use'),
    reply([{ type: 'tool_use', id: 'tu_2', name: 'save_level', input: { level: LEVEL, design_notes: 'deneme' } }], 'tool_use'),
    reply([{ type: 'text', text: 'Bitti.' }], 'end_turn'),
  ];
  const fakeFetch = async (url, init) => {
    requests.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(script.shift()), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new Anthropic({ apiKey: 'test', fetch: fakeFetch });
  const before = readGenerated('shooter').length;

  const saved = await planLevel(client, 'shooter');

  assert.equal(saved, false, 'hedefi tutmayan bölüm kaydedilmemeli');
  assert.equal(readGenerated('shooter').length, before);
  assert.equal(requests.length, 3);
  const first = requests[0].body;
  assert.equal(first.model, 'claude-opus-5-5');
  assert.equal(first.fallbacks, 'default');
  assert.deepEqual(first.tools.map((t) => t.name).sort(), ['evaluate_level', 'list_levels', 'save_level']);
  // araç sonuçları bir sonraki isteğe eklenmiş olmalı
  const toolResult = requests[1].body.messages.at(-1).content[0];
  assert.equal(toolResult.type, 'tool_result');
  const evaluation = JSON.parse(toolResult.content);
  assert.equal(evaluation.solvable, true);
  assert.equal(evaluation.obstacles, 2);
  const saveResult = JSON.parse(requests[2].body.messages.at(-1).content[0].content);
  assert.equal(saveResult.saved, false);
  const betaHeader = new Headers(requests[0].headers).get('anthropic-beta') ?? '';
  assert.match(betaHeader, /server-side-fallback-2026-07-01/);
});
