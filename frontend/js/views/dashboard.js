import { fetchNews, fetchMarketSummary, fetchSectorSummary, fetchTopMovers, fetchIhsgChart, fetchMarketBreadth, fetchAiPicks, apiFetch } from '../api.js?v=20260511';
import { observeElements, animateValue } from '../main.js?v=20260511';
import { nf, pf } from '../utils/format.js?v=20260511';
import { ssSet } from '../utils/storage.js?v=20260511';
import { loadTodayEvents } from './calendar.js?v=20260511';
import { showSkeleton, hideSkeleton } from '../skeleton.js?v=20260511';

const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';

const SUGGESTION_PRESETS = [
  { ticker: 'BBCA', reason: 'Relative strength bertahan di atas pivot harian.' },
  { ticker: 'BMRI', reason: 'Bank besar tetap jadi fokus saat tape defensif.' },
  { ticker: 'GOTO', reason: 'Momentum aktif untuk trader agresif intraday.' },
  { ticker: 'BRPT', reason: 'Rotasi sektor dan volatility cocok untuk watchlist cepat.' },
  { ticker: 'TLKM', reason: 'Quality defensive name untuk pullback map.' },
  { ticker: 'ANTM', reason: 'Komoditas tetap menarik saat flow sektor bergeser.' },
];
const activeRanges = { '1W': false, '1M': true, '1Q': false, '1Y': false };

function buildAiPickContext(item, mode = 'swing') {
  return JSON.stringify({
    ticker: item?.ticker || '', mode, source_route: '#dashboard', source_label: 'Top AI Pick Today',
    score: item?.score ?? null, confidence: item?.confidence || null, fit_label: item?.fit_label || '',
    entry_zone: item?.entry_zone ?? null, target_zone: item?.target_zone ?? null, invalidation: item?.invalidation ?? null,
    reason_labels: Array.isArray(item?.reason_labels) ? item.reason_labels.slice(0, 3) : [], risk_note: item?.risk_note || '',
  });
}

export async function renderDashboard(root) {
  document.title = 'RetailBijak — Dashboard';
  root.innerHTML = `
  <section class="dashboard-pro stagger-reveal" aria-label="Dashboard Pasar">
    <div class="dash-hero-pro panel">
      <div class="dash-copy">
        <div class="screener-kicker">RUANG KERJA IDX</div>
        <h1>Dashboard Pasar</h1>
        <p class="dash-hero-lead">Pantau IHSG, breadth, dan penggerak utama dalam satu layar.</p>
        <div class="dash-actions dash-actions-compact">
          <a href="#screener" class="btn btn-primary dash-primary-cta">Jalankan Pemindai</a>
          <a href="#market" class="btn dash-secondary-cta">Ikhtisar Pasar</a>
          <div class="dash-quick-actions" style="display:inline-flex;gap:4px;margin-left:8px">
            <button class="btn btn-sm" id="dash-refresh-btn" title="Refresh semua data"><i data-lucide="refresh-cw" style="width:14px"></i></button>
            <button class="btn btn-sm" id="dash-clear-cache-btn" title="Bersihkan cache"><i data-lucide="trash-2" style="width:14px"></i></button>
            <button class="btn btn-sm" id="dash-widget-toggle" title="Atur widget"><i data-lucide="layout" style="width:14px"></i></button>
          </div>
        </div>
        <div class="dash-summary-strip dash-summary-strip-compact dash-mobile-stack" aria-live="polite" aria-atomic="true">
          <div class="dash-summary-card">
            <span>Bias Pasar</span>
            <strong id="dash-bias-label">Memuat...</strong>
            <small id="dash-bias-note">Menyiapkan breadth dan konteks tape.</small>
          </div>
          <div class="dash-summary-card">
            <span>Penguat Utama</span>
            <strong id="dash-lead-gainer">Memuat...</strong>
            <small id="dash-lead-gainer-note">Menunggu top movers valid.</small>
          </div>
          <div class="dash-summary-card">
            <span>Sektor Utama</span>
            <strong id="dash-lead-sector">Memuat...</strong>
            <small id="dash-lead-sector-note">Snapshot rotasi sektor.</small>
          </div>
          <div class="dash-summary-card" id="dash-pnl-card">
            <span>Portofolio P&L</span>
            <strong id="dash-pnl-label">Memuat...</strong>
            <small id="dash-pnl-note">Menghitung nilai portofolio.</small>
          </div>
        </div>
      </div>
      <div class="dash-quote-card dash-mobile-status" aria-live="polite" aria-atomic="true">
        <div class="dash-quote-meta"><span class="badge" id="market-fold-badge">SYNC</span><span class="mono text-xs text-dim" id="market-fold-status">loading...</span></div>
        <div class="text-xs text-dim mb-2" id="market-data-date">Data IDX: loading...</div>
        <div class="text-xs text-dim uppercase strong">IHSG</div>
        <div class="flex justify-between items-end gap-3" role="group" aria-label="IHSG nilai dan perubahan"><div class="mono strong dash-big" id="ihsg-value">—</div><div class="mono strong text-up" id="ihsg-change">—</div></div>
        <div class="dashboard-metrics mt-3"><div><span>Open</span><strong id="ihsg-open">—</strong></div><div><span>High</span><strong id="ihsg-high" class="text-up">—</strong></div><div><span>Low</span><strong id="ihsg-low" class="text-down">—</strong></div></div>
        <div class="dash-quote-freshness" id="dash-quote-freshness">Sinkronisasi: menunggu ringkasan pasar.</div>
      </div>
    </div>

    <!-- Data Freshness Stats Card -->
    <div class="panel" id="dash-freshness-strip" style="padding:8px 14px;margin-top:0;display:none">
      <div class="dash-freshness-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px"></div>
    </div>

    <div class="dash-grid-pro dash-mobile-shell">
      <div class="panel dash-chart-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">IHSG Chart</h3><p class="text-xs text-dim" id="ihsg-chart-subtitle">Data dari IDX</p></div>
          <div class="dashboard-chip-row" role="group" aria-label="Rentang waktu grafik">
            <button class="btn btn-mini ihsg-range" data-range="1W" aria-pressed="false">1W</button>
            <button class="btn btn-primary btn-mini ihsg-range" data-range="1M" aria-pressed="true">1M</button>
            <button class="btn btn-mini ihsg-range" data-range="1Q" aria-pressed="false">1Q</button>
          </div>
        </div>
        <div class="dash-chart-context"><span class="dash-chart-context-chip" id="dash-chart-bias-chip">Bias dihitung</span><strong id="dash-chart-readout">IHSG readout menunggu data.</strong></div>
        <div class="dashboard-chart-wrap"><div class="skeleton skeleton-chart" aria-hidden="true"></div><canvas id="ihsgMainChart" role="img" aria-label="Grafik pergerakan IHSG"></canvas><div id="ihsg-chart-empty" class="chart-empty-state" style="display:none;"><i data-lucide="bar-chart-3"></i><p>Data IHSG belum tersedia</p><small>Menunggu jadwal sinkronasi harian dari IDX</small></div></div>
      </div>
      <div class="panel dash-movers-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">Penggerak Teratas</h3><div class="dash-movers-summary"><span class="dash-movers-summary-chip" id="dash-movers-summary-chip">Tape dimuat</span></div></div>
          <a href="#movers" class="text-xs text-primary strong">Lihat Semua → #movers</a>
        </div>
        <div id="movers-list" class="flex-col gap-2" aria-live="polite"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyiapkan data</strong></div></div>
      </div>
    </div>

    <div class="dash-bottom-grid dash-bottom-grid-phase2 dash-bottom-grid-mobile">
      <div class="panel dash-breadth-panel" id="dash-breadth-panel">
        <div class="flex justify-between items-center mb-3">
          <h3 class="panel-title" style="margin:0">📊 Market Breadth</h3>
          <a href="#breadth" class="text-xs text-primary strong">Detail →</a>
        </div>
        <div id="dash-breadth-content">
          <div class="dashboard-widget-state">
            <strong class="dashboard-widget-state-title">Memuat breadth...</strong>
            <span class="dashboard-widget-state-note">Menghitung data advance-decline.</span>
          </div>
        </div>
      </div>
      <div class="panel"><h3 class="panel-title mb-3">Intelijen Pasar</h3><div id="market-intel" class="intel-list" aria-live="polite"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyusun ringkasan</strong><span class="dashboard-widget-state-note">Merangkum breadth, sektor, dan rencana intraday.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">Arus Asing</h3><div id="foreign-flow-card" class="flex-col gap-2" aria-live="polite"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Memuat data asing</strong><span class="dashboard-widget-state-note">Menarik net foreign buy/sell dari IDX.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">AI Picks</h3><div id="dash-ai-pick-summary" class="text-xs text-muted mb-2" aria-live="polite">Menyiapkan pick unggulan...</div><div id="dash-ai-pick-widget" aria-live="polite"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengambil pick</strong><span class="dashboard-widget-state-note">Menarik kandidat dengan score tertinggi.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">Berita Terbaru</h3><div id="news-container" class="intel-list" aria-live="polite"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengumpulkan berita</strong><span class="dashboard-widget-state-note">Menarik berita terbaru dari feed.</span></div></div></div>
    </div>
    <!-- Market Narrative Card -->
    <div class="panel market-narrative-panel" id="market-narrative-card">
      <div class="market-narrative-inner">
        <div class="market-narrative-icon">📊</div>
        <div class="market-narrative-body">
          <div class="market-narrative-text" id="market-narrative-text">Memuat narasi pasar...</div>
          <div class="market-narrative-meta" id="market-narrative-meta"></div>
        </div>
      </div>
    </div>
    <!-- AI Market Briefing Widget (18.3) -->
    <div class="panel market-narrative-panel" id="market-briefing-card" style="margin-top:14px">
      <div class="market-narrative-inner">
        <div class="market-narrative-icon">🤖</div>
        <div class="market-narrative-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <h3 class="panel-title" style="margin:0 0 4px;font-size:13px">AI Ringkasan Pasar</h3>
            <button class="btn btn-sm" id="briefing-refresh-btn" style="font-size:10px;padding:2px 8px" title="Refresh">🔄</button>
          </div>
          <div class="market-narrative-text" id="market-briefing-text" style="font-size:13px">Memuat ringkasan pasar...</div>
          <div class="market-narrative-meta" id="market-briefing-meta"></div>
        </div>
      </div>
    </div>
    <!-- Signal Overview Widget -->
    <div class="panel" id="signal-widget" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">📡 Ringkasan Sinyal</h3>
        <a href="#signal_overview" class="text-xs text-primary strong">Lihat Semua</a>
      </div>
      <div id="signal-widget-content" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
        <div class="dashboard-widget-state" style="grid-column:1/-1;padding:24px">
          <strong class="dashboard-widget-state-title">Memuat sinyal...</strong>
        </div>
      </div>
    </div>
    <!-- Calendar Widget -->
    <div class="panel" id="dash-calendar-widget" style="margin-top:14px;display:none"></div>
  </section>`;
  // Hapus page-loading segera agar konten terlihat — jangan nunggu API
  root.classList.remove('page-loading');
  // Dashboard hero langsung visible, jangan nunggu IntersectionObserver
  const hero = root.querySelector('.dashboard-pro.stagger-reveal');
  if (hero) hero.classList.add('is-visible');
  observeElements();
  // Skeleton loading — replace widget-state with content-aware skeletons
  const skContainers = [
    { id: 'dash-breadth-content', type: 'kpi' },
    { id: 'market-intel', type: 'list' },
    { id: 'foreign-flow-card', type: 'list' },
    { id: 'dash-ai-pick-widget', type: 'card' },
    { id: 'news-container', type: 'list' },
    { id: 'signal-widget-content', type: 'kpi' },
    { id: 'movers-list', type: 'list' },
  ];
  skContainers.forEach(({ id, type }) => {
    const el = document.getElementById(id);
    if (el) showSkeleton(el, type, 3);
  });
  const [market] = await Promise.all([loadMarketSummary(), loadNews(), loadIntel(), loadMovers(), loadAiPickWidget()]);
  loadMarketNarrative();
  loadPnlWidget();  // P&L widget (async)
  loadMiniHeatmapWidget(); // Mini heatmap widget (async)
  loadMarketBriefing(); // AI Briefing widget (18.3)
  // Lazy load Chart.js only for dashboard (1.7.2)
  if (typeof Chart === 'undefined' && document.getElementById('ihsgMainChart')) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.crossOrigin = 'anonymous';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    } catch (e) { console.warn('Chart.js lazy load failed', e); }
  }
  initChart(market);
  // Foreign Flow card (async, non-blocking)
  loadForeignFlow();
  loadSignalWidget();
  loadTodayEvents();
  loadBreadthWidget();
  loadFreshnessStats(); // Data freshness stats card
  setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.dataset.val || '0'), 900)), 100);

  // ─── Auto-Refresh Dashboard (24.3.1) ──────
  let _dashRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    loadForeignFlow();
    loadBreadthWidget();
    loadSignalWidget();
    loadMiniHeatmapWidget();
  }, 120000);
  window.__viewTimers.push('i_' + _dashRefreshTimer);
}
// ─── Breadth Widget ────────────────────────────
async function loadBreadthWidget() {
  const el = document.getElementById('dash-breadth-content');
  if (!el) return;
  try {
    const res = await fetchMarketBreadth();
    const b = res?.data || {};
    const adv = Number(b.advancing ?? 0);
    const dec = Number(b.declining ?? 0);
    const unch = Number(b.unchanged ?? 0);
    const total = adv + dec + unch;
    const ratio = dec > 0 ? (adv / dec).toFixed(2) : '—';
    const advPct = total > 0 ? (adv / total * 100).toFixed(0) : 0;
    const decPct = total > 0 ? (dec / total * 100).toFixed(0) : 0;
    const isPositive = adv >= dec;
    el.innerHTML = `
      <div class="dash-breadth-visual">
        <div class="dash-breadth-big-numbers">
          <div class="dash-breadth-stat up">${adv}<span class="label">↑</span></div>
          <div class="dash-breadth-stat down">${dec}<span class="label">↓</span></div>
          <div class="dash-breadth-stat muted">${unch}<span class="label">—</span></div>
        </div>
        <div class="dash-breadth-bar-track">
          <div class="dash-breadth-fill is-up" style="flex:${advPct};min-width:${Math.max(advPct, 4)}%"></div>
          <div class="dash-breadth-fill is-down" style="flex:${decPct};min-width:${Math.max(decPct, 4)}%"></div>
        </div>
        <div class="dash-breadth-footer">
          <span class="dash-breadth-ratio ${isPositive ? 'up' : 'down'}">A/D Ratio: ${ratio}</span>
          <span class="dash-breadth-source">${b.latest_date || '—'}</span>
        </div>
      </div>`;
  } catch (e) {
    console.warn('loadBreadthWidget failed', e);
    el.innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Gagal memuat breadth</strong><span class="dashboard-widget-state-note">Coba refresh halaman.</span></div>';
  }
}
  // ─── Dashboard Quick Actions ───
  document.getElementById('dash-refresh-btn')?.addEventListener('click', () => {
    showToast('Me-refresh dashboard...', 'info');
    location.reload();
  });
  document.getElementById('dash-clear-cache-btn')?.addEventListener('click', () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
    localStorage.clear();
    showToast('Cache dibersihkan. Refresh halaman...', 'success');
    setTimeout(() => location.reload(), 1000);
  });
  document.getElementById('dash-widget-toggle')?.addEventListener('click', () => {
    const widgets = [
      { id: 'dash-chart-panel', label: 'IHSG Chart', key: 'widget_chart' },
      { id: 'dash-movers-panel', label: 'Penggerak Teratas', key: 'widget_movers' },
      { id: 'market-intel-parent', label: 'Intelijen Pasar', key: 'widget_intel', selector: '#market-intel' },
      { id: 'foreign-flow-card', label: 'Arus Asing', key: 'widget_foreign' },
      { id: 'dash-ai-pick-widget', label: 'AI Picks', key: 'widget_ai' },
      { id: 'news-container', label: 'Berita Terbaru', key: 'widget_news' },
    ];
    const settings = JSON.parse(localStorage.getItem('retailbijak.widget_visibility') || '{}');
    const items = widgets.map(w => {
      const visible = settings[w.key] !== false;
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
        <input type="checkbox" data-key="${w.key}" ${visible ? 'checked' : ''} style="accent-color:var(--primary-color)" />
        <span class="text-sm">${w.label}</span>
      </label>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.id = 'stock-modal-overlay';
    overlay.innerHTML = `<div class="modal-backdrop"></div>
      <div class="modal-panel" style="width:min(340px,90vw)">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm strong m-0">Atur Widget Dashboard</h3>
          <button class="btn-icon modal-close-btn"><i data-lucide="x"></i></button>
        </div>
        ${items}
        <div class="flex gap-3 mt-4">
          <button class="btn modal-cancel-btn modal-btn" id="widget-reset-btn" style="flex:1">Reset</button>
          <button class="btn btn-primary modal-btn" id="widget-apply-btn" style="flex:1">Terapkan</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.modal-backdrop').addEventListener('click', () => overlay.remove());
    overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#widget-reset-btn').addEventListener('click', () => {
      localStorage.removeItem('retailbijak.widget_visibility');
      overlay.remove();
      location.reload();
    });
    overlay.querySelector('#widget-apply-btn').addEventListener('click', () => {
      const newSettings = {};
      overlay.querySelectorAll('input[type=checkbox]').forEach(cb => {
        newSettings[cb.dataset.key] = cb.checked;
      });
      localStorage.setItem('retailbijak.widget_visibility', JSON.stringify(newSettings));
      overlay.remove();
      applyWidgetVisibility();
      showToast('Tampilan dashboard diperbarui', 'success');
    });
  });
  // Apply widget visibility on load
  applyWidgetVisibility();
}

// ─── Data Freshness Stats ────────────────────────────
async function loadFreshnessStats() {
  const strip = document.getElementById('dash-freshness-strip');
  const grid = strip?.querySelector('.dash-freshness-grid');
  if (!strip || !grid) return;
  // Inject responsive style once
  if (!document.getElementById('dash-freshness-style')) {
    const style = document.createElement('style');
    style.id = 'dash-freshness-style';
    style.textContent = '@media(max-width:767px){.dash-freshness-grid{grid-template-columns:repeat(2,1fr)!important}}';
    document.head.appendChild(style);
  }
  try {
    const [freshnessRes, indRes, stockRes] = await Promise.all([
      apiFetch('/system/freshness'),
      apiFetch('/industries'),
      apiFetch('/stocks'),
    ]);

    const labels = freshnessRes?.labels || {};
    const stockCount = stockRes?.count || 0;
    const indCount = indRes?.total_industries || 0;

    // Determine freshness dot class from label
    const freshnessCls = (label) => {
      if (!label || label === 'tidak tersedia') return 'old';
      if (label.includes('baru') || label.includes('menit')) return 'fresh';
      if (label.includes('jam')) return 'stale';
      return 'old';
    };

    const items = [
      { icon: 'database', label: 'Saham', value: stockCount.toLocaleString('id-ID'), fLabel: labels.stocks || '—' },
      { icon: 'bar-chart-3', label: 'OHLCV', value: labels.ohlcv_daily || '—', fLabel: labels.ohlcv_daily || '—' },
      { icon: 'newspaper', label: 'Berita', value: labels.news || '—', fLabel: labels.news || '—' },
      { icon: 'building-2', label: 'Industri', value: indCount.toLocaleString('id-ID'), fLabel: labels.fundamentals || '—' },
    ];

    grid.innerHTML = items.map(({ icon, label, value, fLabel }) => {
      const cls = freshnessCls(fLabel);
      return `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:8px">
        <i data-lucide="${icon}" style="width:14px;height:14px;flex-shrink:0;opacity:.6"></i>
        <div style="flex:1;min-width:0;line-height:1.2">
          <strong style="font-size:13px;display:block">${value}</strong>
          <small style="font-size:9px;opacity:.55;text-transform:uppercase;letter-spacing:.03em">${label}</small>
        </div>
        <span class="freshness-dot ${cls}" title="${fLabel}"></span>
      </div>`;
    }).join('');

    strip.style.display = '';
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.warn('loadFreshnessStats failed', e);
    strip.style.display = 'none';
  }
}

function applyWidgetVisibility() {
  const settings = JSON.parse(localStorage.getItem('retailbijak.widget_visibility') || '{}');
  const widgets = [
    { el: document.querySelector('.dash-chart-panel'), key: 'widget_chart' },
    { el: document.querySelector('.dash-movers-panel'), key: 'widget_movers' },
    { el: document.getElementById('market-intel')?.closest('.panel'), key: 'widget_intel' },
    { el: document.getElementById('foreign-flow-card')?.closest('.panel'), key: 'widget_foreign' },
    { el: document.getElementById('dash-ai-pick-widget')?.closest('.panel'), key: 'widget_ai' },
    { el: document.getElementById('news-container')?.closest('.panel'), key: 'widget_news' },
  ];
  widgets.forEach(w => {
    if (w.el && settings[w.key] === false) {
      w.el.style.display = 'none';
    }
  });
}

async function loadMarketSummary() {
  try {
  const summary = await fetchMarketSummary();
  const isLive = summary && summary.status !== 'no_data' && summary.value;
  document.getElementById('market-fold-status').textContent = isLive ? 'DB SYNCED' : 'IDX REFERENCE';
  document.getElementById('market-fold-badge').textContent = isLive ? 'DB' : 'REF';
  const dataDate = summary?.data_date || (summary?.updated_at ? String(summary.updated_at).slice(0,10) : null);
  const dateEl = document.getElementById('market-data-date');
  if (dateEl) {
    // Compute staleness
    let stalenessHtml = '';
    if (dataDate) {
      const today = new Date();
      const jktOpts = { timeZone: 'Asia/Jakarta' };
      const todayStr = today.toLocaleDateString('en-CA', jktOpts);
      const diffDays = Math.round((new Date(todayStr) - new Date(dataDate)) / 86400000);
      if (diffDays <= 1) stalenessHtml = ' <span class="badge badge-up badge-mini">Hari ini</span>';
      else if (diffDays === 1) stalenessHtml = ' <span class="badge badge-neutral badge-mini">Kemarin</span>';
      else if (diffDays <= 5) stalenessHtml = ` <span class="badge badge-warn badge-mini">${diffDays} hari lalu</span>`;
      else stalenessHtml = ` <span class="badge badge-down badge-mini">${diffDays} hari lalu</span>`;
    }
    dateEl.innerHTML = dataDate ? `Data ${dataDate}${stalenessHtml} · sync 18:00 WIB` : 'Data belum tersedia';
  }
  const freshnessEl = document.getElementById('dash-quote-freshness');
  if (freshnessEl) freshnessEl.textContent = dataDate ? `Sinkronisasi: ${dataDate}` : 'Sinkronisasi: menunggu data.';
  const v = summary?.value ?? null, c = Number(summary?.change_pct ?? 0);
  document.getElementById('ihsg-value').textContent = v != null ? nf(v, 2) : '—';
  const ch = document.getElementById('ihsg-change'); ch.innerHTML = v != null ? `<span aria-hidden="true">${c >= 0 ? '▲' : '▼'}</span> <span>${pf(Math.abs(c)).replace('+', '')}</span>` : '—'; ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
  document.getElementById('ihsg-open').textContent = summary?.open != null ? nf(summary.open) : '—';
  document.getElementById('ihsg-high').textContent = summary?.high != null ? nf(summary.high) : '—';
  document.getElementById('ihsg-low').textContent = summary?.low != null ? nf(summary.low) : '—';
  const biasLabel = document.getElementById('dash-bias-label');
  const biasNote = document.getElementById('dash-bias-note');
  if (biasLabel) biasLabel.textContent = v == null ? 'Menunggu snapshot' : c >= 0 ? 'Tape Berisiko' : 'Tape Defensif';
  if (biasNote) biasNote.textContent = v == null ? 'Ringkasan belum lengkap.' : c >= 0 ? `IHSG ${pf(c)} dengan bias momentum bertahan.` : `IHSG ${pf(c)} defensif, selektivitas lebih penting.`;
  return summary;
} catch (e) { console.warn('loadMarketSummary failed',e); return null; }
}

async function loadIntel(){
  const [summary, breadthRes, gainersRes, losersRes, sectorRes] = await Promise.all([
    fetchMarketSummary().catch(() => null),
    fetchMarketBreadth().catch(() => null),
    fetchTopMovers(5, 'gainers').catch(() => null),
    fetchTopMovers(5, 'losers').catch(() => null),
    fetchSectorSummary().catch(() => null),
  ]);
  const sectors = Array.isArray(sectorRes?.data) && sectorRes.data.length
    ? sectorRes.data : [{ sector:'Finance', change_pct:1.2 }, { sector:'Energy', change_pct:0.8 }, { sector:'Technology', change_pct:-1.5 }];
  const best = [...sectors].sort((a,b)=>Number(b.change_pct||0)-Number(a.change_pct||0))[0];
  const breadth = breadthRes?.data || {};
  const adv = Number(breadth.advancing ?? 0);
  const dec = Number(breadth.declining ?? 0);
  const gainers = Array.isArray(gainersRes?.data) ? gainersRes.data : [];
  const losers = Array.isArray(losersRes?.data) ? losersRes.data : [];
  const leadGainer = gainers[0] || null;
  const leadLoser = losers[0] || null;
  const tapeBias = adv === 0 && dec === 0 ? 'menunggu data' : adv >= dec ? 'bias positif' : 'tekanan dominan';
  const planLine = Number(summary?.change_pct ?? 0) >= 0
    ? 'Fokus ke saham pemimpin sektor, validasi volume sebelum entry.'
    : 'Prioritaskan defense, entry bertahap, hindari chasing.';
  const biasLabel = document.getElementById('dash-bias-label');
  const leadGainerEl = document.getElementById('dash-lead-gainer');
  const leadGainerNoteEl = document.getElementById('dash-lead-gainer-note');
  const leadSectorEl = document.getElementById('dash-lead-sector');
  const leadSectorNoteEl = document.getElementById('dash-lead-sector-note');
  const chartBiasChip = document.getElementById('dash-chart-bias-chip');
  const chartReadout = document.getElementById('dash-chart-readout');
  if (biasLabel) biasLabel.textContent = adv === 0 && dec === 0 ? 'Butuh breadth' : adv >= dec ? 'Tape Berisiko' : 'Tape Defensif';
  if (leadGainerEl) leadGainerEl.textContent = leadGainer?.ticker || 'Belum ada';
  if (leadGainerNoteEl) leadGainerNoteEl.textContent = leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin hari ini.` : 'Top movers belum lengkap.';
  if (leadSectorEl) leadSectorEl.textContent = best?.sector || best?.name || 'Finance';
  if (leadSectorNoteEl) leadSectorNoteEl.textContent = `${best?.sector||'Sektor'} rotasi ${pf(best?.change_pct ?? 1.2)}.`;
  if (chartBiasChip) chartBiasChip.textContent = adv === 0 && dec === 0 ? 'Data breadth belum tersedia' : adv >= dec ? 'Breadth mendukung' : 'Breadth melemah';
  if (chartReadout) chartReadout.textContent = `IHSG ${pf(Number(summary?.change_pct ?? 0))} · ${adv} adv vs ${dec} dec · ${planLine}`;
  document.getElementById('market-intel').innerHTML = [
    { kicker: 'Breadth', value: `${adv} vs ${dec}`, note: adv === 0 && dec === 0 ? 'Snapshot belum valid.' : `${tapeBias} untuk first glance.` },
    { kicker: 'Leader', value: leadGainer?.ticker || best?.sector || 'N/A', note: leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin.` : 'Fallback sektoral.' },
    { kicker: 'Sektor', value: `<a href="#sector/${encodeURIComponent(best?.sector||'Finance')}" class="text-up strong">${best?.sector||best?.name||'Finance'}</a>`, note: `${best?.sector||''} rotasi ${pf(best?.change_pct ?? 1.2)}.` },
    { kicker: 'Plan', value: Number(summary?.change_pct ?? 0) >= 0 ? 'Selektif' : 'Defensif', note: planLine }
  ].map(({ kicker, value, note }, idx)=>`<div class="dash-intel-card ${idx===0?'dash-intel-card-primary':''}"><span class="dash-intel-kicker">${kicker}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
}

async function loadMovers() {
  try {
  const res = await fetchTopMovers(5, 'gainers');
  const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
  const moversSummaryChip = document.getElementById('dash-movers-summary-chip');
  if (items.length) {
    const positiveCount = items.filter(item => Number(item.change_pct ?? 0) >= 0).length;
    if (moversSummaryChip) moversSummaryChip.textContent = `${positiveCount}/${items.length} positif`;
    document.getElementById('movers-list').innerHTML = items.slice(0,4).map((r, index) => row({
      ticker: r.ticker, name: r.name || r.sector || 'Ekuitas IDX', price: r.price ?? 0,
      change: r.change_pct ?? 0, perf_1w: r.perf_1w ?? 0, rank: index + 1,
    })).join('');
  } else {
    if (moversSummaryChip) moversSummaryChip.textContent = 'Data belum tersedia';
    document.getElementById('movers-list').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Belum ada data penggerak</strong><span class="dashboard-widget-state-note">Top movers akan muncul setelah scheduler memperbarui basis data.</span></div>';
  }
  } catch (e) { console.warn('loadMovers failed', e);
    document.getElementById('movers-list').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Gagal memuat data</strong><span class="dashboard-widget-state-note">Terjadi kesalahan saat mengambil data penggerak pasar.</span></div>';
  }
}

async function loadAiPickWidget() {
  const mount = document.getElementById('dash-ai-pick-widget');
  const summaryEl = document.getElementById('dash-ai-pick-summary');
  if (!mount) return;

  const wireFeaturedPickDetail = (featured, mode = 'swing') => {
    const detailButton = mount.querySelector('[data-dash-ai-pick-open-detail]');
    if (!detailButton || !featured?.ticker) return;
    detailButton.addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      const ticker = detailButton.getAttribute('data-dash-ai-pick-open-detail');
      if (!ticker) return;
      ssSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(featured, mode));
      window.location.hash = `#stock/${ticker}`;
    });
  };

  const wireAltPickDetails = (alternatives = [], mode = 'swing') => {
    mount.querySelectorAll('[data-dash-ai-pick-alt-detail]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        const ticker = button.getAttribute('data-dash-ai-pick-alt-detail');
        const item = alternatives.find(candidate => candidate.ticker === ticker);
        if (!ticker || !item) return;
        ssSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(item, mode));
        window.location.hash = `#stock/${ticker}`;
      });
    });
  };

  const payload = await fetchAiPicks('swing', 3).catch(() => null);
  const picks = Array.isArray(payload?.data) ? payload.data : [];

  const getSignal = (score) => {
    if (score == null) return 'HOLD';
    if (score >= 70) return 'BUY';
    if (score >= 40) return 'HOLD';
    return 'SELL';
  };

  const signalClass = (signal) => {
    if (signal === 'BUY') return 'text-up';
    if (signal === 'SELL') return 'text-down';
    return 'text-warn';
  };

  if (!picks.length) {
    if (summaryEl) summaryEl.textContent = 'Belum ada pick unggulan.';
    mount.innerHTML = '<div class="dashboard-widget-state" style="display:none"><strong class="dashboard-widget-state-title">AI Picks sementara kosong</strong></div>';
    return;
  }

  if (summaryEl) summaryEl.textContent = `${payload?.summary?.eligible_count || picks.length} kandidat lolos filter.`;
  // Compute AI Track Record from current picks
  const returns = picks.map(p => Number(p.change_pct) || 0).filter(v => v !== 0);
  const wins = returns.filter(r => r > 0).length;
  const avgRet = returns.length ? (returns.reduce((a, b) => a + b, 0) / returns.length) : 0;
  const best = returns.length ? Math.max(...returns) : 0;
  const worst = returns.length ? Math.min(...returns) : 0;
  const winRate = returns.length ? (wins / returns.length * 100) : 0;
  mount.innerHTML = `
    <!-- AI Track Record Mini Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;padding:10px 14px;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:12px">
      <div class="flex-col items-center"><span class="text-xs text-dim">Win Rate</span><strong class="mono ${winRate >= 50 ? 'text-up' : 'text-down'}" style="font-size:16px">${winRate.toFixed(0)}%</strong></div>
      <div class="flex-col items-center"><span class="text-xs text-dim">Rata-rata</span><strong class="mono ${avgRet >= 0 ? 'text-up' : 'text-down'}" style="font-size:16px">${avgRet > 0 ? '+' : ''}${avgRet.toFixed(1)}%</strong></div>
      <div class="flex-col items-center"><span class="text-xs text-dim">Best</span><strong class="mono text-up" style="font-size:16px">+${best.toFixed(1)}%</strong></div>
      <div class="flex-col items-center"><span class="text-xs text-dim">Worst</span><strong class="mono text-down" style="font-size:16px">${worst.toFixed(1)}%</strong></div>
    </div>
    <div class="dash-ai-picks-mini"></div>`;
  // Re-render card grid inside the .dash-ai-picks-mini container
  const miniContainer = mount.querySelector('.dash-ai-picks-mini');
  if (miniContainer) {
    miniContainer.innerHTML = `
      <div class="dash-ai-picks-mini-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${picks.slice(0, 3).map(item => {
          const signal = getSignal(item.score);
          const sClass = signalClass(signal);
          return `<div class="dash-ai-pick-mini-card" style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px;cursor:pointer;transition:all .15s;text-decoration:none;color:inherit" onclick="window.location.hash='#stock/${item.ticker}'" role="button" tabindex="0">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:16px;font-family:var(--font-mono);color:var(--text-main)">${item.ticker}</strong>
              <span class="mono strong ${sClass}" style="font-size:13px;padding:2px 10px;border-radius:6px;background:${signal === 'BUY' ? 'rgba(16,185,129,.12)' : signal === 'SELL' ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)'}">${signal}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.name || item.ticker}</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="mono strong ${Number(item.change_pct) >= 0 ? 'text-up' : 'text-down'}">${item.change_pct > 0 ? '+' : ''}${pf(item.change_pct)}</span>
              <span style="font-size:10px;color:var(--text-dim)">${item.fit_label || ''}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:right;margin-top:10px">
        <a href="#ai-picks" class="text-xs text-primary strong">Lihat Semua →</a>
      </div>`;
  }
}

async function loadNews(){
  try {
    const res = await fetchNews(3);
    const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
    if (items.length) {
      document.getElementById('news-container').innerHTML = items.slice(0,2).map((n, index) => `
        <a href="${n.link && n.link.startsWith('http') ? n.link : '#news'}" ${n.link && n.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="intel-item dash-news-card ${index===0?'dash-news-card-featured':''}">
          <span class="badge">${n.source||'NEWS'}</span>
          <b>${n.title}</b>
          <span class="dash-news-meta">${index===0?'Headline':'Brief'} · ${n.source||'NEWS'}</span>
          ${n.summary ? `<small>${String(n.summary).replace(/<[^>]+>/g,'').slice(0,72)}</small>` : ''}
        </a>`).join('');
    } else {
      document.getElementById('news-container').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Berita belum tersedia</strong><span class="dashboard-widget-state-note">Feed berita akan muncul setelah scheduler berjalan. Cek halaman Berita untuk update.</span></div>';
    }
  } catch (e) {
    console.warn('loadNews failed', e);
    document.getElementById('news-container').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Gagal memuat berita</strong><span class="dashboard-widget-state-note">Terjadi kesalahan saat mengambil feed berita. Silakan coba lagi.</span></div>';
  }
}

const row = (r) => `<a href="#stock/${r.ticker}" class="mover-row dash-mover-row">
  <div class="dash-mover-main">
    <span class="dash-mover-rank">#${r.rank || '—'}</span>
    <div><b class="mono">${r.ticker}</b><small>${r.name || ''}</small></div>
  </div>
  <div class="text-right">
    <b class="mono">${r.price == null ? '—' : nf(r.price,0)}</b>
    <small class="${r.change>=0?'text-up':'text-down'}">${pf(r.change)}</small>
    <small class="${r.perf_1w>=0?'text-up':'text-down'}">1W: ${pf(r.perf_1w)}</small>
  </div>
</a>`;

let ihsgChart;
const PERIOD_MAP = { '1W': '1W', '1M': '1M', '1Q': '1Q', '1Y': '1Y' };

async function loadIhsgChartData(period = '1M') {
  try {
    const chartRes = await fetchIhsgChart(period);
    if (chartRes && chartRes.data && chartRes.data.length > 0) return chartRes;
  } catch (e) { console.warn('IHSG chart fetch failed', e); }
  return null;
}

function initChart(summary) {
  const ctx = document.getElementById('ihsgMainChart');
  if (!ctx || typeof Chart === 'undefined') return;

  // Read theme-aware CSS custom properties from the document
  const style = getComputedStyle(document.documentElement);
  const primaryColor = style.getPropertyValue('--primary-color').trim() || '#10b981';
  const textDim = style.getPropertyValue('--text-dim').trim() || '#64748b';
  const borderSubtle = style.getPropertyValue('--border-subtle').trim() || 'rgba(255,255,255,.04)';

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const gradientColor = hexToRgba(primaryColor, 0.36);
  const gradientEnd = hexToRgba(primaryColor, 0);
  const gridColor = borderSubtle;

  const render = async (range = '1M') => {
    const chartRes = await loadIhsgChartData(range);
    let labels, data;

    if (chartRes && chartRes.data.length > 0) {
      labels = chartRes.data.map(p => {
        const d = new Date(p.date);
        return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
      });
      data = chartRes.data.map(p => p.value);
      const sub = document.getElementById('ihsg-chart-subtitle');
      if (sub) {
        const first = chartRes.data[0]?.date || '';
        const last = chartRes.data[chartRes.data.length - 1]?.date || '';
        sub.textContent = `IDX ${chartRes.period} · ${chartRes.count} points`;
        // Hide chart skeleton
        const chartSkel = document.querySelector('.dashboard-chart-wrap .skeleton-chart');
        if (chartSkel) chartSkel.style.display = 'none';
      }
    } else {
      const sub = document.getElementById('ihsg-chart-subtitle');
      if (sub) sub.textContent = 'Data IHSG menunggu scheduler.';
      // Hide skeleton and show empty state
      const chartSkel = document.querySelector('.dashboard-chart-wrap .skeleton-chart');
      if (chartSkel) chartSkel.style.display = 'none';
      const emptyEl = document.getElementById('ihsg-chart-empty');
      if (emptyEl) emptyEl.style.display = 'flex';
      const canvas = document.getElementById('ihsgMainChart');
      if (canvas) canvas.style.display = 'none';
      return;
    }

    const canvasHeight = ctx.height || 320;
    const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, canvasHeight);
    g.addColorStop(0, gradientColor);
    g.addColorStop(1, gradientEnd);
    if (ihsgChart) ihsgChart.destroy();
    ihsgChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: primaryColor, backgroundColor: g, borderWidth: 2, pointRadius: labels.length > 30 ? 0 : 2, fill: true, tension: .42 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `IHSG ${nf(c.parsed.y, 2)}` } } },
        scales: { x: { grid: { display: false }, ticks: { color: textDim, maxTicksLimit: 10 } }, y: { position: 'right', grid: { color: gridColor }, ticks: { color: textDim, callback: (v) => nf(v, 0) } } }
      }
    });
  };
  render('1M');
  document.querySelectorAll('.ihsg-range').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.ihsg-range').forEach(b => { b.classList.remove('btn-primary'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('btn-primary');
    btn.setAttribute('aria-pressed', 'true');
    render(btn.dataset.range);
  }));
}

// ─── Foreign Flow Card ────────────────────────────
async function loadForeignFlow() {
  const el = document.getElementById('foreign-flow-card');
  if (!el) return;
  try {
    const res = await apiFetch('/foreign-flow?limit=5');
    const items = res?.data || [];
    if (!items.length) {
      el.innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Belum ada data asing</strong><span class="dashboard-widget-state-note">Data foreign flow IDX belum tersedia untuk hari ini.</span></div>`;
      return;
    }
    const netCount = items.filter(i => Number(i.net_value) >= 0).length;
    const otherCount = items.length - netCount;
    const html = items.map(r => {
      const nv = Number(r.net_value || 0);
      const isUp = nv >= 0;
      const pct = nv > 0 ? 100 : (nv < 0 ? 0 : 50);
      const volLabel = `${nf(r.buy_volume/1e6,0)}J/${nf(r.sell_volume/1e6,0)}J`;
      return `<a href="#stock/${r.ticker}" class="scanner-row" style="padding:8px 12px">
        <div class="scanner-row-main">
          <div class="scanner-row-badge">${r.ticker.substring(0,2)}</div>
          <div class="scanner-row-copy">
            <div class="scanner-row-title"><span class="text-main scanner-row-ticker">${r.ticker}</span></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="flex-col items-end">
            <strong class="mono ${isUp ? 'text-up' : 'text-down'}">${isUp ? '▲' : '▼'} ${nf(Math.abs(nv/1e9), 1)}M</strong>
            <span class="text-xs text-dim">${volLabel} lot</span>
          </div>
          <div class="dash-movers-bar-wrap" style="width:60px;height:6px;background:var(--down-bg);border-radius:3px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:var(--up-color);border-radius:3px"></div>
          </div>
        </div>
      </a>`;
    }).join('');
    el.innerHTML = `<div class="text-xs text-dim mb-2">${netCount} net buy · ${otherCount} net sell</div><div id="foreign-flow-chart" style="height:140px;margin-bottom:8px"></div><div class="flex-col gap-1">${html}</div>`;
    // Render Chart.js bar chart if available
    renderForeignFlowChart(items);
  } catch (e) {
    console.warn('loadForeignFlow failed', e);
    el.innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Gagal memuat</strong><span class="dashboard-widget-state-note">Data foreign flow tidak tersedia.</span></div>`;
  }
}

function renderForeignFlowChart(items) {
  const canvas = document.getElementById('foreign-flow-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  // Destroy existing chart if any
  if (canvas._chart) { canvas._chart.destroy(); }
  const labels = items.map(r => r.ticker);
  const ctx = document.createElement('canvas');
  ctx.id = 'ff-chart-canvas';
  canvas.innerHTML = '';
  canvas.appendChild(ctx);
  const colors = items.map(r => Number(r.net_value) >= 0 ? '#10b98180' : '#f8717180');
  const borderColors = items.map(r => Number(r.net_value) >= 0 ? '#10b981' : '#f87171');
  canvas._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Net Foreign (Rp)',
        data: items.map(r => Number(r.net_value) / 1e9),
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y.toFixed(1)}M` } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#94a3b8', font: { size: 9 }, callback: v => `${v.toFixed(0)}M` } },
      },
    },
  });
}
// ─── Signal Widget ────────────────────────────
async function loadSignalWidget() {
  const el = document.getElementById('signal-widget-content');
  if (!el) return;
  try {
    const res = await apiFetch('/signals/summary?limit=0&days_back=30', { timeout: 8000 });
    const counts = res?.counts || {};
    const buy = counts.buy || 0;
    const sell = counts.sell || 0;
    const total = res?.total || 0;
    const ratio = sell > 0 ? ((buy / sell) * 100).toFixed(1) : '—';
    const max = Math.max(buy, sell, 1);
    el.innerHTML = `
      <div class="stat-tile" style="border:1px solid var(--border-subtle);border-radius:12px;padding:12px;background:var(--bg-panel)">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Total</div>
        <div style="font-size:24px;font-weight:800;font-family:var(--font-mono);margin-top:4px">${total}</div>
      </div>
      <div class="stat-tile" style="border:1px solid var(--border-subtle);border-radius:12px;padding:12px;background:var(--up-bg)">
        <div style="font-size:10px;color:var(--up-color);text-transform:uppercase;letter-spacing:.04em">BUY</div>
        <div style="font-size:24px;font-weight:800;font-family:var(--font-mono);color:var(--up-color);margin-top:4px">${buy}</div>
      </div>
      <div class="stat-tile" style="border:1px solid var(--border-subtle);border-radius:12px;padding:12px;background:var(--down-bg)">
        <div style="font-size:10px;color:var(--down-color);text-transform:uppercase;letter-spacing:.04em">SELL</div>
        <div style="font-size:24px;font-weight:800;font-family:var(--font-mono);color:var(--down-color);margin-top:4px">${sell}</div>
      </div>
      <div class="stat-tile" style="border:1px solid var(--border-subtle);border-radius:12px;padding:12px;background:var(--bg-panel)">
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">B/S Ratio</div>
        <div style="font-size:24px;font-weight:800;font-family:var(--font-mono);margin-top:4px">${ratio}</div>
      </div>
      <div style="grid-column:1/-1;height:6px;background:var(--border-subtle);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${(buy/max*100).toFixed(1)}%;background:var(--up-color);float:left;transition:width .5s ease"></div>
        <div style="height:100%;width:${(sell/max*100).toFixed(1)}%;background:var(--down-color);float:left;transition:width .5s ease"></div>
      </div>
      <div style="grid-column:1/-1;text-align:center;font-size:11px;color:var(--text-dim);margin-top:2px">
        Sinyal 30 hari terakhir · <a href="#signal_overview" style="color:var(--primary-color)">Lihat detail →</a>
      </div>`;
  } catch (e) {
    console.warn('loadSignalWidget failed', e);
    el.innerHTML = '<div class="dashboard-widget-state" style="grid-column:1/-1"><strong class="dashboard-widget-state-title">Gagal memuat sinyal</strong></div>';
  }
}
// ─── Market Narrative ──────────────────────────
async function loadMarketNarrative() {
  const textEl = document.getElementById('market-narrative-text');
  const metaEl = document.getElementById('market-narrative-meta');
  if (!textEl) return;
  try {
    const [summary, breadth] = await Promise.all([
      fetchMarketSummary().catch(() => null),
      fetchMarketBreadth().catch(() => null),
    ]);
    const s = summary?.value != null ? summary : null;
    const b = breadth?.data || {};
    const adv = Number(b.advancing ?? 0);
    const dec = Number(b.declining ?? 0);
    const total = adv + dec + Number(b.unchanged ?? 0);
    if (!s) {
      textEl.textContent = 'Data pasar belum tersedia. Silakan tunggu jadwal sinkronisasi harian.';
      if (metaEl) metaEl.innerHTML = '';
      return;
    }
    const v = s.value;
    const cp = Number(s.change_pct ?? 0);
    const sign = cp >= 0 ? 'menguat' : 'melemah';
    const arrow = cp >= 0 ? '▲' : '▼';
    const parts = [`IHSG ${nf(v, 2)} ${sign} ${pf(Math.abs(cp))} pada ${s.data_date || 'hari ini'}.`];
    if (total > 0) {
      const advPct = total > 0 ? ((adv / total) * 100).toFixed(0) : 0;
      const decPct = total > 0 ? ((dec / total) * 100).toFixed(0) : 0;
      parts.push(`Dari ${total} saham aktif, ${adv} menguat (${advPct}%), ${dec} melemah (${decPct}%).`);
      if (cp >= 0 && adv >= dec) parts.push('Breadth mendukung — sentimen positif dominan.');
      else if (cp < 0 && dec > adv) parts.push('Tekanan jual meluas — selektivitas penting.');
      else parts.push('Divergensi breadth — perhatikan sektor defensif.');
    } else {
      parts.push('Data breadth belum tersedia.');
    }
    textEl.textContent = parts.join(' ');
    if (metaEl) metaEl.innerHTML = `<span class="badge badge-neutral badge-mini">Narasi otomatis</span> <span class="text-dim">${arrow} IHSG ${pf(cp)}</span>`;
  } catch (e) {
    console.warn('loadMarketNarrative failed', e);
    textEl.textContent = 'Gagal memuat narasi pasar.';
  }
}

// ─── P&L Widget ────────────────────────────
async function loadPnlWidget() {
  const labelEl = document.getElementById('dash-pnl-label');
  const noteEl = document.getElementById('dash-pnl-note');
  const cardEl = document.getElementById('dash-pnl-card');
  if (!labelEl || !noteEl) return;

  try {
    const [summaryRes, txnRes] = await Promise.all([
      apiFetch('/portfolio/summary', { timeout: 5000 }).catch(() => null),
      apiFetch('/portfolio/transactions/pnl', { timeout: 5000 }).catch(() => null),
    ]);

    const summary = summaryRes?.data;
    const txn = txnRes?.data;

    const totalValue = summary?.current_value || 0;
    const pnl = summary?.pnl || 0;
    const pnlPct = summary?.pnl_pct || 0;
    const totalInvested = summary?.total_invested || 0;
    const realizedPnl = txn?.realized_pnl || 0;

    const hasData = totalValue > 0 || totalInvested > 0;

    if (!hasData) {
      // Check if there are any transactions (realized P&L)
      if (realizedPnl !== 0 || (txn?.total_buy_cost || 0) > 0) {
        labelEl.textContent = `Realisasi ${money(Math.abs(realizedPnl))}`;
        labelEl.className = realizedPnl >= 0 ? 'up' : 'down';
        noteEl.textContent = `Realized P&L dari transaksi`;
        cardEl.className = `dash-summary-card ${realizedPnl >= 0 ? '' : 'down'}`;
      } else {
        labelEl.textContent = '—';
        noteEl.textContent = 'Belum ada portofolio. Tambah posisi di halaman Portofolio.';
        cardEl.className = 'dash-summary-card';
      }
      return;
    }

    // Format the display
    const pnlSign = pnl >= 0 ? '+' : '';
    const pnlClass = pnl >= 0 ? 'up' : 'down';
    const pnlPctSign = pnlPct >= 0 ? '+' : '';
    labelEl.textContent = `${pnlSign}${money(Math.abs(pnl))}`;
    labelEl.className = pnlClass;
    noteEl.innerHTML = `${pnlPctSign}${pf(Math.abs(pnlPct))} · Total ${money(totalValue)}`;
    cardEl.className = `dash-summary-card ${pnlClass}`;

    // Add a small progress bar
    const barEl = document.createElement('div');
    barEl.className = 'dash-pnl-bar';
    const barPct = Math.min(Math.abs(pnlPct) / 20 * 100, 100); // Cap at 20% change
    barEl.innerHTML = `<div style="height:3px;border-radius:2px;background:${pnl >= 0 ? 'var(--up-color)' : 'var(--down-color)'};width:${barPct}%;margin-top:4px;transition:width .5s"></div>`;
    cardEl?.appendChild(barEl);

  } catch (e) {
    console.warn('loadPnlWidget failed', e);
    labelEl.textContent = 'Gagal';
    noteEl.textContent = 'Data portofolio tidak tersedia.';
  }
}

// ─── Mini Heatmap Widget ────────────────────────────
async function loadMiniHeatmapWidget() {
  const dashBottomGrid = document.querySelector('.dash-bottom-grid-phase2');
  if (!dashBottomGrid) return;

  // Check if already rendered
  if (document.getElementById('dash-mini-heatmap')) return;

  try {
    const res = await apiFetch('/sectors/performance', { timeout: 8000 });
    const sectors = res?.sectors || [];
    if (!sectors.length) return;

    // Sort by 1d return
    const sorted = [...sectors].sort((a, b) => (b.avg_returns?.['1d'] || 0) - (a.avg_returns?.['1d'] || 0));

    // Create heatmap HTML
    const items = sorted.slice(0, 12).map(s => {
      const ret = s.avg_returns?.['1d'] || 0;
      const isUp = ret >= 0;
      const intensity = Math.min(Math.abs(ret) / 5, 1); // 0-1 scale, 5% = max
      const r = isUp ? Math.round(34 + (22 - 34) * intensity) : Math.round(248 + (239 - 248) * (1 - intensity));
      const g = isUp ? Math.round(211 - 180 * intensity) : Math.round(113 + (68 - 113) * (1 - intensity));
      const b = isUp ? Math.round(153 - 130 * intensity) : Math.round(113 + (70 - 113) * (1 - intensity));
      const bg = isUp ? `rgba(${r},${g},${b},${0.15 + 0.35 * intensity})` : `rgba(${r},${g},${b},${0.15 + 0.35 * (1 - intensity)})`;
      const color = isUp ? `rgb(${Math.round(34 - 15 * intensity)}, ${Math.round(211 + 20 * intensity)}, ${Math.round(153 - 20 * intensity)})`
        : `rgb(${Math.round(248 + 5 * intensity)}, ${Math.round(113 - 20 * intensity)}, ${Math.round(113 - 20 * intensity)})`;

      return `<a href="#sector/${encodeURIComponent(s.sector)}" class="dash-heatmap-item" style="background:${bg};color:${color};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;border-radius:8px;text-align:center;gap:2px;text-decoration:none;font-size:11px;font-weight:600;min-height:60px">
        <span style="font-size:9px;opacity:.8;line-height:1.2">${String(s.sector).slice(0, 12)}</span>
        <span style="font-size:13px">${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%</span>
      </a>`;
    }).join('');

    const widget = document.createElement('div');
    widget.id = 'dash-mini-heatmap';
    widget.className = 'panel';
    widget.style.marginTop = '14px';
    widget.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="panel-title" style="margin:0">🗂️ Heatmap Sektor</h3>
        <a href="#market" class="text-xs text-primary strong">Lihat Semua</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${items}</div>
      <div style="margin-top:8px;text-align:center;font-size:10px;color:var(--text-dim)">Performa 1 hari · Ukuran berdasarkan perubahan %</div>`;

    dashBottomGrid.appendChild(widget);
  } catch (e) {
    console.warn('loadMiniHeatmapWidget failed', e);
  }
}
// ─── Market Briefing Widget (18.3) ──────────────
async function loadMarketBriefing() {
  const textEl = document.getElementById('market-briefing-text');
  const metaEl = document.getElementById('market-briefing-meta');
  if (!textEl) return;
  try {
    const res = await apiFetch('/market/briefing');
    if (res?.ok && res?.content) {
      textEl.textContent = res.content;
      const sent = res.sentiment || 'neutral';
      const sentEmoji = sent === 'bullish' ? '🟢' : sent === 'bearish' ? '🔴' : '⚪';
      const source = res.source === 'cache' ? 'cached' : 'AI';
      if (metaEl) metaEl.innerHTML = `<span class="badge badge-${sent === 'bullish' ? 'up' : sent === 'bearish' ? 'down' : 'neutral'} badge-mini" style="font-size:10px">${sentEmoji} ${sent}</span> <span class="text-dim">${source} • ${res.date || ''}</span>`;
    } else if (res?.state === 'disabled') {
      textEl.textContent = '🔑 Atur API key OpenRouter di Settings > AI untuk mengaktifkan ringkasan pasar.';
      if (metaEl) metaEl.innerHTML = '';
    } else {
      textEl.textContent = 'Ringkasan pasar belum tersedia. Coba refresh.';
      if (metaEl) metaEl.innerHTML = '<span class="text-dim">Belum ada data</span>';
    }
  } catch (e) {
    console.warn('loadMarketBriefing failed', e);
    textEl.textContent = 'Gagal memuat ringkasan pasar.';
    if (metaEl) metaEl.innerHTML = '<span class="text-dim">Error</span>';
  }
}
// ─── Refresh Btn ────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#briefing-refresh-btn');
  if (btn) {
    const textEl = document.getElementById('market-briefing-text');
    if (textEl) textEl.textContent = 'Memperbarui ringkasan...';
    apiFetch('/market/briefing', { method: 'POST' }).then(res => {
      if (res?.ok) loadMarketBriefing();
      else {
        if (textEl) textEl.textContent = 'Gagal memperbarui. Coba lagi.';
      }
    });
  }
});
