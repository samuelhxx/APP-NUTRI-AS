/* ── SVG Rings & Count-up ── */

import { isReducedMotion } from '../utils.js';

const GRAD_VORTEX_ID = 'grad-vortex-global';
const GRAD_SUCCESS_ID = 'grad-success-global';

function ensureGlobalGrads() {
  if (document.getElementById(GRAD_VORTEX_ID)) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  defs.innerHTML = `
    <defs>
      <linearGradient id="${GRAD_VORTEX_ID}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF5A1F"/>
        <stop offset="100%" stop-color="#FF2D78"/>
      </linearGradient>
      <linearGradient id="${GRAD_SUCCESS_ID}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#A8FF60"/>
        <stop offset="100%" stop-color="#60FF9A"/>
      </linearGradient>
    </defs>`;
  document.body.insertBefore(defs, document.body.firstChild);
}

/**
 * Constrói um anel SVG dentro de `container`.
 * Retorna { svg, progress, circumference } para uso em animateRing().
 */
export function buildRing(container, {
  size = 80,
  strokeWidth = 7,
  gradientId = GRAD_VORTEX_ID,
} = {}) {
  ensureGlobalGrads();
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.transform = 'rotate(-90deg)';
  svg.style.flexShrink = '0';

  svg.innerHTML = `
    <circle
      cx="${cx}" cy="${cx}" r="${r}"
      fill="none"
      stroke="rgba(255,255,255,0.07)"
      stroke-width="${strokeWidth}"/>
    <circle class="ring-progress"
      cx="${cx}" cy="${cx}" r="${r}"
      fill="none"
      stroke="url(#${gradientId})"
      stroke-width="${strokeWidth}"
      stroke-linecap="round"
      stroke-dasharray="${circumference}"
      stroke-dashoffset="${circumference}"/>`;

  container.appendChild(svg);
  const progress = svg.querySelector('.ring-progress');
  return { svg, progress, circumference };
}

/**
 * Anima o progresso do anel de 0 → pct (0..1).
 * Chame com pct > 1 para mostrar excesso (cor de erro).
 */
export function animateRing(ringData, pct, { over = false, success = false } = {}) {
  const { progress, circumference } = ringData;
  const clampedPct = Math.min(1, Math.max(0, pct));
  const targetOffset = circumference * (1 - clampedPct);

  if (over) {
    progress.setAttribute('stroke', 'var(--color-error)');
  } else if (success) {
    progress.setAttribute('stroke', `url(#${GRAD_SUCCESS_ID})`);
  }

  if (isReducedMotion()) {
    progress.style.strokeDashoffset = targetOffset;
    return;
  }

  gsap.fromTo(progress,
    { strokeDashoffset: circumference },
    { strokeDashoffset: targetOffset, duration: 0.8, ease: 'power3.out' }
  );
}

/**
 * Anima um número de `from` até `to` no elemento `el`.
 */
export function countUp(el, from, to, {
  duration = 0.8,
  suffix = '',
  decimals = 0,
  onUpdate = null,
} = {}) {
  if (isReducedMotion()) {
    el.textContent = Math.round(to).toFixed(decimals) + suffix;
    return;
  }
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration,
    ease: 'power3.out',
    onUpdate() {
      const formatted = decimals > 0
        ? obj.val.toFixed(decimals)
        : String(Math.round(obj.val));
      el.textContent = formatted + suffix;
      if (onUpdate) onUpdate(obj.val);
    },
    onComplete() {
      el.textContent = to.toFixed(decimals) + suffix;
    },
  });
}

/**
 * Versão simplificada: anima o anel E o label de valor juntos.
 */
export function animateRingWithCount(ringData, valueEl, from, to, pct, opts = {}) {
  animateRing(ringData, pct, opts);
  countUp(valueEl, from, to, opts);
}
