/* ── Store — única interface com localStorage ── */

const KEY = 'vortex_v2';
const VERSION = 1;

const SEED = [
  { id:'frango',    name:'Frango (peito grelhado)',  protein_g:31,  carbs_g:0,   fat_g:3.6, kcal:165, price_per_kg:22 },
  { id:'patinho',   name:'Patinho moído cozido',     protein_g:26,  carbs_g:0,   fat_g:9,   kcal:190, price_per_kg:28 },
  { id:'ovo',       name:'Ovo inteiro cozido',       protein_g:13,  carbs_g:1.1, fat_g:11,  kcal:155, price_per_kg:15 },
  { id:'atum',      name:'Atum em água (escorrido)', protein_g:26,  carbs_g:0,   fat_g:1,   kcal:116, price_per_kg:35 },
  { id:'tilapia',   name:'Filé de tilápia grelhado', protein_g:26,  carbs_g:0,   fat_g:2.7, kcal:128, price_per_kg:25 },
  { id:'arroz',     name:'Arroz branco cozido',      protein_g:2.5, carbs_g:28,  fat_g:0.2, kcal:128, price_per_kg:5  },
  { id:'arroz_int', name:'Arroz integral cozido',    protein_g:2.6, carbs_g:26,  fat_g:1,   kcal:124, price_per_kg:6  },
  { id:'batata',    name:'Batata-doce cozida',       protein_g:1.6, carbs_g:20,  fat_g:0.1, kcal:86,  price_per_kg:7  },
  { id:'feijao',    name:'Feijão carioca cozido',    protein_g:4.8, carbs_g:13.6,fat_g:0.5, kcal:76,  price_per_kg:8  },
  { id:'aveia',     name:'Aveia em flocos',           protein_g:17,  carbs_g:66,  fat_g:7,   kcal:389, price_per_kg:8  },
  { id:'azeite',    name:'Azeite de oliva',           protein_g:0,   carbs_g:0,   fat_g:100, kcal:884, price_per_kg:40 },
  { id:'brocolis',  name:'Brócolis cozido',           protein_g:2.4, carbs_g:7,   fat_g:0.4, kcal:35,  price_per_kg:8  },
  { id:'espinafre', name:'Espinafre refogado',        protein_g:2.9, carbs_g:3.6, fat_g:0.5, kcal:29,  price_per_kg:6  },
  { id:'tomate',    name:'Tomate cru',                protein_g:0.9, carbs_g:3.9, fat_g:0.2, kcal:18,  price_per_kg:5  },
  { id:'banana',    name:'Banana prata',              protein_g:1.1, carbs_g:23,  fat_g:0.3, kcal:89,  price_per_kg:4  },
];

const EMPTY = {
  schema_version: VERSION,
  profile: { name:'', age:25, sex:'M', weight_kg:80, height_cm:175, activity_level:'moderate', goal:'cut' },
  targets: null,
  ingredient_bank: SEED.map(s => ({ ...s })),
  meal_config: {
    marmitas_per_week: 5,
    people: 1,
    portions: [
      { ingredient_id:'frango',   grams:200 },
      { ingredient_id:'arroz',    grams:150 },
      { ingredient_id:'brocolis', grams:100 },
    ],
  },
  checkins: [],
  weight_log: [],
  goal_target: { target_weight_kg:null, deadline_date:null },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(EMPTY);
    const parsed = JSON.parse(raw);
    /* Ensure seed ingredients exist even on old saves */
    if (!Array.isArray(parsed.ingredient_bank)) parsed.ingredient_bank = clone(SEED);
    for (const seed of SEED) {
      if (!parsed.ingredient_bank.find(i => i.id === seed.id)) {
        parsed.ingredient_bank.push({ ...seed });
      }
    }
    return { ...clone(EMPTY), ...parsed, schema_version: VERSION };
  } catch {
    return clone(EMPTY);
  }
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* silent */ }
}

let _s = load();

export function getState()         { return clone(_s); }
export function getRaw()           { return _s; }          /* read-only, no clone */

export function updateProfile(p)   { _s.profile = { ..._s.profile, ...p }; save(_s); }
export function updateTargets(t)   { _s.targets = t; save(_s); }
export function updateMealConfig(c){ _s.meal_config = { ..._s.meal_config, ...c }; save(_s); }
export function updateGoalTarget(g){ _s.goal_target = { ..._s.goal_target, ...g }; save(_s); }

export function addCheckin(c) {
  _s.checkins = _s.checkins.filter(x => x.date !== c.date);
  _s.checkins.push(c);
  save(_s);
}
export function removeCheckin(date) { _s.checkins = _s.checkins.filter(x => x.date !== date); save(_s); }

export function addWeightEntry(date, weight_kg) {
  _s.weight_log = _s.weight_log.filter(e => e.date !== date);
  _s.weight_log.push({ date, weight_kg: +weight_kg });
  _s.weight_log.sort((a,b) => a.date.localeCompare(b.date));
  save(_s);
}

export function addIngredient(ing) {
  _s.ingredient_bank.push(ing);
  save(_s);
}
export function deleteIngredient(id) {
  _s.ingredient_bank = _s.ingredient_bank.filter(i => i.id !== id);
  _s.meal_config.portions = _s.meal_config.portions.filter(p => p.ingredient_id !== id);
  save(_s);
}
