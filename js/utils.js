/* ── Utilidades compartilhadas ── */

export function uuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date + 'T00:00:00');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${day}`;
  if (format === 'DD/MM') return `${day}/${m}`;
  if (format === 'DD/MM/YYYY') return `${day}/${m}/${y}`;
  return `${y}-${m}-${day}`;
}

export function today() {
  return formatDate(new Date());
}

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getDayLabel(dateStr) {
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const d = new Date(dateStr + 'T00:00:00');
  return days[d.getDay()];
}

export function getMonthName(monthIndex) {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return months[monthIndex];
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function isToday(dateStr) {
  return dateStr === today();
}

export function isFuture(dateStr) {
  return dateStr > today();
}

export function fmtKcal(v) {
  return Math.round(v).toLocaleString('pt-BR');
}

export function fmtGrams(v) {
  return Math.round(v);
}

export function fmtKg(v) {
  return Number(v).toFixed(1);
}

export function goalLabel(goal) {
  return { cut: 'Emagrecer', maintain: 'Manter', bulk: 'Ganhar massa' }[goal] || goal;
}

export function activityLabel(level) {
  return {
    sedentary: 'Sedentário',
    light:     'Leve',
    moderate:  'Moderado',
    active:    'Intenso',
  }[level] || level;
}

export function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function showToast(message, type = 'default', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast${type !== 'default' ? ` toast--${type}` : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  if (!isReducedMotion()) {
    gsap.fromTo(toast,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
    );
  }

  setTimeout(() => {
    if (!isReducedMotion()) {
      gsap.to(toast, { opacity: 0, y: -8, duration: 0.2, onComplete: () => toast.remove() });
    } else {
      toast.remove();
    }
  }, duration);
}

export function formatCurrency(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
