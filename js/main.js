/* ── Boot ── */

import { render as renderAlimentacao } from './tabs/alimentacao.js';
import { render as renderTreinos }     from './tabs/treinos.js';
import { render as renderMeta }        from './tabs/meta.js';

const TABS    = { alimentacao: renderAlimentacao, treinos: renderTreinos, meta: renderMeta };
const screen  = document.getElementById('screen');
const tabBtns = document.querySelectorAll('.tab-btn');

function go(tab) {
  if (!TABS[tab]) return;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  screen.scrollTop = 0;
  TABS[tab](screen);
}

tabBtns.forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

window.__vortexGo = go;

go('alimentacao');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
