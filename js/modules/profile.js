/* ── Perfil — Switcher de Usuários + Peso + Badges ── */

import { getActiveUser, getActiveUserId, setActiveUser, getAvatarColors, createUser } from '../auth.js';
import { getState, addWeightEntry, updateUser, getUserList } from '../store.js';
import { navigate } from '../nav.js';
import { fadeIn, staggerIn, sheetEnter, sheetLeave, scaleIn } from '../animations/transitions.js';
import { showToast, goalLabel, activityLabel, formatDate, today } from '../utils.js';

export async function render(container) {
  renderFull(container);
  await fadeIn(container);
}

function renderFull(container) {
  const user     = getActiveUser();
  const userId   = getActiveUserId();
  const users    = getUserList();
  const profile  = user?.profile || {};
  const targets  = user?.targets || {};
  const weightLog = user?.weight_log || [];
  const checkins  = user?.checkins || [];

  const trainedCount = checkins.filter(c => c.type !== 'rest').length;
  const totalMinutes = checkins.filter(c => c.type !== 'rest').reduce((s, c) => s + (c.duration_min || 0), 0);
  const lastWeight   = weightLog.length ? weightLog[weightLog.length - 1].weight_kg : profile.weight_kg;

  container.innerHTML = `
<div style="padding-top:var(--s5)">
  <div class="page-header" style="padding-top:0">
    <h1 class="page-header__title">Perfil</h1>
  </div>

  <!-- User switcher -->
  <div class="user-switcher" id="user-switcher" role="group" aria-label="Selecionar usuário">
    ${users.map(u => userCard(u, u.id === userId)).join('')}
    ${users.length < 3 ? addUserCard() : ''}
  </div>

  ${user ? `
  <!-- Stats strip -->
  <div class="profile-stats">
    ${profileStat(trainedCount, 'Treinos')}
    ${profileStat((totalMinutes / 60).toFixed(1).replace('.',',') + 'h', 'Total')}
    ${profileStat(lastWeight ? lastWeight + 'kg' : '—', 'Peso atual')}
  </div>

  <!-- Macro summary -->
  <div class="macro-summary">
    <div style="padding:var(--s4) var(--s5);border-bottom:1px solid var(--border-subtle)">
      <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:700">Metas diárias</div>
      <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:2px">Objetivo: ${goalLabel(profile.goal)} · ${activityLabel(profile.activity_level)}</div>
    </div>
    <table class="macro-summary-table">
      <tr><th></th><th>Meta</th></tr>
      <tr><td>Calorias</td><td>${targets.kcal || 0} kcal</td></tr>
      <tr><td>Proteína</td><td>${targets.protein_g || 0}g</td></tr>
      <tr><td>Carboidratos</td><td>${targets.carbs_g || 0}g</td></tr>
      <tr><td>Gorduras</td><td>${targets.fat_g || 0}g</td></tr>
    </table>
    <div style="padding:var(--s3) var(--s5)">
      <button class="btn btn--ghost btn--full tappable" id="btn-recalc">Recalcular metas</button>
    </div>
  </div>

  <!-- Weight log -->
  <div class="weight-section">
    <div class="weight-section__header">
      <div class="weight-section__title">Histórico de peso</div>
      <button class="btn btn--icon-sm tappable" id="btn-expand-weight" aria-label="Expandir">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    ${weightLog.length > 0 ? `<div class="weight-chart" id="weight-chart">${buildSparkline(weightLog)}</div>` : ''}
    <div class="weight-add-form">
      <div class="input-group">
        <label class="input-label" for="weight-input">Peso hoje (kg)</label>
        <input id="weight-input" class="input-field" type="number" step="0.1" min="30" max="300" placeholder="${lastWeight || 70}" inputmode="decimal">
      </div>
      <button class="btn btn--primary tappable" id="btn-add-weight">Salvar</button>
    </div>
    ${weightLog.length > 0 ? `
    <div class="weight-entries" id="weight-entries" style="display:none">
      ${weightLog.slice(-10).reverse().map(e => `
      <div class="weight-entry-row">
        <div class="weight-entry-row__date">${formatDate(e.date, 'DD/MM/YYYY')}</div>
        <div class="weight-entry-row__value tabular-nums">${e.weight_kg} kg</div>
      </div>`).join('')}
    </div>` : ''}
  </div>

  <!-- Achievements -->
  <div>
    <div class="section-label" style="padding:0 var(--page-px);margin-bottom:var(--s3)">Conquistas</div>
    <div class="achievements-grid" id="achievements">
      ${renderBadges(trainedCount, calcStreak(checkins))}
    </div>
  </div>

  <!-- Settings -->
  <div>
    <div class="section-label" style="padding:0 var(--page-px);margin-bottom:var(--s3)">Configurações</div>
    <div class="settings-section">
      <div class="settings-row">
        <span class="settings-row__label">Movimento reduzido</span>
        <div class="settings-row__value">
          <label class="sr-only" for="reduced-motion-toggle">Reduzir animações</label>
          <input type="checkbox" id="reduced-motion-toggle" style="cursor:pointer" ${window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'checked' : ''}>
        </div>
      </div>
      <div class="settings-row" id="row-clear-data" style="color:var(--color-error)">
        <span class="settings-row__label">Apagar meus dados</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  </div>

  <!-- Version -->
  <div style="text-align:center;padding:var(--s6) var(--s4);color:var(--text-disabled);font-size:var(--text-xs)">
    VORTEX Fit · v1.0.0
  </div>
  ` : ''}
</div>`;

  wireProfile(container, user, userId);
  if (staggerIn) staggerIn(container.querySelectorAll('.page-content > *, .profile-stats > *, .achievements-grid > *'));
}

function userCard(user, isActive) {
  const { id, profile } = user;
  const initial = profile.name?.charAt(0)?.toUpperCase() || '?';
  return `
<div class="user-card ${isActive ? 'active' : ''} tappable" data-user-id="${id}" role="button" tabindex="0" aria-pressed="${isActive}">
  <div class="avatar" style="background:${profile.avatar_color || '#FF5A1F'}">${initial}</div>
  <div class="user-card__name">${escHtml(profile.name)}</div>
  <div class="user-card__goal">${goalLabel(profile.goal)}</div>
</div>`;
}

function addUserCard() {
  return `
<div class="user-card user-card--add tappable" id="btn-add-user" role="button" tabindex="0" aria-label="Adicionar usuário">
  <div class="add-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </div>
  <div class="user-card__name">Adicionar</div>
  <div class="user-card__goal">Novo perfil</div>
</div>`;
}

function profileStat(value, label) {
  return `
<div class="profile-stat">
  <div class="profile-stat__value tabular-nums">${value}</div>
  <div class="profile-stat__label">${label}</div>
</div>`;
}

/* ── Sparkline ── */
function buildSparkline(weightLog) {
  if (weightLog.length < 2) return '';
  const vals = weightLog.slice(-14).map(e => e.weight_kg);
  const min  = Math.min(...vals) - 0.5;
  const max  = Math.max(...vals) + 0.5;
  const W = 300, H = 80, pad = 8;

  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - 2 * pad);
    const y = pad + ((max - v) / (max - min)) * (H - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastX = pad + ((W - 2 * pad));
  const lastV = vals[vals.length - 1];
  const lastY = (pad + ((max - lastV) / (max - min)) * (H - 2 * pad)).toFixed(1);

  return `
<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px" aria-label="Gráfico de peso">
  <defs>
    <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF5A1F"/>
      <stop offset="100%" stop-color="#FF2D78"/>
    </linearGradient>
  </defs>
  <polyline points="${points}" fill="none" stroke="url(#spark-grad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--color-primary)"/>
  <text x="${lastX - 30}" y="${parseFloat(lastY) - 8}" fill="var(--text-primary)" font-size="11" font-family="var(--font-display)" font-weight="700">${lastV}kg</text>
</svg>`;
}

/* ── Badges ── */
function renderBadges(trainedCount, streak) {
  const badges = [
    { icon: '🏋️', name: 'Primeiro Treino', desc: 'Fez o primeiro check-in', unlocked: trainedCount >= 1 },
    { icon: '🔥', name: '7 dias seguidos', desc: 'Sequência de 7 dias', unlocked: streak >= 7 },
    { icon: '💪', name: '10 Treinos', desc: 'Completou 10 treinos', unlocked: trainedCount >= 10 },
    { icon: '🏆', name: '30 dias seguidos', desc: 'Sequência de 30 dias', unlocked: streak >= 30 },
    { icon: '🥗', name: 'Marmita Master', desc: '7 refeições registradas', unlocked: false },
    { icon: '⚡', name: '50 Treinos', desc: 'Completou 50 treinos', unlocked: trainedCount >= 50 },
  ];
  return badges.map(b => `
<div class="achievement-card ${b.unlocked ? '' : 'locked'}" aria-label="${b.name}${b.unlocked ? ', conquistado' : ', bloqueado'}">
  <div class="achievement-card__icon" aria-hidden="true">${b.icon}</div>
  <div class="achievement-card__name">${b.name}</div>
  <div class="achievement-card__desc">${b.desc}</div>
</div>`).join('');
}

/* ── Streak helper ── */
function calcStreak(checkins) {
  const trained = checkins
    .filter(c => c.type !== 'rest')
    .map(c => c.date)
    .sort()
    .reverse();
  if (!trained.length) return 0;
  let streak = 0;
  let checkDate = new Date(today() + 'T00:00:00');
  for (const dateStr of trained) {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) { streak++; checkDate = d; }
    else break;
  }
  return streak;
}

/* ── Wiring ── */

function wireProfile(container, user, userId) {
  /* User switcher */
  container.querySelector('#user-switcher')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-user-id]');
    if (card) {
      setActiveUser(card.dataset.userId);
      renderFull(container);
      return;
    }
    if (e.target.closest('#btn-add-user')) {
      if (getUserList().length >= 3) { showToast('Máximo de 3 perfis atingido', 'error'); return; }
      navigate('/onboarding');
    }
  });

  /* Recalculate */
  container.querySelector('#btn-recalc')?.addEventListener('click', () => {
    navigate('/onboarding');
  });

  /* Weight entry */
  container.querySelector('#btn-add-weight')?.addEventListener('click', () => {
    const input = container.querySelector('#weight-input');
    const val   = parseFloat(input?.value);
    if (!val || val < 30 || val > 300) { showToast('Peso inválido', 'error'); return; }
    addWeightEntry(userId, today(), val);
    if (input) input.value = '';
    showToast('Peso registrado!', 'success');
    renderFull(container);
  });

  /* Expand weight history */
  container.querySelector('#btn-expand-weight')?.addEventListener('click', () => {
    const entries = container.querySelector('#weight-entries');
    if (!entries) return;
    const isVisible = entries.style.display !== 'none';
    entries.style.display = isVisible ? 'none' : '';
  });

  /* Clear data */
  container.querySelector('#row-clear-data')?.addEventListener('click', () => {
    if (!confirm('Apagar todos os dados deste perfil? Esta ação não pode ser desfeita.')) return;
    if (user) {
      updateUser(userId, {
        weight_log: [],
        checkins:   [],
        meal_log:   [],
      });
      showToast('Dados apagados', 'default');
      renderFull(container);
    }
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
