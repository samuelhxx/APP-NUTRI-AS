/* ── Dashboard / Hoje ── */

import { getActiveUser, getActiveUserId } from '../auth.js';
import { getMealLog, getCheckin } from '../store.js';
import { navigate } from '../nav.js';
import { buildRing, animateRing } from '../animations/rings.js';
import { staggerIn, fadeIn } from '../animations/transitions.js';
import { getGreeting, formatDate, today, fmtKcal, goalLabel, isReducedMotion } from '../utils.js';

export async function render(container) {
  const user = getActiveUser();
  if (!user) { navigate('/onboarding'); return; }

  const dateStr = today();
  const meals  = getMealLog(getActiveUserId(), dateStr);
  const checkin = getCheckin(getActiveUserId(), dateStr);
  const targets = user.targets || {};

  const consumed = meals.reduce((acc, m) => ({
    kcal:      acc.kcal      + (m.total_kcal || 0),
    protein_g: acc.protein_g + (m.total_protein_g || 0),
    fat_g:     acc.fat_g     + (m.total_fat_g || 0),
    carbs_g:   acc.carbs_g   + (m.total_carbs_g || 0),
  }), { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 });

  const pct = (v, t) => t > 0 ? v / t : 0;

  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  container.innerHTML = `
<div class="dashboard-header">
  <div class="dashboard-greeting">
    <div class="dashboard-greeting__date">${dateLabel}</div>
    <div class="dashboard-greeting__name">${getGreeting()}, ${escHtml(user.profile.name)}</div>
    <div class="dashboard-greeting__sub">${goalLabel(user.profile.goal)} · Meta: ${fmtKcal(targets.kcal || 0)} kcal</div>
  </div>
  <div class="avatar" style="background:${user.profile.avatar_color || '#FF5A1F'};flex-shrink:0"
       aria-label="Perfil de ${escHtml(user.profile.name)}">
    ${user.profile.name.charAt(0).toUpperCase()}
  </div>
</div>

<!-- kcal strip -->
<div class="page-content">
  <div class="kcal-strip card" id="kcal-strip">
    <div class="kcal-strip__header">
      <span class="kcal-strip__consumed tabular-nums" id="kcal-consumed">${fmtKcal(consumed.kcal)}</span>
      <span class="kcal-strip__target">/ ${fmtKcal(targets.kcal || 0)} kcal</span>
    </div>
    <div class="kcal-strip__bar" role="progressbar" aria-valuenow="${Math.round(consumed.kcal)}" aria-valuemax="${targets.kcal || 0}" aria-label="Progresso calórico">
      <div class="kcal-strip__bar-fill ${consumed.kcal > (targets.kcal || 9999) ? 'kcal-strip__bar-fill--over' : ''}"
           id="kcal-bar"
           style="width:${Math.min(100, pct(consumed.kcal, targets.kcal || 1) * 100).toFixed(1)}%">
      </div>
    </div>
  </div>

  <!-- macro rings -->
  <div class="macro-trio">
    ${macroRingCard('ring-prot', 'Proteína', consumed.protein_g, targets.protein_g || 0)}
    ${macroRingCard('ring-carb', 'Carbs',    consumed.carbs_g,   targets.carbs_g || 0)}
    ${macroRingCard('ring-fat',  'Gordura',  consumed.fat_g,     targets.fat_g || 0)}
  </div>

  <!-- training card -->
  ${renderTrainingCard(checkin)}

  <!-- meal log -->
  ${renderMealLog(meals)}

  <!-- empty state if no meals -->
  ${meals.length === 0 ? renderEmptyState() : ''}
</div>
`;

  /* Animate rings after DOM is ready */
  setTimeout(() => {
    animateMacroRing('ring-prot-canvas', pct(consumed.protein_g, targets.protein_g || 1));
    animateMacroRing('ring-carb-canvas', pct(consumed.carbs_g,   targets.carbs_g || 1));
    animateMacroRing('ring-fat-canvas',  pct(consumed.fat_g,     targets.fat_g || 1));
  }, 80);

  /* FAB for adding meals */
  const fab = document.createElement('button');
  fab.className = 'quick-add-fab tappable';
  fab.setAttribute('aria-label', 'Registrar refeição');
  fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  fab.addEventListener('click', () => navigate('/marmita'));
  container.appendChild(fab);

  /* Wire training card button */
  container.querySelector('#btn-checkin')?.addEventListener('click', () => navigate('/training'));
  container.querySelector('#btn-checkin-done')?.addEventListener('click', () => navigate('/training'));

  if (!isReducedMotion()) staggerIn(container.querySelectorAll('.page-content > *'));
  await fadeIn(container);
}

function macroRingCard(id, label, consumed, target) {
  const pctVal = target > 0 ? consumed / target : 0;
  return `
<div class="macro-ring-card" role="group" aria-label="${label}: ${Math.round(consumed)}g de ${Math.round(target)}g">
  <div class="macro-ring-card__ring-wrap">
    <div id="${id}-canvas"></div>
    <div class="macro-ring-card__center" style="position:absolute">
      <div class="macro-ring-card__value tabular-nums">${Math.round(consumed)}</div>
      <div class="macro-ring-card__unit">g</div>
    </div>
  </div>
  <div class="macro-ring-card__label">${label}</div>
  <div class="macro-ring-card__progress">${Math.round(consumed)}/${Math.round(target)}g</div>
</div>`;
}

function animateMacroRing(canvasId, pct) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const rd = buildRing(el, { size: 80, strokeWidth: 7 });
  animateRing(rd, pct, { over: pct > 1 });
}

function renderTrainingCard(checkin) {
  if (checkin) {
    const typeLabels = { strength: 'Força', cardio: 'Cardio', hiit: 'HIIT', flexibility: 'Flexibilidade', rest: 'Descanso' };
    return `
<div class="training-card card--success" style="margin:0">
  <div class="training-card__header">
    <div>
      <div class="training-card__label">Treino de hoje</div>
      <div class="training-card__title" style="color:var(--color-success)">Check-in feito!</div>
    </div>
    <span class="badge badge--success">${typeLabels[checkin.type] || checkin.type}</span>
  </div>
  <div style="font-size:var(--text-sm);color:var(--text-secondary)">${checkin.duration_min} min${checkin.notes ? ' · ' + escHtml(checkin.notes) : ''}</div>
  <button class="btn btn--ghost tappable" id="btn-checkin-done" style="margin-top:var(--s2)">Ver calendário</button>
</div>`;
  }
  return `
<div class="training-card">
  <div class="training-card__header">
    <div>
      <div class="training-card__label">Treino de hoje</div>
      <div class="training-card__title">Ainda sem check-in</div>
    </div>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M18 6.5v-2a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2M6 6.5v-2a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2"/></svg>
  </div>
  <p style="font-size:var(--text-sm);color:var(--text-secondary)">Registre seu treino de hoje no calendário.</p>
  <div class="training-card__checkin">
    <button class="btn btn--primary tappable" id="btn-checkin" style="flex:1">Fazer check-in</button>
  </div>
</div>`;
}

function renderMealLog(meals) {
  if (!meals.length) return '';
  return `
<div>
  <div class="section-label" style="padding:0;margin-bottom:var(--s2)">Registros de hoje</div>
  <div class="day-log">
    ${meals.map(m => `
    <div class="day-log-item">
      <div class="day-log-item__dot"></div>
      <div class="day-log-item__name">${escHtml(m.meal_name || 'Refeição')}</div>
      <div class="day-log-item__kcal">${Math.round(m.total_kcal || 0)} kcal</div>
    </div>`).join('')}
  </div>
</div>`;
}

function renderEmptyState() {
  return `
<div class="empty-state" style="padding:var(--s8) var(--s4)">
  <div class="empty-state__icon">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2"/><path d="M18 15h3"/><path d="M21 10h-7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8Z"/></svg>
  </div>
  <div class="empty-state__title">Nenhuma refeição hoje</div>
  <div class="empty-state__subtitle">Use o botão + para registrar sua primeira refeição do dia</div>
</div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
