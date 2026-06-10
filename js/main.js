import { getActiveUser } from './store.js';
import { render as renderAlimentacao }          from './tabs/alimentacao.js';
import { render as renderTreinos }              from './tabs/treinos.js';
import { render as renderMeta }                 from './tabs/meta.js';
import { render as renderPerfil,
         renderUserStrip, openNewUserSheet }     from './tabs/perfil.js';

const screen  = document.getElementById('screen');
const tabBtns = document.querySelectorAll('.tab-btn');

const TABS = {
  alimentacao: renderAlimentacao,
  treinos:     renderTreinos,
  meta:        renderMeta,
  perfil:      renderPerfil,
};

let _active = 'alimentacao';

export function go(tab) {
  _active = tab;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  TABS[tab](screen);
}

export function refresh() { go(_active); }

window.__vortexGo      = go;
window.__vortexRefresh = refresh;

tabBtns.forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));

renderUserStrip();

if (!getActiveUser()) {
  openNewUserSheet(() => { renderUserStrip(); go('alimentacao'); });
} else {
  go('alimentacao');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
