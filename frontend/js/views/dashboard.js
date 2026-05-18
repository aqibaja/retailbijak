import { fetchNews, fetchMarketSummary, fetchSectorSummary, fetchTopMovers, fetchIhsgChart, fetchMarketBreadth, fetchAiPicks } from '../api.js?v=20260518H';
import { observeElements, animateValue } from '../main.js?v=20260518H';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';

const SUGGESTION_PRESETS = [
  { ticker: 'BBCA', reason: 'Relative strength bertahan di atas pivot harian.' },
  { ticker: 'BMRI', reason: 'Bank besar tetap jadi fokus saat tape defensif.' },
  { ticker: 'GOTO', reason: 'Momentum aktif untuk trader agresif intraday.' },
  { ticker: 'BRPT', reason: 'Rotasi sektor dan volatility cocok untuk watchlist cepat.' },
  { ticker: 'TLKM', reason: 'Quality defensive name untuk pullback map.' },
  { ticker: 'ANTM', reason: 'Komoditas tetap menarik saat flow sektor bergeser.' },
];

const nf = (n, d = 2) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: d });
const pf = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${Number(n ?? 0).toFixed(2)}%`;

function safeSessionStorageSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

function buildAiPickContext(item, mode = 'swing') {
  return JSON.stringify({
    ticker: item?.ticker || '', mode, source_route: '#dashboard', source_label: 'Top AI Pick Today',
    score: item?.score ?? null, confidence: item?.confidence || null, fit_label: item?.fit_label || '',
    entry_zone: item?.entry_zone ?? null, target_zone: item?.target_zone ?? null, invalidation: item?.invalidation ?? null,
    reason_labels: Array.isArray(item?.reason_labels) ? item.reason_labels.slice(0, 3) : [], risk_note: item?.risk_note || '',
  });
}

export async function renderDashboard(root) {
  document.title = `RetailBijak — ${t('dashboard.title')}`;
  root.innerHTML = `
  <section class="dashboard-pro stagger-reveal" aria-label="${t('dashboard.market_dashboard')}">
    <div class="dash-hero-pro panel">
      <div class="dash-copy">
        <div class="screener-kicker">${t('dashboard.workspace')}</div>
        <h1>${t('dashboard.market_dashboard')}</h1>
        <p class="dash-hero-lead">${t('dashboard.monitor_ihsg')}</p>
        <div class="dash-actions dash-actions-compact">
          <a href="#screener" class="btn btn-primary dash-primary-cta">${t('dashboard.run_screener')}</a>
          <a href="#market" class="btn dash-secondary-cta">${t('dashboard.market_overview')}</a>
        </div>
        <div class="dash-summary-strip dash-summary-strip-compact dash-mobile-stack" aria-live="polite" aria-atomic="true">
          <div class="dash-summary-card">
            <span>${t('dashboard.market_bias')}</span>
            <strong id="dash-bias-label">${t('dashboard.loading_data')}</strong>
            <small id="dash-bias-note">${t('dashboard.preparing_breadth')}</small>
          </div>
          <div class="dash-summary-card">
            <span>${t('dashboard.top_gainer')}</span>
            <strong id="dash-lead-gainer">${t('dashboard.loading_data')}</strong>
            <small id="dash-lead-gainer-note">${t('dashboard.waiting_movers')}</small>
          </div>
          <div class="dash-summary-card">
            <span>${t('dashboard.top_sector')}</span>
            <strong id="dash-lead-sector">${t('dashboard.loading_data')}</strong>
            <small id="dash-lead-sector-note">${t('dashboard.sector_rotation')}</small>
          </div>
        </div>
      </div>
      <div class="dash-quote-card dash-mobile-status" aria-live="polite" aria-atomic="true">
        <div class="dash-quote-meta"><span class="badge" id="market-fold-badge">${t('dashboard.syncing')}</span><span class="mono text-xs text-dim" id="market-fold-status">${t('dashboard.loading_data')}</span></div>
        <div class="text-xs text-dim mb-2" id="market-data-date">${t('dashboard.ihsg_data')}</div>
        <div class="text-xs text-dim uppercase strong">${t('dashboard.ihsg')}</div>
        <div class="flex justify-between items-end gap-3" role="group" aria-label="IHSG nilai dan perubahan"><div class="mono strong dash-big" id="ihsg-value">—</div><div class="mono strong text-up" id="ihsg-change">—</div></div>
        <div class="dashboard-metrics mt-3"><div><span>${t('dashboard.open')}</span><strong id="ihsg-open">—</strong></div><div><span>${t('dashboard.high')}</span><strong id="ihsg-high" class="text-up">—</strong></div><div><span>${t('dashboard.low')}</span><strong id="ihsg-low" class="text-down">—</strong></div></div>
        <div class="dash-quote-freshness" id="dash-quote-freshness">${t('dashboard.sync_status')}</div>
      </div>
    </div>

    <div class="dash-grid-pro dash-mobile-shell">
      <div class="panel dash-chart-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">${t('dashboard.ihsg_chart')}</h3><p class="text-xs text-dim" id="ihsg-chart-subtitle">${t('dashboard.chart_data')}</p></div>
          <div class="dashboard-chip-row" role="group" aria-label="Rentang waktu grafik">
            <button class="btn btn-mini ihsg-range" data-range="1W" aria-pressed="false">${t('dashboard.chart_range_1w')}</button>
            <button class="btn btn-primary btn-mini ihsg-range" data-range="1M" aria-pressed="true">${t('dashboard.chart_range_1m')}</button>
            <button class="btn btn-mini ihsg-range" data-range="1Q" aria-pressed="false">${t('dashboard.chart_range_1q')}</button>
          </div>
        </div>
        <div class="dash-chart-context"><span class="dash-chart-context-chip" id="dash-chart-bias-chip">${t('dashboard.bias_calculated')}</span><strong id="dash-chart-readout">${t('dashboard.ihsg_readout')}</strong></div>
        <div class="dashboard-chart-wrap"><div class="skeleton skeleton-chart" aria-hidden="true"></div><canvas id="ihsgMainChart" role="img" aria-label="Grafik pergerakan IHSG"></canvas></div>
      </div>
      <div class="panel dash-movers-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">${t('dashboard.top_movers')}</h3><div class="dash-movers-summary"><span class="dash-movers-summary-chip" id="dash-movers-summary-chip">${t('dashboard.tape_loaded')}</span></div></div>
          <a href="#market" class="text-xs text-primary strong">${t('dashboard.view_all')}</a>
        </div>
        <div id="movers-list" class="flex-col gap-2" aria-live="polite">
          <div class="skeleton skeleton-card skeleton-h-80"></div>
          <div class="skeleton skeleton-card skeleton-h-80"></div>
          <div class="skeleton skeleton-card skeleton-h-80"></div>
        </div>
      </div>
    </div>

    <div class="dash-bottom-grid dash-bottom-grid-phase2 dash-bottom-grid-mobile">
      <div class="panel"><h3 class="panel-title mb-3">${t('dashboard.market_intel')}</h3><div id="market-intel" class="intel-list" aria-live="polite">
        <div class="skeleton skeleton-card skeleton-h-80"></div>
        <div class="skeleton skeleton-card skeleton-h-80"></div>
      </div></div>
      <div class="panel"><h3 class="panel-title mb-3">${t('dashboard.ai_picks')}</h3><div id="dash-ai-pick-summary" class="text-xs text-muted mb-2" aria-live="polite">${t('dashboard.preparing_picks')}</div><div id="dash-ai-pick-widget" aria-live="polite">
        <div class="skeleton skeleton-card skeleton-h-110"></div>
      </div></div>
      <div class="panel"><h3 class="panel-title mb-3">${t('dashboard.latest_news')}</h3><div id="news-container" class="intel-list" aria-live="polite">
        <div class="skeleton skeleton-card skeleton-h-80"></div>
        <div class="skeleton skeleton-card skeleton-h-80"></div>
      </div></div>
    </div>
  </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const [market] = await Promise.all([loadMarketSummary(), loadNews(), loadIntel(), loadMovers(), loadAiPickWidget()]);
  initChart(market);
  setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.dataset.val || '0'), 900)), 100);
}

async function loadMarketSummary() {
  try {
  const summary = await fetchMarketSummary();
  const isLive = summary && summary.status !== 'no_data' && summary.value;
  document.getElementById('market-fold-status').textContent = isLive ? 'DB SYNCED' : 'IDX REFERENCE';
  document.getElementById('market-fold-badge').textContent = isLive ? 'DB' : 'REF';
  const dataDate = summary?.data_date || (summary?.updated_at ? String(summary.updated_at).slice(0,10) : null);
  const dateEl = document.getElementById('market-data-date');
  if (dateEl) dateEl.textContent = dataDate ? t('dashboard.data_date', { date: dataDate }) : t('dashboard.data_unavailable');
  const freshnessEl = document.getElementById('dash-quote-freshness');
  if (freshnessEl) freshnessEl.textContent = dataDate ? t('dashboard.sync_date', { date: dataDate }) : t('dashboard.sync_waiting');
  const v = summary?.value ?? null, c = Number(summary?.change_pct ?? 0);
  document.getElementById('ihsg-value').textContent = v != null ? nf(v, 2) : '—';
  const ch = document.getElementById('ihsg-change'); ch.innerHTML = v != null ? `<span aria-hidden="true">${c >= 0 ? '▲' : '▼'}</span> <span>${pf(Math.abs(c)).replace('+', '')}</span>` : '—'; ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
  document.getElementById('ihsg-open').textContent = summary?.open != null ? nf(summary.open) : '—';
  document.getElementById('ihsg-high').textContent = summary?.high != null ? nf(summary.high) : '—';
  document.getElementById('ihsg-low').textContent = summary?.low != null ? nf(summary.low) : '—';
  const biasLabel = document.getElementById('dash-bias-label');
  const biasNote = document.getElementById('dash-bias-note');
  if (biasLabel) biasLabel.textContent = v == null ? t('dashboard.waiting_snapshot') : c >= 0 ? t('dashboard.risky_tape') : t('dashboard.defensive_tape');
  if (biasNote) biasNote.textContent = v == null ? t('dashboard.summary_incomplete') : c >= 0 ? t('dashboard.momentum_bias', { change: pf(c) }) : t('dashboard.defensive_bias', { change: pf(c) });
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
  if (biasLabel) biasLabel.textContent = adv === 0 && dec === 0 ? t('dashboard.need_breadth') : adv >= dec ? t('dashboard.risky_tape') : t('dashboard.defensive_tape');
  if (leadGainerEl) leadGainerEl.textContent = leadGainer?.ticker || t('dashboard.no_data_yet');
  if (leadGainerNoteEl) leadGainerNoteEl.textContent = leadGainer ? `${pf(leadGainer.change_pct ?? 0)} ${t('dashboard.leading_today')}` : t('dashboard.waiting_movers');
  if (leadSectorEl) leadSectorEl.textContent = best?.sector || best?.name || 'Finance';
  if (leadSectorNoteEl) leadSectorNoteEl.textContent = `${best?.sector||'Sektor'} ${t('dashboard.sector_rotation_label')} ${pf(best?.change_pct ?? 1.2)}.`;
  if (chartBiasChip) chartBiasChip.textContent = adv === 0 && dec === 0 ? t('dashboard.data_unavailable') : adv >= dec ? 'Breadth mendukung' : 'Breadth melemah';
  if (chartReadout) chartReadout.textContent = `IHSG ${pf(Number(summary?.change_pct ?? 0))} · ${adv} adv vs ${dec} dec · ${planLine}`;
  document.getElementById('market-intel').innerHTML = [
    { kicker: t('dashboard.breadth_label'), value: `${adv} vs ${dec}`, note: adv === 0 && dec === 0 ? t('dashboard.data_unavailable') : `${tapeBias} untuk first glance.` },
    { kicker: t('dashboard.leader_label'), value: leadGainer?.ticker || best?.sector || 'N/A', note: leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin.` : t('dashboard.leader_fallback') },
    { kicker: t('dashboard.sector_label'), value: best?.sector||best?.name||'Finance', note: `${best?.sector||''} rotasi ${pf(best?.change_pct ?? 1.2)}.` },
    { kicker: t('dashboard.plan_label'), value: Number(summary?.change_pct ?? 0) >= 0 ? t('dashboard.plan_selective') : t('dashboard.plan_defensive'), note: planLine }
  ].map(({ kicker, value, note }, idx)=>`<div class="dash-intel-card ${idx===0?'dash-intel-card-primary':''}"><span class="dash-intel-kicker">${kicker}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
}

async function loadMovers() {
  try {
  const res = await fetchTopMovers(5, 'gainers');
  const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
  const moversSummaryChip = document.getElementById('dash-movers-summary-chip');
  if (items.length) {
    const positiveCount = items.filter(item => Number(item.change_pct ?? 0) >= 0).length;
    if (moversSummaryChip) moversSummaryChip.textContent = t('dashboard.positive_count', { positive: positiveCount, total: items.length });
    document.getElementById('movers-list').innerHTML = items.slice(0,4).map((r, index) => row({
      ticker: r.ticker, name: r.name || r.sector || t('dashboard.equity_idx'), price: r.price ?? 0,
      change: r.change_pct ?? 0, rank: index + 1,
    })).join('');
  } else {
    if (moversSummaryChip) moversSummaryChip.textContent = t('dashboard.data_unavailable');
    document.getElementById('movers-list').innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">${t('dashboard.no_movers_data')}</strong><span class="dashboard-widget-state-note">${t('dashboard.movers_after_scheduler')}</span></div>`;
  }
  } catch (e) { console.warn('loadMovers failed', e);
    document.getElementById('movers-list').innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">${t('dashboard.load_failed')}</strong><span class="dashboard-widget-state-note">${t('dashboard.error_loading_movers')}</span></div>`;
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
      safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(featured, mode));
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
        safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(item, mode));
        window.location.hash = `#stock/${ticker}`;
      });
    });
  };

  const payload = await fetchAiPicks('swing', 3).catch(() => null);
  const picks = Array.isArray(payload?.data) ? payload.data : [];
  const featured = picks[0];

  if (!featured) {
    if (summaryEl) summaryEl.textContent = t('dashboard.no_featured_pick');
    mount.innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">${t('dashboard.ai_picks_empty')}</strong><span class="dashboard-widget-state-note">${t('dashboard.ai_picks_thin_universe')}</span><a href="#ai-picks" class="btn btn-secondary portfolio-action-btn mt-10">${t('dashboard.open_ai_picks')}</a></div>`;
    return;
  }

  if (summaryEl) summaryEl.textContent = t('dashboard.candidates_passed', { count: payload?.summary?.eligible_count || picks.length });
  const alternatives = picks.slice(1, 3);
  mount.innerHTML = `
    <div class="dash-ai-pick-featured">
      <a href="#ai-picks" class="dash-ai-pick-featured-link">
        <div class="dash-ai-pick-head">
          <div>
            <span class="dash-intel-kicker">${t('dashboard.featured')} · ${featured.ticker}</span>
            <strong>${featured.name || featured.ticker}</strong>
          </div>
          <div class="dash-ai-pick-score">${nf(featured.score, 1)}</div>
        </div>
        <p class="dash-ai-pick-fit">${featured.fit_label || t('dashboard.best_candidate_swing')}</p>
        <div class="dash-ai-pick-metrics">
          <div><span>${t('dashboard.confidence')}</span><strong>${featured.confidence || '-'}</strong></div>
          <div><span>${t('dashboard.change')}</span><strong>${pf(featured.change_pct ?? 0)}</strong></div>
          <div><span>${t('dashboard.volume')}</span><strong>${nf(featured.volume_ratio, 2)}x</strong></div>
        </div>
        <div class="dash-ai-pick-summary">
          <span>${featured.reason_labels?.[0] || t('dashboard.liquidity_technical_support')}</span>
        </div>
      </a>
      ${alternatives.length ? `
        <div class="dash-ai-pick-alt-list">
          ${alternatives.map(item => `
            <button class="dash-ai-pick-alt-item" data-dash-ai-pick-alt-detail="${item.ticker}">
              <span class="dash-ai-pick-alt-ticker">${item.ticker}</span>
              <strong>${nf(item.score, 1)}</strong>
              <small>${item.reason_labels?.[0] || item.fit_label || ''}</small>
            </button>`).join('')}
        </div>` : ''}
      <div class="dash-ai-pick-cta-row">
        <button class="btn" data-dash-ai-pick-open-detail="${featured.ticker}">${t('dashboard.open_detail')}</button>
        <a href="#ai-picks" class="dash-ai-pick-cta">${t('dashboard.open_ai_picks')}</a>
      </div>
    </div>`;
  wireFeaturedPickDetail(featured, payload?.mode || 'swing');
  wireAltPickDetails(alternatives, payload?.mode || 'swing');
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
          <span class="dash-news-meta">${index===0?t('dashboard.headline'):t('dashboard.brief')} · ${n.source||'NEWS'}</span>
          ${n.summary ? `<small>${String(n.summary).replace(/<[^>]+>/g,'').slice(0,72)}</small>` : ''}
        </a>`).join('');
    } else {
      document.getElementById('news-container').innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">${t('dashboard.news_unavailable')}</strong><span class="dashboard-widget-state-note">${t('dashboard.news_after_scheduler')}</span></div>`;
    }
  } catch (e) {
    console.warn('loadNews failed', e);
    document.getElementById('news-container').innerHTML = `<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">${t('dashboard.load_failed')}</strong><span class="dashboard-widget-state-note">${t('dashboard.error_loading_news')}</span></div>`;
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
      // Hide skeleton even on empty data so canvas fallback is visible
      const chartSkel = document.querySelector('.dashboard-chart-wrap .skeleton-chart');
      if (chartSkel) chartSkel.style.display = 'none';
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
