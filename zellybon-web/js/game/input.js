// Dokunma ve fare ile kaydırma (swipe) + dokun-dokun seçimi algılama.

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('./renderer.js').Renderer} renderer
 * @param {{ onSwipe: (from: number, to: number) => void, onTap: (index: number) => void }} handlers
 * @returns {() => void} dinleyicileri kaldıran fonksiyon
 */
export function attachInput(canvas, renderer, { onSwipe, onTap }) {
  let start = null;

  function down(e) {
    const index = renderer.cellFromPoint(e.clientX, e.clientY);
    if (index < 0) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    start = { x: e.clientX, y: e.clientY, index, pointerId: e.pointerId, swiped: false };
  }

  function move(e) {
    if (!start || start.swiped || e.pointerId !== start.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = renderer.cell * 0.35;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    const size = renderer.size;
    const r = Math.floor(start.index / size);
    const c = start.index % size;
    let tr = r;
    let tc = c;
    if (Math.abs(dx) > Math.abs(dy)) tc += dx > 0 ? 1 : -1;
    else tr += dy > 0 ? 1 : -1;

    start.swiped = true;
    if (tr < 0 || tc < 0 || tr >= size || tc >= size) return;
    onSwipe(start.index, tr * size + tc);
  }

  function up(e) {
    if (!start || e.pointerId !== start.pointerId) return;
    if (!start.swiped) onTap(start.index);
    start = null;
  }

  function cancel() {
    start = null;
  }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);

  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
  };
}
