import { handleRoute } from './router.js?v=202605120200';
import { fetchMarketSummary, searchStocks, fetchTopMovers, initTVThemeSync, apiFetch } from './api.js?v=202605120200';
import { initTheme } from './theme.js?v=202605120200';
import { registerViewTimer, clearViewTimers } from './utils/view_timers.js?v=202605120200';

// ─── ENTRY ─── main.js
window.__rbk_log && window.__rbk_log('main.js module loaded', true);
console.log('RBK: main.js module execution started');

document.documentElement.setAttribute('data-js-loaded', 'true');

// ================= GLOBAL ERROR BOUNDARY =================
window.__hermesErrors = [];

window.onerror = function(msg, url, line, col, error) {
  const err = {msg, url, line, col, time: Date.now()};
  window.__hermesErrors.push(err);
  console.error('[ErrorBoundary]', msg, url, line, col);
  console.error('[RetailBijak] Global error:', error);
  showErrorFallback(msg);
  return true; // Prevent default browser handler
};

window.addEventListener('unhandledrejection', function(e) {
  const err = {reason: String(e.reason), time: Date.now()};
  window.__hermesErrors.push(err);
  console.error('[ErrorBoundary] Unhandled Rejection:', e.reason);
  console.error('[RetailBijak] Unhandled rejection:', e.reason);
  const msg = e.reason?.message || 'Terjadi kesalahan tidak terduga';
  if (typeof showToast === 'function') showToast(msg, 'error');
  showErrorFallback(e.reason);
  e.preventDefault();
});

window.addEventListener('error', event => {
  console.error('[RetailBijak] Global error:', event.error);
});

function showErrorFallback(detail) {
  const root = document.getElementById('app-root');
  if (!root) return;
  // Only show if root is empty or in loading state
  if (root.children.length > 1 && !root.classList.contains('page-loading')) return;
  
  root.innerHTML = `
    <div class="empty-state-card" style="min-height:60vh">
      <div class="empty-state-icon">⚠️</div>
      <strong class="empty-state-title">Terjadi Kesalahan</strong>
      <span class="empty-state-desc">${String(detail).substring(0, 100) || 'Halaman gagal dimuat. Silakan coba refresh.'}</span>
      <button type="button" class="empty-state-action" onclick="location.reload()">
        <i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang
      </button>
    </div>
  `;
}
// ================= ANIMATION ENGINE =================
// View lifecycle: cleanup timers when navigating away
// Re-exported from utils/view_timers.js for backward compatibility
export { registerViewTimer, clearViewTimers } from './utils/view_timers.js?v=202605120200';
export { observeElements, animateValue, flashUpdate } from './utils/helpers.js?v=202605120200';
// ─── More Drawer (mobile nav) ────────────────────
function closeMoreDrawer() {
  const drawer = document.getElementById('more-drawer');
  if (drawer) drawer.hidden = true;
}
function openMoreDrawer() {
  const drawer = document.getElementById('more-drawer');
  if (drawer) {
    drawer.hidden = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}
// Expose globally for inline onclick handlers
window.closeMoreDrawer = closeMoreDrawer;
window.openMoreDrawer = openMoreDrawer;

// ─── Keyboard Shortcuts Overlay ────────────────
function openShortcuts() {
  const el = document.getElementById('shortcuts-overlay');
  if (el) { el.hidden = false; if (typeof lucide !== 'undefined') lucide.createIcons(); }
}
function closeShortcuts() {
  const el = document.getElementById('shortcuts-overlay');
  if (el) el.hidden = true;
}
window.openShortcuts = openShortcuts;
window.closeShortcuts = closeShortcuts;

let _goBuffer = '';
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    // ? or Shift+/ → open shortcuts
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      openShortcuts();
      return;
    }
    // Esc → close shortcuts
    if (e.key === 'Escape') {
      const shortcuts = document.getElementById('shortcuts-overlay');
      if (shortcuts && !shortcuts.hidden) { closeShortcuts(); e.preventDefault(); return; }
    }
    // T → toggle theme
    if (e.key === 't' || e.key === 'T') {
      const btn = document.getElementById('theme-toggle');
      if (btn) { btn.click(); e.preventDefault(); return; }
    }
    // / → focus search
    if (e.key === '/') {
      const input = document.getElementById('global-search-input');
      const overlay = document.getElementById('search-overlay');
      if (input && overlay) {
        overlay.classList.add('active');
        setTimeout(() => input.focus(), 50);
        e.preventDefault(); return;
      }
    }
    // Go-style navigation: g then d/s/p/m/n
    if (e.key === 'g' || e.key === 'G') {
      _goBuffer = 'g';
      setTimeout(() => { _goBuffer = ''; }, 800);
      e.preventDefault(); return;
    }
    if (_goBuffer === 'g') {
      _goBuffer = '';
      const navMap = { d: 'dashboard', s: 'screener', p: 'portfolio', m: 'market', n: 'news', t: 'paper_trades', b: 'backtest', c: 'compare' };
      const route = navMap[e.key.toLowerCase()];
      if (route) { window.location.hash = `#${route}`; e.preventDefault(); }
      return;
    }
  });
}

// ─── Lucide Icons Auto-Render via MutationObserver ───
function setupLucideAutoRender() {
  const render = () => {
    if (typeof lucide === 'undefined' || !lucide.createIcons) return;
    lucide.createIcons();
    const target = document.getElementById('app-root') || document.body;
    let rendering = false;
    const observer = new MutationObserver(() => {
      if (rendering) return;
      rendering = true;
      requestAnimationFrame(() => {
        lucide.createIcons();
        rendering = false;
      });
    });
    observer.observe(target, { childList: true, subtree: true });
  };
  
  // Wait for Lucide CDN if not loaded yet
  if (typeof lucide === 'undefined') {
    const checkLucide = setInterval(() => {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        clearInterval(checkLucide);
        render();
      }
    }, 100);
    setTimeout(() => clearInterval(checkLucide), 5000); // Timeout after 5s
  } else {
    render();
  }
}

// ================= UI CORE =================
function setupSearchOverlay() {
   const overlay = document.getElementById('search-overlay');
   const trigger = document.getElementById('cmd-k-trigger');
   const input = document.getElementById('global-search-input');
   
   if (!overlay || !trigger || !input) return;
   const toggle = (show) => {
       if (show) {
           overlay.classList.add('active');
           setTimeout(() => input.focus(), 100);
       } else {
           overlay.classList.remove('active');
           input.blur();
       }
   };
   trigger.addEventListener('click', () => toggle(true));
   overlay.addEventListener('click', (e) => {
       if (e.target === overlay) toggle(false);
   });
   const suggestions = document.getElementById('search-suggestions');
   let searchTimer = null;
   let activeIndex = -1;
   let currentItems = [];
   const escapeHtml = (str = '') => String(str)
       .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
   const highlight = (text, q) => {
       const value = String(text ?? '');
       const query = String(q ?? '').trim();
       if (!query) return escapeHtml(value);
       const idx = value.toUpperCase().indexOf(query.toUpperCase());
       if (idx < 0) return escapeHtml(value);
       return `${escapeHtml(value.slice(0, idx))}<mark>${escapeHtml(value.slice(idx, idx + query.length))}</mark>${escapeHtml(value.slice(idx + query.length))}`;
   };
   const renderSuggestions = (items = [], query = '') => {
       if (!suggestions) return;
       currentItems = items;
       activeIndex = items.length ? 0 : -1;
       if (!items.length) {
           suggestions.innerHTML = '<div class="text-sm text-muted p-3">Tidak ada hasil yang benar-benar cocok.</div>';
           return;
       }
       const groups = { ticker: [], company: [], sector: [] };
       items.forEach(item => (groups[item.bucket || 'company'] || groups.company).push(item));
      const renderRow = (item, idx) => {
        const isUp = item.change >= 0;
        const priceHtml = item.price != null
          ? `<span class="search-badge-group"><span class="search-price">${Math.round(item.price).toLocaleString('id-ID')}</span><span class="search-change ${isUp ? 'text-up' : 'text-down'}">${item.change_pct > 0 ? '+' : ''}${(item.change_pct || 0).toFixed(2)}%</span></span>`
          : '';
        return `<a href="#stock/${item.ticker}" data-idx="${idx}" class="flex justify-between items-center px-3 py-2 search-suggestion-item${idx === activeIndex ? ' search-suggestion-active' : ''}">
          <div class="flex items-center gap-3 search-suggestion-row">
            <span class="badge sugg-badge">${item.bucket === 'sector' ? 'SC' : item.bucket === 'company' ? 'CO' : 'EQ'}</span>
            <span class="mono strong text-main search-suggestion-ticker">${highlight(item.ticker, query)}</span>
            <span class="text-xs text-muted search-suggestion-text">${highlight(item.name || item.sector || 'Ekuitas IDX', query)}</span>
          </div>
          ${priceHtml ? `<span>${priceHtml}</span>` : `<span class="search-suggestion-label">${escapeHtml(item.bucket || item.source || '')}</span>`}
        </a>`;
      };
       suggestions.innerHTML = [
        groups.ticker.length ? `<div class="px-3 pt-2 pb-1 text-xs uppercase text-dim strong">Kode Saham</div>${groups.ticker.map(renderRow).join('')}` : '',
        groups.company.length ? `<div class="px-3 pt-2 pb-1 text-xs uppercase text-dim strong">Emiten</div>${groups.company.map(renderRow).join('')}` : '',
        groups.sector.length ? `<div class="px-3 pt-2 pb-1 text-xs uppercase text-dim strong">Sektor</div>${groups.sector.map(renderRow).join('')}` : '',
].filter(Boolean).join('');
       suggestions.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
   };
   const refreshSuggestions = async () => {
       const q = input.value.trim();
       if (!q) {
           suggestions.innerHTML = '<div class="text-sm text-muted p-3">Ketik kode saham atau nama emiten.</div>';
           currentItems = [];
           activeIndex = -1;
           hideFilterBar();
           return;
       }
       const res = await searchStocks(q, 12, activeSectorFilter);
       const items = Array.isArray(res?.data) ? res.data : [];
       renderSuggestions(items, q);
       updateFilterChips(res);
   };
   const moveActive = (delta) => {
       if (!currentItems.length) return;
       activeIndex = Math.max(0, Math.min(currentItems.length - 1, activeIndex + delta));
       const rows = [...suggestions.querySelectorAll('a[data-idx]')];
       rows.forEach((row, idx) => row.classList.toggle('search-suggestion-active', idx === activeIndex));
       rows[activeIndex]?.scrollIntoView({ block: 'nearest' });
   };
   input.addEventListener('input', () => {
       clearTimeout(searchTimer);
       searchTimer = setTimeout(refreshSuggestions, 300);
   });
   input.addEventListener('focus', refreshSuggestions);
   input.addEventListener('keydown', (e) => {
       if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
       if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); return; }
       if (e.key === 'Enter' && input.value.trim()) {
           const target = currentItems[activeIndex] || currentItems[0];
           window.location.hash = target ? `#stock/${target.ticker}` : ('#stock/' + input.value.trim().toUpperCase());
           input.value = '';
           toggle(false);
       }
   });
   document.addEventListener('keydown', (e) => {
       const tag = e.target.tagName;
       const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
       // Ctrl+K or Cmd+K → toggle search
       if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
           e.preventDefault();
           toggle(!overlay.classList.contains('active'));
           return;
       }
       // / → focus search (only outside input/textarea)
       if (e.key === '/' && !isInput) {
           e.preventDefault();
           toggle(true);
           return;
       }
       // Escape → close search overlay
       if (e.key === 'Escape' && overlay.classList.contains('active')) {
           toggle(false);
           e.preventDefault();
           return;
       }
       // Escape → close ANY modal overlay (portfolio, alert, etc.)
       if (e.key === 'Escape') {
           document.querySelectorAll('[id$="-modal-overlay"]').forEach(el => el.remove());
       }
   });
   // Close on link click inside search
   overlay.querySelectorAll('a').forEach(a => {
       a.addEventListener('click', () => toggle(false));
   });
   // Close button
   const closeBtn = document.getElementById('search-close-btn');
   if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
   
   // Recent searches
   const RECENT_KEY = 'retailbijak.recent_searches';
   function getRecent() {
     try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
   }
   function saveRecent(q) {
     let recents = getRecent().filter(r => r !== q);
     recents.unshift(q);
     if (recents.length > 5) recents = recents.slice(0, 5);
     localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
   }
   function renderRecent() {
     const recents = getRecent();
     if (!recents.length || input.value.trim()) return;
     suggestions.innerHTML = `
       <div class="search-recent-header">
         <i data-lucide="clock" style="width:12px;height:12px"></i> Pencarian Terakhir
         <button class="search-recent-clear" id="clear-recent-btn">Hapus</button>
       </div>
       ${recents.map((r, i) => `
         <a href="#stock/${r}" data-idx="${i}" class="flex items-center px-3 py-2 search-suggestion-item" style="gap:8px">
           <i data-lucide="history" style="width:14px;height:14px;color:var(--text-dim);flex-shrink:0"></i>
           <span class="mono strong text-main">${r}</span>
         </a>
       `).join('')}`;
     if (typeof lucide !== 'undefined') lucide.createIcons();
     const clearBtn = document.getElementById('clear-recent-btn');
     if (clearBtn) clearBtn.addEventListener('click', () => { localStorage.removeItem(RECENT_KEY); renderRecent(); });
     suggestions.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
   }
   // Override refreshSuggestions to show recents when empty
   const origRefresh = refreshSuggestions;
   refreshSuggestions = async () => {
     const q = input.value.trim();
     if (!q) { renderRecent(); currentItems = []; activeIndex = -1; return; }
     const res = await searchStocks(q, 12);
     const items = Array.isArray(res?.data) ? res.data : [];
     renderSuggestions(items, q);
   };
   // Save to recents on Enter
   input.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' && input.value.trim()) {
       saveRecent(input.value.trim().toUpperCase());
     }
   });
}
// ─── Search Filter Chips ───
let activeSectorFilter = '';
function updateFilterChips(res) {
  const bar = document.getElementById('search-filter-bar');
  const chips = document.getElementById('search-filter-chips');
  if (!bar || !chips) return;
  
  const sectors = res?.filters?.sectors;
  if (!sectors || sectors.length < 2) {
    hideFilterBar();
    return;
  }
  
  bar.classList.remove('hidden');
  chips.innerHTML = sectors.map(s => {
    const isActive = activeSectorFilter && activeSectorFilter === s.name;
    return `<button class="search-filter-chip ${isActive ? 'active' : ''}" data-sector="${s.name}" onclick="toggleSectorFilter('${s.name}')">${s.name} <span class="search-filter-chip-count">${s.count}</span></button>`;
  }).join('');
}
function hideFilterBar() {
  const bar = document.getElementById('search-filter-bar');
  if (bar) bar.classList.add('hidden');
}
window.toggleSectorFilter = function(sector) {
  const input = document.getElementById('global-search-input');
  if (activeSectorFilter === sector) {
    activeSectorFilter = '';
  } else {
    activeSectorFilter = sector;
  }
  // Trigger re-search with filter
  const q = input?.value?.trim() || '';
  if (q) {
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
  }
  // Update chip visual
  document.querySelectorAll('.search-filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.sector === activeSectorFilter);
  });
};
function setupScrollEffects() {
   const topbar = document.querySelector('.topbar');
   const progressBar = document.getElementById('scroll-progress');
   if (!topbar) return;
   window.addEventListener('scroll', () => {
       if (window.scrollY > 20) topbar.classList.add('scrolled');
       else topbar.classList.remove('scrolled');
       // Update scroll progress bar
       if (progressBar) {
           const scrollTop = window.scrollY;
           const docHeight = document.documentElement.scrollHeight - window.innerHeight;
           const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
           progressBar.style.width = progress + '%';
       }
   }, { passive: true });
}

// ─── 16.6.5 — Scroll-to-top button ──────────────
function setupScrollToTop() {
  const btn = document.getElementById('scroll-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      btn.style.display = 'flex';
      requestAnimationFrame(() => { btn.style.opacity = '1'; });
    } else {
      btn.style.opacity = '0';
      setTimeout(() => { if (window.scrollY <= 500) btn.style.display = 'none'; }, 200);
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ─── 16.6.3 — Keyboard Shortcut Panel ───────────
function setupShortcutPanel() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.target.closest('input,textarea,select')) {
      e.preventDefault();
      toggleShortcutModal();
    }
  });
}

function toggleShortcutModal() {
  const existing = document.getElementById('shortcut-modal-overlay');
  if (existing) { existing.remove(); return; }
  const overlay = document.createElement('div');
  overlay.id = 'shortcut-modal-overlay';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease" onclick="if(event.target===this)this.remove()">
      <div style="background:var(--card-bg);border-radius:16px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:16px;font-weight:800;color:var(--text-main)">⌨️ Pintasan Keyboard</h3>
          <button type="button" onclick="this.closest('#shortcut-modal-overlay').remove()" style="background:none;border:none;font-size:22px;color:var(--text-dim);cursor:pointer">&times;</button>
        </div>
        <div style="font-size:13px;line-height:2">
          <div><kbd>?</kbd> — Buka pintasan ini</div>
          <div><kbd>Ctrl+K</kbd> — Cari saham</div>
          <div><kbd>D</kbd> — Dashboard</div>
          <div><kbd>S</kbd> — Screener</div>
          <div><kbd>P</kbd> — Portfolio</div>
          <div><kbd>N</kbd> — News</div>
          <div><kbd>T</kbd> — Ganti tema</div>
          <div><kbd>Esc</kbd> — Tutup modal</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ─── 16.6.1 — Page Transition Animation ─────────
function setupPageTransitions() {
  // Add fade-in class to views when they mount
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.view-content:not(.view-visible)').forEach(el => {
      el.classList.add('view-visible');
      el.style.animation = 'viewFadeIn .3s ease forwards';
    });
  });
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
}

// ─── 16.6.2 — Swipe Navigation ──────────────────
function setupSwipeNavigation() {
  let startX = 0, startY = 0;
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // not horizontal enough
    const navOrder = ['#dashboard', '#screener', '#portfolio', '#settings'];
    const current = window.location.hash || '#dashboard';
    const idx = navOrder.indexOf(current);
    if (dx > 0 && idx > 0) { // swipe right → previous
      window.location.hash = navOrder[idx - 1];
    } else if (dx < 0 && idx < navOrder.length - 1) { // swipe left → next
      window.location.hash = navOrder[idx + 1];
    }
  }, { passive: true });
}

// ─── 16.6.4 — Pull-to-refresh ───────────────────
function setupPullToRefresh() {
  let startY = 0, pulling = false;
  const indicator = document.createElement('div');
  indicator.id = 'ptr-indicator';
  indicator.style.cssText = 'position:fixed;top:-40px;left:0;right:0;z-index:9999;text-align:center;padding:10px;font-size:12px;color:var(--text-dim);transition:top .3s;background:var(--bg-panel)';
  indicator.textContent = '⬇️ Tarik untuk refresh';
  document.body.appendChild(indicator);

  document.addEventListener('touchstart', (e) => {
    if (window.scrollY > 10) { startY = 0; return; }
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!startY || window.scrollY > 10) return;
    const pull = e.touches[0].clientY - startY;
    if (pull > 60) {
      pulling = true;
      indicator.style.top = '0';
      indicator.textContent = '🔃 Lepas untuk refresh';
    }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (pulling) {
      pulling = false;
      indicator.textContent = '⏳ Memuat ulang...';
      setTimeout(() => {
        location.reload();
      }, 300);
    }
    startY = 0;
    indicator.style.top = '-40px';
  }, { passive: true });
}

// Global button click effect
document.addEventListener('click', (e) => {
   const btn = e.target.closest('.btn');
   if (btn) {
       btn.style.transform = 'scale(0.95)';
       setTimeout(() => btn.style.transform = '', 150);
   }
});
// Topbar Data Fetch
async function refreshTopbarMarket() {
   try {
       const data = await fetchMarketSummary();
       const valEl = document.getElementById('topbar-ihsg-val');
       const pctEl = document.getElementById('topbar-ihsg-pct');
       const dotEl = document.querySelector('.status-dot');
       const txtEl = document.getElementById('market-status-text');
       
       if (data && valEl && pctEl) {
           const prevVal = parseFloat(valEl.textContent.replace(/,/g, ''));
           const newVal = parseFloat(data.value);
           
           if (prevVal !== newVal && !isNaN(prevVal) && !isNaN(newVal)) {
               animateValue(valEl, prevVal, newVal, 800);
               flashUpdate(valEl, newVal > prevVal);
               // Toggle glow on quote card
               const qc = document.querySelector('.dash-quote-card');
               if (qc) { qc.classList.remove('is-up', 'is-down'); qc.classList.add(newVal > prevVal ? 'is-up' : 'is-down'); }
           } else {
               valEl.textContent = Number(data.value || 7080.63).toLocaleString('id-ID', { maximumFractionDigits: 2 });
           }
           
           const isPos = data.change_pct >= 0;
           pctEl.textContent = `${isPos ? '+' : ''}${data.change_pct.toFixed(2)}%`;
           pctEl.className = `mono text-xs ${isPos ? 'text-up' : 'text-down'}`;
           
           if (dotEl && txtEl) {
               const isOpen = data.status === 'ok';
               dotEl.classList.toggle('live', isOpen);
               txtEl.textContent = isOpen ? 'IDX BUKA' : 'IDX TUTUP';
           }
       }
   } catch (e) {
       console.warn('Gagal memperbarui topbar', e);
   }
}
// ─── IDX Market Countdown ─────────────────────────
function updateMarketCountdown() {
  const el = document.getElementById('market-countdown');
  const statusEl = document.getElementById('market-status-text');
  const dotEl = document.querySelector('.status-dot');
  if (!el || !statusEl) return;
  
  const now = new Date();
  // WIB = UTC+7
  const wibH = (now.getUTCHours() + 7) % 24;
  const wibM = now.getUTCMinutes();
  const wibS = now.getUTCSeconds();
  const totalSec = wibH * 3600 + wibM * 60 + wibS;
  
  // Session boundaries in seconds from midnight WIB
  const S = { pre: 8*3600+45*60, open1: 9*3600, close1: 12*3600, open2: 13*3600+30*60, close: 15*3600+30*60 };
  const DAY = 86400;
  
  let nextSec, label, isLive, dotColor;
  
  if (totalSec >= S.pre && totalSec < S.open1) {
    // Pre-open: countdown to session 1
    nextSec = S.open1 - totalSec;
    label = 'PRE-OPEN';
    isLive = true;
    dotColor = 'var(--accent-indigo)';
  } else if (totalSec >= S.open1 && totalSec < S.close1) {
    // Session 1
    nextSec = S.close1 - totalSec;
    label = 'SESI 1';
    isLive = true;
    dotColor = 'var(--primary-color)';
  } else if (totalSec >= S.close1 && totalSec < S.open2) {
    // Break
    nextSec = S.open2 - totalSec;
    label = 'ISTIRAHAT';
    isLive = false;
    dotColor = 'var(--warning-color, #f59e0b)';
  } else if (totalSec >= S.open2 && totalSec < S.close) {
    // Session 2
    nextSec = S.close - totalSec;
    label = 'SESI 2';
    isLive = true;
    dotColor = 'var(--primary-color)';
  } else {
    // Market closed: countdown to next pre-open
    if (totalSec >= S.close) nextSec = DAY - totalSec + S.pre;
    else nextSec = S.pre - totalSec;
    label = 'TUTUP';
    isLive = false;
    dotColor = 'var(--text-dim)';
  }
  
  // Format countdown: HH:MM:SS
  const hh = String(Math.floor(nextSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((nextSec % 3600) / 60)).padStart(2, '0');
  const ss = String(Math.floor(nextSec % 60)).padStart(2, '0');
  
  el.textContent = `${hh}:${mm}:${ss}`;
  el.classList.remove('hidden');
  
  // Sync status text with session
  if (statusEl && isLive) statusEl.textContent = label;
  if (dotEl) dotEl.style.background = dotColor;
  if (dotEl && isLive) dotEl.classList.add('live'); else if (dotEl) dotEl.classList.remove('live');
  
  // Flash effect when countdown < 60 seconds
  el.classList.toggle('countdown-urgent', nextSec < 60);
}

function startMarketCountdown() {
  updateMarketCountdown();
  setInterval(updateMarketCountdown, 1000);
}
// Running Ticker Setup — data dari API (tetap di website)
async function setupRunningTicker() {
  const tickerContainer = document.getElementById('running-ticker');
  if (!tickerContainer) return;
  const res = await fetchTopMovers(12);
  const seen = new Set();
  const rows = Array.isArray(res?.data) && res.data.length
    ? res.data.filter(r => { const ok = !seen.has(r.ticker); seen.add(r.ticker); return ok; }).slice(0, 12)
    : [];
  if (!rows.length) {
    // Fallback: static list of major IDX stocks
    const fallback = ['BBRI','BBCA','TLKM','ASII','BMRI','UNVR','ADRO','GOTO','BYAN','ICBP','ANTM','PGAS'];
    tickerContainer.innerHTML = fallback.map(t => `
      <a href="#stock/${t}" class="tape-card">
        <div class="flex-col"><div class="tape-pair">${t}</div><div class="tape-price">—</div></div>
        <div class="flex-col items-end"><div class="tape-chg">—</div></div>
      </a>`).join('');
    return;
  }
  const tickerItems = [...rows, ...rows]; // duplicate for seamless loop
  tickerContainer.innerHTML = tickerItems.map(item => {
    const change = Number(item.change_pct ?? item.change ?? 0);
    const price = item.price == null ? '—' : Number(item.price).toLocaleString('id-ID', { maximumFractionDigits: 0 });
    return `
      <a href="#stock/${item.ticker}" class="tape-card">
        <div class="flex-col">
          <div class="tape-pair">${item.ticker}</div>
          <div class="tape-price">${price}</div>
        </div>
        <div class="flex-col items-end">
          <div class="tape-chg ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</div>
        </div>
      </a>`;
  }).join('');
}

// ─── 16.2.2 — Live Price SSE Stream ──────────────
let livePriceSource = null;

function setupLivePriceStream() {
  const container = document.getElementById('running-ticker');
  const liveBadge = document.getElementById('live-badge');
  if (!container) return;

  if (livePriceSource) { livePriceSource.close(); livePriceSource = null; }

  try {
    livePriceSource = new EventSource('/api/market/live-prices?top_n=30&interval=5');
    livePriceSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'tick' && data.prices?.length) {
          const items = [...data.prices, ...data.prices];
          container.innerHTML = items.map(p => {
            const price = p.close != null ? Number(p.close).toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '—';
            return ` <a href="#stock/${p.ticker}" class="tape-card"> <div class="flex-col"><div class="tape-pair">${p.ticker}</div><div class="tape-price">${price}</div></div> </a>`;
          }).join('');
          if (liveBadge) { liveBadge.style.display = 'inline'; liveBadge.classList.remove('hidden'); }
        }
      } catch (e) { /* ignore */ }
    };
    livePriceSource.onerror = () => { if (liveBadge) liveBadge.style.display = 'none'; };
  } catch (e) {
    console.warn('[LivePrice] SSE failed:', e);
    if (liveBadge) liveBadge.style.display = 'none';
  }
}

// ─── 16.2.4 — Live Stock Detail Refresh ──────────
function setupStockDetailLiveRefresh() { /* called by stock_detail.js */ }

// Network status indicator
function setupNetworkStatus() {
  const el = document.getElementById('network-status');
  if (!el) return;
  const show = (online) => {
    const cachedInfo = el.dataset.cachedDate ? ` — data cache ${el.dataset.cachedDate}` : '';
    el.textContent = online 
      ? '✅ Koneksi tersambung kembali.' 
      : `⚠️ Koneksi terputus — menampilkan data cache${cachedInfo}. Beberapa fitur mungkin tidak berfungsi.`;
    el.className = `network-status ${online ? 'online' : ''}`;
    el.classList.remove('hidden');
    if (online) setTimeout(() => el.classList.add('hidden'), 4000);
    // Also update topbar
    const topbarStatus = document.querySelector('.topbar-market-status');
    if (topbarStatus) {
      const dot = topbarStatus.querySelector('.status-dot');
      const text = topbarStatus.querySelector('#market-status-text');
      if (dot) dot.style.background = online ? 'var(--up-color)' : 'var(--danger-text)';
      if (text) text.textContent = online ? 'IDX TUTUP' : 'OFFLINE';
    }
  };
  window.addEventListener('online', () => show(true));
  window.addEventListener('offline', () => show(false));
  // Initial check
  if (!navigator.onLine) show(false);
}
// ─── Touch Gestures ──────────────────────────────
function setupTouchGestures() {
  const root = document.getElementById('app-root');
  if (!root) return;
  
  let startX = 0, startY = 0, distX = 0, distY = 0;
  let swiping = false;
  
  root.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    distX = 0;
    distY = 0;
    swiping = true;
  }, { passive: true });
  
  root.addEventListener('touchmove', (e) => {
    if (!swiping) return;
    const touch = e.touches[0];
    distX = touch.clientX - startX;
    distY = touch.clientY - startY;
    
    // Pull-to-refresh: show indicator when pulled down >50px from top
    if (distY > 50 && window.scrollY < 10) {
      const indicator = document.getElementById('ptr-indicator');
      if (indicator) {
        indicator.classList.add('ptr-visible');
        indicator.style.opacity = Math.min(1, (distY - 50) / 100);
      }
    }
  }, { passive: true });
  
  root.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    
    const absX = Math.abs(distX);
    const absY = Math.abs(distY);
    
    // Pull-to-refresh
    if (absY > 80 && absY > absX && window.scrollY < 10) {
      const indicator = document.getElementById('ptr-indicator');
      if (indicator) indicator.classList.remove('ptr-visible');
      // Reload current view
      handleRoute(window.location.hash);
      showToast('Menyegarkan...', 'info');
      return;
    }
    
    // Horizontal swipe: navigate between bottom nav tabs (mobile)
    if (absX > 60 && absX > absY * 1.5) {
      const navOrder = ['dashboard', 'screener', 'portfolio', 'settings'];
      const currentView = document.getElementById('app-root')?.dataset?.activeView || '';
      const idx = navOrder.indexOf(currentView);
      if (idx !== -1) {
        const dir = distX < 0 ? 1 : -1; // swipe left = next, right = prev
        const next = idx + dir;
        if (next >= 0 && next < navOrder.length) {
          window.location.hash = `#${navOrder[next]}`;
        }
      }
    }
  }, { passive: true });
}

// ─── First-Run Onboarding (3-step) ────────────────
function showOnboarding() {
  if (localStorage.getItem('retailbijak.onboarded.v1')) return;

  const steps = [
    { icon: '📊', title: 'Dashboard Real-Time', desc: 'Pantau IHSG, top movers, dan market breadth dalam satu tampilan.' },
    { icon: '🔍', title: 'Screener Canggih', desc: 'Scan ratusan saham IDX dengan filter teknikal dan fundamental.' },
    { icon: '💼', title: 'Portfolio Tracker', desc: 'Catat portofolio kamu dan pantau P&L secara otomatis.' },
  ];

  let current = 0;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;';

  function renderStep(i) {
    const s = steps[i];
    overlay.innerHTML = `
      <div style="background:var(--card-bg,#1e2130);border-radius:16px;padding:32px;max-width:360px;width:90%;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px">${s.icon}</div>
        <h2 style="color:var(--text-primary,#fff);margin:0 0 12px">${s.title}</h2>
        <p style="color:var(--text-secondary,#aaa);margin:0 0 24px;line-height:1.5">${s.desc}</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:20px">
          ${steps.map((_,j) => `<div style="width:8px;height:8px;border-radius:50%;background:${j===i?'var(--accent,#3b82f6)':'#444'}"></div>`).join('')}
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          ${i > 0 ? '<button id="ob-prev" style="padding:10px 20px;border-radius:8px;border:1px solid #444;background:transparent;color:#aaa;cursor:pointer">Kembali</button>' : ''}
          <button id="ob-next" style="padding:10px 24px;border-radius:8px;border:none;background:var(--accent,#3b82f6);color:#fff;cursor:pointer;font-weight:600">${i === steps.length-1 ? 'Mulai!' : 'Lanjut'}</button>
        </div>
        <button id="ob-skip" style="margin-top:12px;background:none;border:none;color:#666;cursor:pointer;font-size:13px">Lewati</button>
      </div>
    `;
    overlay.querySelector('#ob-next').onclick = () => {
      if (i === steps.length-1) finishOnboarding();
      else { current++; renderStep(current); }
    };
    if (i > 0) overlay.querySelector('#ob-prev').onclick = () => { current--; renderStep(current); };
    overlay.querySelector('#ob-skip').onclick = finishOnboarding;
  }

  function finishOnboarding() {
    localStorage.setItem('retailbijak.onboarded.v1', '1');
    overlay.remove();
  }

  renderStep(0);
  document.body.appendChild(overlay);
}

// ─── Data Freshness ────────────────────────
window.loadFreshness = async function loadFreshness() {
  const textEl = document.getElementById('freshness-text');
  const dotEl = document.querySelector('.freshness-dot');
  if (!textEl) return;
  try {
    const res = await apiFetch('/system/freshness');
    const labels = res?.labels || {};
    // Find the most recent meaningful data freshness
    const keyOrder = ['ohlcv_daily', 'signals', 'broker_summary', 'stocks', 'news'];
    let bestLabel = null;
    for (const key of keyOrder) {
      if (labels[key] && labels[key] !== 'tidak tersedia') {
        bestLabel = labels[key];
        break;
      }
    }
    // Determine staleness
    let freshnessClass = 'fresh';
    if (bestLabel) {
      if (bestLabel.includes('hari')) freshnessClass = 'old';
      else if (bestLabel.includes('jam')) freshnessClass = 'stale';
    }
    if (dotEl) { dotEl.className = 'freshness-dot ' + freshnessClass; }
    textEl.textContent = bestLabel || 'tidak tersedia';
    textEl.title = 'OHLCV: ' + (labels.ohlcv_daily || '—') + ' | Signal: ' + (labels.signals || '—');
  } catch (e) {
    textEl.textContent = 'error';
    if (dotEl) dotEl.className = 'freshness-dot old';
  }
};

// ─── Push Notification Polling (14.4.1) ─────────────────
// Upgraded to SSE streaming in 16.3.2 — falls back to polling if SSE fails

let alertEventSource = null;

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.35);
  } catch (e) { /* Audio not available */ }
}

function setupPushNotifications() {
  if (!('Notification' in window)) {
    console.log('[PushNotify] Notification API not supported');
    return;
  }
  if (Notification.permission === 'denied') return;

  if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') startAlertStream();
    });
    return;
  }

  // Permission granted — try SSE first, fall back to polling
  startAlertStream();

  function startAlertStream() {
    if (alertEventSource) { alertEventSource.close(); alertEventSource = null; }
    try {
      alertEventSource = new EventSource('/api/alerts/stream');
      alertEventSource.onmessage = (event) => {
        try {
          if (event.data && event.data.startsWith('{')) {
            const a = JSON.parse(event.data);
            if (a.type !== 'alert') return;

            const label = (a.alert_type || '').replace(/_/g, ' ');
            const title = `🔔 ${a.ticker || 'Alert'}`;
            const body = `${label}: ${a.trigger_value || ''} → ${a.current_value || ''}`;

            // Browser notification
            try {
              new Notification(title, {
                body: body,
                icon: '/icons/icon-192.png',
                tag: 'rb-alert-' + a.id,
              });
            } catch (e) { /* ignore */ }

            // Sound
            playAlertSound();

            // Auto-acknowledge so it doesn't queue up
            fetch('/api/alerts/triggered/ack', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: [a.id] }),
            }).catch(() => {});
          }
        } catch (e) { /* parse error */ }
      };
      alertEventSource.onerror = () => {
        // SSE failed — close and revert to polling
        if (alertEventSource) { alertEventSource.close(); alertEventSource = null; }
        console.warn('[PushNotify] SSE failed, falling back to polling');
        startAlertPolling();
      };
      // Set 10s timeout — if no data in 10s, fall back to polling
      setTimeout(() => {
        if (!alertEventSource) return;
        // If we got at least one message, keep SSE. Otherwise fallback.
      }, 10000);
    } catch (e) {
      console.warn('[PushNotify] SSE setup failed, using polling');
      startAlertPolling();
    }
  }

  function startAlertPolling() {
    let _lastNotifiedId = 0;

    async function pollAlerts() {
      try {
        const res = await apiFetch('/alerts/triggered?limit=10');
        if (!res?.data?.length) return;
        const newAlerts = res.data.filter(a => a.id > _lastNotifiedId);
        if (!newAlerts.length) {
          _lastNotifiedId = Math.max(_lastNotifiedId, res.data[0].id || 0);
          return;
        }
        _lastNotifiedId = Math.max(...newAlerts.map(a => a.id), _lastNotifiedId);
        const toShow = newAlerts.slice(0, 3);
        toShow.forEach(a => {
          const label = (a.alert_type || '').replace(/_/g, ' ');
          const title = `RetailBijak: ${a.ticker || 'Alert'}`;
          const body = `${label}: ${a.trigger_value || ''} → ${a.current_value || ''}`;
          try {
            new Notification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'retailbijak-alert-' + a.id });
          } catch (e) { /* fallback */ }
        });
        // Sound
        playAlertSound();
      } catch (e) { /* silent */ }
    }
    setTimeout(pollAlerts, 15000);
    setInterval(pollAlerts, 60000);
  }
}
// ─── End Push Notification Polling ─────────────────

// INIT
document.addEventListener('DOMContentLoaded', () => {
  try {
      initTheme();
      setupLucideAutoRender();
      setupSearchOverlay();
      setupScrollEffects();
      setupRunningTicker();
      refreshTopbarMarket();
      let _marketIntervalId = setInterval(refreshTopbarMarket, 60000);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          clearInterval(_marketIntervalId);
          _marketIntervalId = null;
        } else if (!_marketIntervalId) {
          refreshTopbarMarket();
          _marketIntervalId = setInterval(refreshTopbarMarket, 60000);
        }
      });
      setupNetworkStatus();
      setupKeyboardShortcuts();
      startMarketCountdown();
      setupLivePriceStream(); // re-enabled — SSE query fixed
      setupScrollToTop();
      setupShortcutPanel();
      setupPageTransitions();
      setupSwipeNavigation();
      setupPullToRefresh();
      setupTouchGestures();
      showOnboarding();
      // Service Worker — re-enabled after fixing reload loop
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js?v=202605120200').then(async reg => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            newSW.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
          // ─── Periodic Background Sync for alerts ──
          if ('periodicSync' in reg) {
            try {
              await reg.periodicSync.register('check-alerts', { minInterval: 15 * 60 * 1000 });
            } catch(e) { /* not supported or permission denied */ }
          }
        }).catch(() => {});
      }

      // ─── PWA Install Prompt ────────────────────────
      let deferredPrompt = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67+ from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;

        // Check if user already dismissed the banner
        if (localStorage.getItem('retailbijak.pwa_dismissed')) return;

        // Show install banner
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
          banner.style.display = 'flex';
          banner.classList.add('pwa-install-banner-show');
        }
      });

      document.addEventListener('click', (e) => {
        const installBtn = e.target.closest('#pwa-install-btn');
        if (installBtn && deferredPrompt) {
          // Hide the banner
          const banner = document.getElementById('pwa-install-banner');
          if (banner) {
            banner.style.display = 'none';
            banner.classList.remove('pwa-install-banner-show');
          }
          // Show the install prompt
          deferredPrompt.prompt();
          // Wait for the user to respond
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('[PWA] User accepted the install prompt');
            } else {
              console.log('[PWA] User dismissed the install prompt');
            }
            deferredPrompt = null;
          });
          return;
        }

        const closeBtn = e.target.closest('#pwa-install-close');
        if (closeBtn) {
          const banner = document.getElementById('pwa-install-banner');
          if (banner) {
            banner.style.display = 'none';
            banner.classList.remove('pwa-install-banner-show');
          }
          // Set flag so banner doesn't show again
          localStorage.setItem('retailbijak.pwa_dismissed', '1');
          deferredPrompt = null;
        }
      });
      try { initTVThemeSync(); } catch (e) { console.warn('TV theme sync init error', e); }

      // Alert notification polling — check every 2 min for triggered alerts
      let _lastAlertCheck = Date.now();
      async function checkTriggeredAlerts() {
        try {
          const res = await apiFetch('/alerts/triggered?limit=5');
          const badge = document.getElementById('sidebar-alert-badge');
          if (res?.data?.length) {
            const unseen = res.data.filter(a => !a.seen);
            const total = res.data.length;
            if (badge) { badge.textContent = total > 99 ? '99+' : total; badge.style.display = 'flex'; }
            if (unseen.length && res.data[0] && (!window._lastAlertTs || res.data[0].id > window._lastAlertTs)) {
              unseen.slice(0, 3).forEach(a => {
                if (a.alert_type && a.alert_type.startsWith('screener_match_')) {
                  showToast(`🔍 Screener: ${Math.round(a.current_value)} saham cocok!`, 'info', 8000);
                  // Refresh saved screener badges
                  updateScreenerMatchBadges();
                } else {
                  const label = (a.alert_type || '').replace(/_/g, ' ');
                  showToast(`${a.ticker}: ${label} ${a.trigger_value} (${a.current_value})`, 'info', 8000);
                }
              });
              window._lastAlertTs = res.data[0].id;
              // Acknowledge all
              apiFetch('/alerts/triggered/ack', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '[]' });
            }
          } else {
            if (badge) badge.style.display = 'none';
          }
        } catch (e) { /* silent */ }
      }
      // Initial check after 10s, then every 120s
      setTimeout(checkTriggeredAlerts, 10000);
      setInterval(checkTriggeredAlerts, 120000);

      // ─── Screener match badge updater ───────
      window.updateScreenerMatchBadges = async function() {
        try {
          const res = await apiFetch('/screener/saved');
          if (res?.data?.length) {
            const matching = res.data.filter(s => s.match_count > 0);
            if (matching.length > 0) {
              const totalMatches = matching.reduce((sum, s) => sum + s.match_count, 0);
              showToast(`🔍 ${matching.length} screener: ${totalMatches} total saham cocok`, 'info', 6000);
            }
          }
        } catch (e) { /* silent */ }
      };

      // More Drawer button
      const moreBtn = document.getElementById('bottom-more-btn');
      if (moreBtn) moreBtn.addEventListener('click', openMoreDrawer);

      // Signal badge update
      async function updateSignalBadge() {
        const badge = document.getElementById('sidebar-signal-badge');
        if (!badge) return;
        try {
          const res = await apiFetch('/signals/summary?limit=0&days_back=7', { timeout: 5000 });
          const total = res?.total || 0;
          if (total > 0) {
            badge.textContent = total > 99 ? '99+' : total;
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        } catch {}
      }
      updateSignalBadge();
      // Data freshness polling — refresh every 5 min
      loadFreshness();
      setInterval(loadFreshness, 300000);

      // ─── Push Notification Polling (14.4.1) ────────────────
      setupPushNotifications();
  } catch (e) {
      console.error('Init error:', e);
  }
});
// Routing
window.addEventListener('hashchange', () => handleRoute(window.location.hash));
window.addEventListener('DOMContentLoaded', () => handleRoute(window.location.hash || '#dashboard'), { once: true });
if (document.readyState !== 'loading') {
   queueMicrotask(() => handleRoute(window.location.hash || '#dashboard'));
}
