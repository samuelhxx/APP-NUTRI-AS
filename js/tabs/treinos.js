/* ── Aba Treinos ── */

import { getState, addCheckin, removeCheckin } from '../store.js';
import {
  today, isToday, isFuture, getDaysInMonth, getFirstWeekday,
  getMonthLabel, formatDate, openSheet, showToast,
} from '../utils.js';

let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();

export function render(container) {
  viewYear  = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  container.innerHTML = buildHTML();
  wire(container);
}

/* ════ HTML ════ */

function buildHTML() {
  const { checkins } = getState();
  const monthCheckins = checkins.filter(c => {
    const ym = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
    return c.date.startsWith(ym);
  });
  const totalMin  = monthCheckins.reduce((s,c) => s+(c.duration_min||0), 0);
  const cardioQt  = monthCheckins.filter(c => c.cardio).length;
  const h = Math.floor(totalMin/60);
  const m = totalMin % 60;

  return `
<div class="page-header">
  <h1>Treinos</h1>
  <p>Registre seus treinos. O app mostra só o que você fez.</p>
</div>

<div class="tr-content">
  <!-- Resumo do mês -->
  <div class="tr-summary">
    <div class="tr-kpi">
      <div class="tr-kpi-val tabular-nums">${monthCheckins.length}</div>
      <div class="tr-kpi-label">Treinos</div>
    </div>
    <div class="tr-kpi">
      <div class="tr-kpi-val tabular-nums">${h}h${m>0?` ${m}m`:''}</div>
      <div class="tr-kpi-label">Total</div>
    </div>
    <div class="tr-kpi">
      <div class="tr-kpi-val tabular-nums">${cardioQt}</div>
      <div class="tr-kpi-label">Com cardio</div>
    </div>
  </div>

  <!-- Calendário -->
  <div class="tr-cal-header">
    <button class="tr-nav-btn tappable" id="btn-prev" aria-label="Mês anterior">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="tr-month-label" id="month-label">${getMonthLabel(viewYear, viewMonth)}</div>
    <button class="tr-nav-btn tappable" id="btn-next" aria-label="Próximo mês">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>

  <div class="tr-weekdays">
    ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=>`<div>${d}</div>`).join('')}
  </div>

  <div class="tr-cal-grid" id="cal-grid">
    ${buildCalGrid(viewYear, viewMonth, getState().checkins)}
  </div>

  <div class="tr-legend">
    <span class="tr-legend-item tr-legend-checked">■ Treinado</span>
    <span class="tr-legend-item tr-legend-today">■ Hoje</span>
    <span class="tr-legend-item tr-legend-cardio">• Cardio</span>
  </div>

  <div class="tr-note">Toque em qualquer dia do passado (ou hoje) para registrar o treino.</div>
</div>`;
}

function buildCalGrid(year, month, checkins) {
  const days    = getDaysInMonth(year, month);
  const offset  = getFirstWeekday(year, month);
  const ym      = `${year}-${String(month+1).padStart(2,'0')}`;
  const byDate  = {};
  checkins.filter(c => c.date.startsWith(ym)).forEach(c => { byDate[c.date] = c; });

  let html = '';
  for (let i = 0; i < offset; i++) {
    html += `<div class="tr-day tr-day--empty"></div>`;
  }
  for (let d = 1; d <= days; d++) {
    const dateStr = `${ym}-${String(d).padStart(2,'0')}`;
    const checkin = byDate[dateStr];
    const isT     = isToday(dateStr);
    const isFut   = isFuture(dateStr);
    let cls = 'tr-day tappable';
    if (checkin) cls += ' tr-day--checked';
    if (isT)     cls += ' tr-day--today';
    if (isFut)   cls += ' tr-day--future';
    const cardioPin = checkin?.cardio ? '<span class="tr-cardio-pin" aria-label="cardio"></span>' : '';
    html += `<div class="${cls}" data-date="${dateStr}" role="button" tabindex="${isFut?'-1':'0'}" aria-label="Dia ${d}${checkin?' — treinado':''}">${d}${cardioPin}</div>`;
  }
  return html;
}

/* ════ Wire ════ */

function wire(container) {
  /* Navegação de mês */
  container.querySelector('#btn-prev')?.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    rerenderCal(container);
  });
  container.querySelector('#btn-next')?.addEventListener('click', () => {
    const now = new Date();
    const maxYear = now.getFullYear();
    const maxMonth = now.getMonth();
    if (viewYear > maxYear || (viewYear === maxYear && viewMonth >= maxMonth)) return;
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    rerenderCal(container);
  });

  /* Click em dia */
  container.querySelector('#cal-grid')?.addEventListener('click', e => {
    const day = e.target.closest('[data-date]');
    if (!day || day.classList.contains('tr-day--future')) return;
    openCheckinSheet(day.dataset.date, container);
  });
  container.querySelector('#cal-grid')?.addEventListener('keydown', e => {
    if (e.key==='Enter'||e.key===' ') {
      const day = e.target.closest('[data-date]');
      if (day && !day.classList.contains('tr-day--future')) openCheckinSheet(day.dataset.date, container);
    }
  });
}

function rerenderCal(container) {
  const { checkins } = getState();
  container.querySelector('#month-label').textContent = getMonthLabel(viewYear, viewMonth);
  container.querySelector('#cal-grid').innerHTML = buildCalGrid(viewYear, viewMonth, checkins);
  refreshSummary(container);
}

function refreshSummary(container) {
  const { checkins } = getState();
  const ym = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
  const mc = checkins.filter(c => c.date.startsWith(ym));
  const totalMin = mc.reduce((s,c)=>s+(c.duration_min||0),0);
  const h = Math.floor(totalMin/60);
  const m = totalMin%60;
  const vals = container.querySelectorAll('.tr-kpi-val');
  if (vals[0]) vals[0].textContent = mc.length;
  if (vals[1]) vals[1].textContent = `${h}h${m>0?` ${m}m`:''}`;
  if (vals[2]) vals[2].textContent = mc.filter(c=>c.cardio).length;
}

/* ── Check-in sheet ── */

function buildCheckinHTML(dateStr, existing) {
  const dur = existing?.duration_min ?? 60;
  const cardio = existing?.cardio ?? false;
  return `
<div class="tr-sheet-date">${formatDate(dateStr,'DD/MM/YYYY')}</div>

<div class="input-group" style="margin-bottom:var(--s5)">
  <div class="tr-slider-row">
    <label class="input-label" for="dur-slider">Duração</label>
    <span class="tr-dur-val" id="dur-val">${dur} min</span>
  </div>
  <input id="dur-slider" class="slider" type="range" min="10" max="240" step="5" value="${dur}">
  <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-disabled);margin-top:4px">
    <span>10 min</span><span>4 h</span>
  </div>
</div>

<div class="input-group" style="margin-bottom:var(--s5)">
  <div class="input-label" style="margin-bottom:var(--s2)">Incluiu cardio?</div>
  <div class="tr-cardio-toggle">
    <div class="tr-ctog-opt tappable ${!cardio?'sel':''}" data-cardio="false">Não</div>
    <div class="tr-ctog-opt tappable ${cardio?'sel':''}" data-cardio="true">Sim</div>
  </div>
</div>

<div style="display:flex;gap:var(--s3)">
  ${existing ? `<button class="btn btn--danger btn--full tappable" id="btn-remove-checkin">Apagar</button>` : ''}
  <button class="btn btn--primary btn--full tappable" id="btn-save-checkin">Salvar treino</button>
</div>`;
}

function openCheckinSheet(dateStr, container) {
  const { checkins } = getState();
  const existing = checkins.find(c => c.date === dateStr) || null;
  const sheet = openSheet(buildCheckinHTML(dateStr, existing), isToday(dateStr)?'Treino de hoje':'Treino do dia', {
    onClose: () => rerenderCal(container),
  });

  const inner = () => document.querySelector('.sheet-inner');

  /* Duration slider */
  inner()?.querySelector('#dur-slider')?.addEventListener('input', e => {
    const v = inner()?.querySelector('#dur-val');
    if (v) v.textContent = e.target.value + ' min';
  });

  /* Cardio toggle */
  inner()?.querySelectorAll('.tr-ctog-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      inner()?.querySelectorAll('.tr-ctog-opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
    });
  });

  /* Save */
  inner()?.querySelector('#btn-save-checkin')?.addEventListener('click', () => {
    const dur   = parseInt(inner()?.querySelector('#dur-slider')?.value) || 60;
    const cardio = inner()?.querySelector('.tr-ctog-opt.sel')?.dataset.cardio === 'true';
    addCheckin({ date:dateStr, duration_min:dur, cardio });
    showToast('Treino registrado!','success');
    sheet.close();
  });

  /* Remove */
  inner()?.querySelector('#btn-remove-checkin')?.addEventListener('click', () => {
    removeCheckin(dateStr);
    showToast('Treino removido','default');
    sheet.close();
  });
}
