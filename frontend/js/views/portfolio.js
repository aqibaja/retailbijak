import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, savePortfolioPosition, deletePortfolioPosition, showToast, loadTVWidget, getTVTheme } from '../api.js?v=20260518F';
import { observeElements } from '../main.js?v=20260518F';
import { t as _t } from '../i18n.js?v=20260518F';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

// ─── Focus Trap ──────────────────────────────
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// ─── Shared Modal ──────────────────────────────
export function showModal({ title, fields = [], confirmText = t('common.save'), cancelText = t('common.cancel'), onConfirm }) {
  const existing = document.getElementById('stock-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-panel">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <button class="btn btn-icon modal-close-btn" type="button" aria-label="${t('common.close')}"><i data-lucide="x"></i></button>
      </div>
      <form class="modal-fields" onsubmit="return false">${fields.map((f, i) => `
        <div class="mb-4">
          <label class="text-xs text-dim uppercase strong block mb-2">${f.label}</label>
          ${f.type === 'number'
            ? `<input type="number" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" step="${f.step ?? '1'}" min="${f.min ?? ''}" />`
            : `<input type="text" id="modal-field-${i}" class="modal-input" value="${f.value ?? ''}" placeholder="${f.placeholder ?? ''}" />`
          }
        </div>`).join('')}</form>
      <div class="flex gap-3 mt-4">
        <button type="button" class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button type="button" class="btn btn-primary modal-confirm-btn modal-btn">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  if (typeof lucide !== 'undefined') lucide.createIcons();

  return new Promise((resolve) => {
    const close = (resolveVal = null) => {
      overlay.querySelector('.modal-backdrop')?.classList.add('closing');
      overlay.querySelector('.modal-panel')?.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        resolve(resolveVal);
      }, 200);
    };
    overlay.querySelector('.modal-close-btn')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close());
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', async () => {
      const values = fields.map((_, i) => {
        const el = document.getElementById(`modal-field-${i}`);
        return el ? (fields[i].type === 'number' ? Number(el.value) : el.value) : null;
      });
      try {
        const result = await onConfirm(values);
        if (result !== false) {
          close(values);
        }
      } catch (e) {
        console.warn('onConfirm failed', e);
        showToast('Terjadi kesalahan, coba lagi', 'error');
      }
    });
    // Form submit catches Enter key (keyboard + iOS "Go" button)
    overlay.querySelector('.modal-fields')?.addEventListener('submit', (e) => {
      e.preventDefault();
      overlay.querySelector('.modal-confirm-btn')?.click();
    });
    // Escape to close
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
    // Focus first field
    const firstInput = overlay.querySelector('.form-input, .modal-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    // Focus trap
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Confirm Dialog ────────────────────────────
export function showConfirm({ title, message, confirmText = t('common.delete'), cancelText = t('common.cancel'), danger = false }) {
  const existing = document.getElementById('stock-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-panel modal-panel-narrow">
      <div class="text-center py-4">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <p class="text-xs text-muted mt-2 line-height-150">${message}</p>
      </div>
      <div class="flex gap-2 mt-4">
        <button type="button" class="btn modal-cancel-btn modal-btn modal-btn-cancel">${cancelText}</button>
        <button type="button" class="btn modal-confirm-btn modal-btn ${danger ? 'modal-btn-danger' : 'btn-primary'}">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  return new Promise((resolve) => {
    const close = (val) => {
      overlay.querySelector('.modal-backdrop')?.classList.add('closing');
      overlay.querySelector('.modal-panel')?.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        resolve(val);
      }, 200);
    };
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', () => close(true));
    // Escape to close
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close(false);
    });
    // Focus trap
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Render ────────────────────────────────────
export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    document.title = `RetailBijak — ${t('portfolio.title')}`;
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
        <div class="col-span-12 portfolio-header">
          <div class="portfolio-header-copy">
            <div class="portfolio-kicker">${t('portfolio.center_title')}</div>
            <h1>${t('portfolio.assets_watchlist')}</h1>
            <p>${t('portfolio.manage_positions')}</p>
          </div>
          <div class="portfolio-meta-rail">
            <div class="portfolio-tab-switch flex p-1">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''} portfolio-tab-btn">${t('portfolio.portfolio_tab')}</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''} portfolio-tab-btn">${t('portfolio.watchlist_tab')}</a>
            </div>
          </div>
        </div>
        <div id="tab-content" class="col-span-12 panel flex-col portfolio-card">
            <div class="p-4">
              <div class="skeleton skel-text"></div>
              <div class="skeleton skel-text skeleton-text.long"></div>
              <div class="skeleton skeleton-card skeleton-h-80 mt-4"></div>
            </div>
        </div>
      </section>`;
    observeElements();
    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function renderWatchlistTab(el) {
    let data; try { data = await fetchWatchlist(); } catch (e) { data = null; console.warn('fetchWatchlist failed', e); }
    const rows = Array.isArray(data?.data) ? data.data : [];

    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">${t('portfolio.watchlist_entries')} <span class="badge badge-primary ml-2">${rows.length} ${t('portfolio.entries')}</span></h3>
        <button id="add-watchlist" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> ${t('portfolio.add_btn')}</button>
      </div>
      ${rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>${t('portfolio.stock_code')}</th><th>${t('portfolio.notes')}</th><th class="text-right">${t('portfolio.actions')}</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="text-muted text-sm">${r.notes || '-'}</td>
              <td class="text-right"><button type="button" class="btn-icon delete-watchlist portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div id="watchlist-mini-charts" class="portfolio-mini-grid mt-3"></div>` : `
      <div class="empty-state-v2">
        <div class="empty-icon"><i data-lucide="eye" class="watchlist-empty-icon"></i></div>
        <h3>${t('portfolio.empty_watchlist')}</h3>
        <p>${t('portfolio.add_stocks_monitor')}</p>
        <button id="add-watchlist-empty" type="button" class="btn btn-primary mt-12"><i data-lucide="plus" class="lucide-md"></i> ${t('portfolio.add_now')}</button>
      </div>`}`;

    // Watchlist add
    const addBtn = el.querySelector('#add-watchlist') || el.querySelector('#add-watchlist-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        const vals = await showModal({
            title: t('portfolio.add_to_watchlist_title'),
            fields: [{ label: t('portfolio.stock_code_label'), placeholder: t('portfolio.stock_code_placeholder') }, { label: t('portfolio.notes_label'), placeholder: t('portfolio.notes_placeholder') }],
            confirmText: t('portfolio.add_btn'),
            onConfirm: async ([ticker, notes]) => {
                if (!ticker || !ticker.trim()) { showToast(t('portfolio.ticker_required'), 'error'); return false; }
                await saveWatchlistItem({ ticker: ticker.toUpperCase().trim(), notes: notes || '' });
                showToast(`${ticker.toUpperCase()} ${t('portfolio.ticker_added')}`, 'success');
            }
        });
        if (vals) { await renderWatchlistTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    });

    // Watchlist delete
    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: t('portfolio.delete_from_watchlist'), message: `${t('portfolio.confirm_delete_watchlist', { ticker })}`, confirmText: t('portfolio.delete_btn'), danger: true });
            if (ok) {
                try {
                    await deleteWatchlistItem(ticker);
                    showToast(`${ticker} ${t('portfolio.ticker_removed')}`, 'success');
                    await renderWatchlistTab(el);
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } catch (e) {
                    console.warn('deleteWatchlistItem failed', e);
                    showToast(t('portfolio.failed_delete_watchlist', { ticker }), 'error');
                }
            }
        });
    });
    
    // Load TV mini charts for the first 4 watchlist items
    const miniGrid = document.getElementById('watchlist-mini-charts');
    if (miniGrid && rows.length) {
      const watchSymbols = rows.slice(0, 4);
      miniGrid.innerHTML = watchSymbols.map((r, i) => `<div id="tv-mini-${i}" class="portfolio-mini-card"></div>`).join('');
      watchSymbols.forEach((r, i) => {
        setTimeout(() => {
          const containerId = `tv-mini-${i}`;
          loadTVWidget(containerId, 'mini-symbol-overview', {
            symbol: `IDX:${r.ticker.toUpperCase().replace('.JK','')}`,
            width: '100%',
            height: 160,
            dateRange: '3M',
            colorTheme: getTVTheme(),
            isTransparent: false,
            autosize: false,
            chartOnly: false,
            locale: 'id_ID',
          });
        }, i * 200);
      });
    }
}

async function renderPortfolioTab(el) {
    let data; try { data = await fetchPortfolio(); } catch (e) { data = null; console.warn('fetchPortfolio failed', e); }
    const rows = Array.isArray(data?.data) ? data.data : [];

    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">${t('portfolio.active_positions')} <span class="badge badge-primary ml-2">${rows.length} ${t('portfolio.positions')}</span></h3>
        <button id="add-portfolio" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> ${t('portfolio.add_btn')}</button>
      </div>
      ${rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>${t('portfolio.stock_code')}</th><th>${t('portfolio.lots')}</th><th>${t('portfolio.avg_price')}</th><th class="text-right">${t('portfolio.actions')}</th></tr></thead>
          <tbody>${rows.map(r => `
            <tr>
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="mono font-size-14">${r.lots}</td>
              <td class="mono font-size-14 text-muted">Rp ${(r.avg_price || 0).toLocaleString()}</td>
              <td class="text-right"><button type="button" class="btn-icon delete-portfolio portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>` : `
      <div class="empty-state-v2">
        <div class="empty-icon"><i data-lucide="briefcase" class="watchlist-empty-icon"></i></div>
        <h3>${t('portfolio.no_positions_yet')}</h3>
        <p>${t('portfolio.start_tracking')}</p>
        <button id="add-portfolio-empty" type="button" class="btn btn-primary mt-12"><i data-lucide="plus" class="lucide-md"></i> ${t('portfolio.add_position_btn')}</button>
      </div>`}`;

    // Portfolio add
    const addBtn = el.querySelector('#add-portfolio') || el.querySelector('#add-portfolio-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        const vals = await showModal({
            title: t('portfolio.add_position_title'),
            fields: [
                { label: t('portfolio.stock_code_label'), placeholder: t('portfolio.stock_code_placeholder') },
                { label: t('portfolio.lots_label'), type: 'number', value: '1', step: '1', min: '1' },
                { label: t('portfolio.avg_price_label'), type: 'number', value: '1000', step: '100', min: '1' }
            ],
            confirmText: t('portfolio.save_btn'),
            onConfirm: async ([ticker, lots, avgPrice]) => {
                if (!ticker || !ticker.trim()) { showToast(t('portfolio.ticker_required'), 'error'); return false; }
                if (isNaN(lots) || isNaN(avgPrice) || lots <= 0 || avgPrice <= 0) { showToast(t('portfolio.invalid_lots_price'), 'error'); return false; }
                await savePortfolioPosition({ ticker: ticker.toUpperCase().trim(), lots, avg_price: avgPrice });
                showToast(`${ticker.toUpperCase()} ${t('portfolio.ticker_added')}`, 'success');
            }
        });
        if (vals) { await renderPortfolioTab(el); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    });

    // Portfolio delete
    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: t('portfolio.delete_position_confirm'), message: `${t('portfolio.confirm_delete_position', { ticker })}`, confirmText: t('portfolio.delete_btn'), danger: true });
            if (ok) {
                try {
                    await deletePortfolioPosition(ticker);
                    showToast(`${ticker} ${t('portfolio.ticker_removed')}`, 'success');
                    await renderPortfolioTab(el);
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } catch (e) {
                    console.warn('deletePortfolioPosition failed', e);
                    showToast(t('portfolio.failed_delete_position', { ticker }), 'error');
                }
            }
        });
    });
}
