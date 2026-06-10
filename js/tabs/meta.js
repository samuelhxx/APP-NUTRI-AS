/* ── Aba Meta ── */

import { getState, addWeightEntry, updateGoalTarget } from '../store.js';
import {
  calcGoalPace, buildProjection, buildSparkline,
  today, formatDate, fmtKg, fmtCurrency,
  showToast, escHtml,
} from '../utils.js';

export function render(container) {
  container.innerHTML = buildHTML();
  wire(container);
}

/* ════ HTML ════ */

function buildHTML() {
  const { profile, goal_target, weight_log } = getState();

  return `
<div class="page-header">
  <h1>Meta</h1>
  <p>Veja se sua meta é realista e acompanhe o progresso real.</p>
</div>

<!-- ① Formulário da meta -->
<div class="mt-section" id="sec-goal-form">
  <div class="mt-section-title">Defina sua meta</div>
  <div class="mt-form">
    <div class="al-row">
      <div class="input-group" style="flex:1">
        <label class="input-label" for="mt-current">Peso atual (kg)</label>
        <input id="mt-current" class="input-field" type="number" min="30" max="300" step="0.1"
          value="${profile.weight_kg}" inputmode="decimal">
      </div>
      <div class="input-group" style="flex:1">
        <label class="input-label" for="mt-target">Peso desejado (kg)</label>
        <input id="mt-target" class="input-field" type="number" min="30" max="300" step="0.1"
          value="${goal_target.target_weight_kg || ''}" placeholder="Ex: 70" inputmode="decimal">
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="mt-deadline">Prazo (data)</label>
      <input id="mt-deadline" class="input-field" type="date"
        min="${minDate()}" value="${goal_target.deadline_date || ''}">
    </div>
    <button class="btn btn--primary btn--full tappable" id="btn-calc-goal">Calcular</button>
  </div>
</div>

<!-- ② Resultado (mostrado após cálculo) -->
<div id="sec-goal-result">
  ${goal_target.target_weight_kg && goal_target.deadline_date
    ? buildResult(profile.weight_kg, goal_target)
    : ''}
</div>

<!-- ③ Registro de peso -->
<div class="mt-section" id="sec-weight-log">
  <div class="mt-section-title">Acompanhamento de peso</div>

  <div class="al-row" style="margin-bottom:var(--s4)">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="wl-weight">Peso hoje (kg)</label>
      <input id="wl-weight" class="input-field" type="number" min="30" max="300" step="0.1"
        placeholder="${profile.weight_kg}" inputmode="decimal">
    </div>
    <button class="btn btn--secondary tappable" id="btn-add-weight" style="align-self:flex-end;white-space:nowrap">
      Registrar
    </button>
  </div>

  <div id="weight-log-display">
    ${buildWeightLog(weight_log, goal_target)}
  </div>
</div>`;
}

function minDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0,10);
}

function buildResult(currentWeight, goal_target) {
  const { target_weight_kg, deadline_date } = goal_target;
  if (!target_weight_kg || !deadline_date) return '';

  const pace = calcGoalPace(currentWeight, target_weight_kg, deadline_date);
  if (!pace) return '';

  const { loss, weeks, needed, safe, isSafe, weeksIdeal, safeDeadline } = pace;

  if (loss <= 0) {
    return `
<div class="mt-section">
  <div class="mt-result mt-result--safe">
    <div class="mt-result-status">✅ Você já está abaixo da meta!</div>
    <p class="mt-result-text">Peso atual (${fmtKg(currentWeight)}) já é menor que o desejado (${fmtKg(target_weight_kg)}).</p>
  </div>
  <div class="al-notice">⚠ Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</div>
</div>`;
  }

  let resultHTML;
  if (isSafe) {
    const proj = buildProjection(currentWeight, needed, target_weight_kg, Math.ceil(weeks)+1);
    resultHTML = `
<div class="mt-result mt-result--safe">
  <div class="mt-result-status">✅ Meta dentro do ritmo saudável</div>
  <p class="mt-result-text">
    Para chegar a <strong>${fmtKg(target_weight_kg)}</strong> até <strong>${formatDate(deadline_date,'DD/MM/YYYY')}</strong>,
    você precisa perder <strong>~${needed.toFixed(2).replace('.',',')} kg/semana</strong>.
  </p>
  <p class="mt-result-sub">
    Ritmo seguro estimado: até ${safe.toFixed(2).replace('.',',')} kg/semana (≈ 1% do peso corporal).
    Está dentro.
  </p>
</div>
${buildProjectionTable(proj, target_weight_kg, deadline_date)}`;
  } else {
    resultHTML = `
<div class="mt-result mt-result--warn">
  <div class="mt-result-status">⚠ Ritmo acima do considerado seguro</div>
  <p class="mt-result-text">
    Essa meta exigiria perder <strong>~${needed.toFixed(2).replace('.',',')} kg/semana</strong> —
    acima do ritmo estimado como seguro (${safe.toFixed(2).replace('.',',')} kg/semana ≈ 1% do peso).
  </p>
  <p class="mt-result-sub">
    Para chegar a ${fmtKg(target_weight_kg)} de forma saudável, o prazo ideal seria
    <strong>~${weeksIdeal} semanas</strong> (até ${formatDate(safeDeadline,'DD/MM/YYYY')}).
  </p>
  <button class="btn btn--secondary tappable" id="btn-use-safe" style="margin-top:var(--s3);width:100%"
    data-safe-date="${safeDeadline}">
    Usar prazo saudável (${formatDate(safeDeadline,'DD/MM/YYYY')})
  </button>
</div>
${buildProjectionTable(buildProjection(currentWeight, safe, target_weight_kg, weeksIdeal+1), target_weight_kg, safeDeadline)}`;
  }

  return `
<div class="mt-section">
  ${resultHTML}
  <div class="al-notice" style="margin-top:var(--s4)">⚠ Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</div>
</div>`;
}

function buildProjectionTable(rows, targetWeight, deadline) {
  if (!rows.length) return '';
  const show = rows.slice(0, 12); /* max 12 weeks shown */
  const hasMore = rows.length > 12;
  return `
<div class="mt-proj-wrap">
  <div class="mt-section-title" style="margin-bottom:var(--s3)">Projeção semana a semana</div>
  <table class="mt-proj-table" aria-label="Projeção de peso">
    <thead><tr><th>Semana</th><th>Peso projetado</th></tr></thead>
    <tbody>
      ${show.map(r => {
        const isGoal = r.weight <= targetWeight;
        return `<tr class="${isGoal?'mt-goal-row':''}">
          <td>Semana ${r.week}</td>
          <td class="tabular-nums">${fmtKg(r.weight)}${isGoal?' ←meta':''}</td>
        </tr>`;
      }).join('')}
      ${hasMore ? `<tr><td colspan="2" style="color:var(--text-secondary);font-size:var(--text-xs)">... e mais ${rows.length-12} semanas até ${formatDate(deadline,'DD/MM/YYYY')}</td></tr>` : ''}
    </tbody>
  </table>
</div>`;
}

function buildWeightLog(weight_log, goal_target) {
  if (!weight_log.length) {
    return `<div class="al-empty">Nenhum peso registrado ainda. Comece hoje.</div>`;
  }

  const last = weight_log[weight_log.length - 1];
  const sparkline = buildSparkline(weight_log, goal_target);

  return `
<div class="mt-last-weight">
  Última medição: <strong>${fmtKg(last.weight_kg)}</strong> em ${formatDate(last.date,'DD/MM/YYYY')}
</div>
${sparkline ? `
<div class="mt-sparkline-wrap">
  ${sparkline}
  <div class="mt-sparkline-legend">
    <span><span class="mt-dot mt-dot--green"></span> Peso real</span>
    ${goal_target?.deadline_date ? `<span><span class="mt-dot mt-dot--orange"></span> Projeção</span>` : ''}
  </div>
</div>` : ''}
<div class="mt-log-list">
  ${weight_log.slice().reverse().slice(0,10).map(e => `
  <div class="mt-log-row">
    <span class="mt-log-date">${formatDate(e.date,'DD/MM/YYYY')}</span>
    <span class="mt-log-val tabular-nums">${fmtKg(e.weight_kg)}</span>
  </div>`).join('')}
  ${weight_log.length > 10 ? `<p style="font-size:var(--text-xs);color:var(--text-disabled);text-align:center;margin-top:var(--s2)">Mostrando as últimas 10 entradas</p>` : ''}
</div>`;
}

/* ════ Wire ════ */

function wire(container) {
  /* Calcular meta */
  container.querySelector('#btn-calc-goal')?.addEventListener('click', () => {
    const current  = parseFloat(container.querySelector('#mt-current')?.value);
    const target   = parseFloat(container.querySelector('#mt-target')?.value);
    const deadline = container.querySelector('#mt-deadline')?.value;

    if (!current || current<30||current>300) { showToast('Peso atual inválido','error'); return; }
    if (!target  || target<30||target>300)   { showToast('Peso desejado inválido','error'); return; }
    if (!deadline)                           { showToast('Informe o prazo','error'); return; }

    updateGoalTarget({ target_weight_kg:target, deadline_date:deadline });
    const { goal_target } = getState();
    container.querySelector('#sec-goal-result').innerHTML =
      buildResult(current, goal_target);
    wireResult(container);
    showToast('Cálculo feito!','success');
  });

  wireResult(container);

  /* Registrar peso — event delegation so the button survives re-renders */
  container.addEventListener('click', e => {
    if (!e.target.closest('#btn-add-weight')) return;
    const inp = container.querySelector('#wl-weight');
    const val = parseFloat(inp?.value);
    if (!val || val<30||val>300) { showToast('Peso inválido (30–300 kg)','error'); return; }
    addWeightEntry(today(), val);
    if (inp) inp.value = '';
    showToast('Peso registrado!','success');
    const { weight_log, goal_target } = getState();
    const logDisplay = container.querySelector('#weight-log-display');
    if (logDisplay) logDisplay.innerHTML = buildWeightLog(weight_log, goal_target);
  });
}

function wireResult(container) {
  /* "Usar prazo saudável" button */
  container.querySelector('#btn-use-safe')?.addEventListener('click', e => {
    const safeDate = e.currentTarget.dataset.safeDate;
    if (!safeDate) return;
    const inp = container.querySelector('#mt-deadline');
    if (inp) inp.value = safeDate;
    updateGoalTarget({ deadline_date: safeDate });
    const { goal_target, profile } = getState();
    container.querySelector('#sec-goal-result').innerHTML =
      buildResult(profile.weight_kg, goal_target);
    wireResult(container);
    showToast('Prazo atualizado!','success');
  });
}
