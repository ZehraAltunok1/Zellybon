const CONFETTI_COLORS = ['#FF3B5C', '#FF8C1A', '#FFD60A', '#3DDC84', '#2D9CFF', '#A259FF', '#FFFFFF'];

export function launchConfetti(container) {
  container.replaceChildren();
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    container.appendChild(piece);
  }
}
