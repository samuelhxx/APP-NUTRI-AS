/* ── Boot sequence ── */

import { initStore } from './store.js';
import { ensureActiveUser } from './auth.js';
import { initRouter, navigate } from './router.js';

async function boot() {
  /* 1. Inicializa store (lê localStorage, migra schema, seed de ingredientes) */
  initStore();

  /* 2. Verifica usuário ativo */
  const hasUser = ensureActiveUser();

  /* 3. Inicializa router */
  initRouter();

  /* 4. Navega para tela inicial */
  if (!hasUser) {
    navigate('/onboarding', {}, true);
  } else {
    navigate('/dashboard', {}, true);
  }

  /* 5. Registra service worker */
  if ('serviceWorker' in navigator) {
    try {
      const sw = await navigator.serviceWorker.register('./sw.js');
      /* Gera e cacheia ícones PWA via Canvas na primeira instalação */
      if (sw.installing) {
        sw.installing.addEventListener('statechange', () => {
          if (sw.installing?.state === 'installed') generateAndCacheIcons();
        });
      } else {
        generateAndCacheIcons();
      }
    } catch (e) {
      /* App funciona normalmente sem SW */
    }
  } else {
    generateAndCacheIcons();
  }
}

/* Gera PNG 192×192 e 512×512 via Canvas e guarda no Cache API */
async function generateAndCacheIcons() {
  if (!('caches' in window) || !('HTMLCanvasElement' in window)) return;
  try {
    const iconCache = await caches.open('vortex-icons-v1');
    const existing  = await iconCache.match('./assets/icons/icon-192.png');
    if (existing) return; /* já gerados */

    for (const size of [192, 512]) {
      const blob = await drawIcon(size);
      if (!blob) continue;
      const resp = new Response(blob, { headers: { 'Content-Type': 'image/png' } });
      await iconCache.put(`./assets/icons/icon-${size}.png`, resp.clone());
      if (size === 512) {
        await iconCache.put('./assets/icons/icon-maskable-512.png', resp);
      }
    }
  } catch (_) { /* silencioso */ }
}

function drawIcon(size) {
  return new Promise(resolve => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      /* Background */
      ctx.fillStyle = '#0E0E12';
      const r = size * 0.18;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, size, size, r);
      } else {
        ctx.rect(0, 0, size, size);
      }
      ctx.fill();

      /* Spiral arcs */
      const cx = size / 2;
      const cy = size / 2;
      const radii  = [size * 0.33, size * 0.22, size * 0.12];
      const widths = [size * 0.065, size * 0.055, size * 0.045];
      const opacs  = [1, 0.78, 0.55];
      const sweeps = [1.5 * Math.PI, 1.33 * Math.PI, 1.17 * Math.PI];

      for (let i = 0; i < radii.length; i++) {
        const grad = ctx.createLinearGradient(cx - radii[0], cy - radii[0], cx + radii[0], cy + radii[0]);
        grad.addColorStop(0, `rgba(255,90,31,${opacs[i]})`);
        grad.addColorStop(1, `rgba(255,45,120,${opacs[i]})`);
        ctx.beginPath();
        ctx.arc(cx, cy, radii[i], -Math.PI / 2, -Math.PI / 2 + sweeps[i]);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = widths[i];
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      /* Center dot */
      const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.05);
      dotGrad.addColorStop(0, '#FF5A1F');
      dotGrad.addColorStop(1, '#FF2D78');
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.045, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      canvas.toBlob(blob => resolve(blob), 'image/png');
    } catch (e) {
      resolve(null);
    }
  });
}

boot();
