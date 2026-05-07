// ─── Safe SessionStorage Utilities ──────────────────────
// Wraps sessionStorage in try-catch to handle private browsing
// Use: import { ssGet, ssSet, ssRemove } from '../utils/storage.js';

export const ssGet = (key) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};

export const ssSet = (key, value) => {
  try { sessionStorage.setItem(key, value); } catch { /* private browsing */ }
};

export const ssRemove = (key) => {
  try { sessionStorage.removeItem(key); } catch { /* private browsing */ }
};
