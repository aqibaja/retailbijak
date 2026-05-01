import { fetchMarketSummary, fetchTopMovers, fetchNews, apiFetch } from '../api.js?v=20260501e';
import { observeElements } from '../main.js?v=20260501a';

const fmt = (n, digits = 2) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: digits });
const pct = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${Number(n ?? 0).toFixed(2)}%`;
const safeRows = (payload) => Array.isArray(payload?.data) ? payload.data : [];

async function fetchCorporateActions() { return apiFetch('/corporate-actions?limit=12') || { count: 0, data: [], source: 'no_data' }; }
async function fetchCompanyAnnouncements() { return apiFetch('/company-announcements?limit=8') || { count: 0, data: [], source: 'no_data' }; }
async function fetchForeignTrading() { return apiFetch('/foreign-trading?limit=8') || { count: 0, data: [], source: 'no_data' }; }
async function fetchBrokerActivity() { return apiFetch('/broker-activity?limit=8') || { count: 0, data: [], source: 'no_data' }; }

const badge = (label) => `<span class="badge" style="background:rgba(99,102,241,0.12); color:#c7d2fe; border:1px solid rgba(99,102,241,0.2);">${label}</span>`;

const card = (title, subtitle, body, accent = 'var(--accent-indigo)') => `
  <div class="panel flex-col" style="border-left:2px solid ${accent};">
    <div class="mb-3">
      <div class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">${title}</div>
      <div class="text-sm text-muted mt-1">${subtitle}</div>
    </div>
    ${body}
  </div>`;

const moverRow = (r) => `
  <a href="#stock/${r.ticker || ''}" class="block p-3" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
    <div class="flex justify-between items-center gap-3">
      <div><div class="strong text-main mono">${r.ticker || '-'}</div><div class="text-xs text-dim truncate">${r.name || ''}</div></div>
      <div class="text-right"><div class="mono strong ${Number(r.change_pct ?? r.change ?? 0) >= 0 ? 'text-up' : 'text-down'}">${pct(r.change_pct ?? r.change)}</div><div class="text-xs text-dim mono">${r.price != null ? fmt(r.price) : '--'}</div></div>
    </div>
  </a>`;

const flowRow = (r) => `
  <div class="p-3" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
    <div class="flex justify-between items-center gap-3">
      <div><div class="strong text-main mono">${r.ticker || '-'}</div><div class="text-xs text-dim">${r.source || 'IDX'}</div></div>
      <div class="text-right"><div class="mono strong ${Number(r.net_value ?? 0) >= 0 ? 'text-up' : 'text-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="text-xs text-dim">buy ${fmt(r.buy_value ?? 0, 0)} / sell ${fmt(r.sell_value ?? 0, 0)}</div></div>
    </div>
  </div>`;

const brokerRow = (r) => `
  <div class="p-3" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
    <div class="flex justify-between items-center gap-3">
      <div><div class="strong text-main">${r.broker_code || '-'}</div><div class="text-xs text-dim mono">${r.ticker || '-'}</div></div>
      <div class="text-right"><div class="mono strong ${Number(r.net_value ?? 0) >= 0 ? 'text-up' : 'text-down'}">Rp ${fmt(r.net_value ?? 0, 0)}</div><div class="text-xs text-dim">vol ${fmt(r.net_volume ?? 0, 0)}</div></div>
    </div>
  </div>`;

const actionRow = (r) => `
  <div class="p-3" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
    <div class="flex justify-between items-start gap-3">
      <div>
        <div class="strong text-main">${r.title || '-'}</div>
        <div class="text-xs text-dim mono mt-1">${r.code || ''} ${r.date || ''}</div>
      </div>
      ${badge(String(r.type || 'event').toUpperCase())}
    </div>
  </div>`;

const newsRow = (n) => `
  <a href="${n.link || '#news'}" class="block p-3" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
    <div class="text-sm strong text-main mb-1 line-clamp-2">${n.title || '-'}</div>
    <div class="text-xs text-dim line-clamp-2">${n.summary || ''}</div>
    <div class="text-xs text-dim mono mt-2">${n.source || 'IDX'}</div>
  </a>`;

export async function renderMarket(root) {
  root.innerHTML = `
    <section class="grid grid-cols-12 stagger-reveal">
      <div class="col-span-12 flex justify-between items-end mb-4">
        <div>
          <h1 class="text-3xl mb-2" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Market Overview</h1>
          <p class="text-base" style="color:var(--text-muted);">Live IDX intelligence: movers, foreign flow, broker activity, announcements, and corporate actions.</p>
        </div>
        <div id="market-source" class="badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">SYNCING</div>
      </div>

      <div class="col-span-7 flex-col gap-4">
        <div id="corporate-actions"></div>
        <div id="foreign-flows"></div>
        <div id="broker-activity"></div>
      </div>

      <div class="col-span-5 flex-col gap-4">
        <div id="movers-card"></div>
        <div id="announcements-card"></div>
        <div id="news-card"></div>
      </div>
    </section>`;

  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const [summary, movers, news, actions, announcements, foreign, brokers] = await Promise.all([
    fetchMarketSummary().catch(() => null),
    fetchTopMovers(8).catch(() => null),
    fetchNews(4).catch(() => null),
    fetchCorporateActions().catch(() => null),
    fetchCompanyAnnouncements().catch(() => null),
    fetchForeignTrading().catch(() => null),
    fetchBrokerActivity().catch(() => null),
  ]);

  const src = [summary?.source, actions?.source, announcements?.source, foreign?.source, brokers?.source].filter(Boolean).join(' / ') || 'NO DATA';
  const badgeEl = document.getElementById('market-source');
  if (badgeEl) badgeEl.textContent = src.toUpperCase();

  document.getElementById('corporate-actions').innerHTML = card('Corporate Actions', 'Listing, dividend, suspension, and other company events from IDX', `<div class="flex-col gap-3">${safeRows(actions).slice(0,4).map(actionRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No corporate actions available.</div>'}</div>`);
  document.getElementById('foreign-flows').innerHTML = card('Foreign Investor Flows', 'Live IDX trading summary for foreign participation', `<div class="flex-col gap-3">${safeRows(foreign).slice(0,4).map(flowRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No foreign flow data available.</div>'}</div>`, 'var(--text-up)');
  document.getElementById('broker-activity').innerHTML = card('Broker Trading Activity', 'Top broker concentration and net value from IDX broker summary', `<div class="flex-col gap-3">${safeRows(brokers).slice(0,4).map(brokerRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No broker activity available.</div>'}</div>`, 'var(--accent-orange)');
  document.getElementById('movers-card').innerHTML = card('Top Gainers / Losers', 'Most active movers today', `<div class="grid grid-cols-1 gap-2">${(Array.isArray(movers?.data) && movers.data.length ? movers.data : []).slice(0,8).map(moverRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No movers available.</div>'}</div>`, 'var(--accent-cyan)');
  document.getElementById('announcements-card').innerHTML = card('Corporate News & Announcements', 'Company notices pulled from IDX announcement endpoint', `<div class="flex-col gap-3">${safeRows(announcements).slice(0,4).map(actionRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No announcements available.</div>'}</div>`);
  document.getElementById('news-card').innerHTML = card('Latest Market News', 'Supporting market headlines', `<div class="flex-col gap-3">${(Array.isArray(news?.data) && news.data.length ? news.data : []).slice(0,4).map(newsRow).join('') || '<div class="p-3 text-sm text-muted" style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:var(--radius-md);">No news available.</div>'}</div>`);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
