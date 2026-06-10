/* ── Store v3 — multi-user, única interface com localStorage ── */

const KEY = 'vortex_v3';
const VERSION = 1;

const AVATAR_COLORS = ['#FF5A1F','#FF2D78','#A8FF60','#FFD060','#3B82F6','#A855F7','#10B981'];

export const SEED_INGREDIENTS = {
  frango:      { id:'frango',      name:'Peito de frango',       category:'protein',   per_100g:{ kcal:165, protein_g:31,  fat_g:3.6, carbs_g:0    }, price_per_kg:22,  is_custom:false },
  ovo:         { id:'ovo',         name:'Ovo inteiro',            category:'protein',   per_100g:{ kcal:155, protein_g:13,  fat_g:11,  carbs_g:1.1  }, price_per_kg:30,  is_custom:false },
  atum:        { id:'atum',        name:'Atum em água',           category:'protein',   per_100g:{ kcal:116, protein_g:26,  fat_g:1,   carbs_g:0    }, price_per_kg:44,  is_custom:false },
  patinho:     { id:'patinho',     name:'Patinho moído',          category:'protein',   per_100g:{ kcal:190, protein_g:26,  fat_g:9,   carbs_g:0    }, price_per_kg:28,  is_custom:false },
  arroz:       { id:'arroz',       name:'Arroz branco cozido',    category:'carb',      per_100g:{ kcal:128, protein_g:2.5, fat_g:0.2, carbs_g:28   }, price_per_kg:5,   is_custom:false },
  arroz_int:   { id:'arroz_int',   name:'Arroz integral cozido',  category:'carb',      per_100g:{ kcal:124, protein_g:2.6, fat_g:1,   carbs_g:26   }, price_per_kg:6.5, is_custom:false },
  batata_doce: { id:'batata_doce', name:'Batata-doce cozida',     category:'carb',      per_100g:{ kcal:86,  protein_g:1.6, fat_g:0.1, carbs_g:20   }, price_per_kg:5.5, is_custom:false },
  batata:      { id:'batata',      name:'Batata inglesa cozida',  category:'carb',      per_100g:{ kcal:77,  protein_g:2,   fat_g:0.1, carbs_g:17   }, price_per_kg:4.5, is_custom:false },
  feijao:      { id:'feijao',      name:'Feijão carioca cozido',  category:'carb',      per_100g:{ kcal:76,  protein_g:4.9, fat_g:0.5, carbs_g:13.6 }, price_per_kg:8,   is_custom:false },
  brocolis:    { id:'brocolis',    name:'Brócolis cozido',        category:'vegetable', per_100g:{ kcal:35,  protein_g:2.4, fat_g:0.4, carbs_g:7    }, price_per_kg:7,   is_custom:false },
  cenoura:     { id:'cenoura',     name:'Cenoura cozida',         category:'vegetable', per_100g:{ kcal:41,  protein_g:1,   fat_g:0.2, carbs_g:9.5  }, price_per_kg:3.5, is_custom:false },
  espinafre:   { id:'espinafre',   name:'Espinafre refogado',     category:'vegetable', per_100g:{ kcal:29,  protein_g:2.9, fat_g:0.5, carbs_g:3.6  }, price_per_kg:6,   is_custom:false },
};

function _emptyUser(id) {
  return {
    id,
    created_at: new Date().toISOString(),
    profile: {
      name: '', age: 25, sex: 'M',
      weight_kg: 75, height_cm: 170,
      activity_level: 'moderate', goal: 'lose',
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
    targets: null,
    meal_config: { marmitas_per_week: 5, people: 1 },
    checkins: [],
    weight_log: [],
    goal_target: null,
  };
}

const EMPTY_STATE = {
  schema_version: VERSION,
  active_user_id: null,
  users: {},
  ingredient_bank: { ...SEED_INGREDIENTS },
};

function _deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function _load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return _deepClone(EMPTY_STATE);
    const parsed = JSON.parse(raw);
    if (!parsed.ingredient_bank || typeof parsed.ingredient_bank !== 'object' || Array.isArray(parsed.ingredient_bank)) {
      parsed.ingredient_bank = {};
    }
    for (const [id, seed] of Object.entries(SEED_INGREDIENTS)) {
      if (!parsed.ingredient_bank[id]) parsed.ingredient_bank[id] = { ...seed };
    }
    if (!parsed.users || typeof parsed.users !== 'object') parsed.users = {};
    return parsed;
  } catch {
    return _deepClone(EMPTY_STATE);
  }
}

function _save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

let _s = _load();

/* ── Reads ── */
export function getState()          { return _deepClone(_s); }
export function getActiveUserId()   { return _s.active_user_id; }
export function getActiveUser() {
  if (!_s.active_user_id || !_s.users[_s.active_user_id]) return null;
  return _deepClone(_s.users[_s.active_user_id]);
}
export function getAllUsers()       { return _deepClone(Object.values(_s.users)); }
export function getIngredientBank() { return _deepClone(_s.ingredient_bank); }

/* ── Users ── */
export function createUser() {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
  _s.users[id] = _emptyUser(id);
  _s.active_user_id = id;
  _save(_s);
  return _deepClone(_s.users[id]);
}

export function setActiveUser(id) {
  if (!_s.users[id]) return;
  _s.active_user_id = id;
  _save(_s);
}

export function deleteUser(id) {
  delete _s.users[id];
  if (_s.active_user_id === id) {
    const remaining = Object.keys(_s.users);
    _s.active_user_id = remaining.length ? remaining[0] : null;
  }
  _save(_s);
}

/* ── Per-user mutations ── */
function _withUser(fn) {
  const id = _s.active_user_id;
  if (!id || !_s.users[id]) return;
  fn(_s.users[id]);
  _save(_s);
}

export function updateProfile(p)    { _withUser(u => { u.profile = { ...u.profile, ...p }; }); }
export function updateTargets(t)    { _withUser(u => { u.targets = t; }); }
export function updateMealConfig(c) { _withUser(u => { u.meal_config = { ...u.meal_config, ...c }; }); }
export function updateGoalTarget(g) { _withUser(u => { u.goal_target = g; }); }

export function addCheckin(c) {
  _withUser(u => {
    u.checkins = u.checkins.filter(x => x.date !== c.date);
    u.checkins.push(c);
  });
}
export function removeCheckin(date) {
  _withUser(u => { u.checkins = u.checkins.filter(x => x.date !== date); });
}

export function addWeightEntry(date, weight_kg) {
  _withUser(u => {
    u.weight_log = u.weight_log.filter(e => e.date !== date);
    u.weight_log.push({ date, weight_kg: +weight_kg });
    u.weight_log.sort((a, b) => a.date.localeCompare(b.date));
  });
}

/* ── Ingredient bank (shared across users) ── */
export function updateIngredientPrice(id, price) {
  if (_s.ingredient_bank[id]) {
    _s.ingredient_bank[id].price_per_kg = +price;
    _save(_s);
  }
}

export function addCustomIngredient(ing) {
  _s.ingredient_bank[ing.id] = { ...ing, is_custom: true };
  _save(_s);
}

export function deleteCustomIngredient(id) {
  if (_s.ingredient_bank[id]?.is_custom) {
    delete _s.ingredient_bank[id];
    _save(_s);
  }
}
