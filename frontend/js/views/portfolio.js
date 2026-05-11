import { fetchWatchlist, saveWatchlistItem, deleteWatchlistItem, fetchPortfolio, fetchPortfolioDividends, savePortfolioPosition, deletePortfolioPosition, showToast, loadTVWidget, getTVTheme, apiFetch } from '../api.js?v=202605120200';
import { money, nf, pf } from '../utils/format.js?v=202605120200';
import { observeElements, flashUpdate } from '../utils/helpers.js?v=202605120200';
import { exportCSV as expCSV } from '../utils/export.js?v=202605120200';

// ─── SSE State ──────────────────────────────
let _wlEventSource = null;   // Watchlist SSE connection
let _pfEventSource = null;   // Portfolio SSE connection

// ─── Alert Polling State (32.2.1) ────────────
let _alertPollTimer = null;  // setInterval handle for alert polling

function stopWatchlistSSE() {
    if (_wlEventSource) {
        _wlEventSource.close();
        _wlEventSource = null;
    }
    // Also stop alert polling when leaving watchlist
    stopAlertPolling();
}

// ─── 32.2.1 — Alert Polling ──────────────────
function stopAlertPolling() {
    if (_alertPollTimer) {
        clearInterval(_alertPollTimer);
        _alertPollTimer = null;
    }
}

async function checkTriggeredAlerts() {
    try {
        const res = await apiFetch('/alerts');
        const alerts = Array.isArray(res?.data) ? res.data : [];
        const triggered = alerts.filter(a => a.triggered || a.status === 'triggered');
        triggered.forEach(a => {
            const condLabel = a.condition === 'price_above' || a.alert_type === 'price_above' ? 'naik di atas' : 'turun di bawah';
            const val = a.value ?? a.target_price ?? 0;
            showToast(`🔔 Alert ${a.ticker}: harga ${condLabel} Rp${Number(val).toLocaleString('id-ID')}`, 'warning', 8000);
        });
    } catch (e) { /* silent — polling should never throw */ }
}

function startAlertPolling() {
    stopAlertPolling();
    // Check immediately on start, then every 5 minutes
    checkTriggeredAlerts();
    _alertPollTimer = setInterval(checkTriggeredAlerts, 5 * 60 * 1000);
}

function stopPortfolioSSE() {
    if (_pfEventSource) {
        _pfEventSource.close();
        _pfEventSource = null;
    }
}

function startWatchlistSSE(tickers) {
    stopWatchlistSSE();
    if (!tickers || !tickers.length) return;
    const url = `${window.location.origin}/api/watchlist/stream?tickers=${tickers.join(',')}`;
    _wlEventSource = new EventSource(url);
    _wlEventSource.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type !== 'update' || !msg.data) return;
            msg.data.forEach(item => {
                if (item.price == null) return;
                // Update watchlist row cells
                const priceEl = document.querySelector(`.wl-price[data-ticker="${item.ticker}"]`);
                const changeEl = document.querySelector(`.wl-change[data-ticker="${item.ticker}"]`);
                const pctEl = document.querySelector(`.wl-change-pct[data-ticker="${item.ticker}"]`);
                if (priceEl) {
                    const oldVal = priceEl._lastPrice;
                    priceEl.textContent = money(item.price);
                    if (oldVal != null && oldVal !== item.price) {
                        flashUpdate(priceEl, item.change >= 0);
                    }
                    priceEl._lastPrice = item.price;
                }
                if (changeEl) {
                    const cls = item.change >= 0 ? 'text-up' : 'text-down';
                    changeEl.className = `mono font-size-14 wl-change ${cls}`;
                    changeEl.textContent = `${item.change >= 0 ? '+' : ''}${nf(item.change, 0)}`;
                }
                if (pctEl) {
                    const cls = item.change_pct >= 0 ? 'text-up' : 'text-down';
                    pctEl.className = `mono font-size-14 wl-change-pct ${cls}`;
                    pctEl.textContent = pf(item.change_pct);
                }
                // Also update portfolio row if present
                const pfPriceEl = document.querySelector(`.pf-price[data-ticker="${item.ticker}"]`);
                if (pfPriceEl) {
                    const oldVal = pfPriceEl._lastPrice;
                    pfPriceEl.textContent = money(item.price);
                    if (oldVal != null && oldVal !== item.price) {
                        flashUpdate(pfPriceEl, item.change >= 0);
                    }
                    pfPriceEl._lastPrice = item.price;
                }
            });
        } catch (e) { /* ignore parse errors */ }
    };
    _wlEventSource.onerror = () => {
        // Auto-reconnect is built into EventSource; just log
        console.warn('Watchlist SSE connection error, will retry...');
    };
}

function startPortfolioSSE(tickers) {
    stopPortfolioSSE();
    if (!tickers || !tickers.length) return;
    const url = `${window.location.origin}/api/watchlist/stream?tickers=${tickers.join(',')}`;
    _pfEventSource = new EventSource(url);
    _pfEventSource.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type !== 'update' || !msg.data) return;
            msg.data.forEach(item => {
                if (item.price == null) return;
                const pfPriceEl = document.querySelector(`.pf-price[data-ticker="${item.ticker}"]`);
                const pfChangeEl = document.querySelector(`.pf-change[data-ticker="${item.ticker}"]`);
                const pfPctEl = document.querySelector(`.pf-change-pct[data-ticker="${item.ticker}"]`);
                if (pfPriceEl) {
                    const oldVal = pfPriceEl._lastPrice;
                    pfPriceEl.textContent = money(item.price);
                    if (oldVal != null && oldVal !== item.price) {
                        flashUpdate(pfPriceEl, item.change >= 0);
                    }
                    pfPriceEl._lastPrice = item.price;
                }
                if (pfChangeEl) {
                    const cls = item.change >= 0 ? 'text-up' : 'text-down';
                    pfChangeEl.className = `mono font-size-14 pf-change ${cls}`;
                    pfChangeEl.textContent = `${item.change >= 0 ? '+' : ''}${nf(item.change, 0)}`;
                }
                if (pfPctEl) {
                    const cls = item.change_pct >= 0 ? 'text-up' : 'text-down';
                    pfPctEl.className = `mono font-size-14 pf-change-pct ${cls}`;
                    pfPctEl.textContent = pf(item.change_pct);
                }
            });
        } catch (e) { /* ignore parse errors */ }
    };
    _pfEventSource.onerror = () => {
        console.warn('Portfolio SSE connection error, will retry...');
    };
}

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
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

// ─── Shared Modal ──────────────────────────────
export function showModal({ title, fields = [], confirmText = 'Simpan', cancelText = 'Batal', onConfirm }) {
  const existing = document.getElementById('stock-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-panel">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-sm strong m-0 text-main">${title}</h3>
        <button class="btn btn-icon modal-close-btn" type="button" aria-label="Tutup"><i data-lucide="x"></i></button>
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
  return new Promise((resolve) => {
    const close = (resolveVal = null) => {
      overlay.querySelector('.modal-backdrop')?.classList.add('closing');
      overlay.querySelector('.modal-panel')?.classList.add('closing');
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; resolve(resolveVal); }, 200);
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
        if (result !== false) close(values);
      } catch (e) { showToast('Terjadi kesalahan, coba lagi', 'error'); }
    });
    overlay.querySelector('.modal-fields')?.addEventListener('submit', (e) => { e.preventDefault(); overlay.querySelector('.modal-confirm-btn')?.click(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    const firstInput = overlay.querySelector('.form-input, .modal-input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Confirm Dialog ────────────────────────────
export function showConfirm({ title, message, confirmText = 'Yakin', cancelText = 'Batal', danger = false }) {
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
    const close = (val) => { overlay.querySelector('.modal-backdrop')?.classList.add('closing'); overlay.querySelector('.modal-panel')?.classList.add('closing'); setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; resolve(val); }, 200); };
    overlay.querySelector('.modal-backdrop')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => close(false));
    overlay.querySelector('.modal-confirm-btn')?.addEventListener('click', () => close(true));
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
    setTimeout(() => trapFocus(overlay), 150);
  });
}

// ─── Render ────────────────────────────────────
export async function renderPortfolio(root, activeTab) {
    const isPort = activeTab === 'portfolio';
    document.title = 'RetailBijak — Portofolio';
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal portfolio-page-pro">
        <div class="col-span-12 portfolio-header">
          <div class="portfolio-header-copy">
            <div class="portfolio-kicker">Pusat Portofolio</div>
            <h1>Aset & Daftar Pantau</h1>
            <p>Kelola posisi aktif dan pantau aset kandidat.</p>
          </div>
          <div class="portfolio-meta-rail">
            <div class="portfolio-tab-switch flex p-1">
              <a href="#portfolio" class="btn ${isPort ? 'btn-primary' : ''} portfolio-tab-btn">Portofolio</a>
              <a href="#watchlist" class="btn ${!isPort ? 'btn-primary' : ''} portfolio-tab-btn">Pantauan</a>
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="wl-news-tab-btn" style="font-size:11px">📰 News</button>
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="rebalance-tab-btn" style="font-size:11px">⚖️ Rebalance</button>
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="perf-chart-btn" style="font-size:11px">📈 Kinerja</button>
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="whatif-tab-btn" style="font-size:11px">🔮 What-If</button>
              <button type="button" class="btn portfolio-tab-btn ${isPort ? '' : ''}" id="dividend-tab-btn" style="font-size:11px">📋 Dividen</button>
              <span id="wl-news-badge" class="badge badge-warning hidden ml-1" style="font-size:9px;padding:1px 5px;align-self:center">0</span>
            </div>
            ${isPort ? '<button class="btn btn-sm" id="export-csv-btn" title="Export CSV"><i data-lucide="download" style="width:16px"></i> CSV</button>' : ''}
            ${isPort ? '<button class="btn btn-sm" id="import-csv-btn" title="Import CSV"><i data-lucide="upload" style="width:16px"></i> Import</button>' : ''}
            ${isPort ? '<button class="btn btn-sm" id="print-portfolio-btn" title="Print Portfolio"><i data-lucide="printer" style="width:16px"></i> Print</button>' : ''}
          </div>
        </div>
        <div id="tab-content" class="col-span-12 panel flex-col portfolio-card">
            <div class="p-4 text-center"><div class="skeleton skel-text skeleton-center"></div></div>
        </div>
      </section>`;
    observeElements();
    // Stop previous SSE connections before rendering new tab
    stopWatchlistSSE();
    stopPortfolioSSE();
    if (isPort) await renderPortfolioTab(root.querySelector('#tab-content'));
    else await renderWatchlistTab(root.querySelector('#tab-content'));
    
    // Rebalance tab handler
    const rebalanceBtn = root.querySelector('#rebalance-tab-btn');
    if (rebalanceBtn) {
      rebalanceBtn.addEventListener('click', () => {
        stopWatchlistSSE();
        stopPortfolioSSE();
        renderRebalanceTab(root.querySelector('#tab-content'));
      });
    }

    // Perf chart handler (18.2)
    const perfBtn = root.querySelector('#perf-chart-btn');
    if (perfBtn) {
      perfBtn.addEventListener('click', () => {
        stopWatchlistSSE();
        stopPortfolioSSE();
        renderPerfChart(root.querySelector('#tab-content'));
      });
    }

    // What-If Simulator tab handler
    const whatifBtn = root.querySelector('#whatif-tab-btn');
    if (whatifBtn) {
      whatifBtn.addEventListener('click', () => {
        stopWatchlistSSE();
        stopPortfolioSSE();
        renderWhatIfTab(root.querySelector('#tab-content'));
      });
    }

    // Dividend tab handler
    const dividendBtn = root.querySelector('#dividend-tab-btn');
    if (dividendBtn) {
      dividendBtn.addEventListener('click', () => {
        stopWatchlistSSE();
        stopPortfolioSSE();
        renderDividendTab(root.querySelector('#tab-content'));
      });
    }

    // Watchlist News tab handler
    const wlNewsBtn = root.querySelector('#wl-news-tab-btn');
    if (wlNewsBtn) {
      wlNewsBtn.addEventListener('click', () => {
        stopWatchlistSSE();
        stopPortfolioSSE();
        renderWatchlistNews(root.querySelector('#tab-content'));
      });
    }

    // Load watchlist news badge count
    loadWatchlistNewsBadge();

    // 31.2.2 — inject floating quick-add FAB when on portfolio tab
    if (isPort) injectQuickAddFAB();
    else removeQuickAddFAB();
}

// ─── P&L Color ─────────────────────────
function pnlClass(v) { return v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-dim'; }
function pnlArrow(v) { return v > 0 ? '▲' : v < 0 ? '▼' : '—'; }
function pnlFmt(v) { return v > 0 ? `+${money(v)}` : money(v); }

async function renderPortfolioTab(el) {
    let data, fetchError;
    try {
        const [posRes, sumRes] = await Promise.all([
            fetchPortfolio(),
            apiFetch('/portfolio/summary').catch(() => null)
        ]);
        data = { positions: posRes, summary: sumRes };
    } catch (e) { fetchError = true; data = null; }

    const rows = Array.isArray(data?.positions?.data) ? data.positions.data : [];
    const summary = data?.summary?.data;
    const hasSummary = summary && summary.positions?.length > 0;

    // KPI cards
    const kpiHtml = hasSummary ? `
      <div class="portfolio-kpi-grid">
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Investasi</span><strong class="portfolio-kpi-value">${money(summary.total_invested)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Nilai Saat Ini</span><strong class="portfolio-kpi-value">${money(summary.current_value)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Untung/Rugi</span><strong class="portfolio-kpi-value ${pnlClass(summary.pnl)}">${pnlFmt(summary.pnl)}</strong></div>
        <div class="portfolio-kpi"><span class="portfolio-kpi-label">Return %</span><strong class="portfolio-kpi-value ${pnlClass(summary.pnl_pct)}">${summary.pnl_pct > 0 ? '+' : ''}${pf(summary.pnl_pct)}</strong></div>
      </div>` : '';

    // Risk metrics card
    const riskHtml = `<div id="risk-metrics-section" class="portfolio-kpi-grid" style="margin-top:12px;display:none">
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Sharpe Ratio</span><strong class="portfolio-kpi-value" id="risk-sharpe">—</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Max Drawdown</span><strong class="portfolio-kpi-value text-down" id="risk-drawdown">—</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Win Rate</span><strong class="portfolio-kpi-value text-up" id="risk-winrate">—</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Return</span><strong class="portfolio-kpi-value" id="risk-totalreturn">—</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Posisi</span><strong class="portfolio-kpi-value" id="risk-positions">—</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Sektor</span><strong class="portfolio-kpi-value" id="risk-sectors">—</strong></div>
    </div>`;
    //
    // Analytics charts container
    const analyticsHtml = `<div id="portfolio-analytics-section" class="portfolio-analytics-grid">
      <div class="portfolio-chart-card" id="equity-curve-card">
        <div class="flex justify-between items-center mb-2">
          <h4 class="text-xs uppercase text-dim strong m-0">Kurva Ekuitas</h4>
          <div class="flex gap-1" id="equity-range-selector">
            <button class="btn btn-xs range-btn active" data-range="1M">1B</button>
            <button class="btn btn-xs range-btn" data-range="3M">3B</button>
            <button class="btn btn-xs range-btn" data-range="6M">6B</button>
            <button class="btn btn-xs range-btn" data-range="1Y">1T</button>
            <button class="btn btn-xs range-btn" data-range="ALL">ALL</button>
          </div>
        </div>
        <div id="equity-curve-chart" style="height:200px"><div class="skeleton skeleton-chart"></div></div>
      </div>
      <div class="portfolio-chart-card">
        <h4 class="text-xs uppercase text-dim strong mb-2">Alokasi Sektor</h4>
        <div id="sector-pie-chart" style="height:200px;display:flex;align-items:center;justify-content:center">
          <div class="text-xs text-dim">Memuat...</div>
        </div>
      </div>
    </div>`;

    // Sector breakdown
    const sectors = summary?.sectors || {};
    const sectorKeys = Object.keys(sectors);
    const sectorHtml = sectorKeys.length ? `
      <div class="portfolio-sector-section">
        <h4 class="text-xs uppercase text-dim strong mb-2">Sektor</h4>
        <div class="portfolio-sector-grid">
          ${sectorKeys.map(s => {
            const sec = sectors[s];
            const cls = pnlClass(sec.pnl);
            return `<div class="portfolio-sector-chip"><span class="portfolio-sector-name">${s}</span><span class="portfolio-sector-weight">${pf(sec.weight)}</span><span class="portfolio-sector-pnl ${cls}">${sec.pnl > 0 ? '+' : ''}${money(sec.pnl)}</span></div>`;
          }).join('')}
        </div>
      </div>` : '';

    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Posisi Aktif <span class="badge badge-primary ml-2">${rows.length} POS</span></h3>
        <button id="add-portfolio" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
        <button id="export-portfolio-csv" type="button" class="btn portfolio-action-btn" style="margin-left:6px"><i data-lucide="download" class="lucide-sm"></i> CSV</button>
      </div>
      ${kpiHtml}
      ${analyticsHtml}
      ${sectorHtml}
      ${fetchError ? `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <strong class="empty-state-title">Gagal Memuat</strong>
        <span class="empty-state-desc">Data portofolio tidak dapat dimuat. Coba refresh halaman.</span>
        <button type="button" class="empty-state-action" onclick="location.reload()"><i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang</button>
      </div>` : rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Sektor</th><th>Lot</th><th>Harga Rata-Rata</th><th>Harga Saat Ini</th><th>Untung/Rugi</th><th>Return %</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => {
            const sumItem = summary?.positions?.find(p => p.ticker === r.ticker);
            const cp = sumItem?.current_price;
            const pnl = sumItem?.pnl;
            const pnlPct = sumItem?.pnl_pct;
            const sector = sumItem?.sector || '';
            return `<tr data-ticker="${r.ticker}">
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="text-xs text-dim">${sector || '—'}</td>
              <td class="mono font-size-14">${r.lots}</td>
              <td class="mono font-size-14 text-muted">${money(r.avg_price)}</td>
              <td class="mono font-size-14 pf-price" data-ticker="${r.ticker}">${cp ? money(cp) : '—'}</td>
              <td class="mono font-size-14 ${pnlClass(pnl)}">${pnl != null ? pnlFmt(pnl) : '—'}</td>
              <td class="mono font-size-14 ${pnlClass(pnlPct)}">${pnlPct != null ? `${pnlPct > 0 ? '+' : ''}${pf(pnlPct)}` : '—'}</td>
              <td class="text-right"><button type="button" class="btn-icon delete-portfolio portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : `
      <div class="empty-state-card">
        <div class="empty-state-icon">📊</div>
        <strong class="empty-state-title">Mulai Portofolio Anda</strong>
        <span class="empty-state-desc">Catat posisi saham yang Anda miliki dan pantau P&amp;L secara real-time. Data tersimpan di akun Anda.</span>
        <div class="mt-8 flex gap-2" style="justify-content:center;flex-wrap:wrap">
          <button id="add-portfolio-empty" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-md"></i> Tambah Posisi</button>
          <a href="#screener" class="btn portfolio-action-btn" style="padding:8px 16px;font-size:12px"><i data-lucide="radar" class="lucide-md"></i> Cari Ide Saham</a>
          <button id="seed-sample-portfolio" type="button" class="btn portfolio-action-btn" style="padding:8px 16px;font-size:12px"><i data-lucide="test-tube" class="lucide-md"></i> Contoh Data</button>
        </div>
        <div class="mt-6 text-xs text-dim" style="max-width:340px;line-height:1.6;text-align:left;padding:12px 16px;background:var(--bg-panel);border-radius:12px;border:1px solid var(--border-subtle)">
          <strong class="text-muted">📊 Contoh Portofolio:</strong><br>
          BBCA — 2 lot @ Rp6.225 (+4.6%) &nbsp;•&nbsp; TLKM — 5 lot @ Rp3.800 (-1.2%)<br>
          <span style="color:var(--text-dim)">Tambahkan posisi Anda untuk lihat grafik equity curve, alokasi sektor, dan P&amp;L.</span>
        </div>
      </div>`}`;

    // Add
    const addBtn = el.querySelector('#add-portfolio') || el.querySelector('#add-portfolio-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        await showModal({
            title: 'Tambah Posisi Portofolio',
            fields: [
                { label: 'Kode Saham', placeholder: 'BBCA' },
                { label: 'Jumlah Lot', type: 'number', value: '1', step: '1', min: '1' },
                { label: 'Harga Rata-Rata (Rp)', type: 'number', value: '1000', step: '100', min: '1' }
            ],
            confirmText: 'Simpan',
            onConfirm: async ([ticker, lots, avgPrice]) => {
                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
                if (isNaN(lots) || isNaN(avgPrice) || lots <= 0 || avgPrice <= 0) { showToast('Lot atau harga tidak valid', 'error'); return false; }
                await savePortfolioPosition({ ticker: ticker.toUpperCase().trim(), lots, avg_price: avgPrice });
                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
            }
        });
    });

    // Seed Sample Data
    const seedBtn = el.querySelector('#seed-sample-portfolio');
    if (seedBtn) seedBtn.addEventListener('click', async () => {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Menambahkan...';
        try {
            const res = await apiFetch('/portfolio/seed-sample', { method: 'POST' });
            if (res?.ok) {
                showToast(res.message || 'Data contoh ditambahkan!', 'success');
                await renderPortfolioTab(el);
            }
        } catch (e) {
            showToast('Gagal menambahkan data contoh', 'error');
            seedBtn.disabled = false;
            seedBtn.innerHTML = '<i data-lucide="test-tube" class="lucide-md"></i> Contoh Data';
        }
    });

    // Export CSV
    const exportBtn = el.querySelector('#export-portfolio-csv');
    if (exportBtn) exportBtn.addEventListener('click', () => {
        const exportRows = rows.map(r => [
            r.ticker || '',
            (r.lots || 0).toString(),
            (r.avg_price || 0).toString(),
            (r.current_price || 0).toString(),
            (r.value || 0).toString(),
            (r.pnl || 0).toString(),
            (r.pnl_pct || 0).toString() + '%',
        ]);
        const headers = ['Ticker', 'Lot', 'Avg Price', 'Current Price', 'Value', 'P&L', 'Return'];
        expCSV(`retailbijak-portfolio-${new Date().toISOString().slice(0,10)}.csv`, headers, exportRows);
        showToast(`${rows.length} posisi diekspor ke CSV`, 'success');
    });

    // Delete
    el.querySelectorAll('.delete-portfolio').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus Posisi?', message: `Yakin ingin menghapus ${ticker} dari portofolio?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                try {
                    await deletePortfolioPosition(ticker);
                    showToast(`${ticker} dihapus`, 'success');
                    await renderPortfolioTab(el);
                } catch (e) { showToast(`Gagal menghapus ${ticker}`, 'error'); }
            }
        });
    });

    // CSV Export handler
    const csvBtn = document.getElementById('export-csv-btn');
    if (csvBtn) {
        csvBtn.addEventListener('click', () => {
            window.location.href = '/api/portfolio/export-csv';
        });
    }

    // 32.3.3 — Print handler
    const printBtn = document.getElementById('print-portfolio-btn');
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });

    // CSV Import handler (17.3)
    const importBtn = document.getElementById('import-csv-btn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,.tsv,.txt';
            input.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                if (lines.length < 2) { showToast('CSV harus memiliki header + minimal 1 baris data', 'error'); return; }
                const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["']/g, ''));
                const tickerIdx = headers.indexOf('ticker');
                const lotsIdx = headers.indexOf('lots');
                const priceIdx = headers.indexOf('avg_price');
                if (tickerIdx === -1 || lotsIdx === -1 || priceIdx === -1) {
                    showToast('CSV harus memiliki kolom: ticker, lots, avg_price', 'error');
                    return;
                }
                const rows = [];
                const errors = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',').map(c => c.trim().replace(/["']/g, ''));
                    if (cols.length < 3) { errors.push(`Baris ${i+1}: format salah`); continue; }
                    const ticker = cols[tickerIdx].toUpperCase();
                    const lots = parseInt(cols[lotsIdx]);
                    const avgPrice = parseFloat(cols[priceIdx]);
                    if (!ticker || isNaN(lots) || isNaN(avgPrice) || lots <= 0 || avgPrice <= 0) {
                        errors.push(`Baris ${i+1}: data tidak valid (${cols.join(',')})`);
                        continue;
                    }
                    rows.push({ ticker, lots, avg_price: avgPrice });
                }
                if (!rows.length) { showToast('Tidak ada data valid untuk diimport', 'error'); return; }
                // Show preview modal
                const previewHtml = rows.slice(0, 20).map(r =>
                    `<div class="flex justify-between px-3 py-1 text-xs" style="border-bottom:1px solid var(--border-subtle)">
                      <span class="mono strong">${r.ticker}</span>
                      <span>${r.lots} lot</span>
                      <span>Rp${r.avg_price.toLocaleString('id-ID')}</span>
                    </div>`
                ).join('');
                const totalHtml = `<div class="flex justify-between px-3 py-2 text-xs text-dim strong">
                  <span>${rows.length} posisi</span>
                  <span>${errors.length ? `${errors.length} error` : ''}</span>
                </div>`;
                // Build inline confirm dialog
                const confirmOverlay = document.createElement('div');
                confirmOverlay.id = 'stock-modal-overlay';
                confirmOverlay.innerHTML = `
                  <div class="modal-backdrop"></div>
                  <div class="modal-panel modal-panel-narrow">
                    <div class="text-center py-4">
                      <h3 class="text-sm strong m-0 text-main">Import ${rows.length} Posisi?</h3>
                      <div class="import-preview" style="max-height:260px;overflow-y:auto;margin-top:12px;border:1px solid var(--border-subtle);border-radius:8px">
                        ${previewHtml}${totalHtml}
                      </div>
                      <p class="text-xs text-muted mt-2">Mode: append (tambah ke posisi existing)</p>
                    </div>
                    <div class="flex gap-2 mt-4">
                      <button type="button" class="btn modal-cancel-btn modal-btn modal-btn-cancel" id="import-cancel-btn">Batal</button>
                      <button type="button" class="btn btn-primary modal-confirm-btn modal-btn" id="import-confirm-btn">Import</button>
                    </div>
                  </div>`;
                document.body.appendChild(confirmOverlay);
                document.body.style.overflow = 'hidden';
                const closeConfirm = (confirmed) => {
                  confirmOverlay.querySelector('.modal-backdrop')?.classList.add('closing');
                  confirmOverlay.querySelector('.modal-panel')?.classList.add('closing');
                  setTimeout(() => { confirmOverlay.remove(); document.body.style.overflow = ''; }, 200);
                  if (!confirmed) return;
                  apiFetch('/portfolio/import-csv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rows, mode: 'append' })
                  }).then(res => {
                    if (res?.ok) {
                      showToast(`✅ ${res.created} posisi diimport`, 'success', 5000);
                      renderPortfolioTab(document.getElementById('tab-content'));
                    } else {
                      showToast(`Gagal import: ${res?.message || 'unknown error'}`, 'error');
                    }
                  });
                };
                confirmOverlay.querySelector('#import-cancel-btn')?.addEventListener('click', () => closeConfirm(false));
                confirmOverlay.querySelector('#import-confirm-btn')?.addEventListener('click', () => closeConfirm(true));
                confirmOverlay.querySelector('.modal-backdrop')?.addEventListener('click', () => closeConfirm(false));
                confirmOverlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeConfirm(false); });
            });
            input.click();
        });
    }

    // Load transaction history
    loadTransactionHistory(el);
    // Load analytics charts
    loadPortfolioAnalytics();
    // loadRebalancing() — handled by rebalance tab click, not auto-load

    // ─── Start live price SSE for portfolio ───
    const pfTickers = rows.map(r => r.ticker).filter(Boolean);
    startPortfolioSSE(pfTickers);
}

async function loadPortfolioAnalytics() {
  const section = document.getElementById('portfolio-analytics-section');
  if (!section) return;

  // ─── 28.2.3 — inject sector-allocation-chart container after equity curve card ───
  if (!document.getElementById('sector-allocation-chart')) {
    const equityCard = document.getElementById('equity-curve-card');
    if (equityCard) {
      const allocCard = document.createElement('div');
      allocCard.className = 'portfolio-chart-card';
      allocCard.innerHTML = `
        <h4 class="text-xs uppercase text-dim strong mb-2">Alokasi Sektor (Pie)</h4>
        <div id="sector-allocation-chart" style="max-width:320px;margin:0 auto">
          <div class="text-xs text-dim" style="padding:20px;text-align:center">Memuat...</div>
        </div>`;
      equityCard.parentNode.insertBefore(allocCard, equityCard.nextSibling);
    }
  }
  // Fire sector allocation chart (independent of analytics endpoint)
  renderSectorAllocation();

  try {
    const data = await apiFetch('/portfolio/analytics');
    if (!data?.has_data) {
      document.getElementById('equity-curve-chart').innerHTML = '<div class="empty-state-v2" style="padding:20px"><p class="text-xs text-dim">Belum ada transaksi untuk grafik</p></div>';
      document.getElementById('sector-pie-chart').innerHTML = '<div class="empty-state-v2" style="padding:20px"><p class="text-xs text-dim">Belum ada posisi</p></div>';
      return;
    }
    // ─── Equity Curve ───
    renderEquityCurve(data.equity_curve || [], data.ihsg_series || [], data.alpha, data.beta);
    // ─── Sector Pie ───
    renderSectorPie(data.sectors || []);
    // ─── Risk Metrics ───
    renderRiskMetrics(data.risk_metrics || {});
    // ─── Monthly Returns ───
    renderMonthlyHeatmap(data.monthly_returns || []);
    // ─── Concentration ───
    if (data.concentration) {
      const sektorEl = document.getElementById('risk-sectors');
      if (sektorEl) sektorEl.textContent = data.concentration.num_sectors + ' (' + data.concentration.top_1_pct + '% terbesar)';
    }
  } catch (e) {
    section.innerHTML = '<div class="empty-state-v2"><p class="text-xs text-dim">Gagal memuat grafik</p></div>';
  }
}

// ─── Risk Metrics & Monthly Returns ───────────────────────────
function renderRiskMetrics(metrics) {
  const section = document.getElementById('risk-metrics-section');
  if (!section) return;
  if (!metrics || !metrics.sharpe_ratio) { section.style.display = 'none'; return; }
  section.style.display = '';
  document.getElementById('risk-sharpe').textContent = metrics.sharpe_ratio > 0 ? metrics.sharpe_ratio : '—';
  document.getElementById('risk-drawdown').textContent = metrics.max_drawdown ? '-' + metrics.max_drawdown + '%' : '—';
  document.getElementById('risk-winrate').textContent = metrics.win_rate ? metrics.win_rate + '%' : '—';
  document.getElementById('risk-totalreturn').textContent = metrics.total_returns ? (metrics.total_returns > 0 ? '+' : '') + metrics.total_returns + '%' : '—';
  document.getElementById('risk-positions').textContent = metrics.total_trades || '—';
  document.getElementById('risk-sectors').textContent = metrics.num_sectors || '—';
  // Colorize
  const sharpe = document.getElementById('risk-sharpe');
  if (metrics.sharpe_ratio > 1) sharpe.className = 'portfolio-kpi-value text-up';
  else if (metrics.sharpe_ratio > 0) sharpe.className = 'portfolio-kpi-value text-warn';
  else sharpe.className = 'portfolio-kpi-value text-down';
}

function renderMonthlyHeatmap(monthly) {
  const grid = document.getElementById('monthly-heatmap-grid');
  const section = document.getElementById('monthly-heatmap-section');
  if (!grid || !section) return;
  if (!monthly || !monthly.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  grid.innerHTML = monthly.map(m => {
    const ret = m['return'];
    const cls = ret > 2 ? 'bg-green-600' : ret > 0.5 ? 'bg-green-400' : ret > -0.5 ? 'bg-neutral' : ret > -2 ? 'bg-red-400' : 'bg-red-600';
    const txt = ret > 0 ? '+' + ret.toFixed(1) : ret.toFixed(1);
    return `<div class="monthly-cell ${cls}" title="${m.month}: ${txt}%" style="width:48px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white">${txt}</div>`;
  }).join('');
}

// ─── 28.2.3 — Sector Allocation Doughnut (Chart.js) ───────────
async function renderSectorAllocation() {
  const container = document.getElementById('sector-allocation-chart');
  if (!container) return;

  let res;
  try {
    res = await apiFetch('/portfolio/sector-allocation');
  } catch (e) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:12px;text-align:center">Gagal memuat alokasi sektor</div>';
    return;
  }

  const sectors = res?.sectors || res?.data?.sectors || [];
  const totalValue = res?.total_value || res?.data?.total_value || 0;
  const isDummy = res?.is_dummy || res?.data?.is_dummy || false;

  if (!sectors.length) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:12px;text-align:center">Belum ada data sektor</div>';
    return;
  }

  // Build canvas
  container.innerHTML = `
    <div style="max-width:320px;margin:0 auto">
      ${isDummy ? '<div class="text-xs text-dim mb-2" style="text-align:center;opacity:0.7">Contoh data — tambah posisi untuk data nyata</div>' : ''}
      <canvas id="sector-alloc-canvas" height="220"></canvas>
      <div id="sector-alloc-legend" style="margin-top:10px;display:flex;flex-direction:column;gap:4px"></div>
    </div>`;

  const canvas = document.getElementById('sector-alloc-canvas');
  if (!canvas) return;

  const labels = sectors.map(s => s.name);
  const values = sectors.map(s => s.value);
  const colors = sectors.map(s => s.color);

  // Wait for Chart.js if not yet loaded
  const getChart = () => new Promise((resolve, reject) => {
    if (window.Chart) { resolve(window.Chart); return; }
    let tries = 0;
    const iv = setInterval(() => {
      if (window.Chart) { clearInterval(iv); resolve(window.Chart); }
      if (++tries > 20) { clearInterval(iv); reject(new Error('Chart.js not loaded')); }
    }, 300);
  });

  let Chart;
  try { Chart = await getChart(); }
  catch (e) {
    // Fallback: CSS conic-gradient pie
    renderSectorPie(sectors);
    return;
  }

  // Destroy previous instance if any
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(0,0,0,0.15)',
        borderWidth: 1,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const s = sectors[ctx.dataIndex];
              return ` ${s.name}: ${s.pct}%  (${money(s.value)})`;
            },
          },
        },
      },
    },
  });

  // Custom legend
  const legend = document.getElementById('sector-alloc-legend');
  if (legend) {
    legend.innerHTML = sectors.map(s => `
      <div style="display:flex;align-items:center;gap:6px;font-size:11px">
        <span style="width:10px;height:10px;border-radius:3px;background:${s.color};flex-shrink:0"></span>
        <span class="text-dim" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
        <span class="strong mono">${s.pct}%</span>
        <span class="text-dim mono" style="font-size:10px">${money(s.value)}</span>
      </div>`).join('');
  }
}

// ─── Sector Pie Chart (CSS conic-gradient, zero dependency) ───
function renderSectorPie(sectors) {
  const container = document.getElementById('sector-pie-chart');
  if (!container) return;
  if (!sectors.length) {
    container.innerHTML = '<div class="text-xs text-dim">Belum ada data</div>';
    return;
  }
  const colors = ['#10b981','#6366f1','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
  const total = sectors.reduce((s, x) => s + x.pct, 0);
  const conicParts = sectors.map((s, i) => {
    const c = colors[i % colors.length];
    return `${c} ${s.pct}%`;
  });
  const gradient = `conic-gradient(${conicParts.join(', ')})`;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;height:100%;width:100%">
      <div style="width:100px;height:100px;border-radius:50%;background:${gradient};flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden">
        ${sectors.map((s, i) => `
          <div style="display:flex;align-items:center;gap:6px;font-size:11px">
            <span style="width:8px;height:8px;border-radius:2px;background:${colors[i % colors.length]};flex-shrink:0"></span>
            <span class="text-dim" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
            <span class="strong mono">${s.pct}%</span>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ─── Equity Curve (LightweightCharts) ───
function renderEquityCurve(data, ihsgData, alpha, beta) {
  const container = document.getElementById('equity-curve-chart');
  if (!container) return;
  if (!data.length) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Belum ada data transaksi</div>';
    return;
  }

  // Filter by active range
  let range = 'ALL';
  const activeBtn = document.querySelector('#equity-range-selector .range-btn.active');
  if (activeBtn) range = activeBtn.dataset.range;

  let filtered = data;
  if (range !== 'ALL') {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range] || 0;
    if (months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      filtered = data.filter(d => new Date(d.date) >= cutoff);
    }
  }

  if (filtered.length < 2) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Data terlalu sedikit untuk grafik</div>';
    return;
  }

  // Filter IHSG to same date range (null-safe)
  const ihsgFiltered = Array.isArray(ihsgData) && ihsgData.length
    ? ihsgData.filter(d => d.date >= filtered[0].date && d.date <= filtered[filtered.length - 1].date)
    : [];

  container.innerHTML = '';
  const W = window.LightweightCharts;
  if (!W || !W.createChart) {
    container.innerHTML = '<div class="text-xs text-dim" style="padding:40px;text-align:center">Memuat chart...</div>';
    const check = setInterval(() => {
      if (window.LightweightCharts?.createChart) {
        clearInterval(check);
        renderEquityCurve(data, ihsgData, alpha, beta);
      }
    }, 500);
    setTimeout(() => clearInterval(check), 10000);
    return;
  }

  const chart = W.createChart(container, {
    height: 200,
    layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#94a3b8' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    crosshair: { mode: 0 },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.08)', visible: true },
    handleScroll: false,
    handleScale: false,
  });

  // Portfolio equity area series
  const series = chart.addAreaSeries({
    lineColor: '#10b981',
    topColor: 'rgba(16,185,129,0.3)',
    bottomColor: 'rgba(16,185,129,0.02)',
    lineWidth: 2,
    priceFormat: { type: 'custom', formatter: (v) => Math.round(v).toLocaleString('id-ID') },
  });

  series.setData(filtered.map(d => ({
    time: d.date.slice(0, 10),
    value: d.value,
  })));

  // IHSG overlay line series (null-safe: skip if empty)
  if (ihsgFiltered.length >= 2) {
    // Normalize IHSG to match portfolio's starting value for visual alignment
    const portBase = filtered[0].value;
    const ihsgBase = ihsgFiltered[0].value; // already normalized to 100
    const scale = portBase / 100; // convert IHSG index (base=100) to portfolio value scale

    const ihsgSeries = chart.addLineSeries({
      color: 'rgba(251,191,36,0.8)',
      lineWidth: 1,
      lineStyle: 1, // dashed (LightweightCharts LineStyle.Dashed = 1)
      title: 'IHSG',
      priceFormat: { type: 'custom', formatter: (v) => Math.round(v).toLocaleString('id-ID') },
      lastValueVisible: true,
      priceLineVisible: false,
    });

    ihsgSeries.setData(ihsgFiltered.map(d => ({
      time: d.date.slice(0, 10),
      value: d.value * scale,
    })));
  }

  chart.timeScale().fitContent();

  // Alpha & Beta KPI cards — render below chart card
  _renderAlphaBetaCards(alpha, beta);

  // Range selector buttons
  document.querySelectorAll('#equity-range-selector .range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#equity-range-selector .range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEquityCurve(data, ihsgData, alpha, beta);
    });
  });
}

// ─── Alpha & Beta KPI cards ───
function _renderAlphaBetaCards(alpha, beta) {
  // Remove any existing cards to avoid duplicates on re-render
  document.getElementById('ihsg-alpha-beta-cards')?.remove();

  const card = document.getElementById('equity-curve-card');
  if (!card) return;

  const fmtAlpha = (v) => {
    if (v == null) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(2);
  };
  const fmtBeta = (v) => {
    if (v == null) return '—';
    return v.toFixed(2);
  };
  const alphaClass = alpha == null ? 'text-dim' : alpha >= 0 ? 'text-up' : 'text-down';
  const betaClass = beta == null ? 'text-dim' : '';

  const div = document.createElement('div');
  div.id = 'ihsg-alpha-beta-cards';
  div.className = 'portfolio-kpi-grid';
  div.style.cssText = 'margin-top:10px;grid-template-columns:repeat(2,1fr)';
  div.innerHTML = `
    <div class="portfolio-kpi">
      <span class="portfolio-kpi-label">Alpha vs IHSG</span>
      <strong class="portfolio-kpi-value ${alphaClass}">${fmtAlpha(alpha)}</strong>
    </div>
    <div class="portfolio-kpi">
      <span class="portfolio-kpi-label">Beta vs IHSG</span>
      <strong class="portfolio-kpi-value ${betaClass}">${fmtBeta(beta)}</strong>
    </div>`;
  card.appendChild(div);
}

async function loadTransactionHistory(el) {
  const container = document.getElementById('transaction-section') || (() => {
    const section = document.createElement('div');
    section.id = 'transaction-section';
    section.className = 'p-4';
    el.appendChild(section);
    return section;
  })();

  try {
    const [txnRes, pnlRes] = await Promise.all([
      fetch('/api/portfolio/transactions').then(r => r.json()).catch(() => null),
      fetch('/api/portfolio/transactions/pnl').then(r => r.json()).catch(() => null),
    ]);
    const txns = Array.isArray(txnRes?.data) ? txnRes.data : [];
    
    const pnlHtml = pnlRes ? `
      <div class="flex gap-4 mb-3 flex-wrap">
        <div class="text-xs"><span class="text-dim">Realized P&L:</span> <strong class="${pnlRes.realized_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.realized_pnl >= 0 ? '+' : ''}${money(pnlRes.realized_pnl)}</strong></div>
        <div class="text-xs"><span class="text-dim">Unrealized P&L:</span> <strong class="${pnlRes.unrealized_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.unrealized_pnl >= 0 ? '+' : ''}${money(pnlRes.unrealized_pnl)}</strong></div>
        <div class="text-xs"><span class="text-dim">Total P&L:</span> <strong class="${pnlRes.total_pnl >= 0 ? 'text-up' : 'text-down'}">${pnlRes.total_pnl >= 0 ? '+' : ''}${money(pnlRes.total_pnl)}</strong></div>
      </div>` : '';

    container.innerHTML = `
      <div class="flex justify-between items-center mt-4 pt-4 border-top-subtle">
        <h4 class="text-xs uppercase text-dim strong">Riwayat Transaksi <span class="badge ml-2">${txns.length} ENTRI</span></h4>
        <button id="add-transaction-btn" type="button" class="btn btn-primary btn-sm"><i data-lucide="plus" class="lucide-sm"></i> Transaksi</button>
      </div>
      ${pnlHtml}
      ${txns.length
        ? `<div class="table-wrapper mt-2">
            <table class="table table-sm">
              <thead><tr><th>Ticker</th><th>Jenis</th><th>Lot</th><th>Harga</th><th>Fee</th><th>Total</th><th>Tanggal</th><th class="text-right">Aksi</th></tr></thead>
              <tbody>${txns.map(t => `
                <tr>
                  <td><span class="mono strong">${t.ticker}</span></td>
                  <td><span class="badge ${t.transaction_type === 'buy' ? 'badge-up' : 'badge-down'}">${t.transaction_type.toUpperCase()}</span></td>
                  <td class="mono">${t.lots}</td>
                  <td class="mono">${money(t.price)}</td>
                  <td class="mono text-dim">${money(t.fee)}</td>
                  <td class="mono">${money(t.total)}</td>
                  <td class="text-xs text-dim">${(t.transaction_date || '').slice(0,10)}</td>
                  <td class="text-right"><button class="btn-icon delete-txn" data-txn-id="${t.id}"><i data-lucide="trash-2" style="width:14px"></i></button></td>
                </tr>`).join('')}</tbody>
            </table>
          </div>`
        : '<div class="text-xs text-dim mt-2">Belum ada transaksi. Klik "Transaksi" untuk mencatat beli/jual.</div>'
      }`;

    // Add transaction button
    const addBtn = document.getElementById('add-transaction-btn');
    if (addBtn) addBtn.addEventListener('click', () => showTransactionForm(el));

    // Delete transaction
    container.querySelectorAll('.delete-txn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.txnId;
        if (!id || !confirm('Hapus transaksi ini?')) return;
        try {
          await fetch(`/api/portfolio/transactions/${id}`, { method: 'DELETE' });
          showToast('Transaksi dihapus', 'success');
          loadTransactionHistory(el);
        } catch (e) { showToast('Gagal menghapus', 'error'); }
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) { console.warn('Transaction history error:', e); }
}

async function showTransactionForm(el) {
  const { showModal } = await import('./portfolio.js?v=202605120200');
  showModal({
    title: 'Catat Transaksi',
    fields: [
      { label: 'Kode Saham', placeholder: 'BBCA' },
      { label: 'Jenis', type: 'select', options: [
        { value: 'buy', label: 'Beli' },
        { value: 'sell', label: 'Jual' },
      ]},
      { label: 'Harga (Rp)', type: 'number', value: '1000', step: '50' },
      { label: 'Jumlah Lot', type: 'number', value: '1', step: '1', min: '1' },
      { label: 'Biaya/Broker (Rp)', type: 'number', value: '0', step: '1000' },
      { label: 'Catatan (opsional)', placeholder: '' },
    ],
    confirmText: 'Simpan',
    onConfirm: async ([ticker, type, price, lots, fee, notes]) => {
      if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
      if (!price || isNaN(price) || price <= 0) { showToast('Harga tidak valid', 'error'); return false; }
      try {
        const res = await fetch('/api/portfolio/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: ticker.toUpperCase().trim(),
            transaction_type: type || 'buy',
            price: parseFloat(price),
            lots: parseInt(lots) || 1,
            fee: parseFloat(fee) || 0,
            notes: notes || '',
          }),
        }).then(r => r.json());
        if (res?.ok) { showToast(res.message, 'success'); loadTransactionHistory(el); }
        else showToast('Gagal', 'error');
      } catch (e) { showToast('Gagal menyimpan', 'error'); }
      return true;
    },
  });
}

// ─── Rebalance (15.4) ──────────────────────────
async function renderRebalanceTab(el) {
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:200px;margin:1rem"></div>';
  
  try {
    const res = await fetch('/api/portfolio/rebalance');
    const data = await res.json();
    
    if (!data || !data.suggestions || data.suggestions.length === 0) {
      el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚖️</div><h3>${data?.message || 'Belum ada data portofolio'}</h3><p>Tambahkan posisi portofolio terlebih dahulu.</p></div>`;
      return;
    }
    
    const total = data.total_value || 0;
    
    el.innerHTML = `
      <div class="rebalance-wrap" style="padding:16px">
        <div class="flex justify-between items-center mb-3">
          <h3 style="margin:0;font-size:1rem;font-weight:800">⚖️ Rebalancing Portofolio</h3>
          <span class="text-xs text-dim">Total: Rp ${total.toLocaleString('id-ID')}</span>
        </div>
        <div class="rebalance-method mb-3" style="font-size:12px;color:var(--text-muted);background:var(--bg-panel);padding:10px 14px;border-radius:10px;border:1px solid var(--border-subtle)">
          Target: <strong>equal-weight antar sektor</strong>. Rekomendasi aksi jika alokasi menyimpang &gt;2% dari target.
        </div>
        <div class="rebalance-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
          ${data.suggestions.map(s => {
            const actionColor = s.action === 'overweight' ? 'var(--up-color)' : s.action === 'underweight' ? 'var(--down-color)' : 'var(--text-dim)';
            const actionIcon = s.action === 'overweight' ? '⬇️ Jual' : s.action === 'underweight' ? '⬆️ Beli' : '✅ Biarkan';
            return `
              <div class="rebalance-card" style="padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle);border-left:3px solid ${actionColor}">
                <div class="flex justify-between items-center mb-2">
                  <strong style="font-size:13px">${s.sector}</strong>
                  <span style="font-size:10px;font-weight:700;color:${actionColor}">${actionIcon}</span>
                </div>
                <div class="rebalance-bar" style="height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden;margin-bottom:8px">
                  <div style="height:100%;width:${Math.min(s.current_pct * 3, 100)}%;background:${actionColor};border-radius:3px"></div>
                </div>
                <div class="flex justify-between text-xs" style="color:var(--text-muted)">
                  <span>Saat ini: <strong style="color:var(--text-main)">${s.current_pct}%</strong></span>
                  <span>Target: <strong style="color:var(--text-main)">${s.target_pct}%</strong></span>
                </div>
                ${s.diff ? `<div class="text-xs mt-1" style="color:${actionColor}">${s.diff > 0 ? '+' : ''}${s.diff.toFixed(1)}% dari target</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="text-xs text-dim mt-3" style="text-align:center">Data berdasarkan harga terakhir. Update posisi untuk rekomendasi akurat.</div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚠️</div><h3>Gagal memuat data</h3><p>${e.message || 'Coba refresh halaman.'}</p><button class="btn btn-primary" onclick="location.reload()">Refresh</button></div>`;
  }
}
async function renderWatchlistTab(el, activeGroupId) {
    let data, groups, fetchError, activeAlerts = [];
    const activeGroup = activeGroupId || 0;
    try {
        const [wlRes, grpRes, alertsRes] = await Promise.all([
            fetchWatchlist(),
            apiFetch('/watchlist-groups'),
            apiFetch('/alerts').catch(() => null),
        ]);
        data = wlRes;
        groups = Array.isArray(grpRes?.data) ? grpRes.data : [];
        activeAlerts = Array.isArray(alertsRes?.data) ? alertsRes.data.filter(a => a.active !== 0) : [];
    } catch (e) { fetchError = true; data = null; groups = []; }
    const allRows = Array.isArray(data?.data) ? data.data : [];
    const rows = activeGroup ? allRows.filter(r => r.group_id === activeGroup) : allRows;
    // Build a Set of tickers that have active alerts for O(1) lookup
    const alertTickerSet = new Set(activeAlerts.map(a => a.ticker));

    // Build group tabs
    const groupTabs = `<div class="watchlist-group-tabs flex gap-1 p-2" style="border-bottom:1px solid var(--border-subtle);overflow-x:auto">
      ${groups.map(g => `
        <button class="btn btn-xs grp-tab ${g.id === (activeGroup || 0) ? 'active' : ''}" data-grp-id="${g.id}" style="flex-shrink:0">
          ${g.icon !== 'folder' ? `<i data-lucide="${g.icon}" style="width:12px"></i>` : ''} ${g.name}
        </button>
      `).join('')}
      <button class="btn btn-xs grp-mgr" id="btn-manage-groups" style="flex-shrink:0;margin-left:auto" title="Kelola grup"><i data-lucide="settings" style="width:12px"></i></button>
    </div>`;
    el.innerHTML = `
      <div class="flex justify-between items-center p-4 border-bottom-subtle">
        <h3 class="text-xs uppercase text-dim strong m-0 portfolio-section-header">Daftar Pantau <span class="badge badge-primary ml-2">${rows.length} ENTRI</span></h3>
        <div class="flex gap-2">
          <button id="add-watchlist" type="button" class="btn btn-primary portfolio-action-btn"><i data-lucide="plus" class="lucide-sm"></i> Tambah</button>
          <button id="btn-compare-watchlist" type="button" class="btn portfolio-action-btn"><i data-lucide="bar-chart-3" class="lucide-sm"></i> Bandingkan</button>
        </div>
      </div>
        ${groupTabs}
      ${fetchError ? `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <strong class="empty-state-title">Gagal Memuat</strong>
        <span class="empty-state-desc">Data tidak dapat dimuat. Coba refresh halaman.</span>
        <button type="button" class="empty-state-action" onclick="location.reload()"><i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang</button>
      </div>` : rows.length ? `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Kode Saham</th><th>Harga</th><th>Change</th><th>Change %</th><th>Catatan</th><th class="text-right">Aksi</th></tr></thead>
          <tbody>${rows.map(r => `\n            <tr class="watchlist-row" data-ticker="${r.ticker}" role="button" tabindex="0">
              <td><a href="#stock/${r.ticker}" class="flex items-center gap-3"><span class="portfolio-row-kicker">${r.ticker.substring(0,2)}</span><span class="mono strong text-main search-suggestion-ticker">${r.ticker}</span></a></td>
              <td class="mono font-size-14 wl-price" data-ticker="${r.ticker}">—</td>
              <td class="mono font-size-14 wl-change" data-ticker="${r.ticker}">—</td>
              <td class="mono font-size-14 wl-change-pct" data-ticker="${r.ticker}">—</td>
              <td class="text-muted text-sm">${r.notes || '-'}</td>
              <td class="text-right" style="white-space:nowrap">
                <button type="button" class="btn-icon wl-alert-toggle" data-ticker="${r.ticker}" title="Set Price Alert" style="color:${alertTickerSet.has(r.ticker) ? 'var(--warning-color,#f59e0b)' : 'var(--text-dim)'}">
                  <i data-lucide="${alertTickerSet.has(r.ticker) ? 'bell-ring' : 'bell'}" class="lucide-md"></i>
                </button>
                <button type="button" class="btn-icon delete-watchlist portfolio-delete-btn" data-ticker="${r.ticker}"><i data-lucide="trash-2" class="lucide-md"></i></button>
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <div id="watchlist-mini-charts" class="portfolio-mini-grid mt-3"></div>` : `
      <div class="empty-state-card">
        <div class="empty-state-icon">👁️</div>
        <strong class="empty-state-title">Daftar Pantau Kosong</strong>
        <span class="empty-state-desc">Tambahkan saham untuk mulai memantau pergerakan dan sinyal.</span>
        <button id="add-watchlist-empty" type="button" class="empty-state-action"><i data-lucide="plus" class="lucide-md"></i> Tambah Sekarang</button>
      </div>`}`;
    
    // Group tab handlers
    // Compare watchlist button
    document.getElementById('btn-compare-watchlist')?.addEventListener('click', () => {
      const tickers = allRows.map(r => r.ticker).filter(Boolean);
      if (tickers.length < 2) { showToast('Minimal 2 saham untuk dibandingkan', 'warning'); return; }
      window.location.hash = '#compare/' + tickers.join('+');
    });

    // Group select change handler
    el.querySelectorAll('.wl-group-select').forEach(sel => {
      btn.addEventListener('click', async () => {
        const gid = parseInt(btn.dataset.grpId) || 0;
        // Re-render with this group active
        await renderWatchlistTab(el, gid);
      });
    });
    // Manage groups button
    document.getElementById('btn-manage-groups')?.addEventListener('click', () => showManageGroupsDialog(el));

    const addBtn = el.querySelector('#add-watchlist') || el.querySelector('#add-watchlist-empty');
    if (addBtn) addBtn.addEventListener('click', async () => {
        const vals = await showModal({
            title: 'Tambah Saham ke Pantauan',
            fields: [{ label: 'Kode Saham', placeholder: 'BBCA' }, { label: 'Catatan (opsional)', placeholder: 'Target swing' }],
            confirmText: 'Tambah',
            onConfirm: async ([ticker, notes]) => {
                if (!ticker || !ticker.trim()) { showToast('Kode saham wajib diisi', 'error'); return false; }
                await saveWatchlistItem({ ticker: ticker.toUpperCase().trim(), notes: notes || '' });
                showToast(`${ticker.toUpperCase()} ditambahkan`, 'success');
            }
        });
    });

    el.querySelectorAll('.delete-watchlist').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const ticker = e.currentTarget.getAttribute('data-ticker');
            const ok = await showConfirm({ title: 'Hapus dari Pantauan?', message: `Yakin ingin menghapus ${ticker}?`, confirmText: 'Hapus', danger: true });
            if (ok) {
                try { await deleteWatchlistItem(ticker); showToast(`${ticker} dihapus`, 'success'); await renderWatchlistTab(el); }
                catch (e) { showToast(`Gagal menghapus ${ticker}`, 'error'); }
            }
        });
    });

    // ─── 32.2.1 — Watchlist Price Alert Mini-Modal ───
    el.querySelectorAll('.wl-alert-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ticker = btn.dataset.ticker;
        if (!ticker) return;

        // Remove any existing alert modal
        document.getElementById('wl-alert-modal')?.remove();

        // Fetch current alerts for this ticker
        let existingAlert = null;
        try {
          const alertsRes = await apiFetch('/alerts');
          const all = Array.isArray(alertsRes?.data) ? alertsRes.data : [];
          existingAlert = all.find(a => a.ticker === ticker && a.active !== 0) || null;
        } catch (e) { /* proceed without existing data */ }

        // Get current price for placeholder
        let currentPrice = 0;
        try {
          const stockRes = await apiFetch(`/stocks/${ticker}`);
          currentPrice = stockRes?.close || stockRes?.price || 0;
        } catch (e) { /* ignore */ }

        const defaultPrice = existingAlert
          ? (existingAlert.value ?? existingAlert.target_price ?? currentPrice)
          : (currentPrice > 0 ? Math.round(currentPrice * 1.05) : '');
        const defaultCond = existingAlert
          ? (existingAlert.condition || existingAlert.alert_type || 'price_above')
          : 'price_above';

        // Build mini-modal
        const modal = document.createElement('div');
        modal.id = 'wl-alert-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease';
        modal.innerHTML = `
          <div style="background:var(--card-bg,#1a1a2e);border-radius:16px;padding:24px;min-width:300px;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);position:relative">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h3 style="margin:0;font-size:14px;font-weight:700;color:var(--text-main)">🔔 Price Alert — <span class="mono">${ticker}</span></h3>
              <button type="button" id="wl-alert-close" style="background:none;border:none;font-size:20px;color:var(--text-dim);cursor:pointer;line-height:1;padding:0">&times;</button>
            </div>
            ${currentPrice > 0 ? `<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px">Harga saat ini: <strong style="color:var(--text-main)">Rp${currentPrice.toLocaleString('id-ID')}</strong></div>` : ''}
            <form id="wl-alert-form" onsubmit="return false">
              <div style="margin-bottom:12px">
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Kondisi</label>
                <select id="wl-alert-condition" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color,#0f0f1a);color:var(--text-main);font-size:13px;box-sizing:border-box">
                  <option value="price_above" ${defaultCond === 'price_above' ? 'selected' : ''}>📈 Harga naik di atas</option>
                  <option value="price_below" ${defaultCond === 'price_below' ? 'selected' : ''}>📉 Harga turun di bawah</option>
                </select>
              </div>
              <div style="margin-bottom:18px">
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Target Harga (Rp)</label>
                <input type="number" id="wl-alert-price" value="${defaultPrice}" min="1" step="1"
                  style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color,#0f0f1a);color:var(--text-main);font-size:14px;font-weight:700;box-sizing:border-box" />
              </div>
              <div style="display:flex;gap:10px">
                ${existingAlert ? `<button type="button" id="wl-alert-delete" class="btn" style="flex:1;font-size:12px;color:var(--down-color,#ef4444)">🗑️ Hapus Alert</button>` : ''}
                <button type="submit" id="wl-alert-save" class="btn btn-primary" style="flex:2;font-size:13px;font-weight:700">🔔 Set Alert</button>
              </div>
            </form>
          </div>`;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const closeModal = () => { modal.remove(); document.body.style.overflow = ''; };
        modal.querySelector('#wl-alert-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal(); });
        modal.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });
        setTimeout(() => modal.querySelector('#wl-alert-price')?.focus(), 100);

        // Delete existing alert
        modal.querySelector('#wl-alert-delete')?.addEventListener('click', async () => {
          if (!existingAlert?.id) return;
          try {
            await apiFetch(`/alerts/${existingAlert.id}`, { method: 'DELETE' });
            showToast(`${ticker}: alert dihapus`, 'success');
            btn.style.color = 'var(--text-dim)';
            btn.querySelector('i')?.setAttribute('data-lucide', 'bell');
            if (window.lucide) lucide.createIcons();
            closeModal();
          } catch (err) { showToast('Gagal menghapus alert', 'error'); }
        });

        // Save / update alert
        modal.querySelector('#wl-alert-form').addEventListener('submit', async () => {
          const condition = modal.querySelector('#wl-alert-condition').value;
          const targetPrice = Number(modal.querySelector('#wl-alert-price').value);
          if (!targetPrice || targetPrice <= 0) { showToast('Target harga tidak valid', 'error'); return; }

          const saveBtn = modal.querySelector('#wl-alert-save');
          saveBtn.disabled = true;
          saveBtn.textContent = 'Menyimpan...';

          try {
            let res;
            if (existingAlert?.id) {
              // Update existing alert
              res = await apiFetch(`/alerts/${existingAlert.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condition, alert_type: condition, value: targetPrice, active: 1 }),
              });
            } else {
              // Create new alert — POST /api/alerts
              res = await apiFetch('/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, condition, value: targetPrice }),
              });
            }

            if (res?.ok || res?.id || res?.data) {
              const condLabel = condition === 'price_above' ? 'naik di atas' : 'turun di bawah';
              showToast(`🔔 Alert ${ticker}: ${condLabel} Rp${targetPrice.toLocaleString('id-ID')}`, 'success');
              // Update bell icon to yellow
              btn.style.color = 'var(--warning-color,#f59e0b)';
              btn.querySelector('i')?.setAttribute('data-lucide', 'bell-ring');
              if (window.lucide) lucide.createIcons();
              closeModal();
            } else {
              showToast(res?.message || 'Gagal menyimpan alert', 'error');
              saveBtn.disabled = false;
              saveBtn.textContent = '🔔 Set Alert';
            }
          } catch (err) {
            showToast('Gagal menyimpan alert', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '🔔 Set Alert';
          }
        });
      });
    });

    // ─── Watchlist Context Menu (right-click) ─────
    const CONTEXT_ITEMS = [
      { label: '🔔 Buat Alert', icon: 'bell-plus', action: (ticker) => { window.location.hash = `#alerts?ticker=${ticker}`; } },
      { label: '📊 Bandingkan', icon: 'bar-chart-3', action: (ticker) => { window.location.hash = `#compare/${ticker}`; } },
      { label: '📈 Buka Detail', icon: 'chart-candlestick', action: (ticker) => { window.location.hash = `#stock/${ticker}`; } },
      { label: '🗑️ Hapus', icon: 'trash-2', action: async (ticker, el) => {
        const ok = await showConfirm({ title: 'Hapus dari Pantauan?', message: `Yakin ingin menghapus ${ticker}?`, confirmText: 'Hapus', danger: true });
        if (ok) { await deleteWatchlistItem(ticker); showToast(`${ticker} dihapus`, 'success'); await renderWatchlistTab(el); }
      }},
    ];

    el.querySelectorAll('.watchlist-row').forEach(row => {
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const ticker = row.dataset.ticker;
        if (!ticker) return;

        // Remove any existing context menu
        document.querySelectorAll('.wl-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'wl-context-menu';
        menu.innerHTML = CONTEXT_ITEMS.map(item =>
          `<button type="button" class="wl-context-item" data-action="${item.label}">
            ${item.label}
          </button>`
        ).join('');
        menu.style.position = 'fixed';
        menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
        menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
        document.body.appendChild(menu);

        // Close menu on click outside
        const closeMenu = (ev) => {
          if (!menu.contains(ev.target) && !row.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);

        // Wire actions
        menu.querySelectorAll('.wl-context-item').forEach(btn => {
          btn.addEventListener('click', async () => {
            const item = CONTEXT_ITEMS.find(i => i.label === btn.dataset.action);
            if (item) await item.action(ticker, el);
            menu.remove();
          });
        });
      });
    });

    // TV mini charts
    const miniGrid = document.getElementById('watchlist-mini-charts');
    if (miniGrid && rows.length) {
      const watchSymbols = rows.slice(0, 4);
      miniGrid.innerHTML = watchSymbols.map((r, i) => `<div id="tv-mini-${i}" class="portfolio-mini-card"></div>`).join('');
      watchSymbols.forEach((r, i) => {
        setTimeout(() => {
          loadTVWidget(`tv-mini-${i}`, 'mini-symbol-overview', {
            symbol: `IDX:${r.ticker.toUpperCase().replace('.JK','')}`, width: '100%', height: 160,
            dateRange: '3M', colorTheme: getTVTheme(), isTransparent: false, autosize: false,
            chartOnly: false, locale: 'id_ID',
          });
        }, i * 200);
      });
    }

    // ─── Start live price SSE ───
    const watchTickers = rows.map(r => r.ticker).filter(Boolean);
    startWatchlistSSE(watchTickers);

    // ─── 32.2.1 — Start alert polling (every 5 min) ───
    startAlertPolling();
}

// ─── Manage Watchlist Groups (19.4) ──────────
async function showManageGroupsDialog(el) {
  try {
    const grpRes = await apiFetch('/watchlist-groups');
    let groups = Array.isArray(grpRes?.data) ? grpRes.data : [];

    const renderList = () => groups.map((g, i) => `
      <div class="flex items-center gap-1 p-2 border-bottom-subtle group-row" data-gid="${g.id}" data-idx="${i}">
        <div class="flex flex-col gap-0" style="flex-shrink:0">
          <button class="btn-icon group-move-up" data-gid="${g.id}" ${i === 0 ? 'disabled style="opacity:0.3"' : ''}><i data-lucide="chevron-up" class="lucide-xs"></i></button>
          <button class="btn-icon group-move-down" data-gid="${g.id}" ${i === groups.length - 1 ? 'disabled style="opacity:0.3"' : ''}><i data-lucide="chevron-down" class="lucide-xs"></i></button>
        </div>
        <span class="mono strong text-sm text-main group-name-display" style="flex:1;cursor:pointer" title="Klik untuk rename">${g.name}</span>
        <span class="text-xs text-dim">${g.count} item</span>
        <button class="btn-icon group-rename-btn" data-gid="${g.id}" title="Rename"><i data-lucide="edit-3" class="lucide-sm"></i></button>
        <button class="btn-icon delete-group" data-gid="${g.id}" title="Hapus" ${g.count > 0 ? `onclick="showToast('Pindahkan item dulu sebelum hapus grup', 'warning')"` : ''}><i data-lucide="trash-2" class="lucide-sm"></i></button>
      </div>
    `).join('');

    const buildOverlay = () => {
      const listHtml = renderList();
      return `<div class="modal-backdrop"></div>
        <div class="modal-panel" style="width:min(420px,90vw)">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-sm strong m-0">Kelola Grup Pantauan</h3>
            <button class="btn-icon modal-close-btn"><i data-lucide="x"></i></button>
          </div>
          <div class="flex gap-2 mb-3">
            <input type="text" id="new-group-name" class="form-input" placeholder="Nama grup baru" style="flex:1" />
            <button class="btn btn-primary btn-sm" id="btn-create-group">Buat</button>
          </div>
          <div id="group-list" class="flex flex-col" style="max-height:300px;overflow-y:auto">${listHtml || '<div class="text-xs text-dim p-3">Belum ada grup</div>'}</div>
          <div class="flex gap-2 mt-3 pt-3" style="border-top:1px solid var(--border-subtle)">
            <button class="btn btn-sm scanner-control-btn" id="btn-save-order" style="flex:1">💾 Simpan Urutan</button>
          </div>
        </div>`;
    };

    const overlay = document.createElement('div');
    overlay.id = 'stock-modal-overlay';
    overlay.innerHTML = buildOverlay();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    const close = () => { overlay.remove(); document.body.style.overflow = ''; };
    overlay.querySelector('.modal-backdrop').addEventListener('click', close);
    overlay.querySelector('.modal-close-btn').addEventListener('click', close);

    // Create group
    overlay.querySelector('#btn-create-group').addEventListener('click', async () => {
      const name = overlay.querySelector('#new-group-name').value.trim();
      if (!name) return;
      await apiFetch('/watchlist-groups', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
      close();
      await renderWatchlistTab(el);
    });

    // Rename inline
    overlay.querySelectorAll('.group-rename-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.group-row');
        if (!row) return;
        const display = row.querySelector('.group-name-display');
        const gid = btn.dataset.gid;
        const currentName = display.textContent.trim();
        // Replace display with input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.style.cssText = 'flex:1;font-size:12px;padding:2px 6px';
        input.value = currentName;
        display.replaceWith(input);
        input.focus();
        input.select();
        const saveRename = async () => {
          const newName = input.value.trim();
          if (newName && newName !== currentName) {
            await apiFetch(`/watchlist-groups/${gid}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name: newName}) });
            showToast(`Grup diganti jadi "${newName}"`, 'success');
          }
          close();
          await renderWatchlistTab(el);
        };
        input.addEventListener('blur', saveRename);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
      });
    });

    // Delete groups — only if empty
    overlay.querySelectorAll('.delete-group').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gid = btn.dataset.gid;
        if (gid === '1') { showToast('Tidak bisa hapus grup default', 'warning'); return; }
        const row = btn.closest('.group-row');
        const countEl = row?.querySelector('.text-dim');
        const count = countEl ? parseInt(countEl.textContent) || 0 : 0;
        if (count > 0) {
          showToast('Pindahkan item dulu sebelum hapus grup', 'warning');
          return;
        }
        await apiFetch(`/watchlist-groups/${gid}`, { method: 'DELETE' });
        close();
        await renderWatchlistTab(el);
      });
    });

    // Move up/down (client-side reorder only)
    const doMove = (gid, direction) => {
      const idx = groups.findIndex(g => g.id == gid);
      if (idx < 0) return;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= groups.length) return;
      [groups[idx], groups[newIdx]] = [groups[newIdx], groups[idx]];
      const listEl = overlay.querySelector('#group-list');
      if (listEl) listEl.innerHTML = renderList();
      // Re-bind events
      bindGroupEvents();
    };

    overlay.querySelectorAll('.group-move-up').forEach(btn => {
      btn.addEventListener('click', () => doMove(btn.dataset.gid, -1));
    });
    overlay.querySelectorAll('.group-move-down').forEach(btn => {
      btn.addEventListener('click', () => doMove(btn.dataset.gid, 1));
    });

    // Save order
    overlay.querySelector('#btn-save-order').addEventListener('click', async () => {
      const order = groups.map(g => g.id);
      await apiFetch('/watchlist-groups/reorder', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({order}) });
      showToast('Urutan grup disimpan', 'success');
      close();
      await renderWatchlistTab(el);
    });

    function bindGroupEvents() {
      // Re-bind rename
      overlay.querySelectorAll('.group-rename-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const row = btn.closest('.group-row');
          if (!row) return;
          const display = row.querySelector('.group-name-display');
          const gid = btn.dataset.gid;
          const currentName = display.textContent.trim();
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'form-input';
          input.style.cssText = 'flex:1;font-size:12px;padding:2px 6px';
          input.value = currentName;
          display.replaceWith(input);
          input.focus();
          input.select();
          const saveRename = async () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
              await apiFetch(`/watchlist-groups/${gid}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name: newName}) });
              showToast(`Grup diganti jadi "${newName}"`, 'success');
            }
            close();
            await renderWatchlistTab(el);
          };
          input.addEventListener('blur', saveRename);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        });
      });
      // Re-bind delete
      overlay.querySelectorAll('.delete-group').forEach(btn => {
        btn.addEventListener('click', async () => {
          const gid = btn.dataset.gid;
          if (gid === '1') { showToast('Tidak bisa hapus grup default', 'warning'); return; }
          const row = btn.closest('.group-row');
          const countEl = row?.querySelector('.text-dim');
          const count = countEl ? parseInt(countEl.textContent) || 0 : 0;
          if (count > 0) { showToast('Pindahkan item dulu sebelum hapus grup', 'warning'); return; }
          await apiFetch(`/watchlist-groups/${gid}`, { method: 'DELETE' });
          close();
          await renderWatchlistTab(el);
        });
      });
      // Re-bind move up/down
      overlay.querySelectorAll('.group-move-up').forEach(btn => {
        btn.addEventListener('click', () => doMove(btn.dataset.gid, -1));
      });
      overlay.querySelectorAll('.group-move-down').forEach(btn => {
        btn.addEventListener('click', () => doMove(btn.dataset.gid, 1));
      });
    }

  } catch (e) {
    showToast('Gagal memuat grup', 'error');
  }
}

// ─── 15.8.2 — Watchlist News Widget ───────────────
async function renderWatchlistNews(el) {
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:200px;margin:1rem"></div>';
  try {
    const res = await fetch('/api/news/watchlist?limit=20');
    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];

    if (!items.length) {
      el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">📰</div>
        <h3>Belum Ada Berita</h3>
        <p>${data?.source === 'fallback_all' ? 'Belum ada berita terbaru. Coba lagi nanti.' : 'Tambah saham ke daftar pantau untuk melihat berita khusus.'}</p>
        <button class="btn btn-primary empty-state-action" onclick="window.location.hash='#watchlist'">➕ Tambah ke Pantauan</button>
      </div>`;
      return;
    }

    el.innerHTML = `
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xs uppercase text-dim strong m-0">📰 Berita Pantauan <span class="badge badge-primary ml-2">${items.length}</span></h3>
          <button type="button" class="btn btn-sm scanner-control-btn" id="wl-news-refresh" title="Refresh">🔄</button>
        </div>
        <div class="flex flex-col gap-2" style="max-height:70vh;overflow-y:auto">
          ${items.map(n => {
            const tickers = n.tickers || '';
            const date = n.published_at ? new Date(n.published_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
            const sentimentIcon = n.sentiment === 'positive' ? '🟢' : n.sentiment === 'negative' ? '🔴' : '⚪';
            return `<a href="${n.link || '#'}" target="_blank" class="wl-news-card" style="display:flex;gap:10px;padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-subtle);text-decoration:none;transition:background .15s" onmouseover="this.style.background='var(--bg-panel)'" onmouseout="this.style.background=''">
              <div style="flex:1;min-width:0">
                <div class="text-xs strong text-main mb-1" style="line-height:1.4">${n.title || '(tanpa judul)'}</div>
                <div class="text-xs text-dim mb-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n.summary || ''}</div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs text-muted">${n.source || ''}</span>
                  <span class="text-xs text-dim">${date}</span>
                  ${sentimentIcon ? `<span style="font-size:10px">${sentimentIcon}</span>` : ''}
                  ${tickers ? tickers.split(',').map(t => `<span class="badge" style="font-size:9px;padding:1px 5px">${t.trim()}</span>`).join('') : ''}
                </div>
              </div>
              ${n.image_url ? `<img src="${n.image_url}" alt="" style="width:60px;height:60px;border-radius:6px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'" />` : ''}
            </a>`;
          }).join('')}
        </div>
      </div>`;
    // Refresh handler
    document.getElementById('wl-news-refresh')?.addEventListener('click', () => renderWatchlistNews(el));
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (e) {
    el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚠️</div><h3>Gagal Memuat</h3><p>${e.message || 'Coba refresh halaman.'}</p></div>`;
  }
}

// ─── 15.8.3 — Watchlist News Badge ───────────────
async function loadWatchlistNewsBadge() {
  try {
    const res = await fetch('/api/news/watchlist?limit=1');
    const data = await res.json();
    const count = data?.count || 0;
    const badge = document.getElementById('wl-news-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (e) { /* silent */ }
}

// ─── 18.2 — Portfolio Performance Chart ────────
async function renderPerfChart(el) {
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:320px;margin:1rem"></div>';
  try {
    const res = await apiFetch('/portfolio/analytics');
    const equity = res?.equity_curve;
    const benchmark = res?.benchmark_curve;
    if (!equity || !equity.length) {
      el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">📈</div><h3>Belum Ada Data Kinerja</h3><p>Tambah transaksi portofolio dulu untuk melihat grafik performa.</p><button class="btn btn-primary empty-state-action" onclick="window.location.hash='#portfolio'">➕ Tambah Posisi</button></div>`;
      return;
    }

    const firstVal = equity[0].value;
    const lastVal = equity[equity.length - 1].value;
    const totalReturn = firstVal > 0 ? ((lastVal - firstVal) / firstVal * 100) : 0;
    const retClass = totalReturn >= 0 ? 'text-up' : 'text-down';
    const retSign = totalReturn >= 0 ? '+' : '';

    el.innerHTML = `
      <div class="p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xs uppercase text-dim strong m-0">📈 Kinerja Portofolio</h3>
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1 text-xs"><span style="width:10px;height:3px;border-radius:2px;background:#10b981;display:inline-block"></span> Portofolio <strong class="${retClass} mono">${retSign}${totalReturn.toFixed(2)}%</strong></span>
            ${benchmark && benchmark.length >= 2 ? `<span class="flex items-center gap-1 text-xs"><span style="width:10px;height:2px;border-radius:1px;background:#6366f1;display:inline-block"></span> Rerata <strong class="mono text-muted">—</strong></span>` : ''}
          </div>
        </div>
        <div id="perf-chart-container" style="height:300px;width:100%"></div>
        <div class="flex justify-between mt-2 text-xs text-dim">
          <span>${equity[0].date}</span>
          <span>Rp ${firstVal.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
          <span>→</span>
          <span>Rp ${lastVal.toLocaleString('id-ID', {maximumFractionDigits:0})}</span>
          <span>${equity[equity.length - 1].date}</span>
        </div>
      </div>`;

    // Render chart with LightweightCharts
    const container = document.getElementById('perf-chart-container');
    if (!container || typeof LightweightCharts === 'undefined') return;

    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: 'transparent' },
        textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderVisible: false, timeVisible: false },
      handleScroll: false,
      handleScale: false,
      width: container.clientWidth,
      height: 300,
    });

    const lineSeries = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      priceFormat: { type: 'custom', formatter: (v) => 'Rp ' + Math.round(v).toLocaleString('id-ID') },
    });

    lineSeries.setData(equity.map(p => ({
      time: p.date,
      value: p.value,
    })));

    // Benchmark overlay (19.2)
    if (benchmark && benchmark.length >= 2) {
      const benchSeries = chart.addLineSeries({
        color: '#6366f1',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        crosshairMarkerVisible: false,
        title: 'Rerata Portofolio',
        priceFormat: { type: 'custom', formatter: (v) => v.toFixed(1) },
      });
      benchSeries.setData(benchmark.map(p => ({
        time: p.date,
        value: p.value,
      })));
    }

    chart.timeScale().fitContent();
  } catch (e) {
    el.innerHTML = `<div class="empty-state-card"><div class="empty-icon">⚠️</div><h3>Gagal Memuat Grafik</h3><p>${e.message || 'Coba refresh halaman.'}</p></div>`;
  }
}

// ─── What-If Simulator ──────────────────────────
export async function renderWhatIfTab(el) {
  if (!el) return;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="whatif-wrap" style="padding:16px;max-width:640px;margin:0 auto">
      <h3 style="margin:0 0 4px;font-size:1rem;font-weight:800">🔮 What-If Simulator</h3>
      <p class="text-sm text-dim" style="margin:0 0 16px">Simulasikan hypothetical buy/sell untuk lihat potensi return.</p>
      <form id="whatif-form" class="flex flex-col gap-3">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-dim strong">Ticker</span>
          <input type="text" name="ticker" class="input" placeholder="BBCA" required autocomplete="off" />
        </label>
        <div class="flex gap-3">
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-dim strong">Buy Price (Rp)</span>
            <input type="number" name="buy_price" class="input" placeholder="10000" min="0" step="1" required />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-dim strong">Shares</span>
            <input type="number" name="shares" class="input" placeholder="100" min="1" step="1" required />
          </label>
        </div>
        <div class="flex gap-3">
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-dim strong">Buy Date <span class="text-dim">(opsional)</span></span>
            <input type="date" name="buy_date" class="input" />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-dim strong">Sell Date <span class="text-dim">(opsional)</span></span>
            <input type="date" name="sell_date" class="input" value="${today}" />
          </label>
        </div>
        <button type="submit" class="btn btn-primary" style="align-self:flex-start">🔮 Hitung</button>
      </form>
      <div id="whatif-results" class="hidden" style="margin-top:20px"></div>
    </div>
  `;

  const form = el.querySelector('#whatif-form');
  const resultsEl = el.querySelector('#whatif-results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {};
    for (const [k, v] of fd.entries()) {
      if (v) payload[k] = k === 'buy_price' || k === 'shares' ? Number(v) : v;
    }

    resultsEl.innerHTML = '<div class="skeleton" style="height:120px;margin:0.5rem 0"></div>';
    resultsEl.classList.remove('hidden');

    try {
      const res = await fetch('/api/portfolio/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        showToast(errBody?.message || `HTTP ${res.status}`, 'error');
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
      }
      const data = await res.json();

      if (!data || data.error) {
        showToast(data?.message || data?.error || 'Gagal menghitung simulasi', 'error');
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
      }

      const r = data.data || data;
      const totalInvest = r.total_invested ?? r.totalInvest;
      const finalValue = r.final_value ?? r.finalValue;
      const pnl = r.pnl ?? r.profit_loss ?? 0;
      const pnlPct = r.pnl_pct ?? r.pnlPct ?? 0;
      const cagr = r.cagr ?? 0;
      const period = r.period ?? r.period_days ?? '—';

      const pnlCls = pnl >= 0 ? 'text-up' : 'text-down';
      const pnlSign = pnl >= 0 ? '+' : '';

      resultsEl.innerHTML = `
        <div class="portfolio-kpi-grid">
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Investasi</span><strong class="portfolio-kpi-value">${money(totalInvest)}</strong></div>
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">Nilai Akhir</span><strong class="portfolio-kpi-value">${money(finalValue)}</strong></div>
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">P&L Rp</span><strong class="portfolio-kpi-value ${pnlCls}">${pnlSign}${money(pnl)}</strong></div>
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">P&L %</span><strong class="portfolio-kpi-value ${pnlCls}">${pnlSign}${pf(pnlPct)}</strong></div>
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">CAGR</span><strong class="portfolio-kpi-value ${cagr >= 0 ? 'text-up' : 'text-down'}">${cagr >= 0 ? '+' : ''}${pf(cagr)}</strong></div>
          <div class="portfolio-kpi"><span class="portfolio-kpi-label">Periode</span><strong class="portfolio-kpi-value">${period}</strong></div>
        </div>
      `;
    } catch (e) {
      showToast('Gagal menghubungi server: ' + (e.message || 'unknown'), 'error');
      resultsEl.innerHTML = '';
      resultsEl.classList.add('hidden');
    }
  });
}

// ══════════════════════════════════════════════════
// 31.2.2 — Portfolio Quick-Add FAB
// ══════════════════════════════════════════════════

let _quickAddKeyHandler = null;

function removeQuickAddFAB() {
  document.getElementById('pf-quick-add-fab')?.remove();
  document.getElementById('pf-quick-add-modal')?.remove();
  if (_quickAddKeyHandler) {
    document.removeEventListener('keydown', _quickAddKeyHandler);
    _quickAddKeyHandler = null;
  }
}

function openQuickAddModal() {
  // Don't open if another modal is already open
  if (document.getElementById('stock-modal-overlay') || document.getElementById('pf-quick-add-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'pf-quick-add-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.15s ease';
  overlay.innerHTML = `
    <div style="background:var(--card-bg,#1a1a2e);border-radius:16px;padding:24px;min-width:320px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-main)">➕ Tambah Posisi Cepat</h3>
        <button type="button" id="pf-qa-close" style="background:none;border:none;font-size:22px;color:var(--text-dim);cursor:pointer;line-height:1;padding:0">&times;</button>
      </div>
      <form id="pf-qa-form" onsubmit="return false">
        <div style="margin-bottom:14px;position:relative">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Kode Saham</label>
          <input type="text" id="pf-qa-ticker" autocomplete="off" placeholder="Contoh: BBCA" maxlength="10"
            style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color,#0f0f1a);color:var(--text-main);font-size:14px;font-weight:700;text-transform:uppercase;box-sizing:border-box;letter-spacing:1px" />
          <div id="pf-qa-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--card-bg,#1a1a2e);border:1px solid var(--border-subtle);border-radius:8px;z-index:100;max-height:180px;overflow-y:auto;margin-top:2px;box-shadow:0 8px 24px rgba(0,0,0,0.3)"></div>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Jumlah Lot</label>
          <input type="number" id="pf-qa-lots" value="1" min="1" step="1"
            style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color,#0f0f1a);color:var(--text-main);font-size:14px;box-sizing:border-box" />
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">Harga Rata-Rata (Rp)</label>
          <input type="number" id="pf-qa-price" value="1000" min="1" step="50"
            style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-subtle);background:var(--bg-color,#0f0f1a);color:var(--text-main);font-size:14px;box-sizing:border-box" />
        </div>
        <div style="display:flex;gap:10px">
          <button type="button" id="pf-qa-cancel" class="btn" style="flex:1;font-size:13px">Batal</button>
          <button type="submit" id="pf-qa-save" class="btn btn-primary" style="flex:2;font-size:13px;font-weight:700">💾 Simpan</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const tickerInput = overlay.querySelector('#pf-qa-ticker');
  const suggestionsEl = overlay.querySelector('#pf-qa-suggestions');
  let suggestDebounce = null;

  // Autocomplete
  tickerInput.addEventListener('input', () => {
    clearTimeout(suggestDebounce);
    const q = tickerInput.value.trim().toUpperCase();
    tickerInput.value = q;
    if (q.length < 1) { suggestionsEl.style.display = 'none'; return; }
    suggestDebounce = setTimeout(async () => {
      try {
        const res = await apiFetch(`/stocks/search?q=${encodeURIComponent(q)}&limit=6`);
        const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (!items.length) { suggestionsEl.style.display = 'none'; return; }
        suggestionsEl.innerHTML = items.map(s => {
          const ticker = s.ticker || s.symbol || '';
          const name = s.name || s.company_name || '';
          return `<div class="pf-qa-suggest-item" data-ticker="${ticker}" style="padding:10px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-subtle);transition:background 0.1s" onmouseover="this.style.background='var(--hover-bg,rgba(255,255,255,0.06))'" onmouseout="this.style.background='transparent'">
            <span style="font-weight:700;color:var(--text-main);font-size:13px">${ticker}</span>
            <span style="color:var(--text-dim);font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
          </div>`;
        }).join('');
        suggestionsEl.style.display = 'block';
        suggestionsEl.querySelectorAll('.pf-qa-suggest-item').forEach(item => {
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            tickerInput.value = item.dataset.ticker;
            suggestionsEl.style.display = 'none';
            overlay.querySelector('#pf-qa-lots').focus();
          });
        });
      } catch (e) { suggestionsEl.style.display = 'none'; }
    }, 250);
  });

  // Hide suggestions on blur
  tickerInput.addEventListener('blur', () => setTimeout(() => { suggestionsEl.style.display = 'none'; }, 200));

  const closeModal = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  overlay.querySelector('#pf-qa-close').addEventListener('click', closeModal);
  overlay.querySelector('#pf-qa-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Save
  overlay.querySelector('#pf-qa-form').addEventListener('submit', async () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    const lots = Number(overlay.querySelector('#pf-qa-lots').value);
    const avgPrice = Number(overlay.querySelector('#pf-qa-price').value);
    if (!ticker) { showToast('Kode saham wajib diisi', 'error'); tickerInput.focus(); return; }
    if (isNaN(lots) || lots <= 0) { showToast('Jumlah lot tidak valid', 'error'); return; }
    if (isNaN(avgPrice) || avgPrice <= 0) { showToast('Harga tidak valid', 'error'); return; }
    const saveBtn = overlay.querySelector('#pf-qa-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';
    try {
      await savePortfolioPosition({ ticker, lots, avg_price: avgPrice });
      showToast(`${ticker} ditambahkan ke portofolio`, 'success');
      closeModal();
      // Refresh portfolio list without full page reload
      const tabContent = document.getElementById('tab-content');
      if (tabContent) await renderPortfolioTab(tabContent);
    } catch (e) {
      showToast('Gagal menyimpan posisi', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Simpan';
    }
  });

  setTimeout(() => tickerInput.focus(), 100);
}

export function injectQuickAddFAB() {
  // Remove stale FAB/handler if any
  removeQuickAddFAB();

  // Floating button
  const fab = document.createElement('button');
  fab.id = 'pf-quick-add-fab';
  fab.type = 'button';
  fab.title = 'Tambah posisi cepat (N)';
  fab.setAttribute('aria-label', 'Tambah posisi portofolio');
  fab.innerHTML = '<span style="font-size:22px;line-height:1">＋</span>';
  fab.style.cssText = `
    position:fixed;bottom:80px;right:20px;z-index:900;
    width:52px;height:52px;border-radius:50%;
    background:var(--accent,#6366f1);color:#fff;border:none;
    box-shadow:0 4px 20px rgba(99,102,241,0.5);
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    transition:transform 0.15s,box-shadow 0.15s;
  `;
  fab.addEventListener('mouseenter', () => { fab.style.transform = 'scale(1.1)'; fab.style.boxShadow = '0 6px 28px rgba(99,102,241,0.7)'; });
  fab.addEventListener('mouseleave', () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'; });
  fab.addEventListener('click', openQuickAddModal);
  document.body.appendChild(fab);

  // Keyboard shortcut: N key opens modal when on portfolio page
  _quickAddKeyHandler = (e) => {
    if (e.key === 'n' || e.key === 'N') {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (!document.getElementById('pf-quick-add-fab')) return; // not on portfolio page
      e.preventDefault();
      openQuickAddModal();
    }
  };
  document.addEventListener('keydown', _quickAddKeyHandler);
}

// ─── Dividend Tracker ──────────────────────────
export async function renderDividendTab(el) {
  if (!el) return;
  el.innerHTML = '<div class="skeleton" style="height:200px;margin:1rem 0"></div>';

  const data = await fetchPortfolioDividends();
  if (!data) {
    el.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">⚠️</div>
        <strong class="empty-state-title">Gagal Memuat</strong>
        <span class="empty-state-desc">Data dividen tidak dapat dimuat. Coba refresh halaman.</span>
        <button type="button" class="empty-state-action" onclick="location.reload()"><i data-lucide="refresh-cw" class="lucide-md"></i> Muat Ulang</button>
      </div>`;
    return;
  }

  const positions = data.data || [];
  const summary = data.summary || {};

  if (!positions.length) {
    el.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-state-icon">📋</div>
        <strong class="empty-state-title">Belum Ada Data Dividen</strong>
        <span class="empty-state-desc">Tambah posisi portofolio terlebih dahulu untuk melihat proyeksi dividen.</span>
      </div>`;
    return;
  }

  // KPI cards
  const totalAnnual = summary.total_annual_dividend ?? summary.totalAnnualDividend ?? 0;
  const avgYield = summary.avg_yield ?? summary.avgYield ?? 0;
  const totalInvested = summary.total_invested ?? summary.totalInvested ?? 0;

  el.innerHTML = `
    <h3 style="margin:16px 0 12px;font-size:1rem;font-weight:800">📋 Proyeksi Dividen Portofolio</h3>
    <div class="portfolio-kpi-grid">
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Proyeksi Dividen/Tahun</span><strong class="portfolio-kpi-value text-up">${money(totalAnnual)}</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Rata-Rata Yield</span><strong class="portfolio-kpi-value text-up">${pf(avgYield)}</strong></div>
      <div class="portfolio-kpi"><span class="portfolio-kpi-label">Total Investasi</span><strong class="portfolio-kpi-value">${money(totalInvested)}</strong></div>
    </div>
    <div class="table-wrapper" style="margin-top:16px">
      <table class="table">
        <thead><tr><th>Ticker</th><th>Lot</th><th>Lembar</th><th>Harga Saat Ini</th><th>Yield %</th><th>Est. Dividen/Tahun</th><th>% dari Pendapatan</th></tr></thead>
        <tbody>
          ${positions.map(p => {
            const ticker = p.ticker || p.symbol || '—';
            const lots = p.lots ?? p.lot ?? 0;
            const shares = p.shares ?? p.total_shares ?? 0;
            const price = p.current_price ?? p.price ?? 0;
            const yieldPct = p.dividend_yield ?? p.yield ?? p.yield_pct ?? 0;
            const estAnnual = p.estimated_annual_dividend ?? p.annual_dividend ?? 0;
            const incomePct = p.income_percentage ?? p.income_pct ?? p.pct_of_income ?? 0;

            return `<tr>
              <td><strong>${ticker}</strong></td>
              <td>${typeof lots === 'number' ? nf(lots, 0) : lots}</td>
              <td>${typeof shares === 'number' ? nf(shares, 0) : shares}</td>
              <td class="mono">${money(price)}</td>
              <td class="mono text-up">${pf(yieldPct)}</td>
              <td class="mono text-up">${money(estAnnual)}</td>
              <td class="mono text-up">${pf(incomePct)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}
