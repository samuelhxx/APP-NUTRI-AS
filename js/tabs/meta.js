/* ── Aba Meta ── */

import { getActiveUser as _getUser, addWeightEntry, updateGoalTarget } from '../store.js';
import { calcGoalPace, buildProjection, buildSparkline, formatDate, formatDateBR, openSheet, showToast } from '../utils.js';

export function render(screen) {
  const user = getActiveUser();
  if (!user) {
    screen.innerHTML = `<div class="empty-screen"><p>Nenhum perfil ativo.</p><button class="btn btn--primary" onclick="window.__vortexGo('perfil')">Criar perfil</button></div>`;
    return;
  }
  screen.innerHTML = _html(user);
  _attach(screen, user);
}

/* ─── HTML ─── */

function _html(user) {
  const { profile, goal_target, weight_log } = user;
  const currentWeight = weight_log.length ? weight_log[weight_log.length - 1].weight_kg : profile.weight_kg;

  const minDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  return `
    <div class="page-header">
      <h1>Meta</h1>
      <p>Calcule o ritmo necessário e acompanhe sua evolução de peso.</p>
    </div>

    <div class="section">
      <div class="section-title">Definir meta de peso</div>
      <div class="mt-form">
        <div class="al-row">
          <label class="al-label">Peso atual (kg)</label>
          <input id="mt-curr" type="number" class="input-field" value="${currentWeight}" min="30" max="300" step="0.1">
        </div>
        <div class="al-row">
          <label class="al-label">Peso desejado (kg)</label>
          <input id="mt-tgt"  type="number" class="input-field" value="${goal_target?.target_weight_kg || ''}" min="30" max="300" step="0.1" placeholder="65">
        </div>
        <div class="al-row">
          <label class="al-label">Prazo (data)</label>
          <input id="mt-date" type="date" class="input-field" value="${goal_target?.deadline_date || ''}" min="${minDate}">
        </div>
        <button class="btn btn--primary" id="mt-calc">Calcular ritmo</button>
      </div>
    </div>

    <div id="sec-result">${goal_target?.target_weight_kg && goal_target?.deadline_date ? _result(currentWeight, goal_target) : ''}</div>

    <div class="section">
      <div class="section-title">Registro de peso</div>
      <div class="al-row" style="gap:var(--s3);margin-bottom:var(--s4)">
        <input id="mt-wpeso" type="number" class="input-field" style="flex:1" min="30" max="300" step="0.1" placeholder="Seu peso hoje (kg)">
        <button class="btn btn--secondary" id="mt-wadd" style="flex-shrink:0">Registrar</button>
      </div>
      <div id="mt-sparkline-wrap" class="mt-sparkline-wrap">
        ${buildSparkline(weight_log, goal_target)}
      </div>
      <div id="mt-log-list">${_weightList(weight_log)}</div>
    </div>

    <div class="al-notice">Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</div>
    <div class="tab-footer"></div>`;
}

function _result(currentWeight, goal_target) {
  const { target_weight_kg, deadline_date } = goal_target;
  if (!target_weight_kg || !deadline_date) return '';

  const pace = calcGoalPace(currentWeight, target_weight_kg, deadline_date);
  if (pace.totalLoss <= 0) return `<div class="section"><div class="mt-result mt-result--safe"><div class="mt-result-status">Você já está na meta!</div></div></div>`;

  if (pace.isSafe) {
    const proj = buildProjection(currentWeight, pace.needed, target_weight_kg);
    return `<div class="section">
      <div class="mt-result mt-result--safe">
        <div class="mt-result-status">Ritmo saudável ✓</div>
        <div class="mt-result-text">Para chegar a <strong>${target_weight_kg}kg</strong> até ${formatDateBR(deadline_date)}, você precisa perder <strong>~${pace.needed}kg/semana</strong>.</div>
        <div class="mt-result-sub">Isso está dentro do ritmo considerado seguro (até ${pace.safe}kg/semana para você).</div>
      </div>
      ${_projTable(proj, target_weight_kg)}
    </div>`;
  } else {
    const safeProj = buildProjection(currentWeight, pace.safe, target_weight_kg);
    return `<div class="section">
      <div class="mt-result mt-result--warn">
        <div class="mt-result-status">Ritmo agressivo — atenção</div>
        <div class="mt-result-text">Essa meta exigiria perder <strong>~${pace.needed}kg/semana</strong>, acima do ritmo considerado seguro (até <strong>${pace.safe}kg/semana</strong> para você).</div>
        <div class="mt-result-sub">Para chegar de forma saudável, o prazo ideal seria <strong>~${pace.weeksIdeal} semanas</strong> (até ${formatDateBR(pace.safeDeadline)}).</div>
        <button class="btn btn--secondary mt-use-safe" data-safe="${pace.safeDeadline}" style="margin-top:var(--s4);width:100%">Usar prazo saudável</button>
      </div>
      ${_projTable(safeProj, target_weight_kg)}
    </div>`;
  }
}

function _projTable(proj, target) {
  const show = proj.length <= 13 ? proj : [...proj.slice(0, 12), proj[proj.length - 1]];
  const extra = proj.length > 13 ? proj.length - 13 : 0;
  const rows = show.map((r, i) => {
    const isTarget = r.weight <= target;
    return `<tr${isTarget ? ' class="mt-goal-row"' : ''}>
      <td>${r.week === 0 ? 'Hoje' : `Sem. ${r.week}`}</td>
      <td>${r.weight.toFixed(1)} kg</td>
    </tr>`;
  }).join('');
  return `<div class="mt-proj-wrap">
    <table class="mt-proj-table">
      <thead><tr><th>Semana</th><th>Peso estimado</th></tr></thead>
      <tbody>${rows}${extra ? `<tr><td colspan="2" style="color:var(--text-secondary);text-align:center;font-size:var(--text-xs)">… e mais ${extra} semanas</td></tr>` : ''}</tbody>
    </table>
  </div>`;
}

function _weightList(log) {
  if (!log.length) return '<p style="font-size:var(--text-xs);color:var(--text-secondary)">Nenhum registro ainda.</p>';
  return [...log].reverse().slice(0, 10).map(e => `
    <div class="mt-log-row">
      <span class="mt-log-date">${formatDateBR(e.date)}</span>
      <span class="mt-log-val">${e.weight_kg.toFixed(1)} kg</span>
    </div>`).join('');
}

/* ─── Eventos ─── */

function _attach(screen, user) {
  /* Calcular ritmo */
  screen.querySelector('#mt-calc')?.addEventListener('click', () => {
    const curr = +screen.querySelector('#mt-curr').value;
    const tgt  = +screen.querySelector('#mt-tgt').value;
    const date = screen.querySelector('#mt-date').value;

    if (!curr || !tgt || !date) { showToast('Preencha todos os campos.', 'warn'); return; }
    if (tgt >= curr) { showToast('O peso desejado deve ser menor que o atual.', 'warn'); return; }

    updateGoalTarget({ target_weight_kg: tgt, deadline_date: date, start_weight_kg: curr, start_date: formatDate() });
    const el = screen.querySelector('#sec-result');
    if (el) el.innerHTML = _result(curr, { target_weight_kg: tgt, deadline_date: date });
    showToast('Meta calculada!', 'success');
  });

  /* Usar prazo saudável */
  screen.addEventListener('click', e => {
    if (!e.target.closest('.mt-use-safe')) return;
    const safeDate = e.target.closest('.mt-use-safe').dataset.safe;
    screen.querySelector('#mt-date').value = safeDate;
    screen.querySelector('#mt-calc').click();
  });

  /* Registrar peso */
  screen.querySelector('#mt-wadd')?.addEventListener('click', () => {
    const val = +screen.querySelector('#mt-wpeso').value;
    if (!val || val < 30 || val > 300) { showToast('Peso inválido.', 'warn'); return; }

    const today = formatDate();
    addWeightEntry(today, val);
    screen.querySelector('#mt-wpeso').value = '';
    showToast('Peso registrado!', 'success');

    /* Atualiza só sparkline e log list sem re-renderizar a aba */
    const fresh = getActiveUser();
    const sparkEl = screen.querySelector('#mt-sparkline-wrap');
    if (sparkEl) sparkEl.innerHTML = buildSparkline(fresh.weight_log, fresh.goal_target);
    const listEl = screen.querySelector('#mt-log-list');
    if (listEl) listEl.innerHTML = _weightList(fresh.weight_log);
  });
}

function getActiveUser() { return _getUser(); }
