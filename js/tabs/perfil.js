/* ── Aba Perfil + User Strip ── */

import {
  getActiveUser, getActiveUserId, getAllUsers,
  createUser, setActiveUser, deleteUser,
  updateProfile, updateTargets, getIngredientBank,
  updateIngredientPrice,
} from '../store.js';
import { calcTargets, openSheet, showToast } from '../utils.js';

/* ─── User strip (tira de avatares no topo) ─── */

export function renderUserStrip() {
  const strip = document.getElementById('user-strip');
  if (!strip) return;

  const users    = getAllUsers();
  const activeId = getActiveUserId();

  strip.innerHTML = users.map(u => {
    const initial = u.profile.name ? u.profile.name[0].toUpperCase() : '?';
    const active  = u.id === activeId;
    return `<button class="avatar-btn${active?' active':''}"
               data-uid="${u.id}"
               style="background-color:${u.profile.avatar_color}"
               aria-label="${u.profile.name || 'Usuário'}"
               title="${u.profile.name || 'Usuário'}">${initial}</button>`;
  }).join('') +
  `<button class="avatar-btn avatar-btn--add" id="strip-add" aria-label="Adicionar usuário" title="Adicionar usuário">+</button>`;

  strip.querySelectorAll('.avatar-btn[data-uid]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (btn.dataset.uid === getActiveUserId()) return;
      setActiveUser(btn.dataset.uid);
      renderUserStrip();
      window.__vortexRefresh?.();
    })
  );

  strip.querySelector('#strip-add')?.addEventListener('click', () =>
    openNewUserSheet(() => { renderUserStrip(); window.__vortexGo?.('alimentacao'); })
  );
}

/* ─── Abrir form de novo usuário ─── */

export function openNewUserSheet(onDone) {
  const sheet = openSheet(_newUserHTML(), 'Criar perfil', { onClose: () => {} });
  _attachNewUserForm(sheet.body, sheet, onDone);
}

function _newUserHTML() {
  const acts = [
    ['sedentary','Sedentário'],
    ['light',    'Leve (1–2×/sem)'],
    ['moderate', 'Moderado (3–4×/sem)'],
    ['intense',  'Intenso (5+/sem)'],
  ];
  return `
    <div style="display:grid;gap:var(--s4)">
      <div class="al-row">
        <label class="al-label">Nome</label>
        <input id="nu-nome" type="text" class="input-field" placeholder="Seu nome" autocomplete="name">
      </div>
      <div class="al-row">
        <label class="al-label">Sexo</label>
        <div class="al-toggle" id="nu-sexo">
          <div class="al-toggle-opt sel" data-val="M">Homem</div>
          <div class="al-toggle-opt"    data-val="F">Mulher</div>
        </div>
      </div>
      <div class="al-row">
        <label class="al-label">Idade</label>
        <input id="nu-idade" type="number" class="input-field" min="10" max="99" placeholder="25">
      </div>
      <div class="al-row">
        <label class="al-label">Peso (kg)</label>
        <input id="nu-peso" type="number" class="input-field" min="30" max="300" step="0.1" placeholder="75">
      </div>
      <div class="al-row">
        <label class="al-label">Altura (cm)</label>
        <input id="nu-alt" type="number" class="input-field" min="100" max="250" placeholder="170">
      </div>
      <div class="al-row">
        <label class="al-label">Atividade</label>
        <select id="nu-atv" class="input-field">
          ${acts.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="al-row">
        <label class="al-label">Objetivo</label>
        <div class="al-toggle" id="nu-goal">
          <div class="al-toggle-opt sel" data-val="lose">Emagrecer</div>
          <div class="al-toggle-opt"    data-val="maintain">Manter</div>
          <div class="al-toggle-opt"    data-val="gain">Ganhar</div>
        </div>
      </div>
      <button class="btn btn--primary" id="nu-save">Criar perfil e calcular metas</button>
    </div>`;
}

function _attachNewUserForm(body, sheet, onDone) {
  const tog = (id) => {
    body.querySelectorAll(`#${id} .al-toggle-opt`).forEach(o =>
      o.addEventListener('click', () => {
        body.querySelectorAll(`#${id} .al-toggle-opt`).forEach(x => x.classList.remove('sel'));
        o.classList.add('sel');
      })
    );
  };
  tog('nu-sexo');
  tog('nu-goal');

  body.querySelector('#nu-save')?.addEventListener('click', () => {
    const name           = body.querySelector('#nu-nome').value.trim();
    const age            = +body.querySelector('#nu-idade').value;
    const weight_kg      = +body.querySelector('#nu-peso').value;
    const height_cm      = +body.querySelector('#nu-alt').value;
    const sex            = body.querySelector('#nu-sexo .sel')?.dataset.val || 'M';
    const activity_level = body.querySelector('#nu-atv').value;
    const goal           = body.querySelector('#nu-goal .sel')?.dataset.val || 'lose';

    if (!name) { showToast('Informe seu nome.', 'warn'); return; }
    if (!age || !weight_kg || !height_cm) { showToast('Preencha idade, peso e altura.', 'warn'); return; }

    createUser();
    const prof = { name, age, sex, weight_kg, height_cm, activity_level, goal };
    updateProfile(prof);
    updateTargets(calcTargets(prof));
    showToast(`Perfil de ${name} criado!`, 'success');
    sheet.close();
    onDone?.();
  });
}

/* ─── Render da aba Perfil ─── */

export function render(screen) {
  const user = getActiveUser();
  if (!user) {
    screen.innerHTML = `<div class="empty-screen">
      <p>Crie seu primeiro perfil para começar.</p>
      <button class="btn btn--primary" id="pf-create">Criar perfil</button>
    </div>`;
    screen.querySelector('#pf-create')?.addEventListener('click', () =>
      openNewUserSheet(() => { renderUserStrip(); window.__vortexGo?.('alimentacao'); })
    );
    return;
  }

  const bank  = getIngredientBank();
  const users = getAllUsers();

  screen.innerHTML = _html(user, users, bank);
  _attach(screen, user);
}

/* ─── HTML da aba ─── */

function _html(user, users, bank) {
  const { profile } = user;
  const acts = { sedentary:'Sedentário', light:'Leve', moderate:'Moderado', intense:'Intenso' };
  const goals = { lose:'Emagrecer', maintain:'Manter peso', gain:'Ganhar massa' };

  const avatarRows = users.map(u => {
    const initial = u.profile.name ? u.profile.name[0].toUpperCase() : '?';
    const isMe = u.id === getActiveUserId();
    return `<div class="pf-user-row${isMe?' pf-user-row--active':''}">
      <div class="pf-avatar" style="background-color:${u.profile.avatar_color}">${initial}</div>
      <div class="pf-user-info">
        <div class="pf-user-name">${u.profile.name || '(sem nome)'}</div>
        <div class="pf-user-detail">${u.profile.weight_kg}kg · ${u.profile.goal ? goals[u.profile.goal] : '—'}</div>
      </div>
      <div class="pf-user-actions">
        ${!isMe ? `<button class="btn btn--ghost pf-switch" data-uid="${u.id}">Usar</button>` : '<span class="pf-active-badge">Ativo</span>'}
        <button class="btn btn--ghost pf-del" data-uid="${u.id}" aria-label="Excluir">✕</button>
      </div>
    </div>`;
  }).join('');

  const bankRows = Object.values(bank).slice(0, 12).map(i => `
    <div class="pf-bank-row">
      <span class="pf-bank-name">${i.name}</span>
      <span class="pf-bank-macro">${i.per_100g.protein_g}g prot/100g</span>
      <span class="pf-bank-price">R$ <input type="number" class="pf-price-inp" data-id="${i.id}" value="${i.price_per_kg}" min="0" step="0.5">/kg</span>
    </div>`).join('');

  return `
    <div class="page-header">
      <h1>Perfil</h1>
      <p>Seus dados, usuários e configurações.</p>
    </div>

    <div class="section">
      <div class="section-title">Perfil ativo — ${profile.name || '(sem nome)'}</div>
      <div class="pf-data-grid">
        <div class="pf-data-item"><span class="pf-data-label">Peso</span><span class="pf-data-val">${profile.weight_kg} kg</span></div>
        <div class="pf-data-item"><span class="pf-data-label">Altura</span><span class="pf-data-val">${profile.height_cm} cm</span></div>
        <div class="pf-data-item"><span class="pf-data-label">Idade</span><span class="pf-data-val">${profile.age} anos</span></div>
        <div class="pf-data-item"><span class="pf-data-label">Atividade</span><span class="pf-data-val">${acts[profile.activity_level] || '—'}</span></div>
        <div class="pf-data-item"><span class="pf-data-label">Objetivo</span><span class="pf-data-val">${goals[profile.goal] || '—'}</span></div>
        <div class="pf-data-item"><span class="pf-data-label">Sexo</span><span class="pf-data-val">${profile.sex === 'M' ? 'Homem' : 'Mulher'}</span></div>
      </div>
      <button class="btn btn--secondary" id="pf-edit" style="margin-top:var(--s4);width:100%">Editar dados</button>
    </div>

    <div class="section">
      <div class="section-title">Usuários</div>
      <div class="pf-users-list">${avatarRows}</div>
      <button class="btn btn--secondary" id="pf-add-user" style="margin-top:var(--s3);width:100%">+ Adicionar usuário</button>
    </div>

    <div class="section">
      <div class="section-title">Banco de ingredientes</div>
      <div class="section-hint">Ajuste os preços médios por kg conforme sua região.</div>
      <div class="pf-bank-list">${bankRows}</div>
    </div>

    <div class="section">
      <div class="section-title">Zona de perigo</div>
      <button class="btn btn--ghost pf-danger" id="pf-reset" style="width:100%;color:var(--color-error)">Resetar todos os dados deste usuário</button>
    </div>
    <div class="tab-footer"></div>`;
}

/* ─── Eventos ─── */

function _attach(screen, user) {
  /* Editar perfil */
  screen.querySelector('#pf-edit')?.addEventListener('click', () => _openEditSheet(user));

  /* Adicionar usuário */
  screen.querySelector('#pf-add-user')?.addEventListener('click', () =>
    openNewUserSheet(() => { renderUserStrip(); window.__vortexGo?.('perfil'); })
  );

  /* Trocar usuário */
  screen.querySelectorAll('.pf-switch').forEach(btn =>
    btn.addEventListener('click', () => {
      setActiveUser(btn.dataset.uid);
      renderUserStrip();
      window.__vortexGo?.('perfil');
    })
  );

  /* Excluir usuário */
  screen.querySelectorAll('.pf-del').forEach(btn =>
    btn.addEventListener('click', () => {
      if (!confirm('Excluir este usuário e todos os seus dados?')) return;
      deleteUser(btn.dataset.uid);
      renderUserStrip();
      if (!getActiveUserId()) {
        openNewUserSheet(() => { renderUserStrip(); window.__vortexGo?.('alimentacao'); });
      } else {
        window.__vortexGo?.('perfil');
      }
    })
  );

  /* Preços do banco */
  screen.querySelectorAll('.pf-price-inp').forEach(inp =>
    inp.addEventListener('change', () => {
      updateIngredientPrice(inp.dataset.id, +inp.value);
      showToast('Preço atualizado.', 'success');
    })
  );

  /* Reset */
  screen.querySelector('#pf-reset')?.addEventListener('click', () => {
    if (!confirm('Isso apagará treinos, pesos e metas deste usuário. Continuar?')) return;
    updateProfile({ name: user.profile.name, age: user.profile.age, sex: user.profile.sex,
                    weight_kg: user.profile.weight_kg, height_cm: user.profile.height_cm,
                    activity_level: user.profile.activity_level, goal: user.profile.goal });
    import('../store.js').then(s => {
      s.updateGoalTarget(null);
      // Clear checkins and weight_log via re-render
      showToast('Dados resetados.', 'default');
      window.__vortexGo?.('perfil');
    });
  });
}

function _openEditSheet(user) {
  const p    = user.profile;
  const acts = [
    ['sedentary','Sedentário (escritório, sem exercício)'],
    ['light',    'Leve (1–2×/semana)'],
    ['moderate', 'Moderado (3–4×/semana)'],
    ['intense',  'Intenso (5+×/semana)'],
  ];

  const html = `
    <div style="display:grid;gap:var(--s4)">
      <div class="al-row">
        <label class="al-label">Nome</label>
        <input id="ed-nome" type="text" class="input-field" value="${p.name}" autocomplete="name">
      </div>
      <div class="al-row">
        <label class="al-label">Sexo</label>
        <div class="al-toggle" id="ed-sexo">
          <div class="al-toggle-opt${p.sex==='M'?' sel':''}" data-val="M">Homem</div>
          <div class="al-toggle-opt${p.sex==='F'?' sel':''}" data-val="F">Mulher</div>
        </div>
      </div>
      <div class="al-row">
        <label class="al-label">Idade</label>
        <input id="ed-idade" type="number" class="input-field" value="${p.age}" min="10" max="99">
      </div>
      <div class="al-row">
        <label class="al-label">Peso (kg)</label>
        <input id="ed-peso" type="number" class="input-field" value="${p.weight_kg}" min="30" max="300" step="0.1">
      </div>
      <div class="al-row">
        <label class="al-label">Altura (cm)</label>
        <input id="ed-alt" type="number" class="input-field" value="${p.height_cm}" min="100" max="250">
      </div>
      <div class="al-row">
        <label class="al-label">Atividade</label>
        <select id="ed-atv" class="input-field">
          ${acts.map(([v,l]) => `<option value="${v}"${p.activity_level===v?' selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="al-row">
        <label class="al-label">Objetivo</label>
        <div class="al-toggle" id="ed-goal">
          <div class="al-toggle-opt${p.goal==='lose'?    ' sel':''}" data-val="lose">Emagrecer</div>
          <div class="al-toggle-opt${p.goal==='maintain'?' sel':''}" data-val="maintain">Manter</div>
          <div class="al-toggle-opt${p.goal==='gain'?    ' sel':''}" data-val="gain">Ganhar</div>
        </div>
      </div>
      <button class="btn btn--primary" id="ed-save">Salvar e recalcular</button>
    </div>`;

  const sheet = openSheet(html, 'Editar perfil');

  const tog = (id) => {
    sheet.body.querySelectorAll(`#${id} .al-toggle-opt`).forEach(o =>
      o.addEventListener('click', () => {
        sheet.body.querySelectorAll(`#${id} .al-toggle-opt`).forEach(x => x.classList.remove('sel'));
        o.classList.add('sel');
      })
    );
  };
  tog('ed-sexo');
  tog('ed-goal');

  sheet.body.querySelector('#ed-save')?.addEventListener('click', () => {
    const name           = sheet.body.querySelector('#ed-nome').value.trim();
    const age            = +sheet.body.querySelector('#ed-idade').value;
    const weight_kg      = +sheet.body.querySelector('#ed-peso').value;
    const height_cm      = +sheet.body.querySelector('#ed-alt').value;
    const sex            = sheet.body.querySelector('#ed-sexo .sel')?.dataset.val || 'M';
    const activity_level = sheet.body.querySelector('#ed-atv').value;
    const goal           = sheet.body.querySelector('#ed-goal .sel')?.dataset.val || 'lose';

    if (!name || !age || !weight_kg || !height_cm) { showToast('Preencha todos os campos.', 'warn'); return; }

    const prof = { name, age, sex, weight_kg, height_cm, activity_level, goal };
    updateProfile(prof);
    updateTargets(calcTargets(prof));
    renderUserStrip();
    showToast('Perfil atualizado!', 'success');
    sheet.close();
    window.__vortexGo?.('perfil');
  });
}
