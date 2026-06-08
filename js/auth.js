/* ── Gestão de usuário ativo ── */

import { getState, setActiveUserId, createUser as storeCreateUser } from './store.js';

export function getActiveUserId() {
  return getState().active_user_id || null;
}

export function getActiveUser() {
  const id = getActiveUserId();
  if (!id) return null;
  return getState().users[id] || null;
}

export function setActiveUser(userId) {
  setActiveUserId(userId);
  document.dispatchEvent(new CustomEvent('vortex:userchange', { detail: { userId } }));
}

export function createUser(profile) {
  return storeCreateUser(profile);
}

export function hasUsers() {
  return Object.keys(getState().users).length > 0;
}

export function ensureActiveUser() {
  const users = Object.values(getState().users);
  if (users.length === 0) return false;

  if (!getActiveUserId()) {
    setActiveUser(users[0].id);
  }
  return true;
}

export function getAvatarColors() {
  return ['#FF5A1F', '#60A8FF', '#A8FF60'];
}
