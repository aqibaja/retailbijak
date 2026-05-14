# RetailBijak Development Plan

## Phase 30: UI/UX Polish & Complete i18n Coverage

**Objective:** Polish UI/UX across all pages and complete Indonesian/English translation for all remaining text on the website.

**Duration:** 6-8 hours  
**Tasks:** 12 bite-sized tasks  
**Target:** Production deployment with 100% i18n coverage + polished UI

---

## 📋 Task Breakdown

### Task 30.1: Audit Untranslated Text
**Objective:** Identify all hardcoded text that lacks i18n translation  
**Files:** frontend/js/views/*.js, frontend/index.html, frontend/js/*.js  
**Steps:**
1. Search for hardcoded strings (not using `t()` function)
2. Identify text in:
   - View files (dashboard, screener, portfolio, etc.)
   - Modal/overlay text
   - Button labels
   - Placeholder text
   - Error messages
   - Tooltip text
3. Create audit list with line numbers
4. Categorize by view/component
5. Commit: `git add ... && git commit -m "docs: audit untranslated text across all views"`

**Expected Output:** List of 50-100 untranslated strings with locations

---

### Task 30.2: Add Missing Translations to Locale Files
**Objective:** Add all missing translation keys to id.json and en.json  
**Files:** frontend/locales/id.json, frontend/locales/en.json  
**Steps:**
1. Read current locale files
2. Extract all untranslated strings from Task 30.1
3. Add new keys to both id.json and en.json
4. Organize by category (buttons, labels, messages, errors, etc.)
5. Ensure consistency between ID and EN versions
6. Verify JSON syntax
7. Commit: `git add frontend/locales/*.json && git commit -m "feat(i18n): add missing translation keys for all views"`

**Expected Output:** 50-100 new translation keys in both locale files

---

### Task 30.3: Update Dashboard View with i18n
**Objective:** Replace all hardcoded text in dashboard.js with t() calls  
**Files:** frontend/js/views/dashboard.js  
**Steps:**
1. Read dashboard.js
2. Find all hardcoded strings
3. Replace with `t('key')` calls
4. Update HTML templates with i18n
5. Test in browser (both ID and EN)
6. Verify all text translates correctly
7. Commit: `git add frontend/js/views/dashboard.js && git commit -m "feat(i18n): complete dashboard view translation"`

**Expected Output:** Dashboard fully i18n compliant

---

### Task 30.4: Update Screener View with i18n
**Objective:** Replace all hardcoded text in screener.js with t() calls  
**Files:** frontend/js/views/screener.js  
**Steps:**
1. Read screener.js
2. Find all hardcoded strings (filters, labels, messages)
3. Replace with `t('key')` calls
4. Update filter panel text
5. Update SSE status messages
6. Test in browser (both ID and EN)
7. Commit: `git add frontend/js/views/screener.js && git commit -m "feat(i18n): complete screener view translation"`

**Expected Output:** Screener fully i18n compliant

---

### Task 30.5: Update Portfolio & Stock Detail Views with i18n
**Objective:** Replace all hardcoded text in portfolio.js and stock_detail.js  
**Files:** frontend/js/views/portfolio.js, frontend/js/views/stock_detail.js  
**Steps:**
1. Read both files
2. Find all hardcoded strings
3. Replace with `t('key')` calls
4. Update modal text, button labels, messages
5. Test in browser (both ID and EN)
6. Commit: `git add frontend/js/views/portfolio.js frontend/js/views/stock_detail.js && git commit -m "feat(i18n): complete portfolio and stock detail views translation"`

**Expected Output:** Both views fully i18n compliant

---

### Task 30.6: Update Settings & Help Views with i18n
**Objective:** Replace all hardcoded text in settings.js and help.js  
**Files:** frontend/js/views/settings.js, frontend/js/views/help.js  
**Steps:**
1. Read both files
2. Find all hardcoded strings
3. Replace with `t('key')` calls
4. Update settings labels, help text, descriptions
5. Test in browser (both ID and EN)
6. Commit: `git add frontend/js/views/settings.js frontend/js/views/help.js && git commit -m "feat(i18n): complete settings and help views translation"`

**Expected Output:** Both views fully i18n compliant

---

### Task 30.7: Update Core JS Files with i18n
**Objective:** Replace all hardcoded text in main.js, router.js, api.js  
**Files:** frontend/js/main.js, frontend/js/router.js, frontend/js/api.js  
**Steps:**
1. Read all three files
2. Find all hardcoded strings (error messages, toasts, labels)
3. Replace with `t('key')` calls
4. Update error handling messages
5. Update toast notifications
6. Test in browser (both ID and EN)
7. Commit: `git add frontend/js/main.js frontend/js/router.js frontend/js/api.js && git commit -m "feat(i18n): complete core JS files translation"`

**Expected Output:** All core files fully i18n compliant

---

### Task 30.8: UI Polish - Spacing & Alignment
**Objective:** Improve spacing, padding, and alignment across all pages  
**Files:** frontend/style.css  
**Steps:**
1. Audit current spacing (padding, margin, gaps)
2. Identify inconsistencies
3. Update spacing values for consistency
4. Improve card padding and margins
5. Improve button spacing
6. Improve form field spacing
7. Test responsive design
8. Commit: `git add frontend/style.css && git commit -m "style(ui): improve spacing and alignment across all pages"`

**Expected Output:** Consistent spacing throughout website

---

### Task 30.9: UI Polish - Typography & Font Sizes
**Objective:** Improve typography hierarchy and font sizes  
**Files:** frontend/style.css  
**Steps:**
1. Audit current font sizes
2. Identify inconsistencies
3. Update heading sizes for better hierarchy
4. Improve body text readability
5. Update label and caption sizes
6. Ensure mobile typography scales correctly
7. Test on different screen sizes
8. Commit: `git add frontend/style.css && git commit -m "style(ui): improve typography hierarchy and font sizes"`

**Expected Output:** Better typography hierarchy

---

### Task 30.10: UI Polish - Hover & Focus States
**Objective:** Improve interactive element states (hover, focus, active)  
**Files:** frontend/style.css  
**Steps:**
1. Audit current hover states
2. Add missing hover effects
3. Improve focus states for accessibility
4. Add active states for buttons
5. Improve transition smoothness
6. Test keyboard navigation
7. Commit: `git add frontend/style.css && git commit -m "style(ui): improve hover, focus, and active states"`

**Expected Output:** Better interactive feedback

---

### Task 30.11: UI Polish - Mobile Responsiveness
**Objective:** Improve mobile layout and responsiveness  
**Files:** frontend/style.css, frontend/js/views/*.js  
**Steps:**
1. Test all pages on mobile (375px, 768px, 1024px)
2. Fix layout issues
3. Improve touch targets (44x44px minimum)
4. Improve mobile navigation
5. Fix overflow issues
6. Improve mobile form inputs
7. Test on actual mobile devices
8. Commit: `git add frontend/style.css && git commit -m "style(ui): improve mobile responsiveness and touch targets"`

**Expected Output:** Better mobile experience

---

### Task 30.12: Deploy & Verify Production
**Objective:** Deploy all Phase 30 changes to production and verify  
**Files:** All modified files  
**Steps:**
1. Verify all commits on main branch
2. Push to GitHub
3. Copy files to /opt/swingaq/frontend/
4. Verify backend running
5. Test production website
6. Verify i18n works (ID and EN)
7. Verify UI polish applied
8. Check for regressions
9. Update plans.md with completion
10. Commit: `git add plans.md && git commit -m "docs: Phase 30 complete — UI/UX Polish & Complete i18n Coverage"`
11. Push to GitHub

**Expected Output:** All changes live in production

---

## 📊 Summary

| Phase | Status | Tasks | Duration |
|-------|--------|-------|----------|
| 28 | ✅ Complete | 5 | 8h |
| 29 | ✅ Complete | 8 | 4h |
| 30 | 🔄 In Progress | 12 | 6-8h |

---

## 🎯 Phase 30 Goals

- ✅ 100% i18n coverage (all text translated ID/EN)
- ✅ Polished UI/UX (spacing, typography, states)
- ✅ Better mobile experience
- ✅ No regressions
- ✅ Production ready

---

## 📁 Files to Modify

1. **frontend/locales/id.json** - Add missing translation keys
2. **frontend/locales/en.json** - Add missing translation keys
3. **frontend/js/views/dashboard.js** - Add i18n
4. **frontend/js/views/screener.js** - Add i18n
5. **frontend/js/views/portfolio.js** - Add i18n
6. **frontend/js/views/stock_detail.js** - Add i18n
7. **frontend/js/views/settings.js** - Add i18n
8. **frontend/js/views/help.js** - Add i18n
9. **frontend/js/main.js** - Add i18n
10. **frontend/js/router.js** - Add i18n
11. **frontend/js/api.js** - Add i18n
12. **frontend/style.css** - UI polish

---

## 🚀 Execution Strategy

1. **Task 30.1:** Audit untranslated text (30 min)
2. **Task 30.2:** Add translation keys (1 hour)
3. **Tasks 30.3-30.7:** Update views with i18n (3-4 hours)
4. **Tasks 30.8-30.11:** UI polish (2-3 hours)
5. **Task 30.12:** Deploy & verify (1 hour)

**Total:** 6-8 hours

---

## ✅ Checklist

- [ ] Audit untranslated text
- [ ] Add translation keys
- [ ] Update dashboard view
- [ ] Update screener view
- [ ] Update portfolio & stock detail views
- [ ] Update settings & help views
- [ ] Update core JS files
- [ ] Polish spacing & alignment
- [ ] Polish typography
- [ ] Polish hover & focus states
- [ ] Improve mobile responsiveness
- [ ] Deploy to production
- [ ] Verify all changes live
- [ ] No regressions detected

---

**Phase 30 Status:** 🔄 **READY TO START**  
**Target Completion:** 2026-05-15 (next session)  
**Production Deployment:** ✅ Planned
