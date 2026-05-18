# RetailBijak Blank Screen Diagnosis Report
**Date**: 2026-05-11 10:42 UTC  
**Issue**: User sees blank/dark screen with only 2-3% visible content, no green debug bar, no menu icons

---

## ✅ What's Working

1. **Backend API**: All endpoints return data correctly
   - `/api/health` → `{"status":"ok","version":"1.0.0"}`
   - `/api/market-summary` → Returns IHSG data
   - `/api/top-movers` → Returns stock data

2. **Static File Serving**: All JS files served with HTTP 200
   - `js/main.js` → 200 OK, Content-Type: text/javascript
   - `js/router.js` → 200 OK, Content-Type: text/javascript
   - `js/api.js` → 200 OK, Content-Type: text/javascript
   - `js/theme.js` → 200 OK, Content-Type: text/javascript

3. **MIME Types**: Correct `Content-Type: text/javascript; charset=utf-8`

4. **CSS**: No `display:none` blocking issues found

5. **Version Cache Busting**: `?v=202605111826` applied to all resources

---

## 🔍 Root Cause Analysis

### **CRITICAL ISSUE: Circular Module Dependency**

**Problem**: `theme.js` imports from `i18n.js`, but `i18n.js` may not exist or has errors, causing the entire module chain to fail.

**Evidence**:
```javascript
// theme.js line 1:
import { setLanguage, applyTranslations } from './i18n.js?v=202605111826';

// main.js line 3:
import { initTheme } from './theme.js?v=202605111826';
```

**Impact**: If `i18n.js` fails to load or has syntax errors:
1. `theme.js` import fails
2. `main.js` import fails
3. No JS executes (no green debug bar)
4. Page remains blank

### **Secondary Issue: ES6 Module Support**

User's browser may have issues with:
- ES6 module imports
- Service Worker interference
- CORS/CSP blocking module scripts
- Network proxy stripping module type

---

## 🧪 Diagnostic Tests Created

### 1. **test_module_load.html**
- Tests inline module execution
- Tests router.js import
- Tests main.js import
- Shows detailed error messages
- **URL**: https://retailbijak.rich27.my.id/test_module_load.html

### 2. **test_nomodule.html**
- Non-module fallback implementation
- Pure vanilla JS (no imports)
- Loads API data directly
- Shows dashboard with IHSG + top movers
- **URL**: https://retailbijak.rich27.my.id/test_nomodule.html

---

## 🔧 Recommended Fixes

### **Fix 1: Check i18n.js existence and syntax**
```bash
ls -lh /opt/swingaq/frontend/js/i18n.js
curl -sI https://retailbijak.rich27.my.id/js/i18n.js
```

### **Fix 2: Make theme.js independent (remove i18n dependency)**
```javascript
// theme.js - simplified version without i18n
const THEMES = ['dark', 'light', 'amoled'];

export function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    
    let saved = localStorage.getItem('retail-theme') || 'dark';
    if (!THEMES.includes(saved)) saved = 'dark';
    
    function applyTheme() {
        htmlEl.setAttribute('data-theme', saved);
        localStorage.setItem('retail-theme', saved);
    }
    
    applyTheme();
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const idx = THEMES.indexOf(saved);
            saved = THEMES[(idx + 1) % THEMES.length];
            applyTheme();
        });
    }
}
```

### **Fix 3: Add nomodule fallback to index.html**
```html
<!-- After module script -->
<script type="module" src="js/main.js?v=202605111826"></script>
<script nomodule>
  // Fallback for browsers without module support
  window.location.href = 'test_nomodule.html';
</script>
```

### **Fix 4: Add module error handler in index.html**
```html
<script type="module">
  import('./js/main.js?v=202605111826').catch(err => {
    console.error('Module load failed:', err);
    document.getElementById('rbk-debug-log').innerHTML = 
      '❌ Module load failed: ' + err.message + '<br>Redirecting to fallback...';
    setTimeout(() => {
      window.location.href = 'test_nomodule.html';
    }, 2000);
  });
</script>
```

---

## 📋 Next Steps for User

1. **Test module loading**:
   - Visit: https://retailbijak.rich27.my.id/test_module_load.html
   - Check which test fails
   - Share screenshot of results

2. **Test non-module fallback**:
   - Visit: https://retailbijak.rich27.my.id/test_nomodule.html
   - If this works, the issue is ES6 modules

3. **Check browser console**:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for red errors
   - Share error messages

4. **Check Network tab**:
   - Open DevTools → Network
   - Filter by "JS"
   - Look for failed requests (red)
   - Check if i18n.js loads

---

## 🎯 Most Likely Solution

**If i18n.js is missing or broken**:
1. Remove i18n import from theme.js
2. Simplify theme.js to not depend on translations
3. Restart backend service
4. Hard refresh browser (Ctrl+Shift+R)

**If ES6 modules are blocked**:
1. Use test_nomodule.html as temporary solution
2. Implement proper nomodule fallback
3. Consider bundling JS with webpack/rollup

---

## 📊 Files Modified

- `/opt/swingaq/frontend/test_module_load.html` (NEW)
- `/opt/swingaq/frontend/test_nomodule.html` (NEW)
- `/opt/swingaq/frontend/DIAGNOSIS.md` (NEW - this file)

---

## 🔗 Quick Links

- Main site: https://retailbijak.rich27.my.id/
- Module test: https://retailbijak.rich27.my.id/test_module_load.html
- Fallback: https://retailbijak.rich27.my.id/test_nomodule.html
- API health: https://retailbijak.rich27.my.id/api/health
