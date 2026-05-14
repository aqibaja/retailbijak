import { handleRoute } from './router.js';
import { fetchMarketSummary, searchStocks, fetchTopMovers, initTVThemeSync, apiFetch } from './api.js';
import { initTheme } from './theme.js';
import { registerViewTimer, clearViewTimers } from './utils/view_timers.js';
import { animateValue, flashUpdate } from './utils/helpers.js';

// ENTRY main.js
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
  return true;
};

window.addEventListener('unhandledrejection', function(e) {
  const err = {reason: String(e.reason), time: Date.now()};
  window.__hermesErrors.push(err);
  console.error('[ErrorBoundary] Unhandled Rejection:', e.reason);
  const msg = e.reason?.message || 'Terjadi kesalahan tidak terduga';
  if (typeof showToast === 'function') showToast(msg, 'error');
  showErrorFallback(e.reason);
  e.preventDefault();
});

function showErrorFallback(detail) {
  const root = document.getElementById('app-root');
  if (!root) return;
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

// ================= KEYBOARD SHORTCUTS =================
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
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      openShortcuts();
      return;
    }
    if (e.key === 'Escape') {
      const shortcuts = document.getElementById('shortcuts-overlay');
      if (shortcuts && !shortcuts.hidden) { closeShortcuts(); e.preventDefault(); return; }
    }
    if (e.key === 't' || e.key === 'T') {
      const btn = document.getElementById('theme-toggle');
      if (btn) { btn.click(); e.preventDefault(); return; }
    }
    if (e.key === 'r' || e.key === 'R') {
      window.dispatchEvent(new CustomEvent('retailbijak:refresh'));
      return;
    }
    if (e.key === '/') {
      const input = document.getElementById('global-search-input');
      const overlay = document.getElementById('search-overlay');
      if (input && overlay) {
        overlay.classList.add('active');
        setTimeout(() => input.focus(), 50);
        e.preventDefault(); return;
      }
    }
    if (e.key === 'g' || e.key === 'G') {
      _goBuffer = 'g';
      setTimeout(() => { _goBuffer = ''; }, 800);
      e.preventDefault(); return;
    }
    if (_goBuffer === 'g') {
      _goBuffer = '';
      const navMap = { d: 'dashboard', s: 'screener', p: 'portfolio', m: 'market', n: 'news' };
      const route = navMap[e.key.toLowerCase()];
      if (route) { window.location.hash = `#${route}`; e.preventDefault(); }
      return;
    }
  });
}

// ================= LUCIDE AUTO-RENDER =================
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
  
  if (typeof lucide === 'undefined') {
    const checkLucide = setInterval(() => {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        clearInterval(checkLucide);
        render();
      }
    }, 100);
    setTimeout(() => clearInterval(checkLucide), 5000);
  } else {
    render();
  }
}

// ================= SCROLL EFFECTS =================
function setupScrollEffects() {
  const topbar = document.querySelector('.topbar');
  const progressBar = document.getElementById('scroll-progress');
  if (!topbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) topbar.classList.add('scrolled');
    else topbar.classList.remove('scrolled');
    if (progressBar) {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      progressBar.style.width = progress + '%';
    }
  }, { passive: true });
}

// ================= SCROLL TO TOP =================
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

// ================= SEARCH OVERLAY =================
let activeSectorFilter = '';

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
  
  let refreshSuggestions = async () => {
    const q = input.value.trim();
    if (!q) {
      suggestions.innerHTML = '<div class="text-sm text-muted p-3">Ketik kode saham atau nama emiten.</div>';
      currentItems = [];
      activeIndex = -1;
      return;
    }
    const res = await searchStocks(q, 12, activeSectorFilter);
    const items = Array.isArray(res?.data) ? res.data : [];
    renderSuggestions(items, q);
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
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle(!overlay.classList.contains('active'));
      return;
    }
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      toggle(true);
      return;
    }
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      toggle(false);
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('[id$="-modal-overlay"]').forEach(el => el.remove());
    }
  });
  
  overlay.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => toggle(false));
  });
  
  const closeBtn = document.getElementById('search-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    initTheme();
    setupKeyboardShortcuts();
    setupLucideAutoRender();
    setupScrollEffects();
    setupScrollToTop();
    setupSearchOverlay();
    
    try { initTVThemeSync(); } catch (e) { console.warn('TV theme sync init error', e); }
    
    console.log('[main.js] DOMContentLoaded: all setup complete');
  } catch (e) {
    console.error('Init error:', e);
  }
});

// ================= ROUTING =================
window.addEventListener('hashchange', () => handleRoute(window.location.hash));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[main.js] DOMContentLoaded fired, hash:', window.location.hash);
    handleRoute(window.location.hash || '#dashboard');
  }, { once: true });
} else {
  console.log('[main.js] DOM already loaded, calling handleRoute');
  queueMicrotask(() => handleRoute(window.location.hash || '#dashboard'));
}
