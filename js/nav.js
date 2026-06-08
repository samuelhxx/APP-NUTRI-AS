/* Navigation singleton — evita dependência circular entre router e módulos */

let _navigate = null;

export function setNavigate(fn) {
  _navigate = fn;
}

export function navigate(path, params = {}) {
  if (!_navigate) {
    console.warn('[nav] navigate chamado antes de initRouter()');
    return;
  }
  _navigate(path, params);
}
