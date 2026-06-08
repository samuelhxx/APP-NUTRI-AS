/* ── Micro-celebração de check-in ── */

import { isReducedMotion } from '../utils.js';

const COLORS = ['#A8FF60', '#FF5A1F', '#FF2D78', '#FFD060', '#60A8FF'];

export function triggerCelebration(originEl) {
  if (!originEl) return;
  if (isReducedMotion()) return;

  /* Scale burst no elemento de origem */
  gsap.timeline()
    .to(originEl, { scale: 1.14, duration: 0.14, ease: 'power2.out' })
    .to(originEl, { scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.35)' });

  /* Partículas */
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  createBurst(cx, cy, 14);
}

function createBurst(cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const size = 6 + Math.random() * 6;
    p.style.cssText = [
      'position:fixed',
      `width:${size}px`, `height:${size}px`,
      'border-radius:50%',
      `background:${COLORS[i % COLORS.length]}`,
      `left:${cx}px`, `top:${cy}px`,
      'pointer-events:none',
      'z-index:9999',
      'will-change:transform,opacity',
    ].join(';');
    document.body.appendChild(p);

    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const dist  = 48 + Math.random() * 44;

    gsap.to(p, {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      opacity: 0,
      scale: 0,
      duration: 0.55 + Math.random() * 0.25,
      ease: 'power2.out',
      delay: Math.random() * 0.06,
      onComplete() { p.remove(); },
    });
  }
}

export function triggerCalendarDaySuccess(dayEl) {
  if (isReducedMotion()) return;
  gsap.timeline()
    .fromTo(dayEl,
      { scale: 0.7, opacity: 0.5 },
      { scale: 1.2, opacity: 1, duration: 0.2, ease: 'power3.out' }
    )
    .to(dayEl, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
}
