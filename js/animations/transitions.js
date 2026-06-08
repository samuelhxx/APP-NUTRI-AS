/* ── Transições de página com GSAP ── */

import { isReducedMotion } from '../utils.js';

export function pageEnter(el, from = 'right') {
  if (isReducedMotion()) return Promise.resolve();
  const x = from === 'right' ? 28 : -28;
  return new Promise(resolve => {
    gsap.fromTo(el,
      { opacity: 0, x },
      { opacity: 1, x: 0, duration: 0.28, ease: 'power3.out', clearProps: 'x,opacity', onComplete: resolve }
    );
  });
}

export function pageLeave(el, to = 'left') {
  if (isReducedMotion()) return Promise.resolve();
  const x = to === 'left' ? -28 : 28;
  return new Promise(resolve => {
    gsap.to(el, {
      opacity: 0, x,
      duration: 0.2, ease: 'power2.in',
      onComplete: resolve
    });
  });
}

export function stepEnter(el) {
  if (isReducedMotion()) return Promise.resolve();
  return new Promise(resolve => {
    gsap.fromTo(el,
      { opacity: 0, x: 32 },
      { opacity: 1, x: 0, duration: 0.25, ease: 'power3.out', clearProps: 'x,opacity', onComplete: resolve }
    );
  });
}

export function stepLeave(el) {
  if (isReducedMotion()) return Promise.resolve();
  return new Promise(resolve => {
    gsap.to(el, { opacity: 0, x: -32, duration: 0.2, ease: 'power2.in', onComplete: resolve });
  });
}

export function fadeIn(el, duration = 0.3) {
  if (isReducedMotion()) {
    gsap.set(el, { opacity: 1 });
    return Promise.resolve();
  }
  return new Promise(resolve => {
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration, ease: 'power2.out', onComplete: resolve });
  });
}

export function staggerIn(els, delay = 0.07) {
  if (isReducedMotion()) return;
  gsap.fromTo(els,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out', stagger: delay }
  );
}

export function scaleIn(el) {
  if (isReducedMotion()) return;
  gsap.fromTo(el,
    { opacity: 0, scale: 0.9 },
    { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
  );
}

export function sheetEnter(el) {
  if (isReducedMotion()) return Promise.resolve();
  return new Promise(resolve => {
    gsap.fromTo(el,
      { y: '100%' },
      { y: '0%', duration: 0.35, ease: 'power3.out', onComplete: resolve }
    );
  });
}

export function sheetLeave(el) {
  if (isReducedMotion()) return Promise.resolve();
  return new Promise(resolve => {
    gsap.to(el, { y: '100%', duration: 0.25, ease: 'power2.in', onComplete: resolve });
  });
}
