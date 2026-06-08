/* ── SPA Router (hash-based) ── */

import { setNavigate } from './nav.js';
import { pageEnter, pageLeave } from './animations/transitions.js';

import { render as renderOnboarding } from './modules/onboarding.js';
import { render as renderDashboard }  from './modules/dashboard.js';
import { render as renderMarmita }    from './modules/marmita.js';
import { render as renderTraining }   from './modules/training.js';
import { render as renderProfile }    from './modules/profile.js';

const ROUTES = {
  '/onboarding': renderOnboarding,
  '/dashboard':  renderDashboard,
  '/marmita':    renderMarmita,
  '/training':   renderTraining,
  '/profile':    renderProfile,
};

const TAB_MAP = {
  '/dashboard': 'dashboard',
  '/marmita':   'marmita',
  '/training':  'training',
  '/profile':   'profile',
};

let _currentRoute  = null;
let _currentEl     = null;
let _navigating    = false;
let _history       = [];

/* ─── Tab bar ─── */

export function showTabBar() {
  const bar = document.getElementById('tab-bar');
  if (bar) bar.hidden = false;
}

export function hideTabBar() {
  const bar = document.getElementById('tab-bar');
  if (bar) bar.hidden = true;
}

function setActiveTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.setAttribute('aria-selected', String(isActive));
  });
}

function wireTabBar() {
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = '/' + btn.dataset.tab;
      navigate(route);
    });
  });
}

/* ─── Core navigate ─── */

async function navigate(path, params = {}, skipAnim = false) {
  if (_navigating) return;
  if (path === _currentRoute && !params.force) return;

  _navigating = true;

  const renderFn = ROUTES[path];
  if (!renderFn) {
    console.warn('[router] rota desconhecida:', path);
    _navigating = false;
    return;
  }

  /* Tab bar visibility */
  if (path === '/onboarding') {
    hideTabBar();
  } else {
    showTabBar();
    setActiveTab(TAB_MAP[path] || '');
  }

  /* Determine transition direction */
  const tabOrder = ['/dashboard', '/marmita', '/training', '/profile'];
  const prevIdx = tabOrder.indexOf(_currentRoute);
  const nextIdx = tabOrder.indexOf(path);
  const direction = nextIdx >= prevIdx ? 'left' : 'right';

  /* Leave current screen */
  if (_currentEl && !skipAnim) {
    await pageLeave(_currentEl, direction === 'left' ? 'left' : 'right');
    _currentEl.remove();
  } else if (_currentEl) {
    _currentEl.remove();
  }

  /* Render new screen */
  const screen = document.createElement('div');
  screen.className = 'screen' + (path === '/onboarding' ? ' screen--no-tabs' : '');
  screen.dataset.route = path;
  document.getElementById('app').appendChild(screen);

  _currentEl    = screen;
  _currentRoute = path;
  _history.push(path);

  await renderFn(screen, params);

  /* Enter animation */
  if (!skipAnim) {
    await pageEnter(screen, direction === 'left' ? 'right' : 'left');
  }

  _navigating = false;

  /* Update URL hash silently */
  history.replaceState(null, '', '#' + path);
}

export function back() {
  _history.pop(); // remove current
  const prev = _history.pop() || '/dashboard';
  navigate(prev, {}, false);
}

/* ─── Init ─── */

export function initRouter() {
  wireTabBar();
  setNavigate(navigate);

  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || '/dashboard';
    if (ROUTES[hash]) navigate(hash);
  });
}

export { navigate };
