import { fetchMarketSummary, fetchTopMovers, apiFetch } from '../api.js?v=20260502a';
import { observeElements } from '../main.js?v=20260502c';

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
const breadthStatBox = (advancing, declining) => `<div class="market-stat-box market-stat-box-breadth"><div class="market-stat-label">Breadth</div><div class="market-stat-value market-stat-value-breadth"><span>${advancing ?? 0}</span><span class="market-breadth-separator">/</span><span class="market-breadth-secondary">${declining ?? 0}</span></div><div class="market-stat-footnote">${breadthInsight(advancing, declining)}</div></div>`;
const compactSource = (value) => String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const emptyState = (title, note, cta = 'Refresh data') => `<div class="market-empty market-empty-rich"><strong>${title}</strong><span>${note}</span><button class="market-empty-refresh" type="button" data-market-refresh="1">${cta}</button></div>`;
const freshnessTone = (sources = []) => {
  const cleaned = sources.filter(Boolean).map((item) => String(item).toLowerCase());
  if (!cleaned.length || cleaned.every((item) => item === 'no_data')) return { label: 'Partial Data', tone: 'is-muted', note: 'Sebagian panel belum memiliki snapshot valid.' };
  if (cleaned.some((item) => item === 'no_data')) return { label: 'Mixed Sources', tone: 'is-warn', note: 'Sebagian panel live, sebagian masih fallback atau kosong.' };
  if (cleaned.some((item) => item.includes('live'))) return { label: 'Live Session', tone: 'is-up', note: 'Mayoritas panel sudah memakai feed sesi berjalan.' };
  return { label: 'Data Delayed', tone: 'is-down', note: 'Snapshot tersedia, tetapi belum seluruhnya live sesi berjalan.' };
};
const dataQualityMarkup = (freshness, sourcesLabel) => `<div class="market-data-quality ${freshness.tone}"><div class="market-data-quality-label">Data Quality</div><strong>${freshness.label}</strong><span>${freshness.note}</span><small>${sourcesLabel}</small></div>`;
const marketMood = (summaryValue, breadthValue, topWinner, topLoser) => {
  const adv = Number(breadthValue?.advancing ?? 0);
  const dec = Number(breadthValue?.declining ?? 0);
  const ihsgChange = Number(summaryValue?.change_pct ?? 0);
  const winner = Number(topWinner?.change_pct ?? 0);
  const loser = Number(topLoser?.change_pct ?? 0);
  if (adv > dec * 1.2 && ihsgChange > 0.35) return { label: 'Broad Rally', tone: 'is-up', note: `${adv} saham menguat, risk appetite memimpin.` };
  if (dec > Math.max(adv * 1.6, adv + 120) && ihsgChange < -0.35) return { label: 'Risk-off', tone: 'is-down', note: `${dec} saham turun, tekanan pasar dominan.` };
  if (winner >= 9 && loser <= -9) return { label: 'High Dispersion', tone: '', note: 'Pemenang dan pecundang ekstrem bergerak bersamaan.' };
  return { label: 'Mixed Tape', tone: '', note: 'Arah pasar campuran, perlu seleksi saham ketat.' };
};
const breadthInsight = (advancing, declining) => {
  const adv = Number(advancing ?? 0);
  const dec = Number(declining ?? 0);
  if (adv > 0 && dec > 0) return `rasio ${dec > 0 ? (adv / dec).toFixed(2) : '0.00'}:1`;
  if (adv > 0) return 'semua fokus ke sisi naik';
  if (dec > 0) return 'tekanan turun dominan';
  return 'menunggu breadth valid';
};
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

const moverRow = (r, rank = null) => `<a href="#stock/${r.ticker || ''}" class="market-row-link market-ranked-row"><div class="market-row"><div class="market-row-main"><div class="market-rank-badge">${rank != null ? `#${rank}` : '#'}</div><div><div class="market-code">${r.ticker || '-'}</div><div class="market-sub market-sub-clamp">${r.name || ''}</div></div></div><div class="market-right"><div class="market-change ${Number(r.change_pct ?? 0) >= 0 ? 'is-up' : 'is-down'}">${pct(r.change_pct)}</div><div class="market-sub">${r.price != null ? fmt(r.price) : '--'}</div></div></div></a>`;
const flowRow = (r) => `<div class="market-row-box"><div class="market-row"><div><div class="market-code">${r.ticker || '-'}</div><div class="market-sub">${r.source || 'IDX'}</div></div><div class="market-right"><div class="market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="market-sub market-flow-chip">buy ${fmt(r.buy_value ?? 0, 0)} / sell ${fmt(r.sell_value ?? 0, 0)}</div></div></div></div>`;
const brokerRow = (r) => `<div class="market-row-box"><div class="market-row"><div><div class="market-code">${r.broker_code || '-'}</div><div class="market-sub">${r.ticker || '-'}</div></div><div class="market-right"><div class="market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="market-sub market-flow-chip">vol ${fmt(r.net_volume ?? 0, 0)}</div></div></div></div>`;
const actionRow = (r) => `<div class="market-row-box"><div class="market-row market-row-top"><div><div class="market-code market-code-wrap">${r.title || '-'}</div><div class="market-catalyst-meta"><span class="market-catalyst-chip">${r.code || '-'}</span><span class="market-sub">${r.date || ''}</span></div></div>${badge(String(r.type || 'event').toUpperCase())}</div></div>`;

export async function renderMarket(root) {
  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <header class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-title-row">
            <h1>Market Overview</h1>
            <span id="market-session-pill" class="market-session-pill">Syncing</span>
          </div>
          <p>Command center untuk pulse market IDX, movers utama, aliran dana, dan katalis sesi berjalan.</p>
          <p id="market-summary-sentence" class="market-summary-sentence">Menyusun ringkasan market pulse...</p>
          <div id="market-meta-rail" class="market-meta-rail">
            <span id="market-source" class="market-source-badge">SYNCING</span>
            <span id="market-updated" class="market-meta-chip">Updated --:-- WIB</span>
            <span id="market-sources-inline" class="market-meta-chip">Sources: loading</span>
          </div>
        </div>
        <div class="market-head-status">
          <div id="market-data-quality"></div>
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
          <section class="market-section-group market-section-group-internals">
            <header class="market-section-group-head">
              <div class="market-section-group-title">Market Internals</div>
              <p>Struktur breadth dan mover utama untuk membaca kesehatan pasar.</p>
            </header>
            <div class="market-section-group-grid market-section-group-grid-internals">
              <div id="breadth-card"></div>
              <div id="gainers-card"></div>
              <div id="losers-card"></div>
            </div>
          </section>
          <section class="market-section-group market-section-group-flow">
            <header class="market-section-group-head">
              <div class="market-section-group-title">Flow & Participation</div>
              <p>Aliran dana dan keterlibatan broker untuk mengukur partisipasi sesi.</p>
            </header>
            <div class="market-section-group-grid">
              <div id="foreign-flows"></div>
              <div id="broker-activity"></div>
            </div>
          </section>
          <section class="market-section-group market-section-group-catalyst">
            <header class="market-section-group-head">
              <div class="market-section-group-title">Catalysts & Events</div>
              <p>Katalis korporasi dan announcement yang berpotensi menggerakkan harga.</p>
            </header>
            <div class="market-section-group-grid">
              <div id="corporate-actions"></div>
              <div id="announcements-card"></div>
            </div>
          </section>
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
  const freshness = freshnessTone([summaryData?.source, actionsData?.source, announcementsData?.source, foreignData?.source, brokersData?.source, breadthData?.source, statsData?.source]);
  const srcSummary = srcParts.length > 3 ? `${srcParts.slice(0, 3).join(' · ')} +${srcParts.length - 3}` : (srcParts.join(' · ') || 'NO DATA');
  const badgeEl = document.getElementById('market-source');
  const updatedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (badgeEl) badgeEl.textContent = srcParts[0] ? `${compactSource(srcParts[0])}${srcParts.length > 1 ? ` +${srcParts.length - 1}` : ''}` : 'No data';
  const updatedEl = document.getElementById('market-updated');
  if (updatedEl) updatedEl.textContent = `Updated ${updatedAt} WIB`;
  const sourcesInlineEl = document.getElementById('market-sources-inline');
  if (sourcesInlineEl) sourcesInlineEl.textContent = `Sources: ${srcParts.slice(0, 3).map(compactSource).join(', ') || 'No data'}`;
  const dataQualityEl = document.getElementById('market-data-quality');
  if (dataQualityEl) dataQualityEl.innerHTML = dataQualityMarkup(freshness, srcSummary);

  const b = breadthData?.data || {};
  const leadGainer = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) >= 0);
  const leadLoser = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) < 0);
  const mood = marketMood(summaryData, b, leadGainer, leadLoser);
  const sessionPillEl = document.getElementById('market-session-pill');
  if (sessionPillEl) {
    sessionPillEl.textContent = freshness.label;
    sessionPillEl.className = `market-session-pill ${freshness.tone}`;
  }
  const pulseEl = document.getElementById('market-summary-sentence');
  if (pulseEl) {
    pulseEl.textContent = `Tekanan pasar ${Number(b.declining ?? 0) > Number(b.advancing ?? 0) ? 'masih dominan' : 'lebih seimbang'}: ${b.advancing ?? 0} naik vs ${b.declining ?? 0} turun, dipimpin ${leadGainer?.ticker || 'N/A'} (${leadGainer ? pct(leadGainer.change_pct) : '--'}) sementara ${leadLoser?.ticker || 'N/A'} melemah ${leadLoser ? pct(leadLoser.change_pct) : '--'}.`;
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
      <div class="market-hero-metrics">
        <div class="market-hero-metric"><span>Net change</span><strong>${ihsgChange != null ? pct(ihsgChange) : '--'}</strong></div>
        <div class="market-hero-metric"><span>Breadth ratio</span><strong>${breadthInsight(b.advancing, b.declining)}</strong></div>
        <div class="market-hero-metric"><span>Flat count</span><strong>${b.unchanged ?? 0}</strong></div>
      </div>
    </div>
  </section>`;
  document.getElementById('market-pulse-card').innerHTML = card(
    'Market Pulse',
    'Ringkasan cepat untuk breadth, pemenang, pecundang, dan mood sesi.',
    `<div class="market-pulse-grid">
      <div class="market-pulse-kpis market-pulse-kpis-four">
        ${breadthStatBox(b.advancing, b.declining)}
        ${statBox('Top Winner', leadGainer?.ticker || '--', '', 'market-stat-value-ticker')}
        ${statBox('Top Loser', leadLoser?.ticker || '--', '', 'market-stat-value-ticker')}
        <div class="market-stat-box market-mood-box market-mood-box-wide ${mood.tone}"><div class="market-stat-label">Market Mood</div><div class="market-stat-value market-mood-value">${mood.label}</div><div class="market-stat-footnote">${mood.note}</div></div>
      </div>
      <div class="market-pulse-panels market-pulse-panels-compact">
        <div class="market-mini-panel is-up"><div class="market-mini-panel-head"><div class="market-mini-label">Top Winner</div><div class="market-mini-code">${leadGainer?.ticker || '--'}</div></div><div class="market-mini-value">${leadGainer ? pct(leadGainer.change_pct) : '--'}</div><div class="market-mini-footnote">${leadGainer?.price != null ? `Rp ${fmt(leadGainer.price)}` : 'Harga belum tersedia'}</div></div>
        <div class="market-mini-panel is-down"><div class="market-mini-panel-head"><div class="market-mini-label">Top Loser</div><div class="market-mini-code">${leadLoser?.ticker || '--'}</div></div><div class="market-mini-value">${leadLoser ? pct(leadLoser.change_pct) : '--'}</div><div class="market-mini-footnote">${leadLoser?.price != null ? `Rp ${fmt(leadLoser.price)}` : 'Harga belum tersedia'}</div></div>
      </div>
    </div>`,
    'var(--accent-cyan)'
  );

  document.getElementById('stats-cards').innerHTML = [
    statBox('Breadth Ratio', breadthInsight(b.advancing, b.declining), '', 'market-stat-value-ratio'),
    statBox('Advancing', b.advancing ?? 0, 'is-positive'),
    statBox('Declining', b.declining ?? 0, 'is-negative'),
  ].join('');

  document.getElementById('breadth-card').innerHTML = card(
    'Market Breadth',
    'Advancers vs decliners today',
    `<div class="market-breadth-visual" aria-label="Market breadth distribution">
      <div class="market-breadth-bar">
        <span class="market-breadth-fill is-up" style="width:${Math.max(8, ((Number(b.advancing ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%"></span>
        <span class="market-breadth-fill is-flat" style="width:${Math.max(6, ((Number(b.unchanged ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%"></span>
        <span class="market-breadth-fill is-down" style="width:${Math.max(8, ((Number(b.declining ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%"></span>
      </div>
      <div class="market-breadth-caption">${b.advancing ?? 0} naik / ${b.declining ?? 0} turun / ${b.unchanged ?? 0} flat · ${Number(b.declining ?? 0) > Number(b.advancing ?? 0) ? 'Breadth negatif luas, tekanan dominan di mayoritas saham.' : 'Partisipasi penguatan lebih sehat dibanding tekanan jual.'}</div>
    </div>
    <div class="market-breadth-grid">${statBox('Advance', b.advancing ?? 0)}${statBox('Decline', b.declining ?? 0)}${statBox('Flat', b.unchanged ?? 0)}</div>
     <div class="market-split-list"><div><div class="market-list-title">Top Advancers</div><div class="market-list-stack">${(b.advancers || []).slice(0, 4).map((row, index) => moverRow(row, index + 1)).join('') || '<div class="market-empty">No advancers.</div>'}</div></div><div><div class="market-list-title">Top Decliners</div><div class="market-list-stack">${(b.decliners || []).slice(0, 4).map((row, index) => moverRow(row, index + 1)).join('') || '<div class="market-empty">No decliners.</div>'}</div></div></div>`
  );

  const allMovers = Array.isArray(moversData?.data) ? moversData.data : [];
  const gainers = allMovers.filter((x) => Number(x.change_pct) >= 0).slice(0, 4);
  const losers = allMovers.filter((x) => Number(x.change_pct) < 0).slice(0, 4);

  document.getElementById('gainers-card').innerHTML = card('Top Gainers', 'Best performing stocks today', `<div class="market-list-stack">${gainers.map((row, index) => moverRow(row, index + 1)).join('') || emptyState('Belum ada top gainer yang tervalidasi.', 'Data mover belum lengkap untuk menyusun daftar penguatan sesi ini.')}</div>`, 'var(--accent-cyan)');
  document.getElementById('losers-card').innerHTML = card('Top Losers', 'Weakest performing stocks today', `<div class="market-list-stack">${losers.map((row, index) => moverRow(row, index + 1)).join('') || emptyState('Belum ada top loser yang tervalidasi.', 'Snapshot pelemahan market belum cukup lengkap untuk ditampilkan.')}</div>`, 'var(--text-down)');
  document.getElementById('corporate-actions').innerHTML = card('Corporate Actions', 'Listing, dividend, suspension, and other company events from IDX', `<div class="market-section-summary">${safeRows(actionsData).length ? `${safeRows(actionsData).length} event terbaru untuk dipantau di sesi ini.` : 'Belum ada event korporasi yang menonjol untuk sesi ini.'}</div><div class="market-list-stack">${safeRows(actionsData).slice(0, 4).map(actionRow).join('') || emptyState('Belum ada corporate action yang relevan.', 'Pantau lagi setelah sinkronisasi IDX berikutnya untuk event korporasi terbaru.')}</div>`);
  document.getElementById('foreign-flows').innerHTML = card('Foreign Investor Flows', 'Live IDX trading summary for foreign participation', `<div class="market-section-summary">${safeRows(foreignData).length ? `${safeRows(foreignData).filter((row) => Number(row.net_value ?? 0) >= 0).length} saham net buy asing, ${safeRows(foreignData).filter((row) => Number(row.net_value ?? 0) < 0).length} saham net sell asing.` : 'Belum ada snapshot foreign flow yang valid untuk sesi ini.'}</div><div class="market-list-stack">${safeRows(foreignData).slice(0, 4).map(flowRow).join('') || emptyState('Belum ada foreign flow yang tervalidasi.', 'Feed foreign participation belum mengirim snapshot yang cukup untuk sesi ini.')}</div>`, 'var(--text-up)');
  const brokerRows = safeRows(brokersData).slice(0, 4).map(brokerRow).join('');
  const brokerEmpty = emptyState('Belum ada snapshot broker yang valid untuk sesi ini.', 'Menggunakan snapshot IDX terakhir jika tersedia. Coba refresh untuk sinkronisasi terbaru.');
  document.getElementById('broker-activity').innerHTML = card('Broker Trading Activity', 'Top broker concentration and net value from IDX broker summary', `<div class="market-section-summary">${safeRows(brokersData).length ? `${safeRows(brokersData).filter((row) => Number(row.net_value ?? 0) >= 0).length} broker dominan akumulasi, ${safeRows(brokersData).filter((row) => Number(row.net_value ?? 0) < 0).length} broker distribusi.` : 'Menunggu snapshot broker yang tervalidasi dari sumber IDX.'}</div><div class="market-list-stack">${brokerRows || brokerEmpty}</div>`, 'var(--accent-orange)');
  document.getElementById('announcements-card').innerHTML = card('Corporate News & Announcements', 'Company notices pulled from IDX announcement endpoint', `<div class="market-section-summary">${safeRows(announcementsData).length ? `${safeRows(announcementsData).length} pengumuman perusahaan terbaru tersedia untuk review cepat.` : 'Belum ada announcement baru yang berhasil ditarik.'}</div><div class="market-list-stack">${safeRows(announcementsData).slice(0, 4).map(actionRow).join('') || emptyState('Belum ada announcement terbaru yang tervalidasi.', 'Endpoint pengumuman belum mengembalikan item baru untuk sesi ini.')}</div>`);

  contentEl.dataset.marketReady = '1';
  window.clearTimeout(loadingTimeout);

  root.querySelectorAll('[data-market-refresh="1"]').forEach((btn) => {
    btn.addEventListener('click', () => renderMarket(root));
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
