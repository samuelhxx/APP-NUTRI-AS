/* ── Onboarding Wizard ── */

import { createUser } from '../auth.js';
import { updateUser } from '../store.js';
import { navigate } from '../nav.js';
import { stepEnter, stepLeave, fadeIn } from '../animations/transitions.js';
import { buildRing, animateRing, countUp } from '../animations/rings.js';
import { isReducedMotion } from '../utils.js';

/* ─── Cálculo Mifflin-St Jeor ─── */
function calcMacros(profile) {
  const { age, sex, weight_kg, height_cm, activity_level, goal } = profile;

  /* TMB */
  let tmb = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  tmb += sex === 'male' ? 5 : -161;

  /* TDEE */
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
  let tdee = tmb * (multipliers[activity_level] || 1.375);

  /* Ajuste por objetivo */
  const adjustments = { cut: -300, maintain: 0, bulk: 300 };
  const kcal = Math.round(tdee + (adjustments[goal] || 0));

  /* Macros */
  const protein_g = Math.round(weight_kg * 2.0);
  const fat_g     = Math.round(weight_kg * 0.9);
  const protein_kcal = protein_g * 4;
  const fat_kcal     = fat_g * 9;
  const carbs_g  = Math.round(Math.max(0, kcal - protein_kcal - fat_kcal) / 4);

  return { kcal, protein_g, fat_g, carbs_g, tmb: Math.round(tmb), tdee: Math.round(tdee) };
}

/* ─── Estado do wizard ─── */
let _step = 0;
let _data = { name: '', age: 25, sex: 'male', weight_kg: 70, height_cm: 170, activity_level: 'moderate', goal: 'cut' };
let _container = null;
let _stepEl = null;

const TOTAL_STEPS = 6; // etapas visíveis (1-6, sem contar welcome, loading e result)

/* ─── Render principal ─── */
export async function render(container) {
  _container = container;
  _step = 0;
  _data = { name: '', age: 25, sex: 'male', weight_kg: 70, height_cm: 170, activity_level: 'moderate', goal: 'cut' };
  container.innerHTML = buildWelcomeHTML();
  wireWelcome(container);
  await fadeIn(container);
}

/* ════════════════ STEP TEMPLATES ════════════════ */

function buildWelcomeHTML() {
  return `
<div class="onboarding-screen">
  <div class="ob-welcome">
    <div class="ob-welcome__logo-wrap">
      ${logoSVG(80)}
      <h1 style="font-size:var(--text-4xl);font-weight:800;text-align:center;letter-spacing:-1px;">
        Bem-vindo ao<br><span class="grad-text">VORTEX Fit</span>
      </h1>
      <p class="ob-welcome__tagline">Método simples. Resultado real. Comece agora.</p>
    </div>
    <div class="ob-welcome__features">
      ${feat('Calculadora de macros personalizada','Baseada em Mifflin-St Jeor — rápida e educativa')}
      ${feat('Planner de marmita semanal','Monte, calcule e gere lista de compra')}
      ${feat('Calendário de treinos','Check-in diário com sequência e relatório mensal')}
    </div>
    <div class="ob-welcome__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-start">Vamos lá</button>
      <button class="btn btn--ghost btn--full tappable" id="ob-switch-user">Já tenho perfil</button>
    </div>
  </div>
</div>`;
}

function feat(title, sub) {
  return `
<div class="ob-feature">
  <svg class="ob-feature__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  <div>
    <div style="font-weight:600;font-size:var(--text-sm)">${title}</div>
    <div style="font-size:var(--text-xs);color:var(--text-secondary)">${sub}</div>
  </div>
</div>`;
}

function buildProgressBar(current, total) {
  const pct = (current / total) * 100;
  return `
<div class="ob-progress">
  <div class="ob-progress__bar">
    <div class="ob-progress__fill" style="width:${pct}%"></div>
  </div>
  <div class="ob-progress__text">${current} de ${total}</div>
</div>`;
}

function buildStepShell(stepNum, content, showBack = true) {
  return `
<div class="onboarding-screen">
  ${buildProgressBar(stepNum, TOTAL_STEPS)}
  ${showBack ? `<button class="ob-back tappable" id="ob-back" aria-label="Voltar">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
  </button>` : ''}
  <div class="ob-step" id="ob-step-content">
    ${content}
  </div>
</div>`;
}

/* Step 1: Nome */
function buildNameHTML() {
  const v = _data.name;
  return buildStepShell(1, `
    <div class="ob-step__hero">
      <div class="ob-step__icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      </div>
      <h2 class="ob-step__title">Como você<br>se chama?</h2>
    </div>
    <div class="ob-step__body">
      <div class="input-group">
        <input id="ob-name" class="input-field input-field--lg" type="text" placeholder="Seu nome" value="${escHtml(v)}" autocomplete="given-name" maxlength="40" autocapitalize="words" autofocus>
      </div>
    </div>
    <div class="ob-step__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-next">Continuar</button>
    </div>
  `, false);
}

/* Step 2: Idade + Sexo */
function buildAgeSexHTML() {
  return buildStepShell(2, `
    <div class="ob-step__hero">
      <div class="ob-step__icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <h2 class="ob-step__title">Idade e sexo</h2>
      <p class="ob-step__subtitle">Usamos para calcular seu gasto energético basal</p>
    </div>
    <div class="ob-step__body">
      <div class="input-group">
        <label class="input-label">Idade</label>
        <div class="stepper">
          <button class="stepper__btn tappable" id="ob-age-dec" aria-label="Diminuir" type="button">−</button>
          <div class="stepper__value" id="ob-age-val">${_data.age}</div>
          <button class="stepper__btn tappable" id="ob-age-inc" aria-label="Aumentar" type="button">+</button>
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Sexo biológico</label>
        <div class="toggle-group" role="group" aria-label="Sexo biológico">
          <div class="toggle-option tappable" role="radio" tabindex="0" data-val="male" aria-selected="${_data.sex === 'male'}">Masculino</div>
          <div class="toggle-option tappable" role="radio" tabindex="0" data-val="female" aria-selected="${_data.sex === 'female'}">Feminino</div>
        </div>
      </div>
    </div>
    <div class="ob-step__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-next">Continuar</button>
    </div>
  `);
}

/* Step 3: Peso + Altura */
function buildWeightHeightHTML() {
  return buildStepShell(3, `
    <div class="ob-step__hero">
      <div class="ob-step__icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round"><path d="M12 2L12 22M2 12l10-10 10 10"/></svg>
      </div>
      <h2 class="ob-step__title">Peso e altura</h2>
      <p class="ob-step__subtitle">Para calcular seus macros com precisão</p>
    </div>
    <div class="ob-step__body">
      <div class="input-group">
        <label class="input-label" for="ob-weight">Peso atual (kg)</label>
        <input id="ob-weight" class="input-field input-field--lg" type="number" inputmode="decimal" min="30" max="300" step="0.1" value="${_data.weight_kg}" placeholder="70.0">
      </div>
      <div class="input-group">
        <label class="input-label" for="ob-height">Altura (cm)</label>
        <input id="ob-height" class="input-field input-field--lg" type="number" inputmode="numeric" min="100" max="250" step="1" value="${_data.height_cm}" placeholder="170">
      </div>
    </div>
    <div class="ob-step__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-next">Continuar</button>
    </div>
  `);
}

/* Step 4: Atividade */
function buildActivityHTML() {
  const options = [
    { val: 'sedentary', icon: '🪑', label: 'Sedentário', desc: 'Trabalho de escritório, pouco movimento' },
    { val: 'light',     icon: '🚶', label: 'Leve',       desc: '1-3 dias/sem de exercício leve' },
    { val: 'moderate',  icon: '🏃', label: 'Moderado',   desc: '3-5 dias/sem de treino regular' },
    { val: 'active',    icon: '🏋️', label: 'Intenso',    desc: '6-7 dias/sem ou treino pesado' },
  ];
  const cards = options.map(o => `
    <div class="option-card tappable" role="radio" tabindex="0" data-val="${o.val}" aria-selected="${_data.activity_level === o.val}">
      <div class="option-card__icon">${o.icon}</div>
      <div>
        <div class="option-card__label">${o.label}</div>
        <div class="option-card__desc">${o.desc}</div>
      </div>
    </div>`).join('');
  return buildStepShell(4, `
    <div class="ob-step__hero" style="padding-bottom:0">
      <h2 class="ob-step__title">Nível de atividade</h2>
      <p class="ob-step__subtitle">Inclui exercício e trabalho físico do dia a dia</p>
    </div>
    <div class="ob-step__body">
      <div class="option-grid" role="radiogroup" id="ob-activity-group">
        ${cards}
      </div>
    </div>
    <div class="ob-step__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-next">Continuar</button>
    </div>
  `);
}

/* Step 5: Objetivo */
function buildGoalHTML() {
  const options = [
    { val: 'cut',      icon: '📉', label: 'Emagrecer',    desc: 'Déficit calórico de ~300 kcal/dia' },
    { val: 'maintain', icon: '⚖️', label: 'Manter peso',  desc: 'Manutenção do peso atual' },
    { val: 'bulk',     icon: '📈', label: 'Ganhar massa',  desc: 'Superávit calórico de ~300 kcal/dia' },
  ];
  const cards = options.map(o => `
    <div class="option-card tappable" role="radio" tabindex="0" data-val="${o.val}" aria-selected="${_data.goal === o.val}">
      <div class="option-card__icon">${o.icon}</div>
      <div>
        <div class="option-card__label">${o.label}</div>
        <div class="option-card__desc">${o.desc}</div>
      </div>
    </div>`).join('');
  return buildStepShell(5, `
    <div class="ob-step__hero" style="padding-bottom:0">
      <h2 class="ob-step__title">Seu objetivo</h2>
      <p class="ob-step__subtitle">Define como ajustamos suas calorias</p>
    </div>
    <div class="ob-step__body">
      <div class="option-grid" role="radiogroup" id="ob-goal-group">
        ${cards}
      </div>
    </div>
    <div class="ob-step__actions">
      <button class="btn btn--primary btn--full tappable" id="ob-next">Calcular meus macros</button>
    </div>
  `);
}

/* Step 6: Loading */
function buildLoadingHTML() {
  return `
<div class="onboarding-screen">
  <div class="ob-loading">
    <svg class="ob-loading__spinner" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF5A1F"/>
          <stop offset="100%" stop-color="#FF2D78"/>
        </linearGradient>
      </defs>
      <circle class="ob-loading__spinner-arc" cx="32" cy="32" r="26" fill="none" stroke="url(#spin-grad)" stroke-width="5" stroke-linecap="round" stroke-dasharray="120 164"/>
    </svg>
    <div class="ob-loading__text">Calculando seus macros...</div>
    <div class="ob-loading__sub">Mifflin-St Jeor + ajuste de objetivo</div>
  </div>
</div>`;
}

/* Step 7: Resultado */
function buildResultHTML(macros) {
  const { kcal, protein_g, fat_g, carbs_g, tmb, tdee } = macros;
  const goal = _data.goal;
  const goalLabels = { cut: 'Déficit −300 kcal', maintain: 'Manutenção', bulk: 'Superávit +300 kcal' };
  return `
<div class="onboarding-screen">
  <div class="screen" style="padding-bottom:var(--s12)">
    <div class="ob-result">
      <div>
        <h2 class="ob-result__title">Seus macros diários</h2>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);text-align:center;margin-top:var(--s1)">Objetivo: <strong>${goalLabels[goal]}</strong></p>
      </div>

      <div class="ob-result__kcal">
        <div class="ob-result__kcal-value" id="res-kcal">0</div>
        <div class="ob-result__kcal-label">kcal / dia</div>
      </div>

      <div class="ob-result__rings">
        <div class="ob-result__ring-item">
          <div id="ring-prot"></div>
          <div class="ob-result__ring-value" id="res-prot">0<span style="font-size:var(--text-sm);font-weight:400">g</span></div>
          <div class="ob-result__ring-label">Proteína</div>
        </div>
        <div class="ob-result__ring-item">
          <div id="ring-carb"></div>
          <div class="ob-result__ring-value" id="res-carb">0<span style="font-size:var(--text-sm);font-weight:400">g</span></div>
          <div class="ob-result__ring-label">Carboidrato</div>
        </div>
        <div class="ob-result__ring-item">
          <div id="ring-fat"></div>
          <div class="ob-result__ring-value" id="res-fat">0<span style="font-size:var(--text-sm);font-weight:400">g</span></div>
          <div class="ob-result__ring-label">Gordura</div>
        </div>
      </div>

      <div class="ob-result__breakdown">
        <div class="ob-result__row">
          <span class="ob-result__row-label">TMB (metabolismo basal)</span>
          <span class="ob-result__row-value">${tmb} kcal</span>
        </div>
        <div class="ob-result__row">
          <span class="ob-result__row-label">TDEE (com atividade)</span>
          <span class="ob-result__row-value">${tdee} kcal</span>
        </div>
        <div class="ob-result__row">
          <span class="ob-result__row-label">Proteína (2g/kg)</span>
          <span class="ob-result__row-value">${protein_g}g = ${protein_g * 4} kcal</span>
        </div>
        <div class="ob-result__row">
          <span class="ob-result__row-label">Gordura (0,9g/kg)</span>
          <span class="ob-result__row-value">${fat_g}g = ${fat_g * 9} kcal</span>
        </div>
        <div class="ob-result__row">
          <span class="ob-result__row-label">Carboidrato (restante)</span>
          <span class="ob-result__row-value">${carbs_g}g = ${carbs_g * 4} kcal</span>
        </div>
      </div>

      <div class="notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</p>
      </div>

      <div style="width:100%;display:flex;flex-direction:column;gap:var(--s3);padding-bottom:var(--s6)">
        <button class="btn btn--primary btn--full tappable" id="ob-finish">Começar agora</button>
      </div>
    </div>
  </div>
</div>`;
}

/* ════════════════ WIRING ════════════════ */

function wireWelcome(container) {
  container.querySelector('#ob-start')?.addEventListener('click', () => goToStep(1));
  container.querySelector('#ob-switch-user')?.addEventListener('click', () => {
    navigate('/profile');
  });
}

async function goToStep(stepNum) {
  const templates = {
    1: buildNameHTML,
    2: buildAgeSexHTML,
    3: buildWeightHeightHTML,
    4: buildActivityHTML,
    5: buildGoalHTML,
  };

  const oldEl = _stepEl;
  const newHTML = templates[stepNum]?.();
  if (!newHTML) return;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;inset:0;background:var(--bg-surface);';
  wrapper.innerHTML = newHTML;
  _container.appendChild(wrapper);
  _stepEl = wrapper;

  if (oldEl) await stepLeave(oldEl);
  if (oldEl) oldEl.remove();
  await stepEnter(wrapper);

  _step = stepNum;
  wireStep(wrapper, stepNum);
}

function wireStep(el, stepNum) {
  /* Back button */
  el.querySelector('#ob-back')?.addEventListener('click', () => {
    if (_step > 1) goToStep(_step - 1);
  });

  /* Next button */
  el.querySelector('#ob-next')?.addEventListener('click', () => {
    if (!saveStep(el, stepNum)) return;
    if (stepNum < 5) {
      goToStep(stepNum + 1);
    } else {
      doCalculation();
    }
  });

  /* Step-specific wiring */
  if (stepNum === 2) wireAgeSex(el);
  if (stepNum === 4) wireOptionCards(el, '#ob-activity-group', 'activity_level');
  if (stepNum === 5) wireOptionCards(el, '#ob-goal-group', 'goal');
}

function wireAgeSex(el) {
  el.querySelector('#ob-age-dec')?.addEventListener('click', () => {
    _data.age = Math.max(14, _data.age - 1);
    const v = el.querySelector('#ob-age-val');
    if (v) v.textContent = _data.age;
  });
  el.querySelector('#ob-age-inc')?.addEventListener('click', () => {
    _data.age = Math.min(99, _data.age + 1);
    const v = el.querySelector('#ob-age-val');
    if (v) v.textContent = _data.age;
  });
  el.querySelectorAll('[data-val]').forEach(opt => {
    opt.addEventListener('click', () => {
      _data.sex = opt.dataset.val;
      el.querySelectorAll('[role="radio"]').forEach(r => r.setAttribute('aria-selected', 'false'));
      opt.setAttribute('aria-selected', 'true');
    });
  });
}

function wireOptionCards(el, groupSel, field) {
  el.querySelectorAll(`${groupSel} .option-card`).forEach(card => {
    card.addEventListener('click', () => {
      _data[field] = card.dataset.val;
      el.querySelectorAll(`${groupSel} .option-card`).forEach(c => c.setAttribute('aria-selected', 'false'));
      card.setAttribute('aria-selected', 'true');
    });
  });
}

function saveStep(el, stepNum) {
  if (stepNum === 1) {
    const name = el.querySelector('#ob-name')?.value?.trim();
    if (!name) { shake(el.querySelector('#ob-name')); return false; }
    _data.name = name;
  }
  if (stepNum === 3) {
    const w = parseFloat(el.querySelector('#ob-weight')?.value);
    const h = parseFloat(el.querySelector('#ob-height')?.value);
    if (!w || w < 30 || !h || h < 100) { return false; }
    _data.weight_kg = w;
    _data.height_cm = h;
  }
  return true;
}

async function doCalculation() {
  /* Mostra tela de loading */
  const loadEl = document.createElement('div');
  loadEl.style.cssText = 'position:absolute;inset:0;background:var(--bg-surface);';
  loadEl.innerHTML = buildLoadingHTML();
  _container.appendChild(loadEl);
  if (_stepEl) await stepLeave(_stepEl);
  if (_stepEl) _stepEl.remove();
  await stepEnter(loadEl);

  await new Promise(r => setTimeout(r, 900));

  /* Cria usuário */
  const macros = calcMacros(_data);
  const userId = createUser({
    name: _data.name,
    age: _data.age,
    sex: _data.sex,
    weight_kg: _data.weight_kg,
    height_cm: _data.height_cm,
    activity_level: _data.activity_level,
    goal: _data.goal,
  });
  updateUser(userId, { targets: { ...macros, calculated_at: new Date().toISOString() } });

  /* Mostra resultado */
  const resEl = document.createElement('div');
  resEl.style.cssText = 'position:absolute;inset:0;background:var(--bg-surface);overflow-y:auto;';
  resEl.innerHTML = buildResultHTML(macros);
  _container.appendChild(resEl);
  await stepLeave(loadEl);
  loadEl.remove();
  await stepEnter(resEl);

  animateResult(resEl, macros);

  resEl.querySelector('#ob-finish')?.addEventListener('click', () => {
    navigate('/dashboard');
  });
}

function animateResult(el, macros) {
  const kcalEl = el.querySelector('#res-kcal');
  const protEl = el.querySelector('#res-prot');
  const carbEl = el.querySelector('#res-carb');
  const fatEl  = el.querySelector('#res-fat');

  if (kcalEl) countUp(kcalEl, 0, macros.kcal, { duration: 1 });
  if (protEl) countUp(protEl, 0, macros.protein_g, { duration: 0.8, suffix: 'g' });
  if (carbEl) countUp(carbEl, 0, macros.carbs_g,   { duration: 0.85, suffix: 'g' });
  if (fatEl)  countUp(fatEl,  0, macros.fat_g,     { duration: 0.75, suffix: 'g' });

  const totKcal = macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;

  setTimeout(() => {
    const ringProtEl = el.querySelector('#ring-prot');
    if (ringProtEl) {
      const rd = buildRing(ringProtEl, { size: 72, strokeWidth: 7 });
      animateRing(rd, macros.protein_g * 4 / totKcal);
    }
    const ringCarbEl = el.querySelector('#ring-carb');
    if (ringCarbEl) {
      const rd = buildRing(ringCarbEl, { size: 72, strokeWidth: 7, gradientId: 'grad-vortex-global' });
      animateRing(rd, macros.carbs_g * 4 / totKcal);
    }
    const ringFatEl = el.querySelector('#ring-fat');
    if (ringFatEl) {
      const rd = buildRing(ringFatEl, { size: 72, strokeWidth: 7, gradientId: 'grad-vortex-global' });
      animateRing(rd, macros.fat_g * 9 / totKcal);
    }
  }, 200);
}

/* ─── Helpers ─── */

function shake(el) {
  if (!el || isReducedMotion()) return;
  gsap.to(el, { x: -8, duration: 0.06, yoyo: true, repeat: 5, onComplete: () => gsap.set(el, { x: 0 }) });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function logoSVG(size = 52) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 52 52" role="img" aria-label="VORTEX Fit logo">
  <defs>
    <linearGradient id="logo-vg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5A1F"/>
      <stop offset="100%" stop-color="#FF2D78"/>
    </linearGradient>
  </defs>
  <rect width="52" height="52" rx="14" fill="#1C1C25"/>
  <g transform="translate(26,26)">
    <path d="M0,-17 A17,17 0 1,1 -14.72,8.5" fill="none" stroke="url(#logo-vg)" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M0,-11 A11,11 0 1,1 -9.53,5.5" fill="none" stroke="url(#logo-vg)" stroke-width="3" stroke-linecap="round" opacity="0.78"/>
    <path d="M0,-6 A6,6 0 1,1 -5.2,3" fill="none" stroke="url(#logo-vg)" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
    <circle cx="0" cy="0" r="2.5" fill="url(#logo-vg)"/>
  </g>
</svg>`;
}
