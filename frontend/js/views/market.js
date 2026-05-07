import { fetchMarketSummary, fetchTopMovers, apiFetch, loadTVWidget, getTVTheme } from '../api.js?v=20260507J';
import { observeElements, registerViewTimer } from '../main.js?v=20260507J';
import { fmt, pct, fmtRp, nf, pf } from '../utils/format.js?v=20260507J';

const safeRows = (payload) => (Array.isArray(payload?.data) ? payload.data : []);

async function fetchCorporateActions() { return apiFetch('/corporate-actions?limit=6') || { count: 0, data: [], source: 'no_data' }; }
async function fetchCompanyAnnouncements() { return apiFetch('/company-announcements?limit=6') || { count: 0, data: [], source: 'no_data' }; }
async function fetchForeignTrading() { return apiFetch('/foreign-trading?limit=6') || { count: 0, data: [], source: 'no_data' }; }
async function fetchBrokerActivity() { return apiFetch('/broker-activity?limit=6') || { count: 0, data: [], source: 'no_data' }; }
async function fetchBreadth() { return apiFetch('/market-breadth') || { count: 0, data: {}, source: 'no_data' }; }
async function fetchStats() { return apiFetch('/market-stats') || { count: 0, data: {}, source: 'no_data' }; }

const badge = (label, cls = '') => {
  const badgeClassMap = {
    'LISTING': 'badge-corporate', 'DIVIDEND': 'badge-news', 'SUSPENSION': 'badge-warn',
    'CORPORATE': 'badge-corporate', 'EVENT': 'badge-dim',
  };
  const bCls = badgeClassMap[label] || cls || 'badge-dim';
  return `<span class=\"market-tag ${bCls}\">${label}</span>`;
};
const statBox = (label, value, tone = '', valueClass = '', labelClass = '') => `<div class=\"market-stat-box ${tone}\"><div class=\"market-stat-label ${labelClass}\">${label}</div><div class=\"market-stat-value ${valueClass}\">${value}</div></div>`;
const breadthStatBox = (advancing, declining) => `<div class=\"market-stat-box market-stat-box-breadth\"><div class=\"market-stat-label\">Breadth</div><div class=\"market-stat-value market-stat-value-breadth\"><span>${advancing ?? 0}</span><span class=\"market-breadth-separator\">/</span><span class=\"market-breadth-secondary\">${declining ?? 0}</span></div><div class=\"market-stat-footnote\">${breadthInsight(advancing, declining)}</div></div>`;
const compactSource = (value) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const emptyState = (title, note, cta = 'Muat ulang data') => `<div class=\"market-empty market-empty-rich\"><div class=\"market-empty-icon\">\u26a0\ufe0f</div><strong>${title}</strong><span>${note}</span><button class=\"market-empty-refresh\" type=\"button\" data-market-refresh=\"1\">${cta}</button></div>`;
const freshnessTone = (sources = []) => {
  const cleaned = sources.filter(Boolean).map((item) => String(item).toLowerCase());
  if (!cleaned.length || cleaned.every((item) => item === 'no_data')) return { label: 'Data Parsial', tone: 'is-muted', note: 'Sebagian panel belum memiliki snapshot valid.' };
  if (cleaned.some((item) => item === 'no_data')) return { label: 'Sumber Campuran', tone: 'is-warn', note: 'Sebagian panel live, sebagian masih fallback atau kosong.' };
  if (cleaned.some((item) => item.includes('live'))) return { label: 'Sesi Live', tone: 'is-up', note: 'Mayoritas panel sudah memakai feed sesi berjalan.' };
  return { label: 'Data Tertunda', tone: 'is-down', note: 'Snapshot tersedia, tetapi belum seluruhnya live sesi berjalan.' };
};
const dataQualityMarkup = (freshness, sourcesLabel) => `<div class=\"market-data-quality ${freshness.tone}\"><div class=\"market-data-quality-label\">Kualitas Data</div><strong>${freshness.label}</strong><span>${freshness.note}</span><small>${sourcesLabel}</small></div>`;
const marketMood = (summaryValue, breadthValue, topWinner, topLoser) => {
  const adv = Number(breadthValue?.advancing ?? 0);
  const dec = Number(breadthValue?.declining ?? 0);
  const ihsgChange = Number(summaryValue?.change_pct ?? 0);
  const winner = Number(topWinner?.change_pct ?? 0);
  const loser = Number(topLoser?.change_pct ?? 0);
  if (adv > dec * 1.2 && ihsgChange > 0.35) return { label: 'Reli Luas', tone: 'is-up', note: `${adv} saham menguat, minat risiko memimpin.` };
  if (dec > Math.max(adv * 1.6, adv + 120) && ihsgChange < -0.35) return { label: 'Tekanan Jual', tone: 'is-down', note: `${dec} saham turun, tekanan pasar dominan.` };
  if (winner >= 9 && loser <= -9) return { label: 'Dispersi Tinggi', tone: '', note: 'Pemenang dan pecundang ekstrem bergerak bersamaan.' };
  return { label: 'Mixed/Sideways', tone: '', note: 'Arah pasar campuran, perlu seleksi saham ketat.' };
};
const breadthInsight = (advancing, declining) => {
  const adv = Number(advancing ?? 0);
  const dec = Number(declining ?? 0);
  if (adv > 0 && dec > 0) return `rasio ${dec > 0 ? (adv / dec).toFixed(2) : '0.00'}:1`;
  if (adv > 0) return 'fokus penuh ke sisi naik';
  if (dec > 0) return 'tekanan turun dominan';
  return 'menunggu breadth valid';
};
const card = (title, subtitle, body, accent = 'var(--accent-indigo)') => `
  <section class=\"market-card\" style=\"--market-accent:${accent}\">
    <header class=\"market-card-head\">
      <h3>${title}</h3>
      <p>${subtitle}</p>
    </header>
    <div class=\"market-card-body\">${body}</div>
  </section>`;
const skeletonCard = () => `<div class=\"market-card-skeleton\"><div class=\"skeleton-shimmer skeleton-title\"></div><div class=\"skeleton-shimmer skeleton-text\"></div><div class=\"skeleton-shimmer skeleton-block\"></div></div>`;
const loadingShell = (label = 'Memuat intel pasar...') => `
  <div class=\"market-loading-shell\" role=\"status\" aria-live=\"polite\" aria-busy=\"true\">
    <div class=\"market-loading-pulse\"><div class=\"market-loading-pulse-inner\"></div></div>
    <div class=\"market-loading-copy\">
      <strong>${label}</strong>
      <span>Menyiapkan breadth, movers, flows, dan corporate intelligence.</span>
    </div>
  </div>`;

const moverRow = (r, rank = null) => `<a href=\"#stock/${r.ticker || ''}\" class=\"market-row-link market-ranked-row\"><div class=\"market-row\"><div class=\"market-row-main\"><div class=\"market-rank-badge\">${rank != null ? `#${rank}` : '#'}</div><div><div class=\"market-code\">${r.ticker || '-'}</div><div class=\"market-sub market-sub-clamp\">${r.name || ''}</div></div></div><div class=\"market-right\"><div class=\"market-change ${Number(r.change_pct ?? 0) >= 0 ? 'is-up' : 'is-down'}\">${Number(r.change_pct ?? 0) >= 0 ? '▲' : '▼'} ${pct(r.change_pct).replace('+','')}</div><div class=\"market-sub\">${r.price != null ? fmt(r.price) : '--'}</div></div></div></a>`;
const flowRow = (r) => {
  const sourceDisplay = r.source === 'derived'
    ? `<span class=\"market-catalyst-chip\"><span title=\"Data turunan dari transaksi crossing/negosiasi\">derived (info)</span></span>`
    : `<span class=\"market-catalyst-chip\">${r.source || 'IDX'}</span>`;
  return `<div class=\"market-row-box\"><div class=\"market-row\"><div class=\"market-row-main\"><div><div class=\"market-row-kicker\">Foreign</div><div class=\"market-code\">${r.ticker || '-'}</div><div class=\"market-row-meta\">${sourceDisplay}<span class=\"market-sub market-flow-chip\">beli ${fmtRp(r.buy_value)} / jual ${fmtRp(r.sell_value)}</span></div></div></div><div class=\"market-right\"><div class=\"market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}\">${Number(r.net_value ?? 0) >= 0 ? '▲' : '▼'} ${fmtRp(Math.abs(Number(r.net_value ?? 0)))}</div><div class=\"market-row-value-note\">Asing net ${Number(r.net_value ?? 0) >= 0 ? 'beli' : 'jual'}</div></div></div></div>`;
};
const brokerNames = {
  'DRV01': 'Yuanta', 'DRV02': 'Bahana', 'DRV03': 'BNI Sekuritas',
  'DRV04': 'Mirae Asset', 'DRV05': 'Mandiri Sekuritas', 'DRV06': 'UBS Sekuritas',
  'DRV07': 'Maybank', 'DRV08': 'Danareksa', 'DRV09': 'Trimegah',
  'DRV10': 'Samuel', 'DRV11': 'Sinarmas', 'DRV12': 'CGSIM',
  'DRV13': 'JP Morgan', 'DRV14': 'Macquarie', 'DRV15': 'CLSA',
  'DRV16': 'Credit Suisse', 'DRV17': 'DBS Vickers', 'DRV18': 'Morgan Stanley',
  'DRV19': 'Nomura', 'DRV20': 'Goldman Sachs',
};
const brokerRow = (r) => {
  const name = brokerNames[r.broker_code] || '';
  const nameHtml = name ? `<span class=\"market-sub\">${name}</span>` : '';
  return `<div class=\"market-row-box\"><div class=\"market-row\"><div class=\"market-row-main\"><div><div class=\"market-row-kicker\">Broker</div><div class=\"market-code\">${r.broker_code || '-'} ${nameHtml}</div><div class=\"market-row-meta\"><span class=\"market-catalyst-chip\">${r.ticker || '-'}</span><span class=\"market-sub market-flow-chip\">Net ${fmt(r.net_volume ?? 0, 0)}</span></div></div></div><div class=\"market-right\"><div class=\"market-change ${Number(r.net_value ?? 0) >= 0 ? 'is-up' : 'is-down'}\">${Number(r.net_value ?? 0) >= 0 ? '▲' : '▼'} ${fmtRp(Math.abs(Number(r.net_value ?? 0)))}</div><div class=\"market-row-value-note\">${Number(r.net_value ?? 0) >= 0 ? 'Akumulasi dominan' : 'Distribusi dominan'}</div></div></div></div>`;
};
const actionRow = (r) => `<div class=\"market-row-box\"><div class=\"market-row market-row-top\"><div><div class=\"market-row-kicker\">Katalis korporasi</div><div class=\"market-catalyst-title\">${r.title || '-'}</div><div class=\"market-catalyst-meta\"><span class=\"market-catalyst-chip\">${r.code || '-'}</span><span class=\"market-sub\">${r.date || ''}</span></div></div>${badge(String(r.type || 'event').toUpperCase())}</div></div>`;

// ─── Progressive Card Builders ──────────────────────────

function buildIHSCard(summaryData, breadthData) {
  const b = breadthData?.data || {};
  const ihsg = summaryData?.value;
  const ihsgChange = summaryData?.change_pct;
  const leadGainer = Array.isArray(summaryData?.gainers) ? summaryData.gainers[0] : null;
  const leadLoser = Array.isArray(summaryData?.losers) ? summaryData.losers[0] : null;
  return `<section class=\"market-card market-card-hero market-accent-card\">
    <header class=\"market-card-head market-hero-head\">
      <div>
        <div class=\"market-hero-kicker\">Ringkasan utama pasar</div>
        <h3>Ringkasan IHSG</h3>
        <p>Ringkasan indeks utama dan denyut pasar sesi berjalan</p>
      </div>
      <div class=\"market-hero-badge ${Number(ihsgChange ?? 0) >= 0 ? 'is-up' : 'is-down'}\">${ihsgChange != null ? pct(ihsgChange) : '--'}</div>
    </header>
    <div class=\"market-card-body\">
      <div class=\"market-ihsg-row\">
        <div class=\"market-ihsg-main\">
          <div class=\"market-ihsg-value\">${ihsg != null ? fmt(ihsg, 1) : '--'}</div>
          <div class=\"market-sub market-ihsg-sub\">${summaryData?.date || 'Sesi live'}</div>
        </div>
        <div class=\"market-hero-summary\">${b.advancing ?? 0} penguat · ${b.declining ?? 0} pelemah · ${b.unchanged ?? 0} stagnan</div>
      </div>
      <div class=\"market-hero-metrics\">
        <div class=\"market-hero-metric\"><span>Perubahan Bersih</span><strong>${ihsgChange != null ? pct(ihsgChange) : '--'}</strong></div>
        <div class=\"market-hero-metric\"><span>Rasio Breadth</span><strong>${breadthInsight(b.advancing, b.declining)}</strong></div>
        <div class=\"market-hero-metric\"><span>Jumlah Stagnan</span><strong>${b.unchanged ?? 0}</strong></div>
      </div>
      <div class=\"market-hero-mood\">
        <div class=\"market-pulse-tile market-mood-box ${marketMood(summaryData, b, leadGainer, leadLoser).tone}\">
          <span class=\"market-stat-label\">Mood Pasar</span>
          <span class=\"market-mood-value\">${marketMood(summaryData, b, leadGainer, leadLoser).label}</span>
        </div>
        <div class=\"market-pulse-tile\">
          <span class=\"market-stat-label\">Penguat Utama</span>
          <span class=\"market-stat-value-ticker\">${leadGainer?.ticker || '--'}</span>
          <span class=\"market-stat-footnote\">${leadGainer ? `${pct(leadGainer.change_pct)}` : 'Belum ada'}</span>
        </div>
        <div class=\"market-pulse-tile\">
          <span class=\"market-stat-label\">Pelemah Utama</span>
          <span class=\"market-stat-value-ticker\">${leadLoser?.ticker || '--'}</span>
          <span class=\"market-stat-footnote\">${leadLoser ? `${pct(leadLoser.change_pct)}` : 'Belum ada'}</span>
        </div>
      </div>
    </div>
  </section>`;
}

function buildBreadthCard(breadthData) {
  const b = breadthData?.data || {};
  return `<section class=\"market-card market-card-subtle market-breadth-card market-accent-card\">
    <header class=\"market-card-head\">
      <h3>Breadth Pasar</h3>
      <p>Penguat vs pelemah pada sesi ini</p>
    </header>
    <div class=\"market-card-body\">
      <div class=\"market-breadth-visual\" aria-label=\"Market breadth distribution\">
        <div class=\"market-breadth-bar\">
          <span class=\"market-breadth-fill is-up\" style=\"width:${Math.max(8, ((Number(b.advancing ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%\"><span class=\"market-breadth-pct\">${b.advancing ?? 0}</span></span>
          <span class=\"market-breadth-fill is-flat\" style=\"width:${Math.max(6, ((Number(b.unchanged ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%\"><span class=\"market-breadth-pct\">${b.unchanged ?? 0}</span></span>
          <span class=\"market-breadth-fill is-down\" style=\"width:${Math.max(8, ((Number(b.declining ?? 0) / Math.max(1, Number(b.advancing ?? 0) + Number(b.declining ?? 0) + Number(b.unchanged ?? 0))) * 100).toFixed(2))}%\"><span class=\"market-breadth-pct\">${b.declining ?? 0}</span></span>
        </div>
        <div class=\"market-breadth-caption\">${b.advancing ?? 0} naik / ${b.declining ?? 0} turun / ${b.unchanged ?? 0} flat · ${Number(b.declining ?? 0) > Number(b.advancing ?? 0) ? 'Pelemah dominan, tekanan jual luas.' : 'Penguat dominan, partisipasi sehat.'}</div>
      </div>
      <div class=\"market-breadth-grid\">${statBox('Penguat', b.advancing ?? 0)}${statBox('Pelemah', b.declining ?? 0)}${statBox('Stagnan', b.unchanged ?? 0)}</div>
      <div class=\"market-split-list\"><div><div class=\"market-list-title\">Penguat Teratas</div><div class=\"market-list-stack\">${(b.advancers || []).slice(0, 3).map((row, index) => moverRow(row, index + 1)).join('') || '<div class=\"market-empty\">Belum ada penguat.</div>'}</div></div><div><div class=\"market-list-title\">Pelemah Teratas</div><div class=\"market-list-stack\">${(b.decliners || []).slice(0, 3).map((row, index) => moverRow(row, index + 1)).join('') || '<div class=\"market-empty\">Belum ada pelemah.</div>'}</div></div></div>
    </div>
  </section>`;
}

// ─── Render ─────────────────────────────────────────────

export async function renderMarket(root) {
  document.title = 'RetailBijak — Pasar';
  root.innerHTML = `
    <section class=\"market-overview-page stagger-reveal\">
      <header class=\"market-overview-head\">
        <div class=\"market-head-copy\">
          <div class=\"market-title-row\">
            <h1>Ikhtisar Pasar</h1>
            <span id=\"market-session-pill\" class=\"market-session-pill\">Menyinkronkan</span>
          </div>
          <p>Dashboard Pasar untuk pulse market IDX, movers utama, aliran dana, dan katalis sesi berjalan.</p>
          <p id=\"market-summary-sentence\" class=\"market-summary-sentence\">Menyusun ringkasan denyut pasar...</p>
          <div id=\"market-meta-rail\" class=\"market-meta-rail\">
            <span id=\"market-source\" class=\"market-source-badge\">MENYINKRONKAN</span>
            <span id=\"market-updated\" class=\"market-meta-chip\">Diperbarui --:-- WIB</span>
            <span id=\"market-sources-inline\" class=\"market-meta-chip\">Sumber: memuat</span>
          </div>
        </div>
        <button id=\"market-refresh\" class=\"market-refresh-btn\" type=\"button\">Muat Ulang</button>
      </header>

      <div id=\"market-loading\" class=\"market-loading-wrap\">${loadingShell()}</div>
      <div id=\"market-content\" class=\"market-content-wrap\" hidden>
        <section class=\"market-top-grid\">
          <div id=\"ihsg-summary-card\">${skeletonCard()}</div>
        </section>

        <div class=\"market-main-grid\">
          <section class=\"market-section-group market-section-group-internals\">
            <div class=\"market-section-group-grid market-section-group-grid-internals\">
              <div id=\"breadth-card\">${skeletonCard()}</div>
              <div id=\"gainers-card\">${skeletonCard()}</div>
              <div id=\"losers-card\">${skeletonCard()}</div>
            </div>
          </section>
          <section class=\"market-section-group market-section-group-flow\">
            <header class=\"market-section-group-head\">
              <div class=\"market-section-group-title\">Arus & Partisipasi</div>
              <p>Aliran dana dan keterlibatan broker untuk mengukur partisipasi sesi.</p>
            </header>
            <div class=\"market-section-group-grid\">
              <div id=\"foreign-flows\">${skeletonCard()}</div>
              <div id=\"broker-activity\">${skeletonCard()}</div>
            </div>
          </section>
          <section class=\"market-section-group market-section-group-catalyst\">
            <header class=\"market-section-group-head\">
              <div class=\"market-section-group-title\">Katalis & Agenda</div>
              <p>Katalis korporasi dan pengumuman yang berpotensi menggerakkan harga.</p>
            </header>
            <div class=\"market-section-group-grid\">
              <div id=\"corporate-actions\">${skeletonCard()}</div>
              <div id=\"announcements-card\">${skeletonCard()}</div>
            </div>
          </section>
        </div>
        <section class=\"market-section-group market-section-group-heatmap mt-4\">
          <header class=\"market-section-group-head\">
            <div class=\"market-section-group-title\">Heatmap Pasar IDX</div>
            <p>Peta performa sektor bursa IDX — ukuran = kapitalisasi pasar, warna = perubahan.</p>
          </header>
          <div id=\"tv-stock-heatmap\" class=\"market-heatmap-wrap\"></div>
        </section>
      </div>
    </section>
    <div id=\"market-data-quality-bar\" class=\"market-data-quality-bar\"></div>`;

  observeElements();
  const loadingEl = document.getElementById('market-loading');
  const contentEl = document.getElementById('market-content');
  if (loadingEl && contentEl) {
    loadingEl.hidden = false;
    contentEl.hidden = true;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const settle = (p) => Promise.resolve(p).then((value) => ({ ok: true, value })).catch((error) => ({ ok: false, error, value: null }));

  // Show content section after 2s max — skeletons shown until data arrives
  const loadingTimeout = window.setTimeout(() => {
    if (loadingEl && contentEl && contentEl.hidden) {
      loadingEl.hidden = true;
      contentEl.hidden = false;
    }
  }, 2000);

  // Fire all API calls — each populates its card on resolve
  const [summaryP, moversP, actionsP, announcementsP, foreignP, brokersP, breadthP, statsP] = [
    settle(fetchMarketSummary()),
    settle(fetchTopMovers(8)),
    settle(fetchCorporateActions()),
    settle(fetchCompanyAnnouncements()),
    settle(fetchForeignTrading()),
    settle(fetchBrokerActivity()),
    settle(fetchBreadth()),
    settle(fetchStats()),
  ];

  const unwrap = (entry) => (entry?.ok ? entry.value : null);

  // Breadth resolves fast — populate IHSG & breadth cards ASAP
  breadthP.then((result) => {
    const b = unwrap(result);
    const el = document.getElementById('breadth-card');
    if (el && b) el.innerHTML = buildBreadthCard(b);
  });

  // Summary + breadth = IHSG card
  Promise.all([summaryP, breadthP]).then(([sResult, bResult]) => {
    const s = unwrap(sResult);
    const b = unwrap(bResult);
    const el = document.getElementById('ihsg-summary-card');
    if (el && s) el.innerHTML = buildIHSCard(s, b);
  });

  // Movers
  moversP.then((result) => {
    const moversData = unwrap(result);
    const allMovers = Array.isArray(moversData?.data) ? moversData.data : [];
    const gainers = allMovers.filter((x) => Number(x.change_pct) >= 0).slice(0, 3);
    const losers = allMovers.filter((x) => Number(x.change_pct) < 0).slice(0, 3);
    const gainersEl = document.getElementById('gainers-card');
    const losersEl = document.getElementById('losers-card');
    if (gainersEl) gainersEl.innerHTML = card('Saham Penguat Teratas', 'Saham dengan kinerja terbaik pada sesi ini', `<div class=\"market-list-card-body\"><div class=\"market-list-card-head\">${gainers.length ? `${gainers.length} saham penguat tervalidasi.` : 'Semua saham dalam kondisi turun atau stagnan.'}\n<small class=\"validation-note\">Tervalidasi = Volume > 100Jt & Perubahan > ±2%</small></div><div class=\"market-list-stack\">${gainers.map((row, index) => moverRow(row, index + 1)).join('') || emptyState('Belum ada top gainer yang tervalidasi.', 'Data mover belum lengkap untuk menyusun daftar penguatan sesi ini.')}</div></div>`, 'var(--accent-cyan)');
    if (losersEl) losersEl.innerHTML = card('Saham Pelemah Teratas', 'Saham dengan tekanan terberat pada sesi ini', `<div class=\"market-list-card-body\"><div class=\"market-list-card-head\">${losers.length ? `${losers.length} saham pelemah tervalidasi.` : 'Semua saham dalam kondisi naik atau stagnan.'}\n<small class=\"validation-note\">Tervalidasi = Volume > 100Jt & Perubahan > ±2%</small></div><div class=\"market-list-stack\">${losers.map((row, index) => moverRow(row, index + 1)).join('') || emptyState('Belum ada top loser yang tervalidasi.', 'Snapshot pelemahan pasar belum cukup lengkap untuk ditampilkan.')}</div></div>`, 'var(--text-down)');
  });

  // Corporate actions
  actionsP.then((result) => {
    const d = unwrap(result);
    const el = document.getElementById('corporate-actions');
    if (el) el.innerHTML = card('Aksi Korporasi', 'Pencatatan, dividen, suspensi, dan agenda emiten lain dari IDX', `<div class=\"market-section-summary\">${safeRows(d).length ? `${safeRows(d).length} event terbaru untuk dipantau di sesi ini.` : 'Belum ada event korporasi yang menonjol untuk sesi ini.'}</div><div class=\"market-list-stack\">${safeRows(d).slice(0, 3).map(actionRow).join('') || emptyState('Tidak ada aksi korporasi terjadwal.', 'Semua aksi korporasi difilter untuk menampilkan hanya event mendatang.')}</div>`).replace('class=\"market-card\"', 'class=\"market-card market-card-feed\"');
  });

  // Announcements
  announcementsP.then((result) => {
    const d = unwrap(result);
    const el = document.getElementById('announcements-card');
    if (el) el.innerHTML = card('Berita & Pengumuman Korporasi', 'Pemberitahuan emiten yang ditarik dari endpoint pengumuman IDX', `<div class=\"market-section-summary\">${safeRows(d).length ? `${safeRows(d).length} pengumuman perusahaan terbaru tersedia untuk review cepat.` : 'Belum ada pengumuman baru yang berhasil ditarik.'}</div><div class=\"market-list-stack\">${safeRows(d).slice(0, 3).map(actionRow).join('') || emptyState('Belum ada pengumuman terbaru yang tervalidasi.', 'Endpoint pengumuman belum mengembalikan item baru untuk sesi ini.')}</div>`).replace('class=\"market-card\"', 'class=\"market-card market-card-feed\"');
  });

  // Foreign flows
  foreignP.then((result) => {
    const d = unwrap(result);
    const el = document.getElementById('foreign-flows');
    if (el) el.innerHTML = card('Arus Investor Asing', 'Ringkasan perdagangan IDX untuk partisipasi investor asing', `<div class=\"market-section-summary\">${safeRows(d).length ? `${safeRows(d).filter((row) => Number(row.net_value ?? 0) >= 0).length} saham net buy asing, ${safeRows(d).filter((row) => Number(row.net_value ?? 0) < 0).length} saham net sell asing.` : 'Belum ada snapshot foreign flow yang valid untuk sesi ini.'}</div><div class=\"market-list-stack\">${safeRows(d).slice(0, 6).map(flowRow).join('') || emptyState('Belum ada foreign flow yang tervalidasi.', 'Feed foreign participation belum mengirim snapshot yang cukup untuk sesi ini.')}</div>`, 'var(--text-up)').replace('class=\"market-card\"', 'class=\"market-card market-card-feed\"');
  });

  // Broker activity
  brokersP.then((result) => {
    const d = unwrap(result);
    const rows = safeRows(d).slice(0, 3).map(brokerRow).join('');
    const empty = emptyState('Belum ada snapshot broker yang valid untuk sesi ini.', 'Menggunakan snapshot IDX terakhir jika tersedia. Coba muat ulang untuk sinkronisasi terbaru.');
    const el = document.getElementById('broker-activity');
    if (el) el.innerHTML = card('Aktivitas Broker', 'Konsentrasi broker dan nilai bersih dari ringkasan broker IDX', `<div class=\"market-section-summary\">${safeRows(d).length ? `${safeRows(d).filter((row) => Number(row.net_value ?? 0) >= 0).length} broker dominan akumulasi, ${safeRows(d).filter((row) => Number(row.net_value ?? 0) < 0).length} broker distribusi.` : 'Menunggu snapshot broker yang tervalidasi dari sumber IDX.'}</div><div class=\"market-list-stack\">${rows || empty}</div>`, 'var(--accent-orange)').replace('class=\"market-card\"', 'class=\"market-card market-card-feed\"');
  });

  // Stats — not used for cards, but used for meta. Wait for all to update summary/meta.
  Promise.all([summaryP, moversP, actionsP, announcementsP, foreignP, brokersP, breadthP, statsP]).then((results) => {
    const [summary, movers, actions, announcements, foreign, brokers, breadth, stats] = results;
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
      .map((part) => String(part).toUpperCase().replace(/_/g, ' '));
    const freshness = freshnessTone([summaryData?.source, actionsData?.source, announcementsData?.source, foreignData?.source, brokersData?.source, breadthData?.source, statsData?.source]);
    const srcSummary = srcParts.length > 3 ? `${srcParts.slice(0, 3).join(' · ')} +${srcParts.length - 3}` : (srcParts.join(' · ') || 'TIDAK ADA DATA');
    const badgeEl = document.getElementById('market-source');
    const updatedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const _updateTs = Date.now();
    if (badgeEl) badgeEl.textContent = srcParts[0] ? `${compactSource(srcParts[0])}${srcParts.length > 1 ? ` +${srcParts.length - 1}` : ''}` : 'Tidak ada data';
    const updatedEl = document.getElementById('market-updated');
    if (updatedEl) updatedEl.textContent = `Diperbarui ${updatedAt} WIB`;
    const sourcesInlineEl = document.getElementById('market-sources-inline');
    if (sourcesInlineEl) sourcesInlineEl.textContent = `Sumber: ${srcParts.slice(0, 3).map(compactSource).join(', ') || 'Tidak ada data'}`;
    const dataQualityBar = document.getElementById('market-data-quality-bar');
    if (dataQualityBar) dataQualityBar.innerHTML = `<div class=\"data-status-bar ${freshness.tone}\"><span class=\"status-dot ${freshness.tone === 'is-up' ? 'live' : ''}\"></span><span>${freshness.label} | ${freshness.note} | ${srcSummary}</span></div>`;

    const b = breadthData?.data || {};
    const leadGainer = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) >= 0);
    const leadLoser = (Array.isArray(moversData?.data) ? moversData.data : []).find((x) => Number(x.change_pct) < 0);
    const mood = marketMood(summaryData, b, leadGainer, leadLoser);
    const sessionPillEl = document.getElementById('market-session-pill');
    if (sessionPillEl) {
      sessionPillEl.textContent = freshness.label;
      sessionPillEl.className = `market-session-pill ${freshness.tone}`;
      const badgeClassMap = { 'is-up': 'badge-live', 'is-warn': 'badge-warn', 'is-down': 'badge-down', 'is-muted': 'badge-dim' };
      if (sessionPillEl) sessionPillEl.classList.add(badgeClassMap[freshness.tone] || 'badge-dim');
    }
    const pulseEl = document.getElementById('market-summary-sentence');
    if (pulseEl) {
      pulseEl.textContent = `Breadth ${b.advancing ?? 0} naik vs ${b.declining ?? 0} turun · ${leadGainer?.ticker || 'N/A'} ${leadGainer ? pct(leadGainer.change_pct) : '--'} · ${leadLoser?.ticker || 'N/A'} ${leadLoser ? pct(leadLoser.change_pct) : '--'}`;
    }
    const refreshBtn = document.getElementById('market-refresh');
    if (refreshBtn && !refreshBtn.dataset.marketHooked) {
      refreshBtn.dataset.marketHooked = '1';
      refreshBtn.addEventListener('click', () => renderMarket(root));
    }

    contentEl.dataset.marketReady = '1';
    window.clearTimeout(loadingTimeout);

    // Auto-refresh every 90s
    if (window._marketPollTimer) clearInterval(window._marketPollTimer);
    window._marketPollTimer = setInterval(() => {
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const updatedEl2 = document.getElementById('market-updated');
      if (updatedEl2) updatedEl2.textContent = `Diperbarui ${now} WIB`;
      const pulseEl2 = document.getElementById('market-summary-sentence');
      if (pulseEl2) pulseEl2.textContent = pulseEl2.textContent.replace(/\d+s lalu$/, '') + ' 90s lalu';
    }, 90000);
    registerViewTimer('i_' + window._marketPollTimer);
  });

  // TV Stock Heatmap (always, regardless of data)
  setTimeout(() => {
    loadTVWidget('tv-stock-heatmap', 'stock-heatmap', {
      dataSource: 'AllID',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      autosize: true,
      width: '100%',
      height: 500,
      colorTheme: getTVTheme(),
      locale: 'id_ID',
    });
  }, 200);

  // Stagger reveal
  document.querySelectorAll('.market-section-group').forEach((el, i) => {
    el.style.setProperty('--stagger-delay', `${i * 90}ms`);
    el.classList.add('stagger-item');
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
