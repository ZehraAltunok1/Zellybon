// Nakış jokerleri. Satın alınabilir ve ödül olarak kazanılır; stok sunucuda tutulur.

export const NAKIS_JOKERS = [
  {
    id: 'scissors',
    name: 'Makas',
    icon: '✂️',
    targeted: true,
    desc: 'Kutudaki ya da sütun başındaki bir makarayı atar.',
    hint: 'Atmak istediğin makaraya dokun.',
  },
  {
    id: 'needle',
    name: 'Sihirli İğne',
    icon: '🪡',
    targeted: false,
    desc: 'En içteki 5 hücreyi doğru renkleriyle kendisi işler.',
  },
  {
    id: 'box',
    name: 'Ekstra Kutu',
    icon: '📦',
    targeted: false,
    desc: 'Bu bölüm için +1 bekleme kutusu.',
  },
  {
    id: 'magnet',
    name: 'Mıknatıs',
    icon: '🧲',
    targeted: false,
    desc: 'Her sütunda şu an işe yarayacak makarayı en öne çeker.',
  },
];

export const NEEDLE_STITCHES = 5;

/**
 * Jokeri motora uygular.
 * @returns {{ events: object[], message: string, relayout?: boolean }}
 */
export function applyNakisJoker(id, engine, target) {
  if (id === 'scissors') {
    return { events: engine.discard(target), message: '✂️ Makara atıldı' };
  }
  if (id === 'needle') {
    const events = engine.autoStitch(NEEDLE_STITCHES);
    const n = events.filter((e) => e.type === 'hit').length;
    return { events, message: `🪡 ${n} hücre işlendi` };
  }
  if (id === 'box') {
    engine.addSlot();
    return { events: [], message: '📦 +1 bekleme kutusu', relayout: true };
  }
  const moved = engine.sortColumns();
  return { events: [], message: moved ? `🧲 ${moved} makara öne çekildi` : '🧲 Öndeki makaralar zaten uygun' };
}
