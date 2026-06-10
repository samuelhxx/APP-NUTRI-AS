/* ── Utils & Cálculos ── */

export function formatDate(d = new Date()) { return d.toISOString().slice(0, 10); }

export function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function _r5(n)  { return Math.round(n / 5) * 5; }
function _r10(n) { return Math.round(n / 10) * 10; }
function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/* ── Metas nutricionais (Mifflin-St Jeor) ── */
export function calcTargets({ weight_kg, height_cm, age, sex, activity_level, goal }) {
  const tmb = sex === 'F'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    : 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;

  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, intense: 1.725 };
  const tdee = tmb * (factors[activity_level] || 1.55);
  const adj  = { lose: -300, maintain: 0, gain: 300 };
  const kcal = Math.round(tdee + (adj[goal] ?? 0));

  const protein_g = Math.round(2.0 * weight_kg);
  const fat_g     = Math.round(0.9 * weight_kg);
  const carbs_g   = Math.max(50, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));

  return { kcal, protein_g, fat_g, carbs_g, calculated_at: new Date().toISOString() };
}

/* ── Montagem automática das marmitas ── */
export function buildMarmitas(targets, bank) {
  const ppm = targets.protein_g / 3;
  const kpm = targets.kcal / 3;

  const f  = bank['frango'];
  const a  = bank['arroz'];
  const b  = bank['brocolis'];
  const ov = bank['ovo'];
  const bd = bank['batata_doce'];
  const cn = bank['cenoura'];

  /* Opção 1: Frango + Arroz + Brócolis */
  const f1_g    = _r5(_clamp(ppm / (f.per_100g.protein_g / 100), 80, 350));
  const f1_kcal = f1_g * f.per_100g.kcal / 100;
  const b1_kcal = 100  * b.per_100g.kcal / 100;
  const a1_g    = _r10(_clamp((kpm - f1_kcal - b1_kcal) / (a.per_100g.kcal / 100), 80, 200));
  const op1 = _totals([{ ing: f, g: f1_g }, { ing: a, g: a1_g }, { ing: b, g: 100 }]);

  /* Opção 2: Ovos + Frango (complemento) + Batata-doce + Cenoura */
  const ov_g    = 150;
  const ov_prot = ov_g * ov.per_100g.protein_g / 100;
  const ov_kcal = ov_g * ov.per_100g.kcal / 100;
  const f2_prot = Math.max(0, ppm - ov_prot);
  const f2_g    = _r5(f2_prot / (f.per_100g.protein_g / 100));
  const f2_kcal = f2_g * f.per_100g.kcal / 100;
  const cn_kcal = 100  * cn.per_100g.kcal / 100;
  const bd_g    = _r10(_clamp((kpm - ov_kcal - f2_kcal - cn_kcal) / (bd.per_100g.kcal / 100), 80, 200));

  const items2 = [{ ing: ov, g: ov_g }];
  if (f2_g > 0) items2.push({ ing: f, g: f2_g });
  items2.push({ ing: bd, g: bd_g }, { ing: cn, g: 100 });
  const op2 = _totals(items2);

  return [
    { label: 'Opção 1 — Clássica', items: op1.items, totals: op1.totals },
    { label: 'Opção 2 — Variação', items: op2.items, totals: op2.totals },
  ];
}

function _totals(items) {
  let kcal = 0, prot = 0, fat = 0, carbs = 0, cost = 0;
  const result = items.map(({ ing, g }) => {
    kcal  += ing.per_100g.kcal      * g / 100;
    prot  += ing.per_100g.protein_g * g / 100;
    fat   += ing.per_100g.fat_g     * g / 100;
    carbs += ing.per_100g.carbs_g   * g / 100;
    cost  += (g / 1000) * ing.price_per_kg;
    return { id: ing.id, name: ing.name, g };
  });
  return {
    items: result,
    totals: { kcal: Math.round(kcal), protein_g: Math.round(prot), fat_g: Math.round(fat), carbs_g: Math.round(carbs), cost_r: +cost.toFixed(2) },
  };
}

/* ── Lista de compra ── */
export function calcShoppingList(marmitas, mealConfig, bank) {
  const total = mealConfig.marmitas_per_week * mealConfig.people;
  const half  = total / 2;
  const agg   = {};

  const add = (id, name, g, qty) => {
    if (!agg[id]) agg[id] = { name, total_g: 0, price_per_kg: bank[id]?.price_per_kg ?? 0 };
    agg[id].total_g += g * qty;
  };

  for (const item of marmitas[0].items) add(item.id, item.name, item.g, half);
  for (const item of marmitas[1].items) add(item.id, item.name, item.g, half);

  const list = Object.values(agg).map(({ name, total_g, price_per_kg }) => {
    const kg = total_g / 1000;
    return { name, kg: +kg.toFixed(3), cost_r: +(kg * price_per_kg).toFixed(2) };
  }).sort((a, b) => b.cost_r - a.cost_r);

  return { list, total_cost: +list.reduce((s, i) => s + i.cost_r, 0).toFixed(2), total_marmitas: total };
}

/* ── Ritmo de meta (freio de segurança) ── */
export function calcGoalPace(currentWeight, targetWeight, deadlineDateStr) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const deadline = new Date(deadlineDateStr + 'T00:00:00');
  const msWeek   = 7 * 24 * 3600 * 1000;
  const weeks    = Math.max(0.5, (deadline - today) / msWeek);

  const totalLoss  = +(currentWeight - targetWeight).toFixed(1);
  const needed     = +(totalLoss / weeks).toFixed(2);
  const safe       = +(currentWeight * 0.01).toFixed(2);
  const isSafe     = needed <= safe;
  const weeksIdeal = Math.ceil(totalLoss / safe);
  const safeDeadline = new Date(today.getTime() + weeksIdeal * msWeek).toISOString().slice(0, 10);

  return { totalLoss, weeks: +weeks.toFixed(1), needed, safe, isSafe, weeksIdeal, safeDeadline };
}

export function buildProjection(startWeight, ratePerWeek, targetWeight, maxWeeks = 52) {
  const rows = [{ week: 0, weight: +startWeight.toFixed(1) }];
  let w = startWeight;
  for (let i = 1; i <= maxWeeks; i++) {
    w = Math.max(targetWeight, +(w - ratePerWeek).toFixed(1));
    rows.push({ week: i, weight: w });
    if (w <= targetWeight) break;
  }
  return rows;
}

/* ── Sparkline SVG ── */
export function buildSparkline(weightLog, goalTarget) {
  if (!weightLog?.length) return '<p class="al-empty">Nenhum peso registrado ainda.</p>';

  const W = 300, H = 90;
  const pad = { t: 8, r: 8, b: 8, l: 8 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;

  const actuals  = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  let projected  = [];

  if (goalTarget?.target_weight_kg && goalTarget?.deadline_date && actuals.length) {
    const sw   = actuals[0].weight_kg;
    const tgt  = goalTarget.target_weight_kg;
    const sd   = new Date(actuals[0].date + 'T00:00:00');
    const ed   = new Date(goalTarget.deadline_date + 'T00:00:00');
    const tw   = Math.max(1, (ed - sd) / (7 * 24 * 3600 * 1000));
    const rate = (sw - tgt) / tw;
    for (let i = 0; i <= Math.ceil(tw); i++) {
      const d = new Date(sd.getTime() + i * 7 * 24 * 3600 * 1000);
      projected.push({ date: d.toISOString().slice(0, 10), weight: Math.max(tgt, +(sw - rate * i).toFixed(1)) });
    }
  }

  const allDates = [...new Set([...actuals.map(a => a.date), ...projected.map(p => p.date)])].sort();
  if (allDates.length < 2) return '<p style="font-size:var(--text-xs);color:var(--text-secondary)">Registre ao menos 2 pesagens.</p>';

  const allW = [...actuals.map(a => a.weight_kg), ...projected.map(p => p.weight)];
  const minW = Math.min(...allW) - 0.5;
  const maxW = Math.max(...allW) + 0.5;
  const xOf  = d  => pad.l + (allDates.indexOf(d) / (allDates.length - 1)) * iW;
  const yOf  = wt => pad.t + (1 - (wt - minW) / (maxW - minW)) * iH;
  const p2d  = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.date).toFixed(1)},${yOf(p.weight).toFixed(1)}`).join(' ');

  const projLine = projected.length >= 2 ? `<path d="${p2d(projected)}" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.65"/>` : '';
  const realLine = actuals.length >= 2   ? `<path d="${p2d(actuals.map(a => ({ date: a.date, weight: a.weight_kg })))}" fill="none" stroke="var(--color-success)" stroke-width="2.5"/>` : '';
  const dots     = actuals.map(a =>
    `<circle cx="${xOf(a.date).toFixed(1)}" cy="${yOf(a.weight_kg).toFixed(1)}" r="3.5" fill="var(--color-success)" stroke="var(--bg-card)" stroke-width="1.5"/>`
  ).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
      ${projLine}${realLine}${dots}
    </svg>
    <div class="mt-sparkline-legend">
      <span><span class="mt-dot mt-dot--green"></span>Real</span>
      ${projected.length ? '<span><span class="mt-dot mt-dot--orange"></span>Projeção</span>' : ''}
    </div>`;
}

/* ── Bottom sheet ── */
export function openSheet(html, title = '', { onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'sheet-overlay';

  const panel = document.createElement('div');
  panel.className = 'bottom-sheet';
  panel.innerHTML = `
    <div class="sheet-handle"></div>
    ${title ? `<div class="sheet-header"><span class="sheet-title">${title}</span><button class="sheet-close tappable" aria-label="Fechar">✕</button></div>` : ''}
    <div class="sheet-body">${html}</div>`;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const body = panel.querySelector('.sheet-body');

  function close() {
    overlay.classList.remove('open');
    setTimeout(() => { overlay.remove(); onClose?.(); }, 300);
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  panel.querySelector('.sheet-close')?.addEventListener('click', close);

  return { close, body, setContent(h) { body.innerHTML = h; } };
}

/* ── Toast ── */
export function showToast(msg, type = 'default', ms = 2800) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add('toast--out'), ms - 300);
  setTimeout(() => t.remove(), ms);
}
