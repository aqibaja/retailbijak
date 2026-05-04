import { handleRoute } from './router.js?v=20260504e';
import { fetchMarketSummary, searchStocks, fetchTopMovers } from './api.js?v=20260503b';
import { initTheme } from './theme.js?v=20260430n';
// ================= ANIMATION ENGINE =================
export function observeElements(selector = '.stagger-reveal') {
   const observer = new IntersectionObserver((entries) => {
       entries.forEach((entry, i) => {
           if (entry.isIntersecting) {
               setTimeout(() => {
                   entry.target.classList.add('is-visible');
               }, i * 50); // Stagger delay 50ms
               observer.unobserve(entry.target);
           }
       });
   }, { rootMargin: '0px 0px -50px 0px' });
   document.querySelectorAll(selector).forEach(el => observer.observe(el));
}
// Number Counter Animation (RequestAnimationFrame)
export function animateValue(obj, start, end, duration, prefix = '', suffix = '') {
   let startTimestamp = null;
   const step = (timestamp) => {
       if (!startTimestamp) startTimestamp = timestamp;
       const progress = Math.min((timestamp - startTimestamp) / duration, 1);
       const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out
       const current = start + (end - start) * easeOut;
       
       // Format based on value size
       let formatted;
       if (Math.abs(end) > 100) formatted = current.toLocaleString('id-ID', { maximumFractionDigits: 0 });
       else formatted = current.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
       
       obj.innerHTML = `${prefix}${formatted}${suffix}`;
       
       if (progress < 1) {
           window.requestAnimationFrame(step);
       } else {
           obj.innerHTML = `${prefix}${end > 100 ? end.toLocaleString('id-ID', {maximumFractionDigits:0}) : end.toLocaleString('id-ID', {minimumFractionDigits:2, maximumFractionDigits:2})}${suffix}`;
       }
   };
   window.requestAnimationFrame(step);
}
// Flash Highlight (for price updates)
export function flashUpdate(element, isUp) {
   if (!element) return;
   element.classList.remove('flash-up', 'flash-down');
   void element.offsetWidth; // Trigger reflow
   element.classList.add(isUp ? 'flash-up' : 'flash-down');
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
       return `${escapeHtml(value.slice(0, idx))}<mark style="background:rgba(99,102,241,.22);color:inherit;padding:0 2px;border-radius:3px;">${escapeHtml(value.slice(idx, idx + query.length))}</mark>${escapeHtml(value.slice(idx + query.length))}`;
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
       const renderRow = (item, idx) => `
         <a href="#stock/${item.ticker}" data-idx="${idx}" class="flex justify-between items-center p-3 hover-bg search-suggestion-item" style="border-radius:8px; transition:background 0.2s; ${idx === activeIndex ? 'background:rgba(255,255,255,0.06);' : ''}">
           <div class="flex items-center gap-3" style="min-width:0;">
             <span class="badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">${item.bucket === 'sector' ? 'SC' : item.bucket === 'company' ? 'CO' : 'EQ'}</span>
             <span class="mono strong text-main" style="font-size:15px;">${highlight(item.ticker, query)}</span>
             <span class="text-sm text-muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:330px;">${highlight(item.name || item.sector || 'Ekuitas IDX', query)}</span>
           </div>
           <span class="text-xs text-dim" style="text-transform:uppercase;">${escapeHtml(item.bucket || item.source || '')}</span>
         </a>`;
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
           return;
       }
       const res = await searchStocks(q, 5);
       const items = Array.isArray(res?.data) ? res.data : [];
       renderSuggestions(items, q);
   };
   const moveActive = (delta) => {
       if (!currentItems.length) return;
       activeIndex = Math.max(0, Math.min(currentItems.length - 1, activeIndex + delta));
       const rows = [...suggestions.querySelectorAll('a[data-idx]')];
       rows.forEach((row, idx) => row.style.background = idx === activeIndex ? 'rgba(255,255,255,0.06)' : '');
       rows[activeIndex]?.scrollIntoView({ block: 'nearest' });
   };
   input.addEventListener('input', () => {
       clearTimeout(searchTimer);
       searchTimer = setTimeout(refreshSuggestions, 120);
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
       if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
           e.preventDefault();
           toggle(!overlay.classList.contains('active'));
       }
       if (e.key === 'Escape' && overlay.classList.contains('active')) {
           toggle(false);
       }
   });
   // Close on link click inside search
   overlay.querySelectorAll('a').forEach(a => {
       a.addEventListener('click', () => toggle(false));
   });
}
function setupScrollEffects() {
   const topbar = document.querySelector('.topbar');
   if (!topbar) return;
   window.addEventListener('scroll', () => {
       if (window.scrollY > 20) topbar.classList.add('scrolled');
       else topbar.classList.remove('scrolled');
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
// Running Ticker Setup
async function setupRunningTicker() {
   const tickerContainer = document.getElementById('running-ticker');
   if (!tickerContainer) return;
   const res = await fetchTopMovers(4);
  const rows = Array.isArray(res?.data) && res.data.length ? res.data.slice(0, 4) : [];
  const tickerItems = [...rows, ...rows];
   tickerContainer.innerHTML = tickerItems.map(item => {
       const change = Number(item.change_pct ?? item.change ?? 0);
       const price = item.price == null ? '—' : Number(item.price).toLocaleString('id-ID', { maximumFractionDigits: 0 });
       return `
       <a href="#stock/${item.ticker}" class="tape-card" style="text-decoration:none;">
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
// INIT
document.addEventListener('DOMContentLoaded', () => {
   initTheme();
   lucide.createIcons();
   setupSearchOverlay();
   setupScrollEffects();
   setupRunningTicker();
   refreshTopbarMarket();
   setInterval(refreshTopbarMarket, 60000);
});
// Routing
window.addEventListener('hashchange', () => handleRoute(window.location.hash));
window.addEventListener('DOMContentLoaded', () => handleRoute(window.location.hash || '#dashboard'), { once: true });
if (document.readyState !== 'loading') {
   queueMicrotask(() => handleRoute(window.location.hash || '#dashboard'));
}
