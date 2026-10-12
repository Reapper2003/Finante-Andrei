// Confetti scurt (≈2 secunde) pe un canvas peste ecran. Nu rulează dacă telefonul cere animații reduse.

const COLORS = ['#6C47FF', '#FF8AC6', '#FFD157', '#5DD3A6', '#6FA8FF', '#FF8A80', '#B48CFF'];
const DURATION = 2200;

export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: 150 }, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * 80,
    y: H * 0.4,
    vx: (Math.random() - 0.5) * 16,
    vy: -4 - Math.random() * 13,
    rot: Math.random() * Math.PI,
    vrot: (Math.random() - 0.5) * 0.35,
    w: 6 + Math.random() * 6,
    h: 9 + Math.random() * 8,
    color: COLORS[i % COLORS.length],
  }));

  const start = performance.now();
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - DURATION * 0.6) / (DURATION * 0.4));
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.7)) + 1);
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
