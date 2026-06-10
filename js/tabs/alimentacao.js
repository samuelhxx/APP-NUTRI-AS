/* ── Aba Alimentação ── */

import {
  getState, updateProfile, updateTargets, updateMealConfig,
  addIngredient, deleteIngredient,
} from '../store.js';
import {
  calcTargets, calcMarmitaMacros, calcShoppingList,
  showToast, openSheet, uuid, escHtml, fmtCurrency,
  ACTIVITY_LABELS, GOAL_LABELS,
} from '../utils.js';

export function render(container) {
  container.innerHTML = buildHTML();
  wire(container);
}

/* ════ HTML ════ */

function buildHTML() {
  const { profile, targets, ingredient_bank: bank, meal_config } = getState();
  return `
<div class="page-header">
  <h1>Alimentação</h1>
  <p>Seus dados, metas e marmita num só lugar.</p>
</div>

<!-- ① Dados pessoais -->
<div class="al-section" id="sec-perfil">
  <div class="al-section-title">Seus dados</div>
  ${buildProfileForm(profile)}
</div>

<!-- ② Meta diária -->
<div class="al-section" id="sec-meta">
  <div class="al-section-title">Meta diária</div>
  ${targets ? buildMacroResult(targets, profile) : buildNoTargets()}
</div>

<!-- ③ Montar marmita -->
<div class="al-section" id="sec-marmita">
  <div class="al-section-title">Montar marmita</div>
  <p class="al-hint">Ajuste as gramas de cada ingrediente. Os macros somam automaticamente.</p>
  <div id="portions-wrap">
    ${buildPortions(meal_config.portions, bank)}
  </div>
  <button class="al-link-btn tappable" id="btn-bank" style="margin-top:var(--s3)">
    + Escolher ingredientes
  </button>
</div>

<!-- ④ Compra da semana -->
<div class="al-section" id="sec-compras">
  <div class="al-section-title">Compra da semana</div>
  <div class="al-row" style="margin-bottom:var(--s4)">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="inp-marmitas">Marmitas esta semana</label>
      <input id="inp-marmitas" class="input-field" type="number" min="1" max="50" value="${meal_config.marmitas_per_week}" inputmode="numeric">
    </div>
    <div class="input-group" style="flex:1">
      <label class="input-label" for="inp-people">Para quantas pessoas</label>
      <input id="inp-people" class="input-field" type="number" min="1" max="10" value="${meal_config.people}" inputmode="numeric">
    </div>
  </div>
  <div id="shopping-wrap">
    ${buildShopping(meal_config, bank)}
  </div>
</div>`;
}

function buildProfileForm(p) {
  return `
<div class="al-form">
  <div class="input-group">
    <label class="input-label" for="pf-name">Nome</label>
    <input id="pf-name" class="input-field" type="text" placeholder="Como você se chama?" value="${escHtml(p.name)}" autocomplete="name">
  </div>
  <div class="al-row">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="pf-age">Idade</label>
      <input id="pf-age" class="input-field" type="number" min="10" max="100" value="${p.age}" inputmode="numeric">
    </div>
    <div class="input-group" style="flex:1">
      <label class="input-label">Sexo</label>
      <div class="al-toggle" id="pf-sex">
        <div class="al-toggle-opt ${p.sex==='M'?'sel':''}" data-val="M">Masculino</div>
        <div class="al-toggle-opt ${p.sex==='F'?'sel':''}" data-val="F">Feminino</div>
      </div>
    </div>
  </div>
  <div class="al-row">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="pf-weight">Peso (kg)</label>
      <input id="pf-weight" class="input-field" type="number" min="30" max="300" step="0.1" value="${p.weight_kg}" inputmode="decimal">
    </div>
    <div class="input-group" style="flex:1">
      <label class="input-label" for="pf-height">Altura (cm)</label>
      <input id="pf-height" class="input-field" type="number" min="100" max="250" value="${p.height_cm}" inputmode="numeric">
    </div>
  </div>
  <div class="input-group">
    <label class="input-label" for="pf-activity">Nível de atividade</label>
    <select id="pf-activity" class="input-field" style="cursor:pointer">
      ${Object.entries(ACTIVITY_LABELS).map(([v,l]) =>
        `<option value="${v}"${p.activity_level===v?' selected':''}>${escHtml(l)}</option>`
      ).join('')}
    </select>
  </div>
  <div class="input-group">
    <label class="input-label">Objetivo</label>
    <div class="al-toggle" id="pf-goal">
      ${Object.entries(GOAL_LABELS).map(([v,l]) =>
        `<div class="al-toggle-opt ${p.goal===v?'sel':''}" data-val="${v}">${l}</div>`
      ).join('')}
    </div>
  </div>
  <button class="btn btn--primary btn--full tappable" id="btn-calc" style="margin-top:var(--s2)">Calcular metas</button>
</div>`;
}

function buildMacroResult(t, p) {
  const goalText = { cut:'déficit de 300 kcal/dia para emagrecer', maintain:'calorias de manutenção', bulk:'superávit de 300 kcal/dia para ganhar massa' };
  return `
<div class="al-macros">
  <div class="al-macro-card al-macro-kcal">
    <div class="al-macro-val">${t.kcal} <span class="al-macro-unit">kcal</span></div>
    <div class="al-macro-name">Calorias por dia</div>
    <div class="al-macro-desc">${goalText[p.goal] || ''}</div>
  </div>
  <div class="al-macro-card">
    <div class="al-macro-val">${t.protein_g}<span class="al-macro-unit">g</span></div>
    <div class="al-macro-name">Proteína por dia</div>
    <div class="al-macro-desc">Para preservar e construir músculo (2 g/kg)</div>
  </div>
  <div class="al-macro-card">
    <div class="al-macro-val">${t.carbs_g}<span class="al-macro-unit">g</span></div>
    <div class="al-macro-name">Carboidratos por dia</div>
    <div class="al-macro-desc">Energia para o dia e os treinos</div>
  </div>
  <div class="al-macro-card">
    <div class="al-macro-val">${t.fat_g}<span class="al-macro-unit">g</span></div>
    <div class="al-macro-name">Gorduras por dia</div>
    <div class="al-macro-desc">Hormônios, vitaminas e saciedade (0,9 g/kg)</div>
  </div>
</div>
<div class="al-notice">⚠ Estimativa baseada em fórmulas gerais. Valide com um profissional de saúde.</div>`;
}

function buildNoTargets() {
  return `<div class="al-empty">Preencha seus dados acima e clique em <strong>Calcular metas</strong>.</div>`;
}

function buildPortions(portions, bank) {
  if (!portions.length) {
    return `<div class="al-empty">Nenhum ingrediente. Clique em "Escolher ingredientes" abaixo.</div>`;
  }
  const macros = calcMarmitaMacros(portions, bank);
  const summary = portions.map(p => {
    const ing = bank.find(b => b.id === p.ingredient_id);
    return ing ? `${p.grams}g de ${ing.name.split(' ')[0]}` : null;
  }).filter(Boolean).join(' · ');

  return `
<div class="al-portions" id="al-portions-list">
  ${portions.map((p,i) => buildPortionRow(p, i, bank)).join('')}
</div>
<div class="al-marmita-total">
  <div class="al-total-label">Gramas por marmita:</div>
  <div class="al-total-summary" id="al-total-summary">${escHtml(summary)}</div>
  <div class="al-total-macros">
    <div class="al-mpill"><span class="al-mpill-val" id="m-kcal">${macros.kcal}</span><span class="al-mpill-key">kcal</span></div>
    <div class="al-mpill"><span class="al-mpill-val" id="m-prot">${macros.protein_g}g</span><span class="al-mpill-key">Prot.</span></div>
    <div class="al-mpill"><span class="al-mpill-val" id="m-carb">${macros.carbs_g}g</span><span class="al-mpill-key">Carb.</span></div>
    <div class="al-mpill"><span class="al-mpill-val" id="m-fat">${macros.fat_g}g</span><span class="al-mpill-key">Gord.</span></div>
  </div>
</div>`;
}

function buildPortionRow(p, i, bank) {
  const ing = bank.find(b => b.id === p.ingredient_id);
  if (!ing) return '';
  return `
<div class="al-portion-row" data-index="${i}">
  <div class="al-portion-header">
    <span class="al-portion-name">${escHtml(ing.name)}</span>
    <button class="al-remove-btn tappable" data-remove="${i}" aria-label="Remover ${escHtml(ing.name)}">✕</button>
  </div>
  <div class="al-slider-row">
    <label class="input-label" for="sl-${i}">Gramas</label>
    <span class="al-slider-val" id="slv-${i}">${p.grams}g</span>
  </div>
  <input id="sl-${i}" class="slider al-slider" type="range" min="10" max="600" step="5"
    value="${p.grams}" data-index="${i}">
  <div class="al-portion-macros">
    <span>${Math.round(ing.protein_g*p.grams/100)}g prot</span>
    <span>${Math.round(ing.carbs_g*p.grams/100)}g carb</span>
    <span>${Math.round(ing.fat_g*p.grams/100)}g gord</span>
  </div>
</div>`;
}

function buildShopping(meal_config, bank) {
  const { portions, marmitas_per_week: mw, people: pp } = meal_config;
  if (!portions.length) return `<div class="al-empty">Monte a marmita para ver a lista de compras.</div>`;
  const total = mw * pp;
  const { items, totalCost } = calcShoppingList(portions, bank, mw, pp);
  return `
<div class="al-shopping">
  ${items.map(item => `
  <div class="al-shop-row">
    <span class="al-shop-name">${escHtml(item.name)}</span>
    <div class="al-shop-right">
      <span class="al-shop-qty">${item.totalKg < 1 ? (item.totalKg*1000).toFixed(0)+'g' : item.totalKg.toFixed(2).replace('.',',')+'kg'}</span>
      <span class="al-shop-cost">${fmtCurrency(item.cost)}</span>
    </div>
  </div>`).join('')}
  <div class="al-shop-total">
    <span>Custo total das ${total} marmita${total!==1?'s':''}</span>
    <span class="al-shop-total-val">${fmtCurrency(totalCost)}</span>
  </div>
  <p class="al-shop-note">Preços estimados por kg. Variam por região e mercado.</p>
</div>`;
}

/* ════ Banco de ingredientes ════ */

function buildBankHTML(bank, portions) {
  const portionIds = portions.map(p => p.ingredient_id);
  return `
<div class="al-bank-list">
  ${bank.map(ing => `
  <div class="al-bank-row">
    <div class="al-bank-info">
      <div class="al-bank-name">${escHtml(ing.name)}</div>
      <div class="al-bank-macros">P:${ing.protein_g}g · C:${ing.carbs_g}g · G:${ing.fat_g}g / 100g</div>
    </div>
    <button class="al-bank-btn tappable ${portionIds.includes(ing.id)?'sel':''}" data-add="${ing.id}">
      ${portionIds.includes(ing.id)?'✓ Na marmita':'Adicionar'}
    </button>
  </div>`).join('')}
</div>
<div style="margin-top:var(--s4);padding-top:var(--s4);border-top:1px solid var(--border-subtle)">
  <button class="btn btn--ghost btn--full tappable" id="btn-new-ing">+ Criar ingrediente</button>
</div>`;
}

function buildAddIngForm() {
  return `
<button class="al-link-btn tappable" id="btn-back-bank" style="margin-bottom:var(--s4)">← Voltar</button>
<div class="al-form">
  <div class="input-group">
    <label class="input-label" for="ni-name">Nome do ingrediente</label>
    <input id="ni-name" class="input-field" type="text" placeholder="Ex: Tilápia grelhada">
  </div>
  <div class="al-row">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="ni-prot">Proteína (g/100g)</label>
      <input id="ni-prot" class="input-field" type="number" min="0" step="0.1" placeholder="0" inputmode="decimal">
    </div>
    <div class="input-group" style="flex:1">
      <label class="input-label" for="ni-carb">Carbs (g/100g)</label>
      <input id="ni-carb" class="input-field" type="number" min="0" step="0.1" placeholder="0" inputmode="decimal">
    </div>
  </div>
  <div class="al-row">
    <div class="input-group" style="flex:1">
      <label class="input-label" for="ni-fat">Gordura (g/100g)</label>
      <input id="ni-fat" class="input-field" type="number" min="0" step="0.1" placeholder="0" inputmode="decimal">
    </div>
    <div class="input-group" style="flex:1">
      <label class="input-label" for="ni-price">Preço (R$/kg)</label>
      <input id="ni-price" class="input-field" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal">
    </div>
  </div>
  <button class="btn btn--primary btn--full tappable" id="btn-save-ing" style="margin-top:var(--s2)">Salvar ingrediente</button>
</div>`;
}

/* ════ Wire ════ */

function wire(container) {
  /* ── Profile toggles ── */
  container.querySelector('#pf-sex')?.addEventListener('click', e => {
    const o = e.target.closest('.al-toggle-opt');
    if (!o) return;
    container.querySelectorAll('#pf-sex .al-toggle-opt').forEach(x => x.classList.remove('sel'));
    o.classList.add('sel');
  });
  container.querySelector('#pf-goal')?.addEventListener('click', e => {
    const o = e.target.closest('.al-toggle-opt');
    if (!o) return;
    container.querySelectorAll('#pf-goal .al-toggle-opt').forEach(x => x.classList.remove('sel'));
    o.classList.add('sel');
  });

  /* ── Calcular metas ── */
  container.querySelector('#btn-calc')?.addEventListener('click', () => {
    const name     = container.querySelector('#pf-name')?.value.trim();
    const age      = parseInt(container.querySelector('#pf-age')?.value);
    const weight   = parseFloat(container.querySelector('#pf-weight')?.value);
    const height   = parseFloat(container.querySelector('#pf-height')?.value);
    const activity = container.querySelector('#pf-activity')?.value;
    const sex      = container.querySelector('#pf-sex .sel')?.dataset.val || 'M';
    const goal     = container.querySelector('#pf-goal .sel')?.dataset.val || 'cut';

    if (!name)                            { showToast('Informe seu nome','error'); return; }
    if (!age || age<10 || age>100)        { showToast('Idade inválida (10–100)','error'); return; }
    if (!weight || weight<30||weight>300) { showToast('Peso inválido (30–300 kg)','error'); return; }
    if (!height || height<100||height>250){ showToast('Altura inválida (100–250 cm)','error'); return; }

    const profile = { name, age, sex, weight_kg:weight, height_cm:height, activity_level:activity, goal };
    updateProfile(profile);
    updateTargets(calcTargets(profile));
    showToast('Metas calculadas!','success');
    /* Re-render only the meta section */
    const { targets } = getState();
    container.querySelector('#sec-meta').innerHTML = `
      <div class="al-section-title">Meta diária</div>
      ${buildMacroResult(targets, profile)}`;
  });

  /* ── Portion sliders ── */
  container.querySelector('#portions-wrap')?.addEventListener('input', e => {
    if (!e.target.classList.contains('al-slider')) return;
    const idx = parseInt(e.target.dataset.index);
    const val = parseInt(e.target.value);
    const sl = getState();
    const portions = [...sl.meal_config.portions];
    if (!portions[idx]) return;
    portions[idx] = { ...portions[idx], grams: val };
    updateMealConfig({ portions });
    /* Update label + inline macros */
    const lbl = container.querySelector(`#slv-${idx}`);
    if (lbl) lbl.textContent = val + 'g';
    const ing = sl.ingredient_bank.find(b => b.id === portions[idx].ingredient_id);
    if (ing) {
      const row = container.querySelector(`[data-index="${idx}"] .al-portion-macros`);
      if (row) row.innerHTML = `
        <span>${Math.round(ing.protein_g*val/100)}g prot</span>
        <span>${Math.round(ing.carbs_g*val/100)}g carb</span>
        <span>${Math.round(ing.fat_g*val/100)}g gord</span>`;
    }
    refreshMarmitaTotals(container);
    refreshShopping(container);
  });

  /* ── Remove portion ── */
  container.querySelector('#portions-wrap')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const idx = parseInt(btn.dataset.remove);
    const { meal_config } = getState();
    const portions = meal_config.portions.filter((_,i) => i !== idx);
    updateMealConfig({ portions });
    container.querySelector('#portions-wrap').innerHTML =
      buildPortions(portions, getState().ingredient_bank);
    refreshShopping(container);
  });

  /* ── Ingredient bank sheet ── */
  container.querySelector('#btn-bank')?.addEventListener('click', () => openBankSheet(container));

  /* ── Shopping inputs ── */
  container.querySelector('#inp-marmitas')?.addEventListener('change', e => {
    const v = Math.max(1, parseInt(e.target.value)||1);
    e.target.value = v;
    updateMealConfig({ marmitas_per_week:v });
    refreshShopping(container);
  });
  container.querySelector('#inp-people')?.addEventListener('change', e => {
    const v = Math.max(1, parseInt(e.target.value)||1);
    e.target.value = v;
    updateMealConfig({ people:v });
    refreshShopping(container);
  });
}

/* ── Helpers ── */

function refreshMarmitaTotals(container) {
  const { meal_config: { portions }, ingredient_bank } = getState();
  const macros  = calcMarmitaMacros(portions, ingredient_bank);
  const summary = portions.map(p => {
    const ing = ingredient_bank.find(b => b.id === p.ingredient_id);
    return ing ? `${p.grams}g de ${ing.name.split(' ')[0]}` : null;
  }).filter(Boolean).join(' · ');

  const set = (id, v) => { const el = container.querySelector(id); if (el) el.textContent = v; };
  set('#al-total-summary', summary);
  set('#m-kcal', macros.kcal);
  set('#m-prot', macros.protein_g + 'g');
  set('#m-carb', macros.carbs_g + 'g');
  set('#m-fat',  macros.fat_g + 'g');
}

function refreshShopping(container) {
  const { meal_config, ingredient_bank } = getState();
  container.querySelector('#shopping-wrap').innerHTML = buildShopping(meal_config, ingredient_bank);
}

function openBankSheet(container) {
  const { ingredient_bank: bank, meal_config: { portions } } = getState();
  const sheet = openSheet(buildBankHTML(bank, portions), 'Ingredientes', {
    onClose: () => {
      container.querySelector('#portions-wrap').innerHTML =
        buildPortions(getState().meal_config.portions, getState().ingredient_bank);
      wirePortionSliders(container);
      refreshShopping(container);
    },
  });

  /* Wire bank actions */
  function wireBank() {
    const inner = document.querySelector('.sheet-inner');
    if (!inner) return;

    inner.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.add;
        const { meal_config: { portions: cur } } = getState();
        if (cur.find(p => p.ingredient_id === id)) {
          updateMealConfig({ portions: cur.filter(p => p.ingredient_id !== id) });
        } else {
          updateMealConfig({ portions: [...cur, { ingredient_id: id, grams: 100 }] });
        }
        const { ingredient_bank: b, meal_config: { portions: p } } = getState();
        sheet.setContent(buildBankHTML(b, p));
        wireBank();
      });
    });

    inner.querySelector('#btn-new-ing')?.addEventListener('click', () => {
      sheet.setContent(buildAddIngForm());
      wireAdd();
    });
  }

  function wireAdd() {
    const inner = document.querySelector('.sheet-inner');
    if (!inner) return;
    inner.querySelector('#btn-back-bank')?.addEventListener('click', () => {
      const { ingredient_bank: b, meal_config: { portions: p } } = getState();
      sheet.setContent(buildBankHTML(b, p));
      wireBank();
    });
    inner.querySelector('#btn-save-ing')?.addEventListener('click', () => {
      const name  = inner.querySelector('#ni-name')?.value.trim();
      const prot  = parseFloat(inner.querySelector('#ni-prot')?.value) || 0;
      const carb  = parseFloat(inner.querySelector('#ni-carb')?.value) || 0;
      const fat   = parseFloat(inner.querySelector('#ni-fat')?.value)  || 0;
      const price = parseFloat(inner.querySelector('#ni-price')?.value)|| 0;
      if (!name) { showToast('Informe o nome','error'); return; }
      const kcal = Math.round(prot*4 + carb*4 + fat*9);
      addIngredient({ id: uuid(), name, protein_g:prot, carbs_g:carb, fat_g:fat, kcal, price_per_kg:price });
      showToast('Ingrediente criado!','success');
      const { ingredient_bank: b, meal_config: { portions: p } } = getState();
      sheet.setContent(buildBankHTML(b, p));
      wireBank();
    });
  }

  wireBank();
}

function wirePortionSliders(container) {
  /* Re-wire after portions-wrap re-render */
  container.querySelector('#portions-wrap')?.addEventListener('input', e => {
    if (!e.target.classList.contains('al-slider')) return;
    const idx = parseInt(e.target.dataset.index);
    const val = parseInt(e.target.value);
    const sl = getState();
    const portions = [...sl.meal_config.portions];
    if (!portions[idx]) return;
    portions[idx] = { ...portions[idx], grams: val };
    updateMealConfig({ portions });
    const lbl = container.querySelector(`#slv-${idx}`);
    if (lbl) lbl.textContent = val + 'g';
    refreshMarmitaTotals(container);
    refreshShopping(container);
  }, { once: true });
}
