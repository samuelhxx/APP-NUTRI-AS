/* ── Utilities, cálculos e helpers de UI ── */

/* ─── Datas ─── */

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(dateStr, fmt = 'DD/MM') {
  const d = new Date(dateStr + 'T12:00:00');
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return fmt.replace('DD',dd).replace('MM',mm).replace('YYYY',yyyy);
}

export function getMonthLabel(year, month) {
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${MONTHS[month]} ${year}`;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month+1, 0).getDate();
}

export function getFirstWeekday(year, month) {
  /* 0=Mon … 6=Sun */
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function isToday(dateStr)  { return dateStr === today(); }
export function isFuture(dateStr) { return dateStr > today(); }

export function weeksBetween(dateA, dateB) {
  const a = new Date(dateA+'T12:00:00');
  const b = new Date(dateB+'T12:00:00');
  return (b - a) / (1000*60*60*24*7);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr+'T12:00:00');
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}

/* ─── Nutrição ─── */

const ACTIVITY = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725 };
const GOAL_ADJ  = { cut:-300, maintain:0, bulk:300 };

export function calcTargets({ weight_kg, height_cm, age, sex, activity_level, goal }) {
  const tmb = sex === 'M'
    ? 10*weight_kg + 6.25*height_cm - 5*age + 5
    : 10*weight_kg + 6.25*height_cm - 5*age - 161;
  const tdee = tmb * (ACTIVITY[activity_level] || 1.55);
  const kcal = Math.round(tdee + (GOAL_ADJ[goal] || 0));
  const protein_g = Math.round(weight_kg * 2.0);
  const fat_g     = Math.round(weight_kg * 0.9);
  const carbs_g   = Math.max(0, Math.round((kcal - protein_g*4 - fat_g*9) / 4));
  return { kcal, protein_g, fat_g, carbs_g };
}

export function calcMarmitaMacros(portions, bank) {
  const t = { kcal:0, protein_g:0, carbs_g:0, fat_g:0 };
  for (const p of portions) {
    const ing = bank.find(b => b.id === p.ingredient_id);
    if (!ing) continue;
    const r = p.grams / 100;
    t.kcal      += ing.kcal      * r;
    t.protein_g += ing.protein_g * r;
    t.carbs_g   += ing.carbs_g   * r;
    t.fat_g     += ing.fat_g     * r;
  }
  return { kcal:Math.round(t.kcal), protein_g:Math.round(t.protein_g),
           carbs_g:Math.round(t.carbs_g), fat_g:Math.round(t.fat_g) };
}

export function calcShoppingList(portions, bank, marmitas, people) {
  let totalCost = 0;
  const items = [];
  for (const p of portions) {
    const ing = bank.find(b => b.id === p.ingredient_id);
    if (!ing) continue;
    const totalKg = (p.grams * marmitas * people) / 1000;
    const cost    = totalKg * (ing.price_per_kg || 0);
    totalCost += cost;
    items.push({ name:ing.name, totalKg:+totalKg.toFixed(3), cost:+cost.toFixed(2) });
  }
  return { items, totalCost:+totalCost.toFixed(2) };
}

/* ─── Meta / ritmo ─── */

export function safeRate(weight_kg) { return weight_kg * 0.01; }

export function calcGoalPace(current, target, deadlineDate) {
  const weeks = weeksBetween(today(), deadlineDate);
  if (weeks <= 0) return null;
  const loss   = current - target;
  const needed = loss / weeks;
  const safe   = safeRate(current);
  const weeksIdeal = loss > 0 ? Math.ceil(loss / safe) : 0;
  const safeDeadline = loss > 0 ? addDays(today(), weeksIdeal * 7) : deadlineDate;
  return {
    loss:         +loss.toFixed(1),
    weeks:        +weeks.toFixed(1),
    needed:       +needed.toFixed(2),
    safe:         +safe.toFixed(2),
    isSafe:       needed <= safe,
    weeksIdeal,
    safeDeadline,
  };
}

export function buildProjection(startWeight, ratePerWeek, targetWeight, maxWeeks) {
  const rows = [];
  for (let i = 1; i <= Math.min(maxWeeks, 52); i++) {
    const w = +(startWeight - ratePerWeek*i).toFixed(1);
    rows.push({ week:i, weight:Math.max(w, targetWeight) });
    if (w <= targetWeight) break;
  }
  return rows;
}

/* ─── Sparkline SVG ─── */

export function buildSparkline(weightLog, goalTarget) {
  const W=300, H=90, P=12;
  const entries = weightLog.slice(-20);
  if (!entries.length && !goalTarget?.deadline_date) return '';

  const allW = entries.map(e=>e.weight_kg);
  if (goalTarget?.target_weight_kg) allW.push(goalTarget.target_weight_kg);
  if (!allW.length) return '';

  const minW = Math.min(...allW) - 1;
  const maxW = Math.max(...allW) + 1;
  const wr   = maxW - minW || 1;

  const allDates = entries.map(e=>e.date);
  if (goalTarget?.deadline_date) allDates.push(goalTarget.deadline_date);
  if (entries.length && !allDates.includes(entries[0].date)) allDates.unshift(entries[0].date);
  const startMs = new Date(allDates[0]+'T12:00:00').getTime();
  const endMs   = new Date(allDates[allDates.length-1]+'T12:00:00').getTime();
  const dr = endMs - startMs || 1;

  const tx = d => P + ((new Date(d+'T12:00:00').getTime() - startMs) / dr) * (W-2*P);
  const ty = w => P + ((maxW-w)/wr) * (H-2*P);

  const actualPts = entries.map(e => `${tx(e.date).toFixed(1)},${ty(e.weight_kg).toFixed(1)}`).join(' ');

  let projLine = '';
  if (goalTarget?.deadline_date && goalTarget?.target_weight_kg && entries.length) {
    const sx = tx(entries[0].date).toFixed(1);
    const sy = ty(entries[0].weight_kg).toFixed(1);
    const ex = tx(goalTarget.deadline_date).toFixed(1);
    const ey = ty(goalTarget.target_weight_kg).toFixed(1);
    projLine = `<polyline points="${sx},${sy} ${ex},${ey}" fill="none" stroke="rgba(255,90,31,.45)" stroke-width="1.5" stroke-dasharray="5,4" stroke-linecap="round"/>`;
  }

  const lastX = entries.length ? tx(entries[entries.length-1].date).toFixed(1) : null;
  const lastY = entries.length ? ty(entries[entries.length-1].weight_kg).toFixed(1) : null;

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px" aria-label="Gráfico de peso">
  <defs>
    <linearGradient id="wg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#A8FF60"/><stop offset="100%" stop-color="#60DDFF"/>
    </linearGradient>
  </defs>
  ${projLine}
  ${actualPts ? `<polyline points="${actualPts}" fill="none" stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
  ${lastX ? `<circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--color-success)"/>` : ''}
</svg>`;
}

/* ─── UI helpers ─── */

export function uuid() {
  return crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0;
      return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });
}

export function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function fmtKg(v) {
  return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' kg';
}

export function fmtCurrency(v) {
  return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}

export function showToast(msg, type='default', ms=3000) {
  const wrap = document.getElementById('toast-container');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type!=='default' ? ` toast--${type}` : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* Opens a slide-up bottom sheet appended to body.
   Returns { close, setContent(html) }. */
export function openSheet(html, title, { onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed','inset:0','background:rgba(0,0,0,.72)',
    'backdrop-filter:blur(4px)','-webkit-backdrop-filter:blur(4px)',
    'z-index:1000','display:flex','align-items:flex-end','justify-content:center',
  ].join(';');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'width:100%','max-width:480px','background:var(--bg-elevated)',
    'border-radius:20px 20px 0 0','border-top:1px solid var(--border-subtle)',
    'padding-bottom:calc(var(--s8) + var(--safe-bottom))',
    'max-height:90vh','overflow-y:auto','-webkit-overflow-scrolling:touch',
    'transform:translateY(100%)','transition:transform 280ms cubic-bezier(0.16,1,0.3,1)',
  ].join(';');

  const buildInner = h => `
    <div style="width:36px;height:4px;background:var(--border-strong);border-radius:9999px;margin:12px auto 16px"></div>
    ${title ? `<div style="padding:0 var(--s5) var(--s4);font-family:var(--font-display);font-size:var(--text-xl);font-weight:700">${escHtml(title)}</div>` : ''}
    <div class="sheet-inner" style="padding:0 var(--s5)">${h}</div>`;

  panel.innerHTML = buildInner(html);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => requestAnimationFrame(() => { panel.style.transform='translateY(0)'; }));

  function close() {
    panel.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.remove(); onClose?.(); }, 300);
  }

  overlay.addEventListener('click', e => { if (e.target===overlay) close(); });

  return {
    close,
    setContent(h) { panel.querySelector('.sheet-inner').innerHTML = h; },
  };
}

export const ACTIVITY_LABELS = {
  sedentary:'Sedentário (sem exercício)',
  light:'Leve (1–2x/semana)',
  moderate:'Moderado (3–4x/semana)',
  active:'Intenso (5+x/semana)',
};

export const GOAL_LABELS = {
  cut:'Emagrecer',
  maintain:'Manter peso',
  bulk:'Ganhar massa',
};
