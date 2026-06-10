/* ── Aba Treinos ── */

import { getActiveUser, addCheckin, removeCheckin } from '../store.js';
import { formatDate, openSheet, showToast } from '../utils.js';

let _year, _month;

export function render(screen) {
  const user = getActiveUser();
  if (!user) {
    screen.innerHTML = `<div class="empty-screen"><p>Nenhum perfil ativo.</p><button class="btn btn--primary" onclick="window.__vortexGo('perfil')">Criar perfil</button></div>`;
    return;
  }

  const now = new Date();
  if (_year === undefined) { _year = now.getFullYear(); _month = now.getMonth(); }

  screen.innerHTML = _html(user.checkins, now);
  _attach(screen, user.checkins, now);
}

/* ─── HTML ─── */

function _html(checkins, now) {
  const kpis = _calcKpis(checkins, _year, _month);
  return `
    <div class="page-header">
      <h1>Treinos</h1>
      <p>Marque seus treinos e acompanhe sua sequência.</p>
    </div>
    <div class="section">
      <div class="tr-kpi-grid">
        ${_kpi(kpis.count,    'Treinos')}
        ${_kpi(_fmtH(kpis.minutes), 'Horas')}
        ${_kpi(kpis.cardio,   'Com cardio')}
        ${_kpi(kpis.streak + 'd', 'Sequência')}
      </div>
    </div>
    <div class="section">
      ${_calendar(checkins, now)}
    </div>
    <div class="tab-footer"></div>`;
}

function _kpi(val, label) {
  return `<div class="tr-kpi"><div class="tr-kpi-val">${val}</div><div class="tr-kpi-label">${label}</div></div>`;
}

function _fmtH(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${m ? m + 'm' : ''}` : `${m}m`;
}

function _calendar(checkins, now) {
  const todayStr  = formatDate(now);
  const checkMap  = new Map(checkins.map(c => [c.date, c]));
  const daysInMon = new Date(_year, _month + 1, 0).getDate();
  const firstDay  = new Date(_year, _month, 1).getDay(); // 0=Sun

  const monthLabel = new Date(_year, _month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const isCurrentMon = _year === now.getFullYear() && _month === now.getMonth();

  const WDAYS = ['D','S','T','Q','Q','S','S'];
  const wdays = WDAYS.map(d => `<div>${d}</div>`).join('');

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="tr-day tr-day--empty"></div>`;

  for (let d = 1; d <= daysInMon; d++) {
    const iso    = `${_year}-${String(_month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = iso === todayStr;
    const isFuture = iso > todayStr;
    const checkin  = checkMap.get(iso);
    let cls = 'tr-day';
    if (isFuture)  cls += ' tr-day--future';
    if (isToday)   cls += ' tr-day--today';
    if (checkin)   cls += ' tr-day--checked';
    const pin = checkin?.has_cardio ? '<span class="tr-cardio-pin"></span>' : '';
    cells += `<div class="${cls}" data-date="${iso}">${d}${pin}</div>`;
  }

  return `
    <div class="tr-cal-header">
      <button class="tr-nav-btn" id="tr-prev" aria-label="Mês anterior">‹</button>
      <div class="tr-month-label">${monthLabel}</div>
      <button class="tr-nav-btn" id="tr-next" aria-label="Próximo mês"${isCurrentMon?' disabled':''}>›</button>
    </div>
    <div class="tr-weekdays">${wdays}</div>
    <div class="tr-cal-grid">${cells}</div>
    <div class="tr-legend">
      <span class="tr-legend-item tr-legend-checked">■ Treino registrado</span>
      <span class="tr-legend-item tr-legend-today">■ Hoje</span>
      <span class="tr-legend-item tr-legend-cardio">● Cardio</span>
    </div>`;
}

/* ─── KPIs ─── */

function _calcKpis(checkins, year, month) {
  const pfx = `${year}-${String(month+1).padStart(2,'0')}`;
  const mon = checkins.filter(c => c.date.startsWith(pfx));
  const count   = mon.length;
  const minutes = mon.reduce((s, c) => s + (c.duration_min || 0), 0);
  const cardio  = mon.filter(c => c.has_cardio).length;

  // Streak: consecutive days up to today
  const today = formatDate();
  const dates = new Set(checkins.map(c => c.date));
  let streak = 0, d = new Date(today + 'T00:00:00');
  while (dates.has(formatDate(d))) { streak++; d.setDate(d.getDate() - 1); }

  return { count, minutes, cardio, streak };
}

/* ─── Eventos ─── */

function _attach(screen, checkins, now) {
  screen.querySelector('#tr-prev')?.addEventListener('click', () => {
    _month--;
    if (_month < 0) { _month = 11; _year--; }
    window.__vortexGo?.('treinos');
  });

  screen.querySelector('#tr-next')?.addEventListener('click', () => {
    const nowM = new Date();
    if (_year < nowM.getFullYear() || (_year === nowM.getFullYear() && _month < nowM.getMonth())) {
      _month++;
      if (_month > 11) { _month = 0; _year++; }
      window.__vortexGo?.('treinos');
    }
  });

  screen.querySelectorAll('.tr-day[data-date]').forEach(el => {
    el.addEventListener('click', () => _openCheckin(el.dataset.date, checkins));
  });
}

function _openCheckin(date, checkins) {
  const existing = checkins.find(c => c.date === date);
  const d = new Date(date + 'T00:00:00');
  const label = d.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });

  const html = `
    <div class="tr-sheet-date">${label}</div>
    <div class="al-row" style="margin-bottom:var(--s4)">
      <label class="al-label">Duração (min)</label>
      <input id="tr-dur" type="number" class="input-field" value="${existing?.duration_min || 60}" min="10" max="300" step="5">
    </div>
    <div class="al-row" style="margin-bottom:var(--s5)">
      <label class="al-label">Cardio?</label>
      <div class="al-toggle" id="tr-tog-cardio">
        <div class="al-toggle-opt${!existing?.has_cardio?' sel':''}" data-val="0">Não</div>
        <div class="al-toggle-opt${existing?.has_cardio?' sel':''}"  data-val="1">Sim</div>
      </div>
    </div>
    <div style="display:flex;gap:var(--s3)">
      <button class="btn btn--primary" id="tr-save" style="flex:1">Salvar</button>
      ${existing ? `<button class="btn btn--ghost" id="tr-del" style="flex:1">Remover</button>` : ''}
    </div>`;

  const sheet = openSheet(html, 'Check-in');

  sheet.body.querySelectorAll('#tr-tog-cardio .al-toggle-opt').forEach(o =>
    o.addEventListener('click', () => {
      sheet.body.querySelectorAll('#tr-tog-cardio .al-toggle-opt').forEach(x => x.classList.remove('sel'));
      o.classList.add('sel');
    })
  );

  sheet.body.querySelector('#tr-save')?.addEventListener('click', () => {
    const duration_min = +sheet.body.querySelector('#tr-dur').value || 60;
    const has_cardio   = sheet.body.querySelector('#tr-tog-cardio .sel')?.dataset.val === '1';
    addCheckin({ id: date, date, duration_min, has_cardio, created_at: new Date().toISOString() });
    sheet.close();
    showToast('Treino salvo!', 'success');
    window.__vortexGo?.('treinos');
  });

  sheet.body.querySelector('#tr-del')?.addEventListener('click', () => {
    removeCheckin(date);
    sheet.close();
    showToast('Treino removido.', 'default');
    window.__vortexGo?.('treinos');
  });
}
