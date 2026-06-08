/* ── Marmita — Banco de Ingredientes + Calculadora + Lista de Compra ── */

import { getActiveUserId, getActiveUser } from '../auth.js';
import { getIngredientBank, upsertIngredient, deleteIngredient, getMarmitaConfig, setMarmitaConfig, addMealLog } from '../store.js';
import { fadeIn, staggerIn, scaleIn, sheetEnter, sheetLeave } from '../animations/transitions.js';
import { showToast, today } from '../utils.js';

let _activeTab = 'banco';

export async function render(container) {
  _activeTab = 'banco';
  renderFull(container);
  await fadeIn(container);
}

function renderFull(container) {
  container.innerHTML = `
<div style="padding-top:var(--s5)">
  <div class="page-header" style="padding-top:0">
    <h1 class="page-header__title">Marmita</h1>
  </div>

  <div class="marmita-tabs" role="tablist">
    <button class="marmita-tab ${_activeTab==='banco'?'active':''}" data-tab="banco" role="tab" aria-selected="${_activeTab==='banco'}">Ingredientes</button>
    <button class="marmita-tab ${_activeTab==='calc'?'active':''}"  data-tab="calc"  role="tab" aria-selected="${_activeTab==='calc'}">Calculadora</button>
    <button class="marmita-tab ${_activeTab==='lista'?'active':''}" data-tab="lista" role="tab" aria-selected="${_activeTab==='lista'}">Lista de Compra</button>
  </div>

  <div id="marmita-content" style="padding-top:var(--s4)">
    ${renderTab(_activeTab, container)}
  </div>
</div>`;

  wireTabs(container);
  wireTabContent(container, _activeTab);
}

function renderTab(tab) {
  if (tab === 'banco')  return renderBanco();
  if (tab === 'calc')   return renderCalc();
  if (tab === 'lista')  return renderLista();
  return '';
}

/* ════════ BANCO DE INGREDIENTES ════════ */

function renderBanco() {
  const ingredients = getIngredientBank().sort((a, b) => {
    const catOrder = ['protein','carb','fat','vegetable','fruit','dairy','other'];
    return catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.name.localeCompare(b.name, 'pt-BR');
  });

  return `
<div class="marmita-panel active" id="panel-banco">
  <div class="ingredient-search-wrap">
    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input id="ing-search" class="input-field" type="search" placeholder="Buscar ingrediente..." autocomplete="off">
  </div>

  <div class="ingredient-list" id="ing-list">
    ${ingredients.map(i => ingredientRow(i)).join('')}
    ${ingredients.length === 0 ? '<p style="text-align:center;color:var(--text-secondary);padding:var(--s8)">Nenhum ingrediente</p>' : ''}
  </div>

  <button class="btn btn--secondary btn--full tappable" id="btn-add-ing" style="margin-top:var(--s2)">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Adicionar ingrediente
  </button>
</div>`;
}

function ingredientRow(ing) {
  const { id, name, category, per_100g, is_custom } = ing;
  const macroStr = `P:${per_100g.protein_g}g C:${per_100g.carbs_g}g G:${per_100g.fat_g}g · ${per_100g.kcal}kcal/100g`;
  return `
<div class="ingredient-item tappable" data-id="${id}">
  <div class="ingredient-item__dot dot--${category}"></div>
  <div class="ingredient-item__content">
    <div class="ingredient-item__name">${escHtml(name)}</div>
    <div class="ingredient-item__macros">${macroStr}</div>
  </div>
  <div class="ingredient-item__actions">
    ${is_custom ? `<button class="btn btn--icon-sm tappable btn-edit-ing" data-id="${id}" aria-label="Editar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
    <button class="btn btn--icon-sm tappable btn-del-ing" data-id="${id}" aria-label="Remover">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>` : ''}
  </div>
</div>`;
}

/* ════════ CALCULADORA ════════ */

function renderCalc() {
  const ingredients = getIngredientBank();
  const user = getActiveUser();
  const targets = user?.targets || {};

  return `
<div class="marmita-panel active" id="panel-calc">
  <div class="calc-card">
    <div class="input-group">
      <label class="input-label" for="calc-ing">Ingrediente</label>
      <select id="calc-ing" class="calc-select">
        <option value="">Selecione...</option>
        ${ingredients.map(i => `<option value="${i.id}" data-p100="${i.per_100g.protein_g}" data-c100="${i.per_100g.carbs_g}" data-f100="${i.per_100g.fat_g}" data-k100="${i.per_100g.kcal}" data-dpg="${i.default_portion_g}">${escHtml(i.name)}</option>`).join('')}
      </select>
    </div>

    <div class="slider-wrap">
      <div class="slider-label-row">
        <label class="input-label" for="gram-slider">Quantidade</label>
        <div class="calc-gram-display"><span id="gram-display">100</span><span class="calc-gram-unit">g</span></div>
      </div>
      <input id="gram-slider" class="slider" type="range" min="10" max="500" step="5" value="100">
    </div>

    <div class="macro-preview-bar" id="macro-bar">
      <div class="macro-preview-bar__protein" style="width:33%"></div>
      <div class="macro-preview-bar__carb" style="width:34%"></div>
      <div class="macro-preview-bar__fat" style="width:33%"></div>
    </div>

    <div class="calc-macros-grid" id="calc-macros">
      ${calcMacroCell('0', 'kcal', 'k-kcal')}
      ${calcMacroCell('0g', 'Prot.', 'k-prot')}
      ${calcMacroCell('0g', 'Carbs', 'k-carb')}
      ${calcMacroCell('0g', 'Gord.', 'k-fat')}
    </div>

    ${targets.protein_g ? `<div class="notice" style="margin-top:0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>Sua meta de proteína: <strong>${targets.protein_g}g</strong>/dia</p>
    </div>` : ''}

    <button class="btn btn--primary btn--full tappable" id="btn-log-meal">Registrar refeição hoje</button>
  </div>
</div>`;
}

function calcMacroCell(value, label, id) {
  return `
<div class="calc-macro-cell">
  <div class="calc-macro-cell__value tabular-nums" id="${id}">${value}</div>
  <div class="calc-macro-cell__label">${label}</div>
</div>`;
}

/* ════════ LISTA DE COMPRA ════════ */

function renderLista() {
  const userId = getActiveUserId();
  const config = getMarmitaConfig(userId);
  const user   = getActiveUser();
  const targets = user?.targets || {};
  const proteinTarget = targets.protein_g || 120;

  return `
<div class="marmita-panel active" id="panel-lista">
  <!-- config -->
  <div class="marmita-config">
    <div style="font-family:var(--font-display);font-size:var(--text-base);font-weight:700;margin-bottom:var(--s2)">Configurar semana</div>
    <div class="config-row">
      <div>
        <div class="config-row__label">Marmitas por semana</div>
        <div class="config-row__desc">Para ${proteinTarget}g de proteína/dia</div>
      </div>
      <div class="config-stepper">
        <button class="config-stepper__btn tappable" id="meals-dec" aria-label="Menos">−</button>
        <div class="config-stepper__value tabular-nums" id="meals-val">${config.meals_per_week}</div>
        <button class="config-stepper__btn tappable" id="meals-inc" aria-label="Mais">+</button>
      </div>
    </div>
    <div class="config-row">
      <div>
        <div class="config-row__label">Pessoas</div>
      </div>
      <div class="config-stepper">
        <button class="config-stepper__btn tappable" id="people-dec" aria-label="Menos">−</button>
        <div class="config-stepper__value tabular-nums" id="people-val">${config.people}</div>
        <button class="config-stepper__btn tappable" id="people-inc" aria-label="Mais">+</button>
      </div>
    </div>
  </div>

  <!-- generated list -->
  <div id="shopping-list-content">
    ${generateShoppingListHTML(config, proteinTarget)}
  </div>
</div>`;
}

function generateShoppingListHTML(config, proteinTarget) {
  const mealsPerWeek = config.meals_per_week || 5;
  const people       = config.people || 1;

  const chicken = getIngredientBank().find(i => i.name.toLowerCase().includes('frango'));
  const rice    = getIngredientBank().find(i => i.name.toLowerCase().includes('arroz branco'));
  const sweet   = getIngredientBank().find(i => i.name.toLowerCase().includes('batata-doce'));
  const broc    = getIngredientBank().find(i => i.name.toLowerCase().includes('brócolis'));

  if (!chicken) return '<p style="color:var(--text-secondary);text-align:center;padding:var(--s8)">Banco de ingredientes vazio</p>';

  /* grams of chicken needed per meal to hit protein target */
  const protPerMeal  = proteinTarget;
  const chickGramsPerMeal = Math.round((protPerMeal / (chicken.per_100g.protein_g / 100)));
  const riceGrams    = 150;
  const sweetGrams   = 150;
  const brocGrams    = 100;

  const totalFactor  = mealsPerWeek * people;

  const items = [
    { name: chicken.name, totalG: chickGramsPerMeal * totalFactor, pricePerKg: chicken.price_per_kg || 22 },
    ...(rice  ? [{ name: rice.name,  totalG: riceGrams * totalFactor,  pricePerKg: rice.price_per_kg || 5 }]  : []),
    ...(sweet ? [{ name: sweet.name, totalG: sweetGrams * totalFactor, pricePerKg: sweet.price_per_kg || 7 }] : []),
    ...(broc  ? [{ name: broc.name,  totalG: brocGrams * totalFactor,  pricePerKg: broc.price_per_kg || 8 }]  : []),
  ];

  const totalCost = items.reduce((s, i) => s + (i.totalG / 1000) * i.pricePerKg, 0);
  const listText  = items.map(i => `${i.name}: ${(i.totalG / 1000).toFixed(2).replace('.',',')} kg`).join('\n');

  return `
<div class="shopping-list">
  ${items.map((i, idx) => `
  <div class="shopping-item">
    <div class="shopping-item__check" id="chk-${idx}" role="checkbox" aria-checked="false" tabindex="0"></div>
    <div class="shopping-item__name">${escHtml(i.name)}</div>
    <div class="shopping-item__qty">${(i.totalG / 1000).toFixed(2).replace('.',',')} kg</div>
  </div>`).join('')}
</div>

<div class="shopping-total">
  <span class="shopping-total__label">Custo estimado</span>
  <span class="shopping-total__value">R$ ${totalCost.toFixed(2).replace('.',',')}</span>
</div>

<button class="btn btn--secondary btn--full tappable" id="btn-copy-list">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  Copiar lista
</button>
<button class="btn btn--ghost btn--full tappable" id="btn-share-list" ${typeof navigator !== 'undefined' && !navigator.share ? 'style="display:none"' : ''}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
  Compartilhar
</button>
<div data-list-text="${escHtml(listText)}" id="list-text-store" hidden></div>`;
}

/* ════════ WIRING ════════ */

function wireTabs(container) {
  container.querySelectorAll('.marmita-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _activeTab = tab.dataset.tab;
      container.querySelectorAll('.marmita-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      const content = container.querySelector('#marmita-content');
      if (content) {
        content.innerHTML = renderTab(_activeTab);
        wireTabContent(container, _activeTab);
      }
    });
  });
}

function wireTabContent(container, tab) {
  const content = container.querySelector('#marmita-content');
  if (!content) return;

  if (tab === 'banco') {
    wireBanco(content);
  } else if (tab === 'calc') {
    wireCalcTab(content);
  } else if (tab === 'lista') {
    wireListaTab(content, container);
  }
}

function wireBanco(content) {
  /* Search */
  content.querySelector('#ing-search')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    content.querySelectorAll('.ingredient-item').forEach(row => {
      const name = row.querySelector('.ingredient-item__name')?.textContent.toLowerCase() || '';
      row.style.display = name.includes(q) ? '' : 'none';
    });
  });

  /* Add button */
  content.querySelector('#btn-add-ing')?.addEventListener('click', () => openIngredientSheet(null, content));

  /* Edit / delete */
  content.querySelector('#ing-list')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit-ing');
    const delBtn  = e.target.closest('.btn-del-ing');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const bank = getIngredientBank();
      const ing = bank.find(i => i.id === id);
      if (ing) openIngredientSheet(ing, content);
    }
    if (delBtn) {
      const id = delBtn.dataset.id;
      deleteIngredient(id);
      const row = content.querySelector(`[data-id="${id}"]`);
      if (row) row.remove();
      showToast('Ingrediente removido');
    }
  });
}

function wireCalcTab(content) {
  const select    = content.querySelector('#calc-ing');
  const slider    = content.querySelector('#gram-slider');
  const display   = content.querySelector('#gram-display');

  const update = () => {
    const opt = select?.options[select.selectedIndex];
    const grams = parseInt(slider?.value || 100);
    if (display) display.textContent = grams;
    if (!opt || !opt.value) return;

    const factor = grams / 100;
    const p = parseFloat(opt.dataset.p100 || 0) * factor;
    const c = parseFloat(opt.dataset.c100 || 0) * factor;
    const f = parseFloat(opt.dataset.f100 || 0) * factor;
    const k = parseFloat(opt.dataset.k100 || 0) * factor;

    const kcalEl = content.querySelector('#k-kcal');
    const protEl = content.querySelector('#k-prot');
    const carbEl = content.querySelector('#k-carb');
    const fatEl  = content.querySelector('#k-fat');

    if (kcalEl) kcalEl.textContent = Math.round(k);
    if (protEl) protEl.textContent = Math.round(p) + 'g';
    if (carbEl) carbEl.textContent = Math.round(c) + 'g';
    if (fatEl)  fatEl.textContent  = Math.round(f) + 'g';

    /* Update macro bar */
    const total = p * 4 + c * 4 + f * 9;
    if (total > 0) {
      const bar = content.querySelector('#macro-bar');
      if (bar) {
        bar.children[0].style.width = ((p * 4 / total) * 100).toFixed(1) + '%';
        bar.children[1].style.width = ((c * 4 / total) * 100).toFixed(1) + '%';
        bar.children[2].style.width = ((f * 9 / total) * 100).toFixed(1) + '%';
      }
    }
  };

  select?.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    if (opt?.dataset.dpg && slider) slider.value = opt.dataset.dpg;
    update();
  });
  slider?.addEventListener('input', update);

  content.querySelector('#btn-log-meal')?.addEventListener('click', () => {
    const opt   = select?.options[select.selectedIndex];
    if (!opt?.value) { showToast('Selecione um ingrediente', 'error'); return; }
    const grams = parseInt(slider?.value || 100);
    const factor = grams / 100;
    const dateStr = today();
    addMealLog(getActiveUserId(), {
      date:            dateStr,
      meal_name:       opt.text,
      ingredients:     [{ ingredient_id: opt.value, grams }],
      total_kcal:      parseFloat(opt.dataset.k100) * factor,
      total_protein_g: parseFloat(opt.dataset.p100) * factor,
      total_fat_g:     parseFloat(opt.dataset.f100) * factor,
      total_carbs_g:   parseFloat(opt.dataset.c100) * factor,
    });
    showToast('Refeição registrada!', 'success');
  });
}

function wireListaTab(content, container) {
  const userId = getActiveUserId();
  const user   = getActiveUser();
  const targets = user?.targets || {};

  const updateList = () => {
    const config = getMarmitaConfig(userId);
    const listEl = content.querySelector('#shopping-list-content');
    if (listEl) listEl.innerHTML = generateShoppingListHTML(config, targets.protein_g || 120);
  };

  const bindStepper = (decId, incId, valId, field, min, max) => {
    const dec = content.querySelector('#' + decId);
    const inc = content.querySelector('#' + incId);
    const val = content.querySelector('#' + valId);
    dec?.addEventListener('click', () => {
      const config = getMarmitaConfig(userId);
      const newVal = Math.max(min, (config[field] || min) - 1);
      setMarmitaConfig(userId, { [field]: newVal });
      if (val) val.textContent = newVal;
      updateList();
    });
    inc?.addEventListener('click', () => {
      const config = getMarmitaConfig(userId);
      const newVal = Math.min(max, (config[field] || min) + 1);
      setMarmitaConfig(userId, { [field]: newVal });
      if (val) val.textContent = newVal;
      updateList();
    });
  };

  bindStepper('meals-dec', 'meals-inc', 'meals-val', 'meals_per_week', 1, 21);
  bindStepper('people-dec', 'people-inc', 'people-val', 'people', 1, 10);

  /* Wire copy and share buttons after list renders */
  const wireListButtons = () => {
    const listTextEl = content.querySelector('#list-text-store');
    const listText   = listTextEl?.dataset.listText || '';

    content.querySelector('#btn-copy-list')?.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(listText)
          .then(() => showToast('Lista copiada!', 'success'))
          .catch(() => showToast('Não foi possível copiar', 'error'));
      } else {
        showToast('Copiar não suportado neste browser', 'error');
      }
    });

    content.querySelector('#btn-share-list')?.addEventListener('click', () => {
      navigator.share?.({ title: 'Lista de compra VORTEX Fit', text: listText });
    });

    content.querySelectorAll('[id^=chk-]').forEach(el => {
      el.addEventListener('click', () => {
        const isChecked = el.getAttribute('aria-checked') === 'true';
        el.setAttribute('aria-checked', String(!isChecked));
        el.classList.toggle('checked', !isChecked);
      });
    });
  };

  wireListButtons();
  /* Re-wire after stepper updates */
  content.querySelector('#meals-dec')?.addEventListener('click', () => setTimeout(wireListButtons, 10));
  content.querySelector('#meals-inc')?.addEventListener('click', () => setTimeout(wireListButtons, 10));
  content.querySelector('#people-dec')?.addEventListener('click', () => setTimeout(wireListButtons, 10));
  content.querySelector('#people-inc')?.addEventListener('click', () => setTimeout(wireListButtons, 10));
}

/* ════════ INGREDIENT SHEET ════════ */

function openIngredientSheet(existing, content) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const isEdit = !!existing;
  overlay.innerHTML = `
<div class="bottom-sheet">
  <div class="bottom-sheet__handle" role="presentation"></div>
  <div class="bottom-sheet__header">
    <div class="bottom-sheet__title">${isEdit ? 'Editar' : 'Adicionar'} ingrediente</div>
    <button class="btn btn--icon-sm tappable" id="ing-sheet-close" aria-label="Fechar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div class="bottom-sheet__body">
    <div class="input-group">
      <label class="input-label" for="ing-name">Nome</label>
      <input id="ing-name" class="input-field" type="text" value="${escHtml(existing?.name || '')}" placeholder="Ex: Peito de frango" required>
    </div>
    <div class="input-group">
      <label class="input-label" for="ing-cat">Categoria</label>
      <select id="ing-cat" class="calc-select">
        ${['protein','carb','fat','vegetable','fruit','dairy','other'].map(c => `<option value="${c}" ${existing?.category===c?'selected':''}>${catLabel(c)}</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)">
      <div class="input-group">
        <label class="input-label" for="ing-kcal">kcal/100g</label>
        <input id="ing-kcal" class="input-field" type="number" min="0" step="1" value="${existing?.per_100g?.kcal || ''}" placeholder="165">
      </div>
      <div class="input-group">
        <label class="input-label" for="ing-prot">Proteína (g)</label>
        <input id="ing-prot" class="input-field" type="number" min="0" step="0.1" value="${existing?.per_100g?.protein_g || ''}" placeholder="31">
      </div>
      <div class="input-group">
        <label class="input-label" for="ing-carb">Carbs (g)</label>
        <input id="ing-carb" class="input-field" type="number" min="0" step="0.1" value="${existing?.per_100g?.carbs_g || ''}" placeholder="0">
      </div>
      <div class="input-group">
        <label class="input-label" for="ing-fat">Gordura (g)</label>
        <input id="ing-fat" class="input-field" type="number" min="0" step="0.1" value="${existing?.per_100g?.fat_g || ''}" placeholder="3.6">
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="ing-price">Preço/kg (R$)</label>
      <input id="ing-price" class="input-field" type="number" min="0" step="0.01" value="${existing?.price_per_kg || ''}" placeholder="22.00">
    </div>
    <button class="btn btn--primary btn--full tappable" id="btn-save-ing">Salvar</button>
  </div>
</div>`;

  document.body.appendChild(overlay);
  sheetEnter(overlay.querySelector('.bottom-sheet'));

  const closeSheet = async () => {
    await sheetLeave(overlay.querySelector('.bottom-sheet'));
    overlay.remove();
  };

  overlay.querySelector('#ing-sheet-close')?.addEventListener('click', closeSheet);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSheet(); });

  overlay.querySelector('#btn-save-ing')?.addEventListener('click', () => {
    const name  = overlay.querySelector('#ing-name')?.value?.trim();
    if (!name) return;
    const cat   = overlay.querySelector('#ing-cat')?.value;
    const kcal  = parseFloat(overlay.querySelector('#ing-kcal')?.value) || 0;
    const prot  = parseFloat(overlay.querySelector('#ing-prot')?.value) || 0;
    const carb  = parseFloat(overlay.querySelector('#ing-carb')?.value) || 0;
    const fat   = parseFloat(overlay.querySelector('#ing-fat')?.value)  || 0;
    const price = parseFloat(overlay.querySelector('#ing-price')?.value) || 0;

    upsertIngredient({
      id:   existing?.id || undefined,
      name, category: cat,
      per_100g: { kcal, protein_g: prot, carbs_g: carb, fat_g: fat, fiber_g: 0 },
      default_portion_g: 100,
      price_per_kg: price,
    });

    showToast(isEdit ? 'Ingrediente atualizado!' : 'Ingrediente adicionado!', 'success');
    closeSheet();

    /* Refresh list */
    const listEl = content.querySelector('#ing-list');
    if (listEl) {
      listEl.innerHTML = getIngredientBank()
        .sort((a,b) => a.name.localeCompare(b.name,'pt-BR'))
        .map(i => ingredientRow(i)).join('');
    }
  });
}

function catLabel(c) {
  return { protein:'Proteína', carb:'Carboidrato', fat:'Gordura', vegetable:'Legume/Verdura', fruit:'Fruta', dairy:'Lácteo', other:'Outro' }[c] || c;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
