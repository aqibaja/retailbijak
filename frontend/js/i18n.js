// Lightweight i18n module with localStorage persistence
let currentLocale = 'id';
let translations = {};

/**
 * Initialize i18n system
 * Loads translations from locale JSON files and applies to DOM
 */
export async function initI18n() {
  try {
    // Get saved locale or default to 'id'
    try {
      currentLocale = localStorage.getItem('retailbijak.locale') || 'id';
    } catch (e) {
      // localStorage not available (private browsing mode)
      console.warn('localStorage not available, using default locale');
      currentLocale = 'id';
    }
    
    // Load translations for current locale
    await loadLocale(currentLocale);
    
    // Apply translations to DOM
    applyTranslations();
  } catch (error) {
    console.error('i18n initialization error:', error);
    // Fallback to ID if loading fails
    currentLocale = 'id';
  }
}

/**
 * Load locale JSON file
 */
async function loadLocale(locale) {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
    translations = await response.json();
  } catch (error) {
    console.error(`Error loading locale ${locale}:`, error);
    translations = {};
  }
}

/**
 * Get translated string by key (supports nested keys with dot notation)
 * @param {string} key - Translation key (e.g., 'nav.dashboard' or 'common.loading')
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} Translated string or key if not found
 */
export function t(key, params = {}) {
  // Navigate nested object with dot notation
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Return key if translation not found
      return key;
    }
  }
  
  // Return value if it's a string
  if (typeof value === 'string') {
    // Simple parameter interpolation: {{param}}
    let result = value;
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(`{{${key}}}`, val);
    }
    return result;
  }
  
  return key;
}

/**
 * Set locale and persist to localStorage
 */
export function setLocale(locale) {
  if (locale !== currentLocale) {
    currentLocale = locale;
    try {
      localStorage.setItem('retailbijak.locale', locale);
    } catch (e) {
      // localStorage not available (private browsing mode)
      console.warn('localStorage not available, locale not persisted');
    }
    // Reload translations and apply
    loadLocale(locale)
      .then(() => applyTranslations())
      .catch(error => {
        console.error('Failed to load locale:', error);
        // Fallback: keep current locale
        currentLocale = locale;
      });
  }
}

/**
 * Get current locale
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Get available locales
 */
export function getLocales() {
  return ['id', 'en'];
}

/**
 * Apply translations to DOM elements with data-i18n attribute
 * Supports:
 * - data-i18n="key" for text content
 * - data-i18n-placeholder="key" for input placeholders
 * - data-i18n-title="key" for title attributes
 */
export function applyTranslations() {
  // Update html lang attribute
  document.documentElement.setAttribute('lang', currentLocale);
  
  // Apply text translations
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translated;
    } else {
      // Preserve child elements, only update text nodes
      const hasChildren = el.children.length > 0;
      if (hasChildren) {
        // Find and update text nodes only
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.nodeValue = translated;
          }
        });
      } else {
        el.textContent = translated;
      }
    }
  });
  
  // Apply placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  // Apply title translations
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}
