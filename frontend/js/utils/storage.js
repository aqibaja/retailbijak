// Storage utilities for RetailBijak

// SessionStorage helpers
export function ssGet(key, defaultValue = null) {
  try {
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function ssSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function ssRemove(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function ssClear() {
  try {
    sessionStorage.clear();
    return true;
  } catch {
    return false;
  }
}

// LocalStorage helpers
export function lsGet(key, defaultValue = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function lsClear() {
  try {
    localStorage.clear();
    return true;
  } catch {
    return false;
  }
}

// Check if storage is available
export function isStorageAvailable(type = 'localStorage') {
  try {
    const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
