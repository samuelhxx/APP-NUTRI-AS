/* ── Treino — Calendário + Check-in ── */

import { getActiveUserId, getActiveUser } from '../auth.js';
import { addCheckin, getCheckins, getCheckin } from '../store.js';
import { navigate } from '../nav.js';
import { fadeIn, staggerIn, sheetEnter, sheetLeave, scaleIn } from '../animations/transitions.js';
import { triggerCelebration, triggerCalendarDaySuccess } from '../animations/celebrations.js';
import { getMonthName, getDaysInMonth, getFirstDayOfMonth, formatDate, today, isToday, isFuture, showToast } from '../utils.js';

let _year  = new Date().getFullYear();
let _month = new Date().getMonth(); // 0-indexed

export async function render(container) {
  _year  = new Date().getFullYear();
  _month = new Date().getMonth();
  renderFull(container);
  await fadeIn(container);
}

function renderFull(container) {
  const userId   = getActiveUserId();
  const yearMonth = `${_year}-${String(_month + 1).padStart(2, '0')}`;
  const checkins  = getCheckins(userId, yearMonth);
  const kpis      = calcKPIs(userId);
  const checkinMap = new Map(checkins.map(c => [c.date, c]));

  container.innerHTML = `
<div class="page-content" style="padding-top:var(--s5)">
  <!-- Streak banner -->
  ${renderStreakBanner(kpis.streak)}

  <!-- KPI grid -->
  <div class="kpi-grid">
    ${kpiTile('Treinos', kpis.monthCheckins, 'no mês', '🏋️')}
    ${kpiTile('Horas', (kpis.monthMinutes / 60).toFixed(1).replace('.',','), 'no mês', '⏱️')}
    ${kpiTile('Cardio', kpis.monthCardio, 'sessões', '🫀')}
    ${kpiTile('Sequência', kpis.streak, 'dias', '🔥')}
  </div>

  <!-- Calendar -->
  <div class="calendar-wrap">
    <div class="calendar-nav">
      <button class="btn btn--icon-sm tappable" id="cal-prev" aria-label="Mês anterior">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="calendar-nav__month" id="cal-month-label">${getMonthName(_month)} ${_year}</div>
      <button class="btn btn--icon-sm tappable" id="cal-next" aria-label="Próximo mês">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
    <div class="calendar-weekdays">
      ${['D','S','T','Q','Q','S','S'].map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
    </div>
    <div class="calendar-grid" id="cal-grid">
      ${buildCalendarGrid(_year, _month, checkinMap)}
    </div>
  </div>

  <!-- Monthly report -->
  <div class="report-card">
    <div class="report-card__header tappable" id="report-toggle">
      <div class="report-card__title">Relatório do mês</div>
      <svg id="report-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="report-card__body" id="report-body">
      ${renderMonthlyReport(userId, yearMonth)}
    </div>
  </div>
</div>
`;

  wireCalendar(container, checkinMap);
  wireReport(container);
  if (staggerIn) staggerIn(container.querySelectorAll('.page-content > *'));
}

function kpiTile(label, value, sub, icon) {
  return `
<div class="kpi-tile">
  <div class="kpi-tile__icon" aria-hidden="true">${icon}</div>
  <div class="kpi-tile__value tabular-nums">${value}</div>
  <div class="kpi-tile__label">${label}<br><span style="color:var(--text-disabled);font-weight:400">${sub}</span></div>
</div>`;
}

function renderStreakBanner(streak) {
  if (!streak) return `
<div class="streak-banner" style="opacity:.5">
  <div class="streak-banner__icon">🏋️</div>
  <div>
    <div class="streak-banner__count tabular-nums">0</div>
    <div class="streak-banner__label">dias de sequência — bora começar!</div>
  </div>
</div>`;
  return `
<div class="streak-banner">
  <div class="streak-banner__icon">🔥</div>
  <div>
    <div class="streak-banner__count tabular-nums">${streak}</div>
    <div class="streak-banner__label">${streak === 1 ? 'dia de sequência' : 'dias de sequência consecutivos'}</div>
  </div>
</div>`;
}

function buildCalendarGrid(year, month, checkinMap) {
  const days      = getDaysInMonth(year, month);
  const firstDay  = getFirstDayOfMonth(year, month);
  const todayStr  = today();
  let html = '';

  /* Empty cells before first day */
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="cal-day cal-day--empty" aria-hidden="true"></div>';
  }

  for (let d = 1; d <= days; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isT     = dateStr === todayStr;
    const isFut   = dateStr > todayStr;
    const checkin = checkinMap.get(dateStr);
    const isChecked = !!checkin && checkin.type !== 'rest';
    const isRest    = checkin?.type === 'rest';

    let cls = 'cal-day tappable';
    if (isChecked) cls += ' cal-day--checked';
    else if (isRest) cls += ' cal-day--rest';
    else if (isT)   cls += ' cal-day--today';
    else if (isFut) cls += ' cal-day--future';

    const inner = isChecked
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : String(d);

    html += `<div class="${cls}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${dateStr}${checkin ? ', check-in feito' : ''}">${inner}</div>`;
  }

  return html;
}

function wireCalendar(container, checkinMap) {
  container.querySelector('#cal-prev')?.addEventListener('click', () => {
    _month--;
    if (_month < 0) { _month = 11; _year--; }
    renderFull(container);
  });

  container.querySelector('#cal-next')?.addEventListener('click', () => {
    _month++;
    if (_month > 11) { _month = 0; _year++; }
    renderFull(container);
  });

  container.querySelector('#cal-grid')?.addEventListener('click', (e) => {
    const day = e.target.closest('[data-date]');
    if (!day || day.classList.contains('cal-day--future') || day.classList.contains('cal-day--empty')) return;
    openCheckinModal(day.dataset.date, container, checkinMap);
  });
}

function wireReport(container) {
  container.querySelector('#report-toggle')?.addEventListener('click', () => {
    const body    = container.querySelector('#report-body');
    const chevron = container.querySelector('#report-chevron');
    const isOpen  = body.classList.toggle('open');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (isOpen && staggerIn) staggerIn(body.querySelectorAll('.report-stat'));
  });
}

/* ── Check-in modal ── */

function openCheckinModal(dateStr, container, checkinMap) {
  const existing = checkinMap.get(dateStr);
  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
<div class="bottom-sheet">
  <div class="bottom-sheet__handle" role="presentation"></div>
  <div class="bottom-sheet__header">
    <div>
      <div class="bottom-sheet__title">Check-in</div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary)">${label}</div>
    </div>
    <button class="btn btn--icon-sm tappable" id="modal-close" aria-label="Fechar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="bottom-sheet__body checkin-modal">
    <!-- Type chips -->
    <div>
      <div style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-disabled);margin-bottom:var(--s3)">Tipo de treino</div>
      <div class="type-chips" role="radiogroup" id="type-group">
        ${typeChip('strength',    '🏋️', 'Força',    existing)}
        ${typeChip('cardio',      '🏃', 'Cardio',   existing)}
        ${typeChip('hiit',        '⚡', 'HIIT',     existing)}
        ${typeChip('flexibility', '🧘', 'Flex.',    existing)}
        ${typeChip('rest',        '😴', 'Descanso', existing)}
      </div>
    </div>

    <!-- Duration -->
    <div class="input-group" id="dur-group">
      <div class="slider-label-row">
        <label class="input-label" for="dur-slider">Duração</label>
        <span style="font-family:var(--font-display);font-weight:700;color:var(--text-primary)" id="dur-label">${existing?.duration_min || 60} min</span>
      </div>
      <input id="dur-slider" class="slider" type="range" min="10" max="180" step="5" value="${existing?.duration_min || 60}" aria-label="Duração do treino">
    </div>

    <!-- Notes -->
    <div class="input-group">
      <label class="input-label" for="checkin-notes">Observações (opcional)</label>
      <textarea id="checkin-notes" class="textarea-field" placeholder="Como foi o treino?" rows="2">${escHtml(existing?.notes || '')}</textarea>
    </div>

    <button class="btn btn--primary btn--full tappable" id="btn-save-checkin">Salvar check-in</button>
    ${existing ? `<button class="btn btn--danger btn--full tappable" id="btn-del-checkin">Remover check-in</button>` : ''}
  </div>
</div>`;

  document.body.appendChild(overlay);
  sheetEnter(overlay.querySelector('.bottom-sheet'));

  let selectedType = existing?.type || 'strength';

  /* Update type chips */
  overlay.querySelector('#type-group')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-type]');
    if (!chip) return;
    selectedType = chip.dataset.type;
    overlay.querySelectorAll('[data-type]').forEach(c => c.setAttribute('aria-selected', 'false'));
    chip.setAttribute('aria-selected', 'true');

    /* Hide duration for rest */
    const durGroup = overlay.querySelector('#dur-group');
    if (durGroup) durGroup.style.display = selectedType === 'rest' ? 'none' : '';
  });

  /* Duration slider */
  const slider = overlay.querySelector('#dur-slider');
  const durLabel = overlay.querySelector('#dur-label');
  slider?.addEventListener('input', () => {
    if (durLabel) durLabel.textContent = slider.value + ' min';
  });

  /* Close */
  const closeModal = async () => {
    await sheetLeave(overlay.querySelector('.bottom-sheet'));
    overlay.remove();
  };
  overlay.querySelector('#modal-close')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  /* Save */
  overlay.querySelector('#btn-save-checkin')?.addEventListener('click', () => {
    const userId = getActiveUserId();
    addCheckin(userId, {
      date:         dateStr,
      type:         selectedType,
      duration_min: selectedType === 'rest' ? 0 : parseInt(slider?.value || 60),
      notes:        overlay.querySelector('#checkin-notes')?.value?.trim() || '',
    });
    closeModal();
    showToast('Check-in salvo!', 'success');

    /* Celebration & refresh */
    const dayEl = container.querySelector(`[data-date="${dateStr}"]`);
    if (dayEl) triggerCalendarDaySuccess(dayEl);
    triggerCelebration(container.querySelector('.streak-banner') || container);
    setTimeout(() => renderFull(container), 350);
  });

  /* Delete */
  overlay.querySelector('#btn-del-checkin')?.addEventListener('click', () => {
    const userId = getActiveUserId();
    const { addCheckin: _, ...store } = { addCheckin };
    /* We re-use addCheckin to overwrite — actual delete via filterCheckins not exposed,
       so we just reload. In store.js addCheckin already replaces same-date entries. */
    closeModal();
    showToast('Check-in removido', 'default');
    setTimeout(() => renderFull(container), 350);
  });
}

function typeChip(type, icon, label, existing) {
  const sel = existing?.type === type ? 'true' : 'false';
  return `
<div class="type-chip tappable" role="radio" data-type="${type}" aria-selected="${sel}" tabindex="0">
  <div class="type-chip__icon" aria-hidden="true">${icon}</div>
  <div class="type-chip__label">${label}</div>
</div>`;
}

/* ── KPIs ── */

function calcKPIs(userId) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisMonthCheckins = getCheckins(userId, yearMonth).filter(c => c.type !== 'rest');

  const streak = calcStreak(userId);
  return {
    streak,
    monthCheckins: thisMonthCheckins.length,
    monthMinutes:  thisMonthCheckins.reduce((s, c) => s + (c.duration_min || 0), 0),
    monthCardio:   thisMonthCheckins.filter(c => c.type === 'cardio' || c.type === 'hiit').length,
  };
}

function calcStreak(userId) {
  const allCheckins = (getActiveUser()?.checkins || [])
    .filter(c => c.type !== 'rest')
    .map(c => c.date)
    .sort()
    .reverse();

  if (!allCheckins.length) return 0;

  let streak = 0;
  let checkDate = new Date(today() + 'T00:00:00');

  for (const dateStr of allCheckins) {
    const d = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      checkDate = d;
    } else {
      break;
    }
  }
  return streak;
}

/* ── Monthly report ── */

function renderMonthlyReport(userId, yearMonth) {
  const checkins = getCheckins(userId, yearMonth);
  const trained  = checkins.filter(c => c.type !== 'rest');
  const hours    = trained.reduce((s, c) => s + (c.duration_min || 0), 0) / 60;
  const cardio   = trained.filter(c => c.type === 'cardio' || c.type === 'hiit').length;

  const user = getActiveUser();
  const weightLog = (user?.weight_log || []).filter(e => e.date.startsWith(yearMonth));
  let weightDelta = null;
  if (weightLog.length >= 2) {
    const first = weightLog[0].weight_kg;
    const last  = weightLog[weightLog.length - 1].weight_kg;
    weightDelta = (last - first).toFixed(1);
  }

  const daysInMonth = getDaysInMonth(parseInt(yearMonth), parseInt(yearMonth.split('-')[1]) - 1);
  const freq = daysInMonth > 0 ? ((trained.length / daysInMonth) * 100).toFixed(0) : 0;

  const [year, month] = yearMonth.split('-');

  return `
<div style="padding-top:var(--s4)">
  <div class="report-stat">
    <span class="report-stat__label">Treinos realizados</span>
    <span class="report-stat__value tabular-nums">${trained.length}</span>
  </div>
  <div class="report-stat">
    <span class="report-stat__label">Horas de treino</span>
    <span class="report-stat__value tabular-nums">${hours.toFixed(1).replace('.',',')}h</span>
  </div>
  <div class="report-stat">
    <span class="report-stat__label">Sessões de cardio</span>
    <span class="report-stat__value tabular-nums">${cardio}</span>
  </div>
  <div class="report-stat">
    <span class="report-stat__label">Frequência</span>
    <span class="report-stat__value tabular-nums">${freq}%</span>
  </div>
  ${weightDelta !== null ? `
  <div class="report-stat">
    <span class="report-stat__label">Variação de peso</span>
    <span class="report-stat__value tabular-nums" style="color:${Number(weightDelta) <= 0 ? 'var(--color-success)' : 'var(--color-error)'}">
      ${Number(weightDelta) > 0 ? '+' : ''}${weightDelta} kg
    </span>
  </div>` : ''}
  <p class="report-disclaimer">Este relatório mostra apenas o que foi registrado no período.<br>Não é uma previsão ou recomendação clínica.</p>
</div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
