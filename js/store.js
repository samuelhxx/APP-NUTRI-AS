/* ── Store — única interface com localStorage ── */

import { uuid, deepClone, deepMerge } from './utils.js';

const STORAGE_KEY    = 'vortex_fit_state';
const SCHEMA_VERSION = 3;

let _state = null;

/* ─── Seed de ingredientes (valores por 100g, fonte: TACO/USDA) ─── */
const SEED_INGREDIENTS = [
  { name:'Peito de Frango Grelhado',  category:'protein',   per_100g:{kcal:165,protein_g:31,fat_g:3.6,carbs_g:0,fiber_g:0},   default_portion_g:150, price_per_kg:22 },
  { name:'Patinho Moído Cozido',       category:'protein',   per_100g:{kcal:219,protein_g:28,fat_g:12,carbs_g:0,fiber_g:0},    default_portion_g:120, price_per_kg:28 },
  { name:'Ovo Inteiro Cozido',         category:'protein',   per_100g:{kcal:155,protein_g:13,fat_g:11,carbs_g:1.1,fiber_g:0},  default_portion_g:60,  price_per_kg:15 },
  { name:'Atum em Água (escorrido)',   category:'protein',   per_100g:{kcal:116,protein_g:26,fat_g:1,carbs_g:0,fiber_g:0},     default_portion_g:100, price_per_kg:35 },
  { name:'Filé de Tilápia Grelhado',  category:'protein',   per_100g:{kcal:128,protein_g:26,fat_g:2.7,carbs_g:0,fiber_g:0},   default_portion_g:150, price_per_kg:25 },
  { name:'Arroz Branco Cozido',        category:'carb',      per_100g:{kcal:128,protein_g:2.5,fat_g:0.2,carbs_g:28,fiber_g:0.3}, default_portion_g:150, price_per_kg:5 },
  { name:'Arroz Integral Cozido',      category:'carb',      per_100g:{kcal:124,protein_g:2.6,fat_g:1,carbs_g:26,fiber_g:1.8},   default_portion_g:150, price_per_kg:6 },
  { name:'Batata-Doce Cozida',         category:'carb',      per_100g:{kcal:86,protein_g:1.6,fat_g:0.1,carbs_g:20,fiber_g:2.5},  default_portion_g:150, price_per_kg:7 },
  { name:'Feijão Carioca Cozido',      category:'carb',      per_100g:{kcal:76,protein_g:4.8,fat_g:0.5,carbs_g:13.6,fiber_g:8.4}, default_portion_g:100, price_per_kg:8 },
  { name:'Lentilha Cozida',            category:'carb',      per_100g:{kcal:116,protein_g:9,fat_g:0.4,carbs_g:20,fiber_g:7.9},   default_portion_g:100, price_per_kg:9 },
  { name:'Aveia em Flocos',            category:'carb',      per_100g:{kcal:389,protein_g:17,fat_g:7,carbs_g:66,fiber_g:10},     default_portion_g:40,  price_per_kg:8 },
  { name:'Macarrão Integral Cozido',   category:'carb',      per_100g:{kcal:124,protein_g:5.3,fat_g:0.5,carbs_g:26,fiber_g:3.9}, default_portion_g:150, price_per_kg:7 },
  { name:'Azeite de Oliva',            category:'fat',       per_100g:{kcal:884,protein_g:0,fat_g:100,carbs_g:0,fiber_g:0},      default_portion_g:10,  price_per_kg:40 },
  { name:'Abacate',                    category:'fat',       per_100g:{kcal:160,protein_g:2,fat_g:15,carbs_g:9,fiber_g:6.7},     default_portion_g:80,  price_per_kg:12 },
  { name:'Amendoim Tostado',           category:'fat',       per_100g:{kcal:585,protein_g:25,fat_g:50,carbs_g:16,fiber_g:8},     default_portion_g:30,  price_per_kg:15 },
  { name:'Brócolis Cozido',            category:'vegetable', per_100g:{kcal:35,protein_g:2.4,fat_g:0.4,carbs_g:7,fiber_g:2.6},   default_portion_g:100, price_per_kg:8 },
  { name:'Espinafre Refogado',         category:'vegetable', per_100g:{kcal:29,protein_g:2.9,fat_g:0.5,carbs_g:3.6,fiber_g:2.2}, default_portion_g:80,  price_per_kg:6 },
  { name:'Tomate Cru',                 category:'vegetable', per_100g:{kcal:18,protein_g:0.9,fat_g:0.2,carbs_g:3.9,fiber_g:1.2}, default_portion_g:100, price_per_kg:5 },
  { name:'Alface Crespa',              category:'vegetable', per_100g:{kcal:14,protein_g:1.3,fat_g:0.2,carbs_g:2.2,fiber_g:1.5}, default_portion_g:60,  price_per_kg:4 },
  { name:'Banana Prata',               category:'fruit',     per_100g:{kcal:89,protein_g:1.1,fat_g:0.3,carbs_g:23,fiber_g:2.6},  default_portion_g:100, price_per_kg:4 },
  { name:'Maçã com Casca',             category:'fruit',     per_100g:{kcal:52,protein_g:0.3,fat_g:0.2,carbs_g:14,fiber_g:2.4},  default_portion_g:150, price_per_kg:6 },
];

/* ─── Migrations ─── */
const MIGRATIONS = {
  // v1 → v2: noop (versão inicial)
  1: (s) => s,
  // v2 → v3: adiciona meal_log e marmita_config a usuários legados
  2: (s) => {
    for (const uid of Object.keys(s.users || {})) {
      s.users[uid].meal_log = s.users[uid].meal_log || [];
      s.users[uid].marmita_config = s.users[uid].marmita_config || { meals_per_week: 5, people: 1 };
    }
    return s;
  },
};

function runMigrations(state) {
  let v = state.schema_version || 1;
  while (v < SCHEMA_VERSION) {
    if (MIGRATIONS[v]) state = MIGRATIONS[v](state);
    v++;
  }
  state.schema_version = SCHEMA_VERSION;
  return state;
}

function seedIngredients(bank) {
  for (const item of SEED_INGREDIENTS) {
    const exists = Object.values(bank).some(b => b.name === item.name);
    if (!exists) {
      const id = uuid();
      bank[id] = { id, ...item, is_custom: false, created_at: new Date().toISOString() };
    }
  }
  return bank;
}

/* ─── Public API ─── */

export function initStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _state = raw ? JSON.parse(raw) : null;
  } catch (_) {
    _state = null;
  }

  if (!_state || !_state.schema_version) {
    _state = {
      schema_version: SCHEMA_VERSION,
      active_user_id: null,
      users: {},
      ingredient_bank: {},
      app_meta: {
        install_date: new Date().toISOString(),
        last_opened:  new Date().toISOString(),
        onboarding_completed: false,
      },
    };
  } else {
    _state = runMigrations(_state);
  }

  _state.ingredient_bank = seedIngredients(_state.ingredient_bank);
  _state.app_meta.last_opened = new Date().toISOString();
  _persist();
}

export function getState() {
  return _state;
}

export function setState(patch) {
  _state = deepMerge(_state, patch);
  _persist();
  document.dispatchEvent(new CustomEvent('vortex:storechange'));
}

function _persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.warn('[store] localStorage cheio ou bloqueado', e);
  }
}

/* ── User helpers ── */

export function getUser(userId) {
  return _state.users[userId] || null;
}

export function updateUser(userId, patch) {
  if (!_state.users[userId]) return;
  _state.users[userId] = deepMerge(_state.users[userId], patch);
  _persist();
}

export function createUser(profile) {
  const id = uuid();
  const avatarColors = ['#FF5A1F', '#60A8FF', '#A8FF60'];
  const idx = Object.keys(_state.users).length % avatarColors.length;

  _state.users[id] = {
    id,
    created_at: new Date().toISOString(),
    profile: {
      ...profile,
      avatar_color: avatarColors[idx],
    },
    targets:       { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, calculated_at: '' },
    weight_log:    [],
    checkins:      [],
    meal_log:      [],
    marmita_config: { meals_per_week: 5, people: 1 },
    settings:      { units: 'metric', theme_override: 'auto' },
  };

  _state.active_user_id = id;
  _persist();
  return id;
}

export function getUserList() {
  return Object.values(_state.users);
}

export function setActiveUserId(userId) {
  _state.active_user_id = userId;
  _persist();
}

/* ── Check-in helpers ── */

export function addCheckin(userId, checkin) {
  const user = _state.users[userId];
  if (!user) return;
  // Remove existing checkin for same date
  user.checkins = user.checkins.filter(c => c.date !== checkin.date);
  user.checkins.push({ id: uuid(), ...checkin, created_at: new Date().toISOString() });
  _persist();
}

export function getCheckin(userId, date) {
  return _state.users[userId]?.checkins.find(c => c.date === date) || null;
}

export function getCheckins(userId, yearMonth) {
  return (_state.users[userId]?.checkins || []).filter(c => c.date.startsWith(yearMonth));
}

/* ── Weight log helpers ── */

export function addWeightEntry(userId, date, weight_kg) {
  const user = _state.users[userId];
  if (!user) return;
  user.weight_log = user.weight_log.filter(e => e.date !== date);
  user.weight_log.push({ date, weight_kg: Number(weight_kg) });
  user.weight_log.sort((a, b) => a.date.localeCompare(b.date));
  _persist();
}

/* ── Meal log helpers ── */

export function addMealLog(userId, meal) {
  const user = _state.users[userId];
  if (!user) return;
  user.meal_log.push({ id: uuid(), ...meal, logged_at: new Date().toISOString() });
  _persist();
}

export function getMealLog(userId, date) {
  return (_state.users[userId]?.meal_log || []).filter(m => m.date === date);
}

export function deleteMealLog(userId, mealId) {
  const user = _state.users[userId];
  if (!user) return;
  user.meal_log = user.meal_log.filter(m => m.id !== mealId);
  _persist();
}

/* ── Ingredient bank helpers ── */

export function getIngredientBank() {
  return Object.values(_state.ingredient_bank);
}

export function getIngredient(id) {
  return _state.ingredient_bank[id] || null;
}

export function upsertIngredient(ingredient) {
  const id = ingredient.id || uuid();
  _state.ingredient_bank[id] = { ...ingredient, id, is_custom: true, updated_at: new Date().toISOString() };
  _persist();
  return id;
}

export function deleteIngredient(id) {
  delete _state.ingredient_bank[id];
  _persist();
}

/* ── Marmita config ── */

export function getMarmitaConfig(userId) {
  return _state.users[userId]?.marmita_config || { meals_per_week: 5, people: 1 };
}

export function setMarmitaConfig(userId, config) {
  if (!_state.users[userId]) return;
  _state.users[userId].marmita_config = { ..._state.users[userId].marmita_config, ...config };
  _persist();
}
