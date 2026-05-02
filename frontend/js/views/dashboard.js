import { fetchNews, fetchMarketSummary, fetchSectorSummary, fetchTopMovers, fetchIhsgChart, fetchMarketBreadth } from '../api.js?v=20260503b';
import { observeElements, animateValue } from '../main.js?v=20260503b';

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
const FALLBACK_NEWS = [
  { title: 'IHSG stabil, rotasi sektor mulai terlihat di perbankan dan energi', source: 'MARKET INTEL', link: '#market' },
  { title: 'Watchlist hari ini: BBCA, BMRI, GOTO, BRPT untuk momentum intraday', source: 'IDEA', link: '#screener' },
  { title: 'Breadth netral: tunggu konfirmasi volume sebelum entry agresif', source: 'RISK', link: '#market' },
];
const MOVERS = [
  { ticker:'GOTO', name:'GoTo Gojek Tokopedia', price:96, change:9.89 },
  { ticker:'BRPT', name:'Barito Pacific', price:1200, change:5.20 },
  { ticker:'BBCA', name:'Bank Central Asia', price:9800, change:1.15 },
  { ticker:'BMRI', name:'Bank Mandiri', price:11750, change:0.82 },
  { ticker:'TLKM', name:'Telkom Indonesia', price:3420, change:-0.45 },
];

export async function renderDashboard(root) {
  root.innerHTML = `
  <section class="dashboard-pro stagger-reveal">
    <div class="dash-hero-pro panel">
      <div class="dash-copy">
        <div class="screener-kicker">IDX LIVE WORKSPACE</div>
        <h1>Dashboard Market Intelligence</h1>
        <p class="dash-hero-lead">Pantau IHSG, breadth, top movers, dan ide cepat dalam satu layar trading yang padat.</p>
        <div class="dash-hero-note">Satu glance untuk baca bias tape, kualitas data, dan jalur aksi tercepat sebelum masuk ke scanner.</div>
        <div class="dash-actions dash-actions-compact"><a href="#screener" class="btn btn-primary dash-primary-cta">Run Scanner</a><a href="#market" class="btn dash-secondary-cta">Market Overview</a></div>
        <div class="dash-density-note">Mode briefing padat: lebih sedikit noise di top fold, lebih cepat masuk ke chart dan movers.</div>
        <div class="dash-summary-strip dash-summary-strip-compact dash-mobile-stack">
          <div class="dash-summary-card">
            <span>Market Bias</span>
            <strong id="dash-bias-label">Loading...</strong>
            <small id="dash-bias-note">Menyiapkan breadth dan tape context.</small>
          </div>
          <div class="dash-summary-card">
            <span>Lead Gainer</span>
            <strong id="dash-lead-gainer">Loading...</strong>
            <small id="dash-lead-gainer-note">Menunggu top movers valid.</small>
          </div>
          <div class="dash-summary-card dash-mobile-chip">
            <span>Lead Sector</span>
            <strong id="dash-lead-sector">Loading...</strong>
            <small id="dash-lead-sector-note">Snapshot rotasi sektor.</small>
          </div>
        </div>
      </div>
      <div class="dash-quote-card dash-mobile-status">
        <div class="dash-quote-meta"><span class="badge" id="market-fold-badge">SYNC</span><span class="mono text-xs text-dim" id="market-fold-status">loading...</span></div><div class="text-xs text-dim mb-2" id="market-data-date">Data IDX: loading...</div>
        <div class="text-xs text-dim uppercase strong">IHSG Composite</div>
        <div class="flex justify-between items-end gap-3"><div class="mono strong dash-big" id="ihsg-value">—</div><div class="mono strong text-up" id="ihsg-change">—</div></div>
        <div class="dashboard-metrics mt-3"><div><span>Open</span><strong id="ihsg-open">—</strong></div><div><span>High</span><strong id="ihsg-high" class="text-up">—</strong></div><div><span>Low</span><strong id="ihsg-low" class="text-down">—</strong></div></div>
        <div class="dash-quote-freshness" id="dash-quote-freshness">Last sync: waiting for market summary.</div>
      </div>
    </div>

    <div class="dash-grid-pro dash-mobile-shell">
      <div class="panel dash-chart-panel">
        <div class="flex justify-between items-center mb-3"><div><h3 class="panel-title">IHSG Chart</h3><p class="text-xs text-dim" id="ihsg-chart-subtitle">Data dari IDX</p></div><div class="dashboard-chip-row"><button class="btn btn-mini ihsg-range" data-range="1W">1W</button><button class="btn btn-primary btn-mini ihsg-range" data-range="1M">1M</button><button class="btn btn-mini ihsg-range" data-range="1Q">1Q</button></div></div>
        <div class="dash-chart-context"><span class="dash-chart-context-chip" id="dash-chart-bias-chip">Bias sedang dihitung</span><strong id="dash-chart-readout">IHSG readout menunggu summary dan chart range.</strong></div>
        <div class="dashboard-chart-wrap"><canvas id="ihsgMainChart"></canvas></div>
      </div>
      <div class="panel dash-movers-panel"><div class="flex justify-between items-center mb-3"><div><h3 class="panel-title">Top Movers</h3><div class="dash-movers-summary"><span class="dash-movers-summary-chip" id="dash-movers-summary-chip">Tape loading</span><small id="dash-movers-summary-note">Membaca leader tape dan breadth support.</small></div></div><a href="#market" class="text-xs text-primary strong">View All</a></div><div id="movers-list" class="flex-col gap-2"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Preparing movers tape</strong><span class="dashboard-widget-state-note">Mengurutkan saham paling aktif untuk first glance.</span></div></div></div>
    </div>

    <div class="dash-bottom-grid dash-bottom-grid-phase2 dash-bottom-grid-mobile">
      <div class="panel"><h3 class="panel-title mb-3">Market Intelligence</h3><div id="market-intel" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Building market brief</strong><span class="dashboard-widget-state-note">Merangkum breadth, sektor, dan plan line intraday.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">Suggestions</h3><div class="suggestion-grid">${SUGGESTION_PRESETS.slice(0,4).map(({ ticker, reason })=>`<a href="#stock/${ticker}" class="suggestion-pill"><span>${ticker}</span><small>Open detail</small><em class="dash-suggestion-reason">${reason}</em></a>`).join('')}</div></div>
      <div class="panel"><h3 class="panel-title mb-3">Latest News</h3><div id="news-container" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Gathering market headlines</strong><span class="dashboard-widget-state-note">Menarik berita terbaru dan fallback editorial jika feed kosong.</span></div></div></div>
    </div>
  </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const [market] = await Promise.all([loadMarketSummary(), loadNews(), loadIntel(), loadMovers()]);
  initChart(market);
  setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.dataset.val || '0'), 900)), 100);
}

async function loadMarketSummary(){
  const summary = await fetchMarketSummary();
  const isLive = summary && summary.status !== 'no_data' && summary.value;
  document.getElementById('market-fold-status').textContent = isLive ? 'DB SYNCED' : 'IDX REFERENCE';
  document.getElementById('market-fold-badge').textContent = isLive ? 'DB' : 'REF';
  const dataDate = summary?.data_date || (summary?.updated_at ? String(summary.updated_at).slice(0,10) : null);
  const dateEl = document.getElementById('market-data-date');
  if (dateEl) dateEl.textContent = dataDate ? `Data IDX tanggal ${dataDate} · auto-sync 18:00 WIB` : 'Data IDX belum tersedia · auto-sync 18:00 WIB';
  const freshnessEl = document.getElementById('dash-quote-freshness');
  if (freshnessEl) freshnessEl.textContent = dataDate ? `Last sync: ${dataDate} · auto-refresh after close.` : 'Last sync: waiting for market summary.';
  const v = summary?.value ?? null, c = Number(summary?.change_pct ?? 0);
  document.getElementById('ihsg-value').textContent = v != null ? nf(v, 2) : '—';
  const ch = document.getElementById('ihsg-change'); ch.textContent = v != null ? pf(c) : '—'; ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
  document.getElementById('ihsg-open').textContent = summary?.open != null ? nf(summary.open) : '—';
  document.getElementById('ihsg-high').textContent = summary?.high != null ? nf(summary.high) : '—';
  document.getElementById('ihsg-low').textContent = summary?.low != null ? nf(summary.low) : '—';
  const biasLabel = document.getElementById('dash-bias-label');
  const biasNote = document.getElementById('dash-bias-note');
  if (biasLabel) biasLabel.textContent = v == null ? 'Waiting Snapshot' : c >= 0 ? 'Risk-On Tape' : 'Defensive Tape';
  if (biasNote) biasNote.textContent = v == null ? 'Ringkasan market belum lengkap.' : c >= 0 ? `IHSG ${pf(c)} dengan bias momentum bertahan.` : `IHSG ${pf(c)} sehingga defense dan selektivitas lebih penting.`;
  return summary;
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
    ? sectorRes.data
    : [{ sector:'Finance', change_pct:1.2 }, { sector:'Energy', change_pct:0.8 }, { sector:'Technology', change_pct:-1.5 }];
  const best = [...sectors].sort((a,b)=>Number(b.change_pct||0)-Number(a.change_pct||0))[0];
  const breadth = breadthRes?.data || {};
  const adv = Number(breadth.advancing ?? 0);
  const dec = Number(breadth.declining ?? 0);
  const gainers = Array.isArray(gainersRes?.data) ? gainersRes.data : [];
  const losers = Array.isArray(losersRes?.data) ? losersRes.data : [];
  const leadGainer = gainers[0] || null;
  const leadLoser = losers[0] || null;
  const tapeBias = adv === 0 && dec === 0 ? 'menunggu snapshot breadth valid' : (adv >= dec ? 'bias positif' : 'tekanan dominan');
  const planLine = Number(summary?.change_pct ?? 0) >= 0
    ? 'Plan: fokus ke saham pemimpin sektor, validasi volume sebelum entry lanjutan.'
    : 'Plan: prioritaskan defense, entry bertahap, dan hindari chasing rebound tipis.';
  const biasLabel = document.getElementById('dash-bias-label');
  const leadGainerEl = document.getElementById('dash-lead-gainer');
  const leadGainerNoteEl = document.getElementById('dash-lead-gainer-note');
  const leadSectorEl = document.getElementById('dash-lead-sector');
  const leadSectorNoteEl = document.getElementById('dash-lead-sector-note');
  const chartBiasChip = document.getElementById('dash-chart-bias-chip');
  const chartReadout = document.getElementById('dash-chart-readout');
  if (biasLabel) biasLabel.textContent = adv === 0 && dec === 0 ? 'Need Breadth' : adv >= dec ? 'Risk-On Tape' : 'Defensive Tape';
  if (leadGainerEl) leadGainerEl.textContent = leadGainer?.ticker || 'No leader yet';
  if (leadGainerNoteEl) leadGainerNoteEl.textContent = leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin tape hari ini.` : 'Top movers belum lengkap, fallback tetap aktif.';
  if (leadSectorEl) leadSectorEl.textContent = best?.sector || best?.name || 'Finance';
  if (leadSectorNoteEl) leadSectorNoteEl.textContent = `Rotasi ${pf(best?.change_pct ?? 1.2)} menjadi konteks sektor utama.`;
  if (chartBiasChip) chartBiasChip.textContent = adv === 0 && dec === 0 ? 'Breadth pending' : adv >= dec ? 'Breadth support' : 'Breadth bearish';
  if (chartReadout) chartReadout.textContent = `IHSG ${pf(Number(summary?.change_pct ?? 0))} · ${adv} adv vs ${dec} dec · fokus ${best?.sector || 'sector leader'} sebagai konteks tape.`;
  document.getElementById('market-intel').innerHTML = [
    { kicker: 'Breadth', value: `${adv} vs ${dec}`, note: adv === 0 && dec === 0 ? 'Snapshot breadth belum valid.' : `${tapeBias} untuk first glance tape.` },
    { kicker: 'Leader', value: leadGainer?.ticker || best?.sector || 'N/A', note: leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin, lawan ${leadLoser?.ticker || 'N/A'} di sisi lemah.` : 'Leader tape masih memakai fallback sektoral.' },
    { kicker: 'Sector', value: best?.sector||best?.name||'Finance', note: `Rotasi ${pf(best?.change_pct ?? 1.2)} paling dominan saat ini.` },
    { kicker: 'Plan', value: Number(summary?.change_pct ?? 0) >= 0 ? 'Momentum Selective' : 'Defense First', note: planLine.replace('Plan: ', '') }
  ].map(({ kicker, value, note }, idx)=>`<div class="dash-intel-card ${idx===0?'dash-intel-card-primary':''}"><span class="dash-intel-kicker">${kicker}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
}

async function loadMovers(){
  const res = await fetchTopMovers(5, 'gainers');
  const items = Array.isArray(res?.data) && res.data.length ? res.data : MOVERS;
  const moversSummaryChip = document.getElementById('dash-movers-summary-chip');
  const moversSummaryNote = document.getElementById('dash-movers-summary-note');
  const positiveCount = items.filter(item => Number(item.change_pct ?? item.change ?? 0) >= 0).length;
  if (moversSummaryChip) moversSummaryChip.textContent = `${positiveCount}/${items.length} hijau`;
  if (moversSummaryNote) moversSummaryNote.textContent = positiveCount === items.length
    ? 'Leader tape masih dominan hijau untuk first glance.'
    : 'Perhatikan rotasi karena tidak semua leader bergerak searah.';
  document.getElementById('movers-list').innerHTML = items.slice(0,5).map((r, index) => row({
    ticker: r.ticker,
    name: r.name || r.sector || 'IDX Equity',
    price: r.price ?? 0,
    change: r.change_pct ?? r.change ?? 0,
    rank: index + 1,
  })).join('');
}

async function loadNews(){
  const res = await fetchNews(3); const items = (Array.isArray(res?.data)&&res.data.length?res.data:FALLBACK_NEWS);
  document.getElementById('news-container').innerHTML = items.slice(0,3).map((n, index)=>`<a href="${n.link && n.link.startsWith('http') ? n.link : '#news'}" ${n.link && n.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="intel-item dash-news-card ${index===0?'dash-news-card-featured':''}"><span class="badge">${n.source||'NEWS'}</span><b>${n.title}</b><span class="dash-news-meta">${index===0?'Headline utama':'Quick brief'} · ${n.source||'NEWS'}</span><small>${n.summary ? String(n.summary).replace(/<[^>]+>/g,'').slice(0,72) : 'Buka Market Intelligence'}</small></a>`).join('');
}
const row = (r) => `<a href="#stock/${r.ticker}" class="mover-row dash-mover-row"><div class="dash-mover-main"><span class="dash-mover-rank">#${r.rank || '—'}</span><div><b class="mono">${r.ticker}</b><small>${r.name}</small></div></div><div class="text-right"><b class="mono">${r.price == null ? '—' : nf(r.price,0)}</b><small class="${r.change>=0?'text-up':'text-down'}">${pf(r.change)}</small></div></a>`;

let ihsgChart;
const PERIOD_MAP = { '1W': '1W', '1M': '1M', '1Q': '1Q', '1Y': '1Y' };

async function loadIhsgChartData(period = '1M') {
  try {
    const chartRes = await fetchIhsgChart(period);
    if (chartRes && chartRes.data && chartRes.data.length > 0) {
      return chartRes;
    }
  } catch (e) {
    console.warn('IHSG chart fetch failed', e);
  }
  return null;
}

function initChart(summary) {
  const ctx = document.getElementById('ihsgMainChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const render = async (range = '1M') => {
    const chartRes = await loadIhsgChartData(range);
    let labels, data;

    if (chartRes && chartRes.data.length > 0) {
      // Use real IDX chart data
      labels = chartRes.data.map(p => {
        const d = new Date(p.date);
        if (range === '1Q' || range === '1Y') {
          return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
        }
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      });
      data = chartRes.data.map(p => p.value);
      const sub = document.getElementById('ihsg-chart-subtitle');
      if (sub) {
        const first = chartRes.data[0]?.date || '';
        const last = chartRes.data[chartRes.data.length - 1]?.date || '';
        sub.textContent = `IDX ${chartRes.period} · ${chartRes.count} points · ${first} → ${last}`;
      }
    } else {
      // Fallback: generate synthetic from current value
      const base = Number(summary?.value || 7000);
      const points = range === '1Q' ? 55 : range === '1W' ? 5 : 22;
      labels = Array.from({ length: points }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (points - 1 - i));
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      });
      const amp = range === '1Q' ? 0.06 : range === '1W' ? 0.01 : 0.018;
      data = labels.map((_, i) => Number((base * (1 + Math.sin(i * 1.4) * amp + (i - labels.length + 1) * amp / labels.length)).toFixed(2)));
      data[data.length - 1] = Number(base.toFixed(2));
      // No subtitle on synthetic fallback
    }

    const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, 'rgba(16,185,129,.36)');
    g.addColorStop(1, 'rgba(16,185,129,0)');
    if (ihsgChart) ihsgChart.destroy();
    ihsgChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#10b981', backgroundColor: g, borderWidth: 2, pointRadius: labels.length > 30 ? 0 : 2, fill: true, tension: .42 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `IHSG ${nf(c.parsed.y, 2)}` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#64748b', maxTicksLimit: 10 } }, y: { position: 'right', grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748b', callback: (v) => nf(v, 0) } } }
      }
    });
  };

  render('1M');
  document.querySelectorAll('.ihsg-range').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.ihsg-range').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    render(btn.dataset.range);
  }));
}
