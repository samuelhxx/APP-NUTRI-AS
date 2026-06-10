/* ── Aba Alimentação ── */

import {
  getActiveUser, updateProfile, updateTargets, updateMealConfig, getIngredientBank,
} from '../store.js';
import { calcTargets, buildMarmitas, calcShoppingList, showToast } from '../utils.js';

export function render(screen) {
  const user = getActiveUser();
  if (!user) {
    screen.innerHTML = `<div class="empty-screen">
      <p>Nenhum perfil ativo.</p>
      <button class="btn btn--primary" onclick="window.__vortexGo('perfil')">Criar perfil</button>
    </div>`;
    return;
  }

  const { profile, targets, meal_config } = user;
  const bank     = getIngredientBank();
  const marmitas = targets ? buildMarmitas(targets, bank) : null;
  const shopping = marmitas ? calcShoppingList(marmitas, meal_config, bank) : null;

  screen.innerHTML = _html(profile, targets, marmitas, meal_config, shopping);
  _attach(screen, targets, meal_config, bank);
}

/* ─── HTML ─── */

function _html(profile, targets, marmitas, meal_config, shopping) {
  return `
    <div class="page-header">
      <h1>Alimentação</h1>
      <p>Suas metas e marmitas calculadas automaticamente.</p>
    </div>
    ${_profileSection(profile)}
    ${_targetsSection(targets)}
    ${marmitas ? _marmitasSection(marmitas, meal_config, shopping) : ''}
    <div class="al-notice">Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</div>
    <div class="tab-footer"></div>`;
}

function _profileSection(p) {
  const acts = [
    ['sedentary','Sedentário (escritório, sem exercício)'],
    ['light',    'Leve (1–2×/semana)'],
    ['moderate', 'Moderado (3–4×/semana)'],
    ['intense',  'Intenso (5+×/semana)'],
  ];
  return `
    <div class="section">
      <div class="section-title">Seus dados</div>
      <div class="al-form">
        <div class="al-row">
          <label class="al-label">Peso (kg)</label>
          <input id="al-peso"  type="number" class="input-field" value="${p.weight_kg||''}" min="30" max="300" step="0.1" placeholder="75">
        </div>
        <div class="al-row">
          <label class="al-label">Altura (cm)</label>
          <input id="al-alt"   type="number" class="input-field" value="${p.height_cm||''}" min="100" max="250" placeholder="170">
        </div>
        <div class="al-row">
          <label class="al-label">Idade</label>
          <input id="al-idade" type="number" class="input-field" value="${p.age||''}" min="10" max="99" placeholder="25">
        </div>
        <div class="al-row">
          <label class="al-label">Sexo</label>
          <div class="al-toggle" id="al-sexo">
            <div class="al-toggle-opt${p.sex==='M'?' sel':''}" data-val="M">Homem</div>
            <div class="al-toggle-opt${p.sex==='F'?' sel':''}" data-val="F">Mulher</div>
          </div>
        </div>
        <div class="al-row">
          <label class="al-label">Atividade</label>
          <select id="al-atv" class="input-field">
            ${acts.map(([v,l]) => `<option value="${v}"${p.activity_level===v?' selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="al-row">
          <label class="al-label">Objetivo</label>
          <div class="al-toggle" id="al-goal">
            <div class="al-toggle-opt${p.goal==='lose'?    ' sel':''}" data-val="lose">Emagrecer</div>
            <div class="al-toggle-opt${p.goal==='maintain'?' sel':''}" data-val="maintain">Manter</div>
            <div class="al-toggle-opt${p.goal==='gain'?    ' sel':''}" data-val="gain">Ganhar</div>
          </div>
        </div>
        <button class="btn btn--primary" id="al-calc">Calcular metas</button>
      </div>
    </div>`;
}

function _targetsSection(t) {
  if (!t) return `<div class="section"><div class="al-empty">Preencha seus dados acima e clique em "Calcular metas".</div></div>`;
  return `
    <div class="section">
      <div class="section-title">Suas metas diárias</div>
      <div class="al-macro-grid">
        ${_mc('Calorias',    t.kcal + ' kcal', 'Meta total de energia por dia',                   'var(--color-primary)')}
        ${_mc('Proteína',    t.protein_g + 'g', `${t.protein_g}g/dia — base para preservar músculo`, 'var(--color-success)')}
        ${_mc('Carboidrato', t.carbs_g + 'g',   'Principal fonte de energia para os treinos',      'var(--color-warning)')}
        ${_mc('Gordura',     t.fat_g + 'g',     'Essencial para hormônios e saciedade',            'var(--color-accent)')}
      </div>
    </div>`;
}

function _mc(label, value, desc, color) {
  return `<div class="al-macro-card">
    <div class="al-macro-val" style="color:${color}">${value}</div>
    <div class="al-macro-label">${label}</div>
    <div class="al-macro-desc">${desc}</div>
  </div>`;
}

function _marmitasSection(marmitas, meal_config, shopping) {
  return `
    <div class="section">
      <div class="section-title">Marmitas da semana</div>
      <div class="section-hint">Montadas automaticamente para bater sua meta de proteína (÷ 3 refeições/dia).</div>
      ${marmitas.map(m => _marmitaCard(m)).join('')}
    </div>
    ${_shopSection(meal_config, shopping)}`;
}

function _marmitaCard(m) {
  const items = m.items.map(i => `
    <div class="al-ing-row">
      <span class="al-ing-name">${i.name}</span>
      <span class="al-ing-g">${i.g}g</span>
    </div>`).join('');
  return `
    <div class="al-marmita-card">
      <div class="al-marmita-header">${m.label}</div>
      <div class="al-marmita-items">${items}</div>
      <div class="al-marmita-macros">
        <span>${m.totals.kcal} kcal</span>
        <span>${m.totals.protein_g}g prot</span>
        <span>${m.totals.carbs_g}g carb</span>
        <span>${m.totals.fat_g}g gord</span>
      </div>
      <div class="al-marmita-cost">Custo unitário: <strong>R$ ${m.totals.cost_r.toFixed(2)}</strong></div>
    </div>`;
}

function _shopSection(meal_config, shopping) {
  return `
    <div class="section">
      <div class="section-title">Compra da semana</div>
      <div class="al-shop-config">
        <div class="al-row">
          <label class="al-label">Marmitas/semana</label>
          <input id="al-nmar" type="number" class="input-field" value="${meal_config.marmitas_per_week}" min="1" max="28">
        </div>
        <div class="al-row">
          <label class="al-label">Pessoas</label>
          <input id="al-npes" type="number" class="input-field" value="${meal_config.people}" min="1" max="10">
        </div>
      </div>
      <div id="sec-shopping">${shopping ? _shopList(shopping) : ''}</div>
    </div>`;
}

function _shopList(s) {
  const rows = s.list.map(i => {
    const qty = i.kg < 1 ? Math.round(i.kg * 1000) + 'g' : i.kg.toFixed(2) + 'kg';
    return `<div class="al-shop-row">
      <span class="al-shop-name">${i.name}</span>
      <span class="al-shop-qty">${qty}</span>
      <span class="al-shop-cost">R$ ${i.cost_r.toFixed(2)}</span>
    </div>`;
  }).join('');
  return `<div class="al-shopping-list">
    ${rows}
    <div class="al-shop-total">
      Custo total das <strong>${s.total_marmitas}</strong> marmitas: <strong>R$ ${s.total_cost.toFixed(2)}</strong>
    </div>
  </div>`;
}

/* ─── Eventos ─── */

function _attach(screen, targets, meal_config, bank) {
  const tog = (id) => {
    screen.querySelectorAll(`#${id} .al-toggle-opt`).forEach(o =>
      o.addEventListener('click', () => {
        screen.querySelectorAll(`#${id} .al-toggle-opt`).forEach(x => x.classList.remove('sel'));
        o.classList.add('sel');
      })
    );
  };
  tog('al-sexo');
  tog('al-goal');

  screen.querySelector('#al-calc')?.addEventListener('click', () => {
    const weight_kg      = +screen.querySelector('#al-peso').value;
    const height_cm      = +screen.querySelector('#al-alt').value;
    const age            = +screen.querySelector('#al-idade').value;
    const sex            = screen.querySelector('#al-sexo .sel')?.dataset.val || 'M';
    const activity_level = screen.querySelector('#al-atv').value;
    const goal           = screen.querySelector('#al-goal .sel')?.dataset.val || 'lose';

    if (!weight_kg || !height_cm || !age) { showToast('Preencha peso, altura e idade.', 'warn'); return; }

    const prof = { weight_kg, height_cm, age, sex, activity_level, goal };
    updateProfile(prof);
    updateTargets(calcTargets(prof));
    showToast('Metas calculadas!', 'success');
    window.__vortexGo?.('alimentacao');
  });

  const refreshShop = () => {
    const marmitas_per_week = +screen.querySelector('#al-nmar')?.value || 5;
    const people            = +screen.querySelector('#al-npes')?.value || 1;
    updateMealConfig({ marmitas_per_week, people });
    if (targets) {
      const b = getIngredientBank();
      const m = buildMarmitas(targets, b);
      const s = calcShoppingList(m, { marmitas_per_week, people }, b);
      const el = screen.querySelector('#sec-shopping');
      if (el) el.innerHTML = _shopList(s);
    }
  };

  screen.querySelector('#al-nmar')?.addEventListener('change', refreshShop);
  screen.querySelector('#al-npes')?.addEventListener('change', refreshShop);
}
