import { fetchMarketSummary, fetchTopMovers, apiFetch } from '../api.js?v=20260501f';
import { observeElements } from '../main.js?v=20260501a';

const fmt = (n, digits = 2) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: digits });
const pct = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${Number(n ?? 0).toFixed(2)}%`;
const safeRows = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

async function fetchCorporateActions() { return apiFetch('/corporate-actions?limit=12') || { count: 0, data: [], source: 'no_data' }; }
async function fetchCompanyAnnouncements() { return apiFetch('/company-announcements?limit=8') || { count: 0, data: [], source: 'no_data' }; }
async function fetchForeignTrading() { return apiFetch('/foreign-trading?limit=8') || { count: 0, data: [], source: 'no_data' }; }
async function fetchBrokerActivity() { return apiFetch('/broker-activity?limit=8') || { count: 0, data: [], source: 'no_data' }; }
async function fetchBreadth() { return apiFetch('/market-breadth') || { count: 0, data: {}, source: 'no_data' }; }
async function fetchStats() { return apiFetch('/market-stats') || { count: 0, data: {}, source: 'no_data' }; }

const badge = (label) => `<span class="market-tag">${label}</span>`;
const statBox = (label, value, tone = '', valueClass = '', labelClass = '') => `<div class="market-stat-box ${tone}"><div class="market-stat-label ${labelClass}">${label}</div><div class="market-stat-value ${valueClass}">${value}</div></div>`;
const breadthStatBox = (advancing, declining) => `<div class="market-stat-box market-stat-box-breadth"><div class="market-stat-label">Breadth</div><div class="market-stat-value market-stat-value-breadth"><span>${advancing ?? 0}</span><span class="market-breadth-separator">/</span><span class="market-breadth-secondary">${declining ?? 0}</span></div></div>`;
const card = (title, subtitle, body, accent = 'var(--accent-indigo)') => `
  <section class="market-card" style="--market-accent:${accent}">
    <header class="market-card-head">
      <h3>${title}</h3>
      <p>${subtitle}</p>
    </header>
    <div class="market-card-body">${body}</div>
  </section>`;
const loadingShell = (label = 'Loading market intelligence...') => `
  <div class="market-loading-shell" role="status" aria-live="polite" aria-busy="true">
    <div class="market-loading-ring"></div>
    <div class="market-loading-copy">
      <strong>${label}</strong>
      <span>Menyiapkan breadth, movers, flows, dan corporate intelligence.</span>
    </div>
  </div>`;

const moverRow = (r) => `<a href="#stock/${r.ticker || ''}" class="market-row-link"><div class="market-row"><div><div class="market-code">${r.ticker || '-'}</div><div class="market-sub">${r.name || ''}</div></div><div class="market-right"><div class="market-change ${Number(r.change_pct ?? 0) >= 0 ? 'is-up' : 'is-down'}">${pct(r.change_pct)}</div><div class="market-sub">${r.price != null ? fmt(r.price) : '--'}</div></div></div></a>`;
const flowRow = (r) => `<div class="market-row-box"><div class="market-row"><div><div class="market-code">${r.ticker || '-'}</div><div class="market-sub">${r.source || 'IDX'}</div></div><div class="market-right"><div class="market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="market-sub">buy ${fmt(r.buy_value ?? 0, 0)} / sell ${fmt(r.sell_value ?? 0, 0)}</div></div></div></div>`;
const brokerRow = (r) => `<div class="market-row-box"><div class="market-row"><div><div class="market-code">${r.broker_code || '-'}</div><div class="market-sub">${r.ticker || '-'}</div></div><div class="market-right"><div class="market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="market-sub">vol ${fmt(r.net_volume ?? 0, 0)}</div></div></div></div>`;
const actionRow = (r) => `<div class="market-row-box"><div class="market-row market-row-top"><div><div class="market-code market-code-wrap">${r.title || '-'}</div><div class="market-sub">${r.code || ''} ${r.date || ''}</div></div>${badge(String(r.type || 'event').toUpperCase())}</div></div>`;

export async function renderMarket(root) {
  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <header class="market-overview-head">
        <div>
          <h1>Market Overview</h1>
          <p>Live IDX intelligence: movers, breadth, stats, foreign flow, broker activity, announcements, and corporate actions.</p>
          <p id="market-summary-sentence" class="market-summary-sentence">Menyusun ringkasan market pulse...</p>
        </div>
        <div class="market-head-status">
          <div id="market-source" class="market-source-badge">SYNCING</div>
          <button id="market-refresh" class="market-refresh-btn" type="button">Refresh</button>
        </div>
      </header>

      <div id="market-loading" class="market-loading-wrap">${loadingShell()}</div>
      <div id="market-content" class="market-content-wrap" hidden>
        <section class="market-top-grid">
          <div id="ihsg-summary-card"></div>
          <div id="market-pulse-card"></div>
        </section>
        <div id="stats-cards" class="market-stats-grid"></div>

        <div class="market-main-grid">
          <div class="market-left-col">
            <div id="breadth-card"></div>
            <div id="corporate-actions"></div>
            <div id="foreign-flows"></div>
            <div id="broker-activity"></div>
          </div>
          <div class="market-right-col">
            <div id="gainers-card"></div>
            <div id="losers-card"></div>
            <div id="announcements-card"></div>
          </div>
        </div>
      </div>
    </section>`;

  observeElements();
  const loadingEl = document.getElementById('market-loading');
  const contentEl = document.getElementById('market-content');
  if (loadingEl && contentEl) {
    loadingEl.hidden = false;
    contentEl.hidden = true;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const settle = (p) => Promise.resolve(p).then((value) => ({ ok: true, value })).catch((error) => ({ ok: false, error, value: null }));
  const loadingTimeout = window.setTimeout(() => {
    if (loadingEl && contentEl && !contentEl.dataset.marketReady) {
      loadingEl.hidden = true;
      contentEl.hidden = false;
    }
  }, 3500);

  const [summary, movers, actions, announcements, foreign, brokers, breadth, stats] = await Promise.all([
    settle(fetchMarketSummary()),
    settle(fetchTopMovers(8)),
    settle(fetchCorporateActions()),
    settle(fetchCompanyAnnouncements()),
    settle(fetchForeignTrading()),
    settle(fetchBrokerActivity()),
    settle(fetchBreadth()),
    settle(fetchStats()),
  ]);

  const unwrap = (entry) => (entry?.ok ? entry.value : null);
  const summaryData = unwrap(summary);
  const moversData = unwrap(movers);
  const actionsData = unwrap(actions);
  const announcementsData = unwrap(announcements);
  const foreignData = unwrap(foreign);
  const brokersData = unwrap(brokers);
  const breadthData = unwrap(breadth);
  const statsData = unwrap(stats);

  const srcParts = [summaryData?.source, actionsData?.source, announcementsData?.source, foreignData?.source, brokersData?.source, breadthData?.source, statsData?.source]
    .filter(Boolean)
    .map((part) => String(part).toUpperCase().replaceAll('_', ' '));
  const srcSummary = srcParts.length > 3 ? `${srcParts.slice(0, 3).join(' · ')} +${srcParts.length - 3}` : (srcParts.join(' · ') || 'NO DATA');
  const badgeEl = document.getElementById('market-source');
  if (badgeEl) badgeEl.textContent = `${srcSummary} · ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const b = breadthData?.data || {};
  const leadGainer = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) >= 0);
  const leadLoser = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) < 0);
  const pulseEl = document.getElementById('market-summary-sentence');
  if (pulseEl) {
    pulseEl.textContent = `Pulse: ${b.advancing ?? 0} advancers vs ${b.declining ?? 0} decliners. ${leadGainer?.ticker || 'N/A'} memimpin gainers ${leadGainer ? pct(leadGainer.change_pct) : ''} dan ${leadLoser?.ticker || 'N/A'} tertekan ${leadLoser ? pct(leadLoser.change_pct) : ''}.`;
  }
  const refreshBtn = document.getElementById('market-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => renderMarket(root));
  if (loadingEl && contentEl) {
    loadingEl.hidden = true;
    contentEl.hidden = false;
  }
  root.querySelectorAll('[data-market-refresh="1"]').forEach((btn) => {
    btn.addEventListener('click', () => renderMarket(root));
  });
  const ihsg = summaryData?.value;
  const ihsgChange = summaryData?.change_pct;
  document.getElementById('ihsg-summary-card').innerHTML = `<section class="market-card market-card-hero" style="--market-accent:var(--accent-indigo)">
    <header class="market-card-head market-hero-head">
      <div>
        <div class="market-hero-kicker">Primary market snapshot</div>
        <h3>IHSG Snapshot</h3>
        <p>Ringkasan indeks utama sesi berjalan</p>
      </div>
      <div class="market-hero-badge ${Number(ihsgChange ?? 0) >= 0 ? 'is-up' : 'is-down'}">${ihsgChange != null ? pct(ihsgChange) : '--'}</div>
    </header>
    <div class="market-card-body">
      <div class="market-ihsg-row">
        <div class="market-ihsg-main">
          <div class="market-ihsg-value">${ihsg != null ? fmt(ihsg, 1) : '--'}</div>
          <div class="market-sub market-ihsg-sub">${summaryData?.date || 'Live session'}</div>
        </div>
        <div class="market-hero-summary">${b.advancing ?? 0} advancers · ${b.declining ?? 0} decliners · ${b.unchanged ?? 0} flat</div>
      </div>
    </div>
  </section>`;
  document.getElementById('market-pulse-card').innerHTML = card(
    'Market Pulse',
    'Fokus cepat desktop untuk market breadth dan movers',
    `<div class="market-pulse-grid">
      <div class="market-pulse-kpis">
        ${breadthStatBox(b.advancing, b.declining)}
        ${statBox('Lead Gainer', leadGainer?.ticker || '--', '', 'market-stat-value-ticker')}
        ${statBox('Lead Loser', leadLoser?.ticker || '--', '', 'market-stat-value-ticker')}
      </div>
      <div class="market-pulse-panels">
        <div class="market-mini-panel is-up"><div class="market-mini-label">Top Gainer</div><div class="market-mini-code">${leadGainer?.ticker || '--'}</div><div class="market-mini-value">${leadGainer ? pct(leadGainer.change_pct) : '--'}</div></div>
        <div class="market-mini-panel is-down"><div class="market-mini-label">Top Loser</div><div class="market-mini-code">${leadLoser?.ticker || '--'}</div><div class="market-mini-value">${leadLoser ? pct(leadLoser.change_pct) : '--'}</div></div>
      </div>
    </div>`,
    'var(--accent-cyan)'
  );

  document.getElementById('stats-cards').innerHTML = [
    statBox('Avg Price', statsData?.data?.avg_price != null ? fmt(statsData.data.avg_price) : '--'),
    statBox('Advancing', b.advancing ?? 0, 'is-positive'),
    statBox('Declining', b.declining ?? 0, 'is-negative'),
  ].join('');

  document.getElementById('breadth-card').innerHTML = card(
    'Market Breadth',
    'Advancers vs decliners today',
    `<div class="market-breadth-grid">${statBox('Advance', b.advancing ?? 0)}${statBox('Decline', b.declining ?? 0)}${statBox('Flat', b.unchanged ?? 0)}</div>
     <div class="market-split-list"><div><div class="market-list-title">Top Advancers</div><div class="market-list-stack">${(b.advancers || []).slice(0, 4).map(moverRow).join('') || '<div class="market-empty">No advancers.</div>'}</div></div><div><div class="market-list-title">Top Decliners</div><div class="market-list-stack">${(b.decliners || []).slice(0, 4).map(moverRow).join('') || '<div class="market-empty">No decliners.</div>'}</div></div></div>`
  );

  const allMovers = Array.isArray(moversData?.data) ? moversData.data : [];
  const gainers = allMovers.filter((x) => Number(x.change_pct) >= 0).slice(0, 4);
  const losers = allMovers.filter((x) => Number(x.change_pct) < 0).slice(0, 4);

  document.getElementById('gainers-card').innerHTML = card('Top Gainers', 'Best performing stocks today', `<div class="market-list-stack">${gainers.map(moverRow).join('') || '<div class="market-empty">No gainers available.</div>'}</div>`, 'var(--accent-cyan)');
  document.getElementById('losers-card').innerHTML = card('Top Losers', 'Weakest performing stocks today', `<div class="market-list-stack">${losers.map(moverRow).join('') || '<div class="market-empty">No losers available.</div>'}</div>`, 'var(--text-down)');
  document.getElementById('corporate-actions').innerHTML = card('Corporate Actions', 'Listing, dividend, suspension, and other company events from IDX', `<div class="market-list-stack">${safeRows(actionsData).slice(0, 4).map(actionRow).join('') || '<div class="market-empty">No corporate actions available.</div>'}</div>`);
  document.getElementById('foreign-flows').innerHTML = card('Foreign Investor Flows', 'Live IDX trading summary for foreign participation', `<div class="market-list-stack">${safeRows(foreignData).slice(0, 4).map(flowRow).join('') || '<div class="market-empty">No foreign flow data available.</div>'}</div>`, 'var(--text-up)');
  const brokerRows = safeRows(brokersData).slice(0, 4).map(brokerRow).join('');
  const brokerEmpty = `<div class="market-empty market-empty-alive"><strong>Broker activity belum tersedia saat ini.</strong><span>Menggunakan snapshot IDX terakhir jika tersedia. Coba refresh untuk sinkronisasi terbaru.</span><button class="market-empty-refresh" type="button" data-market-refresh="1">Refresh data</button></div>`;
  document.getElementById('broker-activity').innerHTML = card('Broker Trading Activity', 'Top broker concentration and net value from IDX broker summary', `<div class="market-list-stack">${brokerRows || brokerEmpty}</div>`, 'var(--accent-orange)');
  document.getElementById('announcements-card').innerHTML = card('Corporate News & Announcements', 'Company notices pulled from IDX announcement endpoint', `<div class="market-list-stack">${safeRows(announcementsData).slice(0, 4).map(actionRow).join('') || '<div class="market-empty">No announcements available.</div>'}</div>`);

  contentEl.dataset.marketReady = '1';
  window.clearTimeout(loadingTimeout);

  root.querySelectorAll('[data-market-refresh="1"]').forEach((btn) => {
    btn.addEventListener('click', () => renderMarket(root));
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
