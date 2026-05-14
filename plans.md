# RetailBijak — Phase 28: UI/UX Polish + i18n (ID/EN)

> **Status:** 🟡 **PLANNED**
> **Goal:** Improve UI/UX consistency + add full Indonesian/English translation
> **Scope:** All text on website (UI labels, buttons, messages, help text)
> **Tech:** Vanilla JS i18n system + CSS refinements

---

## 📊 Current State Assessment

### ✅ What Works
- 9/9 core API endpoints functional
- 702 stocks loaded
- Dashboard, Screener, Portfolio, Stock Detail views operational
- Dark/Light theme toggle
- Responsive mobile layout (bottom nav)

### 🟡 UI/UX Gaps
- Inconsistent spacing & typography
- Mixed language (ID/EN scattered)
- No loading states (skeleton loaders)
- Modal/overlay animations rough
- Mobile bottom sheet UX needs polish
- Button sizes inconsistent (tap targets < 44px)
- Color contrast issues in some states

### 🔴 i18n Gaps
- No centralized translation system
- Text hardcoded in JS files
- No language switcher
- No locale persistence

---

## 🎯 Phase 28 Strategy — 2 Pillars

```
┌──────────────────────────────────────────────┐
│    PHASE 28: UI/UX POLISH + i18n             │
├──────────────────────────────────────────────┤
│ P0 — i18n Foundation      │ Effort: ~8h      │
│  28.1 Build i18n system                      │
│  28.2 Extract all text to translations       │
│  28.3 Add language switcher                  │
│  28.4 Persist language preference            │
├──────────────────────────────────────────────┤
│ P1 — UI/UX Polish         │ Effort: ~12h     │
│  28.5 Skeleton loaders                       │
│  28.6 Button/tap target standardization      │
│  28.7 Modal animations                       │
│  28.8 Spacing & typography audit             │
│  28.9 Color contrast fixes                   │
│  28.10 Mobile bottom sheet polish            │
└──────────────────────────────────────────────┘
```

---

## 🔴 P0 — i18n Foundation (HIGHEST PRIORITY)

### Task 28.1: Create i18n System

**Objective:** Build lightweight i18n module for ID/EN translations

**Files:**
- Create: `frontend/js/i18n.js` (new)
- Modify: `frontend/js/main.js` (import i18n)
- Create: `frontend/locales/id.json` (translations)
- Create: `frontend/locales/en.json` (translations)

**Step 1: Create i18n module**

```javascript
// frontend/js/i18n.js
const LOCALES = {
  id: 'Bahasa Indonesia',
  en: 'English'
};

const DEFAULT_LOCALE = 'id';
let currentLocale = localStorage.getItem('retailbijak.locale') || DEFAULT_LOCALE;
let translations = {};

export async function initI18n() {
  try {
    const response = await fetch(`/locales/${currentLocale}.json`);
    translations = await response.json();
    document.documentElement.lang = currentLocale;
    return translations;
  } catch (e) {
    console.error('i18n init failed:', e);
    return {};
  }
}

export function t(key, defaultText = '') {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || defaultText;
}

export function setLocale(locale) {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  localStorage.setItem('retailbijak.locale', locale);
  location.reload(); // Reload to apply translations
}

export function getLocale() {
  return currentLocale;
}

export function getLocales() {
  return LOCALES;
}
```

**Step 2: Create ID translations**

```json
// frontend/locales/id.json
{
  "app": {
    "title": "RetailBijak",
    "subtitle": "Analisis Saham IDX Profesional"
  },
  "nav": {
    "dashboard": "Dashboard",
    "screener": "Screener",
    "portfolio": "Portfolio",
    "settings": "Pengaturan",
    "market": "Market",
    "news": "Berita",
    "help": "Bantuan"
  },
  "dashboard": {
    "title": "Dashboard",
    "ihsg": "IHSG",
    "gainers": "Pemenang",
    "losers": "Pecundang",
    "topMovers": "Pergerakan Terbesar",
    "recentNews": "Berita Terbaru",
    "signals": "Sinyal Trading"
  },
  "screener": {
    "title": "Screener",
    "startScanning": "Mulai Scan",
    "stopScanning": "Hentikan Scan",
    "results": "Hasil",
    "noResults": "Tidak ada hasil"
  },
  "portfolio": {
    "title": "Portfolio",
    "watchlist": "Watchlist",
    "positions": "Posisi",
    "addStock": "Tambah Saham",
    "removeStock": "Hapus Saham",
    "empty": "Portfolio kosong"
  },
  "stockDetail": {
    "title": "Detail Saham",
    "price": "Harga",
    "change": "Perubahan",
    "volume": "Volume",
    "technicalAnalysis": "Analisis Teknikal",
    "fundamentals": "Data Fundamental",
    "addToWatchlist": "Tambah ke Watchlist",
    "removeFromWatchlist": "Hapus dari Watchlist"
  },
  "common": {
    "loading": "Memuat...",
    "error": "Terjadi kesalahan",
    "retry": "Coba Lagi",
    "close": "Tutup",
    "save": "Simpan",
    "cancel": "Batal",
    "delete": "Hapus",
    "edit": "Edit",
    "search": "Cari",
    "noData": "Tidak ada data",
    "refresh": "Segarkan"
  },
  "settings": {
    "title": "Pengaturan",
    "language": "Bahasa",
    "theme": "Tema",
    "darkMode": "Mode Gelap",
    "lightMode": "Mode Terang",
    "notifications": "Notifikasi",
    "enableNotifications": "Aktifkan Notifikasi"
  }
}
```

**Step 3: Create EN translations**

```json
// frontend/locales/en.json
{
  "app": {
    "title": "RetailBijak",
    "subtitle": "Professional IDX Stock Analysis"
  },
  "nav": {
    "dashboard": "Dashboard",
    "screener": "Screener",
    "portfolio": "Portfolio",
    "settings": "Settings",
    "market": "Market",
    "news": "News",
    "help": "Help"
  },
  "dashboard": {
    "title": "Dashboard",
    "ihsg": "IHSG",
    "gainers": "Gainers",
    "losers": "Losers",
    "topMovers": "Top Movers",
    "recentNews": "Recent News",
    "signals": "Trading Signals"
  },
  "screener": {
    "title": "Screener",
    "startScanning": "Start Scanning",
    "stopScanning": "Stop Scanning",
    "results": "Results",
    "noResults": "No results found"
  },
  "portfolio": {
    "title": "Portfolio",
    "watchlist": "Watchlist",
    "positions": "Positions",
    "addStock": "Add Stock",
    "removeStock": "Remove Stock",
    "empty": "Portfolio is empty"
  },
  "stockDetail": {
    "title": "Stock Detail",
    "price": "Price",
    "change": "Change",
    "volume": "Volume",
    "technicalAnalysis": "Technical Analysis",
    "fundamentals": "Fundamentals",
    "addToWatchlist": "Add to Watchlist",
    "removeFromWatchlist": "Remove from Watchlist"
  },
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Retry",
    "close": "Close",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "noData": "No data",
    "refresh": "Refresh"
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "theme": "Theme",
    "darkMode": "Dark Mode",
    "lightMode": "Light Mode",
    "notifications": "Notifications",
    "enableNotifications": "Enable Notifications"
  }
}
```

**Step 4: Import i18n in main.js**

```javascript
// frontend/js/main.js (add at top after other imports)
import { initI18n, t } from './i18n.js';

// In DOMContentLoaded:
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  // ... rest of init
});
```

**Step 5: Verify translations load**

Run: `curl -s https://retailbijak.rich27.my.id/locales/id.json | head -20`
Expected: JSON with "app", "nav", "dashboard" keys

**Step 6: Commit**

```bash
git add frontend/js/i18n.js frontend/locales/
git commit -m "feat(i18n): add i18n system with ID/EN translations"
```

---

### Task 28.2: Add Language Switcher to Settings

**Objective:** Add language selector in Settings view

**Files:**
- Modify: `frontend/js/views/settings.js`
- Modify: `frontend/style.css` (add language selector styles)

**Step 1: Update settings.js**

```javascript
// frontend/js/views/settings.js (add language section)
import { t, getLocale, setLocale, getLocales } from '../i18n.js';

export async function renderSettings(root) {
  const locales = getLocales();
  const currentLocale = getLocale();
  
  root.innerHTML = `
    <div class="view-content">
      <h1>${t('settings.title', 'Settings')}</h1>
      
      <div class="settings-section">
        <label>${t('settings.language', 'Language')}</label>
        <div class="language-selector">
          ${Object.entries(locales).map(([code, name]) => `
            <button 
              class="lang-btn ${code === currentLocale ? 'active' : ''}"
              onclick="window.setLanguage('${code}')"
            >
              ${name}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="settings-section">
        <label>${t('settings.theme', 'Theme')}</label>
        <div class="theme-selector">
          <button class="theme-btn" onclick="window.toggleTheme('dark')">
            ${t('settings.darkMode', 'Dark Mode')}
          </button>
          <button class="theme-btn" onclick="window.toggleTheme('light')">
            ${t('settings.lightMode', 'Light Mode')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Add to window for onclick handlers
window.setLanguage = (locale) => {
  setLocale(locale);
};
```

**Step 2: Add CSS for language selector**

```css
/* frontend/style.css (add) */
.settings-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-panel);
  border-radius: 12px;
}

.settings-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-main);
}

.language-selector,
.theme-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lang-btn,
.theme-btn {
  padding: 10px 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.lang-btn.active,
.theme-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.lang-btn:hover,
.theme-btn:hover {
  border-color: var(--primary-color);
}
```

**Step 3: Verify language switcher works**

- Open Settings view
- Click "English" button
- Page should reload with English text
- Check localStorage: `localStorage.getItem('retailbijak.locale')` should be "en"

**Step 4: Commit**

```bash
git add frontend/js/views/settings.js frontend/style.css
git commit -m "feat(i18n): add language switcher to settings"
```

---

### Task 28.3: Replace All Hardcoded Text with t() Calls

**Objective:** Scan all JS files and replace hardcoded text with `t()` function

**Files:**
- Modify: `frontend/js/views/*.js` (all view files)
- Modify: `frontend/js/main.js`
- Modify: `frontend/js/api.js`

**Step 1: Scan for hardcoded text**

Run: `grep -r "innerHTML\|textContent\|placeholder" frontend/js/views/ | grep -v "t(" | head -20`

**Step 2: Replace in dashboard.js**

```javascript
// Before:
root.innerHTML = `<h1>Dashboard</h1>`;

// After:
import { t } from '../i18n.js';
root.innerHTML = `<h1>${t('dashboard.title', 'Dashboard')}</h1>`;
```

**Step 3: Replace in all view files**

- `dashboard.js`: Dashboard, Top Movers, Recent News, Signals
- `screener.js`: Screener, Start Scanning, Results
- `portfolio.js`: Portfolio, Watchlist, Add Stock
- `stock_detail.js`: Stock Detail, Price, Change, Volume
- `settings.js`: Settings, Theme, Notifications
- `news.js`: News, Recent News
- `market.js`: Market, IHSG, Gainers, Losers
- `help.js`: Help, FAQ

**Step 4: Update locales with all new keys**

Add missing keys to `frontend/locales/id.json` and `frontend/locales/en.json`

**Step 5: Verify all text is translated**

- Switch to English
- Check all views for untranslated text (should see English)
- Switch to Indonesian
- Check all views for untranslated text (should see Indonesian)

**Step 6: Commit**

```bash
git add frontend/js/views/ frontend/js/main.js frontend/locales/
git commit -m "feat(i18n): replace all hardcoded text with t() calls"
```

---

## 🟡 P1 — UI/UX Polish (MEDIUM PRIORITY)

### Task 28.4: Add Skeleton Loaders

**Objective:** Replace spinners with skeleton screens for better perceived performance

**Files:**
- Create: `frontend/js/skeleton.js` (new)
- Modify: `frontend/js/views/*.js` (use skeleton loaders)
- Modify: `frontend/style.css` (add skeleton styles)

**Step 1: Create skeleton module**

```javascript
// frontend/js/skeleton.js
export function createSkeletonCard() {
  return `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width: 60%; height: 16px;"></div>
      <div class="skeleton-line" style="width: 80%; height: 12px; margin-top: 8px;"></div>
      <div class="skeleton-line" style="width: 40%; height: 12px; margin-top: 8px;"></div>
    </div>
  `;
}

export function createSkeletonTable(rows = 5) {
  return `
    <div class="skeleton-table">
      ${Array(rows).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="skeleton-line" style="width: 20%;"></div>
          <div class="skeleton-line" style="width: 30%;"></div>
          <div class="skeleton-line" style="width: 25%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

export function createSkeletonChart() {
  return `
    <div class="skeleton-chart" style="height: 300px;"></div>
  `;
}
```

**Step 2: Add skeleton CSS**

```css
/* frontend/style.css (add) */
.skeleton-card,
.skeleton-row {
  background: linear-gradient(90deg, var(--bg-panel) 25%, var(--bg-elevated) 50%, var(--bg-panel) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.skeleton-line {
  height: 12px;
  background: var(--bg-elevated);
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-chart {
  background: linear-gradient(90deg, var(--bg-panel) 25%, var(--bg-elevated) 50%, var(--bg-panel) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 12px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Step 3: Use skeleton in dashboard.js**

```javascript
// Before:
root.innerHTML = '<div class="spinner"></div>';
const data = await fetchMarketSummary();
root.innerHTML = renderData(data);

// After:
import { createSkeletonCard } from '../skeleton.js';
root.innerHTML = createSkeletonCard();
const data = await fetchMarketSummary();
root.innerHTML = renderData(data);
```

**Step 4: Verify skeleton loaders appear**

- Open Dashboard
- Should see skeleton cards briefly before data loads
- No spinners visible

**Step 5: Commit**

```bash
git add frontend/js/skeleton.js frontend/style.css frontend/js/views/
git commit -m "feat(ux): add skeleton loaders for better perceived performance"
```

---

### Task 28.5: Standardize Button & Tap Targets

**Objective:** Ensure all buttons are 44x44px minimum (Apple HIG standard)

**Files:**
- Modify: `frontend/style.css`

**Step 1: Update button CSS**

```css
/* frontend/style.css (update) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 18px;  /* Increased from 10px 18px */
  min-height: 44px;    /* Add minimum height */
  min-width: 44px;     /* Add minimum width */
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border-subtle);
  background: var(--bg-panel);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  text-decoration: none;
  white-space: nowrap;
  position: relative;
}

.btn:active {
  transform: scale(0.98);
}

/* Icon buttons */
.btn-icon {
  padding: 12px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
}

/* Small buttons (secondary) */
.btn-sm {
  padding: 8px 12px;
  min-height: 36px;
  font-size: 12px;
}
```

**Step 2: Verify tap targets**

- Open website on mobile
- All buttons should be at least 44x44px
- Test tapping buttons (should be easy to hit)

**Step 3: Commit**

```bash
git add frontend/style.css
git commit -m "fix(ux): standardize button tap targets to 44x44px (Apple HIG)"
```

---

### Task 28.6: Polish Modal Animations

**Objective:** Add smooth enter/exit animations to modals

**Files:**
- Modify: `frontend/style.css`
- Modify: `frontend/js/main.js` (modal creation)

**Step 1: Add modal animation CSS**

```css
/* frontend/style.css (add) */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
  backdrop-filter: blur(4px);
}

.modal-panel {
  background: var(--bg-panel);
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile: bottom sheet */
@media (max-width: 768px) {
  .modal-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: none;
    border-radius: 16px 16px 0 0;
    animation: slideUpMobile 0.3s ease-out;
  }
  
  @keyframes slideUpMobile {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
}
```

**Step 2: Verify animations**

- Open a modal (e.g., add stock to watchlist)
- Should see smooth fade-in + slide-up animation
- On mobile, should slide up from bottom

**Step 3: Commit**

```bash
git add frontend/style.css
git commit -m "feat(ux): add smooth modal animations (fade-in + slide-up)"
```

---

### Task 28.7: Fix Color Contrast Issues

**Objective:** Ensure WCAG AA compliance for text contrast

**Files:**
- Modify: `frontend/style.css`

**Step 1: Audit current contrast**

Check text on backgrounds:
- Text on `--bg-panel`: should be 4.5:1 minimum
- Text on `--bg-elevated`: should be 4.5:1 minimum
- Muted text: should be 3:1 minimum

**Step 2: Update CSS variables if needed**

```css
/* frontend/style.css (update if contrast is low) */
:root {
  --text-main: #e5edf8;      /* Ensure 4.5:1 on --bg-panel */
  --text-muted: #94a3b8;     /* Ensure 3:1 on --bg-panel */
  --text-dim: #64748b;       /* For secondary text */
}
```

**Step 3: Test contrast**

Use browser DevTools:
- Right-click element → Inspect
- Check "Contrast" in Accessibility panel
- Should show "AA" or "AAA"

**Step 4: Commit**

```bash
git add frontend/style.css
git commit -m "fix(a11y): improve text contrast for WCAG AA compliance"
```

---

### Task 28.8: Mobile Bottom Sheet Polish

**Objective:** Improve bottom sheet UX on mobile

**Files:**
- Modify: `frontend/style.css`
- Modify: `frontend/js/main.js`

**Step 1: Add bottom sheet handle**

```css
/* frontend/style.css (add) */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bg-panel);
  border-radius: 16px 16px 0 0;
  padding: 16px;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUpMobile 0.3s ease-out;
}

.bottom-sheet::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: var(--border-subtle);
  border-radius: 2px;
}

.bottom-sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-top: 8px;
}

.bottom-sheet-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
}
```

**Step 2: Verify bottom sheet appearance**

- Open modal on mobile
- Should see handle bar at top
- Should be able to swipe down to close (optional)

**Step 3: Commit**

```bash
git add frontend/style.css
git commit -m "feat(ux): polish mobile bottom sheet with handle bar"
```

---

## 📋 Execution Checklist

- [ ] Task 28.1: i18n system created
- [ ] Task 28.2: Language switcher added
- [ ] Task 28.3: All text replaced with t() calls
- [ ] Task 28.4: Skeleton loaders implemented
- [ ] Task 28.5: Button tap targets standardized
- [ ] Task 28.6: Modal animations added
- [ ] Task 28.7: Color contrast fixed
- [ ] Task 28.8: Bottom sheet polished

---

## 🚀 Deployment

After all tasks complete:

```bash
# Copy to production
cp -r frontend/* /opt/swingaq/frontend/

# Restart service
sudo systemctl restart swingaq-backend

# Verify
curl -s https://retailbijak.rich27.my.id/api/health
```

---

## 📝 Notes

- All text keys follow `namespace.key` pattern (e.g., `dashboard.title`)
- Translations stored in `/frontend/locales/` as JSON
- Language preference persisted in localStorage
- i18n module is lightweight (~2KB)
- No external i18n library needed (vanilla JS)
