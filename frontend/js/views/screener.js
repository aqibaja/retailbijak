import { getScanEventSourceUrl, showToast, loadTVWidget, getTVTheme } from '../api.js?v=20260518F';
import { observeElements } from '../main.js?v=20260518F';
import { t as _t } from '../i18n.js?v=20260518F';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

const renderEmptyState = ({
  title = t('screener.not_scanned'),
  body = t('screener.run_scan'),
  action = t('screener.sort_cci'),
} = {}) => `
  <div class="empty-state-v2">
    <div class="empty-icon"><i data-lucide="radar" class="lucide-lg"></i></div>
    <h3>${title}</h3>
    <p>${body}</p>
    <span class="empty-state-small">${action}</span>
  </div>
`;

const renderSkeleton = () => `
  <div class="flex-col gap-3 p-5">
    ${Array(5).fill('<div class="skeleton skeleton-card skeleton-h-80"></div>').join('')}
  </div>
`;

const renderRow = (r) => `
  <a href="#stock/${r.ticker}" class="scanner-row">
    <div class="scanner-row-main">
      <div class="scanner-row-badge">${r.ticker.substring(0, 2)}</div>
      <div class="scanner-row-copy">
        <div class="scanner-row-title">
          <div class="text-main scanner-row-ticker">${r.ticker}</div>
        </div>
        <div class="scanner-row-name">${r.name || t('screener.default_company')}</div>
      </div>
    </div>
    <div class="scanner-row-stats">
      <div class="scanner-row-stat">
        <span>${t('screener.price_label')}</span>
        <strong class="mono">${Number(r.close || 0).toLocaleString('id-ID')}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>${t('screener.cci_label')}</span>
        <strong class="mono">${r.cci ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>${t('screener.ma_label')}</span>
        <strong class="mono">${r.magic_line ?? '—'}</strong>
      </div>
      <div class="scanner-row-stat">
        <span>${t('screener.volume_label')}</span>
        <strong class="mono">${r.volume_spike ? r.volume_spike.toFixed(1) + 'x' : '—'}</strong>
      </div>
    </div>
  </a>
`;

let currentResults = [];
let scanEventSource = null;
let scanErrorHandled = false;

export async function renderScreener(root) {
    // Cleanup any stale EventSource from previous screener view
    if (scanEventSource) {
        scanEventSource.close();
        scanEventSource = null;
    }
    scanErrorHandled = false;
    currentResults = [];
    document.title = t('screener.page_title');
    root.innerHTML = `
      <section class="stagger-reveal">
        <div class="mb-6 screener-hero">
          <div class="screener-kicker">SwingAQ Intelligence</div>
          <h1 class="text-3xl strong mb-2 tracking-tight">${t('screener.title')}</h1>
        </div>
        <div class="scanner-layout">
          <div class="scanner-form flex-col gap-5">
            <div class="scanner-header-text">${t('screener.control_center')}</div>
            <div class="flex items-center gap-2"><span class="text-xs text-dim uppercase strong">${t('screener.timeframe')}:</span><span class="badge badge-primary">${t('screener.daily')}</span></div>
            <p class="scanner-form-note">${t('screener.run_scan')}</p>
            <button id="btn-run-screener" type="button" class="scanner-btn-primary">${t('screener.run_scan')}</button>
            <div id="screener-progress" class="hidden panel-lite p-4 scanner-progress">
              <div class="flex justify-between text-xs mb-2"><span id="sp-text">${t('screener.analyzing')}</span><span id="sp-percent">0%</span></div>
              <div class="screener-progress-track"><div id="sp-fill" class="screener-progress-fill"></div></div>
            </div>
          </div>
          <div class="scanner-results flex-col">
            <div class="flex justify-between items-center p-5 border-b border-subtle">
              <div class="flex items-center gap-3">
                <h3 class="text-xs strong uppercase m-0 screener-signal-title">${t('screener.live_signals')}</h3>
                <span class="badge" id="screener-count">${t('screener.not_scanned')}</span>
              </div>
              <div id="screener-toolbar" class="flex gap-2 screener-toolbar hidden">
                <div class="scanner-control-stack">
                  <select id="screener-sort" class="scanner-select screener-control-select">
                      <option value="cci">${t('screener.sort_cci')}</option>
                      <option value="volume">${t('screener.sort_volume')}</option>
                      <option value="ma">${t('screener.sort_ma')}</option>
                  </select>
                </div>
                <div class="scanner-control-stack">
                  <input type="text" id="screener-search" placeholder="${t('screener.search_code')}" class="scanner-select screener-control-search">
                </div>
              </div>
            </div>
            <div id="screener-content" class="screener-content-area">${renderEmptyState()}</div>
          </div>
        </div>
      </section>
      <section class="market-section-group market-section-group-heatmap mt-6">
        <header class="market-section-group-head">
          <div class="market-section-group-title">${t('screener.tv_screener')}</div>
          <p>${t('screener.tv_screener_desc')}</p>
        </header>
        <div id="tv-screener" class="market-heatmap-wrap" style="min-height:580px;"></div>
      </section>`;
    observeElements();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    root.querySelector('#btn-run-screener').addEventListener('click', runScreener);
    root.querySelector('#screener-sort')?.addEventListener('change', sortResults);
    root.querySelector('#screener-search')?.addEventListener('input', filterResults);

    // TV Screener Widget — inject script to head (innerHTML can't execute scripts)
    setTimeout(() => {
      const tvContainer = document.getElementById('tv-screener');
      if (!tvContainer) return;
      const theme = getTVTheme();

      // Create widget structure
      tvContainer.innerHTML = `
        <div class="tradingview-widget-container" style="height:600px;width:100%">
          <div class="tradingview-widget-container__widget" id="tv-screener-widget"></div>
        </div>`;

      // Inject script via createElement (innerHTML doesn't execute scripts)
      const existing = document.getElementById('tv-screener-script');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'tv-screener-script';
      script.type = 'text/javascript';
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
      script.async = true;
      script.textContent = JSON.stringify({
        width: '100%',
        height: 600,
        defaultColumn: 'change',
        defaultScreen: 'most_volatile',
        market: 'indonesia',
        showToolbar: true,
        colorTheme: theme,
        locale: 'id_ID',
        utm_source: 'retailbijak.rich27.my.id',
        utm_medium: 'widget_new',
        utm_campaign: 'screener',
      });
      tvContainer.querySelector('.tradingview-widget-container').appendChild(script);
    }, 500);
}

function sortResults() {
    const sortBy = document.getElementById('screener-sort').value;
    currentResults.sort((a, b) => {
        if (sortBy === 'cci') return (b.cci || 0) - (a.cci || 0);
        if (sortBy === 'volume') return (b.volume_spike || 0) - (a.volume_spike || 0);
        if (sortBy === 'ma') return (b.magic_line || 0) - (a.magic_line || 0);
        return 0;
    });
    renderList(currentResults);
}

function filterResults() {
    const term = document.getElementById('screener-search').value.toUpperCase();
    const filtered = currentResults.filter(r => r.ticker.includes(term));
    renderList(filtered);
}

function renderList(results) {
    const contentArea = document.getElementById('screener-content');
    const toolbar = document.getElementById('screener-toolbar');
    const hasResults = results.length > 0;
    if (toolbar) toolbar.style.display = hasResults ? 'flex' : 'none';
    const sc = document.getElementById('screener-search');
    if (hasResults) {
        contentArea.innerHTML = `<div class="flex-col gap-3">${results.map(r => renderRow(r)).join('')}</div>`;
    } else if (sc && sc.value !== '' && currentResults.length > 0) {
        // Filter returned nothing — clear search and re-render full list
        sc.value = '';
        renderList(currentResults);
        return;
    } else {
        contentArea.innerHTML = renderEmptyState({
            title: t('screener.no_signals'),
            body: t('screener.no_candidates'),
            action: t('screener.try_again'),
        });
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function runScreener() {
    const btn = document.getElementById('btn-run-screener');
    const contentArea = document.getElementById('screener-content');
    const progBox = document.getElementById('screener-progress');
    const countBadge = document.getElementById('screener-count');
    const toolbar = document.getElementById('screener-toolbar');

    // Prevent concurrent scans
    if (scanEventSource) {
        scanEventSource.close();
        scanEventSource = null;
    }
    scanErrorHandled = false;

    btn.disabled = true;
    btn.classList.add('btn-loading');
    if (toolbar) toolbar.style.display = 'none';
    const searchInput = document.getElementById('screener-search');
    if (searchInput) searchInput.value = '';
    countBadge.textContent = t('screener.scanning');
    currentResults = [];
    contentArea.innerHTML = renderSkeleton();
    progBox.style.display = 'block';

    // Check if we're still mounted before touching DOM
    const isMounted = () => document.getElementById('screener-content') !== null;

    scanEventSource = new EventSource(`${getScanEventSourceUrl('1d')}&rule=SwingAQ`);
    scanEventSource.onmessage = (event) => {
        if (!isMounted()) { scanEventSource.close(); scanEventSource = null; return; }
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            const spText = document.getElementById('sp-text');
            const spPercent = document.getElementById('sp-percent');
            const spFill = document.getElementById('sp-fill');
            if (spText) spText.textContent = `${t('screener.scanning_ticker', { ticker: data.ticker })}`;
            if (spPercent) spPercent.textContent = `${data.percent}%`;
            if (spFill) spFill.style.width = `${data.percent}%`;
        } else if (data.type === 'result') {
            // Dedup by ticker
            if (!currentResults.some(r => r.ticker === data.data.ticker)) {
                currentResults.push(data.data);
            }
            countBadge.textContent = `${currentResults.length} ${t('screener.detected')}`;
            renderList(currentResults);
        } else if (data.type === 'done') {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            progBox.style.display = 'none';
            countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} ${t('screener.detected')}` : t('screener.no_signals');
            renderList(currentResults);
            showToast(t('screener.scan_complete', { count: currentResults.length }), 'success');
            scanEventSource.close();
            scanEventSource = null;
        }
    };
    scanEventSource.onerror = () => {
        if (scanErrorHandled || !isMounted()) {
            if (scanEventSource) { scanEventSource.close(); scanEventSource = null; }
            return;
        }
        scanErrorHandled = true;
        scanEventSource.close();
        scanEventSource = null;
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        progBox.style.display = 'none';
        countBadge.textContent = currentResults.length > 0 ? `${currentResults.length} ${t('screener.disconnected')}` : t('screener.failed');
        if (currentResults.length > 0) {
            // Keep partial results visible
            renderList(currentResults);
            showToast(t('screener.scan_interrupted'), 'warning');
        } else {
            renderList([]);
            showToast(t('screener.scan_failed'), 'error');
        }
    };
}
