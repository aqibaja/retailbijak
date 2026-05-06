import { fetchNews, fetchMarketSummary, fetchSectorSummary, fetchTopMovers, fetchIhsgChart, fetchMarketBreadth, fetchAiPicks } from '../api.js?v=20260506z';
import { observeElements, animateValue } from '../main.js?v=20260506g';

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
  document.title = 'RetailBijak — Dashboard';
  root.innerHTML = `
  <section class="dashboard-pro stagger-reveal">
    <div class="dash-hero-pro panel">
      <div class="dash-copy">
        <div class="screener-kicker">RUANG KERJA IDX</div>
        <h1>Dashboard Pasar</h1>
        <p class="dash-hero-lead">Pantau IHSG, breadth, dan penggerak utama dalam satu layar.</p>
        <div class="dash-actions dash-actions-compact">
          <a href="#screener" class="btn btn-primary dash-primary-cta">Jalankan Pemindai</a>
          <a href="#market" class="btn dash-secondary-cta">Ikhtisar Pasar</a>
        </div>
        <div class="dash-summary-strip dash-summary-strip-compact dash-mobile-stack">
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
        </div>
      </div>
      <div class="dash-quote-card dash-mobile-status">
        <div class="dash-quote-meta"><span class="badge" id="market-fold-badge">SYNC</span><span class="mono text-xs text-dim" id="market-fold-status">loading...</span></div>
        <div class="text-xs text-dim mb-2" id="market-data-date">Data IDX: loading...</div>
        <div class="text-xs text-dim uppercase strong">IHSG</div>
        <div class="flex justify-between items-end gap-3"><div class="mono strong dash-big" id="ihsg-value">—</div><div class="mono strong text-up" id="ihsg-change">—</div></div>
        <div class="dashboard-metrics mt-3"><div><span>Open</span><strong id="ihsg-open">—</strong></div><div><span>High</span><strong id="ihsg-high" class="text-up">—</strong></div><div><span>Low</span><strong id="ihsg-low" class="text-down">—</strong></div></div>
        <div class="dash-quote-freshness" id="dash-quote-freshness">Sinkronisasi: menunggu ringkasan pasar.</div>
      </div>
    </div>

    <div class="dash-grid-pro dash-mobile-shell">
      <div class="panel dash-chart-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">IHSG Chart</h3><p class="text-xs text-dim" id="ihsg-chart-subtitle">Data dari IDX</p></div>
          <div class="dashboard-chip-row">
            <button class="btn btn-mini ihsg-range" data-range="1W">1W</button>
            <button class="btn btn-primary btn-mini ihsg-range" data-range="1M">1M</button>
            <button class="btn btn-mini ihsg-range" data-range="1Q">1Q</button>
          </div>
        </div>
        <div class="dash-chart-context"><span class="dash-chart-context-chip" id="dash-chart-bias-chip">Bias dihitung</span><strong id="dash-chart-readout">IHSG readout menunggu data.</strong></div>
        <div class="dashboard-chart-wrap"><canvas id="ihsgMainChart"></canvas></div>
      </div>
      <div class="panel dash-movers-panel">
        <div class="flex justify-between items-center mb-3">
          <div><h3 class="panel-title">Penggerak Teratas</h3><div class="dash-movers-summary"><span class="dash-movers-summary-chip" id="dash-movers-summary-chip">Tape dimuat</span></div></div>
          <a href="#market" class="text-xs text-primary strong">Lihat Semua</a>
        </div>
        <div id="movers-list" class="flex-col gap-2"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyiapkan data</strong></div></div>
      </div>
    </div>

    <div class="dash-bottom-grid dash-bottom-grid-phase2 dash-bottom-grid-mobile">
      <div class="panel"><h3 class="panel-title mb-3">Intelijen Pasar</h3><div id="market-intel" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyusun ringkasan</strong><span class="dashboard-widget-state-note">Merangkum breadth, sektor, dan rencana intraday.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">AI Picks</h3><div id="dash-ai-pick-summary" class="text-xs text-muted mb-2">Menyiapkan pick unggulan...</div><div id="dash-ai-pick-widget"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengambil pick</strong><span class="dashboard-widget-state-note">Menarik kandidat dengan score tertinggi.</span></div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">Berita Terbaru</h3><div id="news-container" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengumpulkan berita</strong><span class="dashboard-widget-state-note">Menarik berita terbaru dari feed.</span></div></div></div>
    </div>
  </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const [market] = await Promise.all([loadMarketSummary(), loadNews(), loadIntel(), loadMovers(), loadAiPickWidget()]);
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
  if (dateEl) dateEl.textContent = dataDate ? `Data ${dataDate} · sync 18:00 WIB` : 'Data belum tersedia';
  const freshnessEl = document.getElementById('dash-quote-freshness');
  if (freshnessEl) freshnessEl.textContent = dataDate ? `Sinkronisasi: ${dataDate}` : 'Sinkronisasi: menunggu data.';
  const v = summary?.value ?? null, c = Number(summary?.change_pct ?? 0);
  document.getElementById('ihsg-value').textContent = v != null ? nf(v, 2) : '—';
  const ch = document.getElementById('ihsg-change'); ch.textContent = v != null ? (c >= 0 ? '▲' : '▼') + ' ' + pf(Math.abs(c)).replace('+', '') : '—'; ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
  document.getElementById('ihsg-open').textContent = summary?.open != null ? nf(summary.open) : '—';
  document.getElementById('ihsg-high').textContent = summary?.high != null ? nf(summary.high) : '—';
  document.getElementById('ihsg-low').textContent = summary?.low != null ? nf(summary.low) : '—';
  const biasLabel = document.getElementById('dash-bias-label');
  const biasNote = document.getElementById('dash-bias-note');
  if (biasLabel) biasLabel.textContent = v == null ? 'Menunggu snapshot' : c >= 0 ? 'Tape Berisiko' : 'Tape Defensif';
  if (biasNote) biasNote.textContent = v == null ? 'Ringkasan belum lengkap.' : c >= 0 ? `IHSG ${pf(c)} dengan bias momentum bertahan.` : `IHSG ${pf(c)} defensif, selektivitas lebih penting.`;
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
    { kicker: 'Sektor', value: best?.sector||best?.name||'Finance', note: `${best?.sector||''} rotasi ${pf(best?.change_pct ?? 1.2)}.` },
    { kicker: 'Plan', value: Number(summary?.change_pct ?? 0) >= 0 ? 'Selektif' : 'Defensif', note: planLine }
  ].map(({ kicker, value, note }, idx)=>`<div class="dash-intel-card ${idx===0?'dash-intel-card-primary':''}"><span class="dash-intel-kicker">${kicker}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
}

async function loadMovers(){
  const res = await fetchTopMovers(5, 'gainers');
  const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
  const moversSummaryChip = document.getElementById('dash-movers-summary-chip');
  if (items.length) {
    const positiveCount = items.filter(item => Number(item.change_pct ?? 0) >= 0).length;
    if (moversSummaryChip) moversSummaryChip.textContent = `${positiveCount}/${items.length} positif`;
    document.getElementById('movers-list').innerHTML = items.slice(0,4).map((r, index) => row({
      ticker: r.ticker, name: r.name || r.sector || 'Ekuitas IDX', price: r.price ?? 0,
      change: r.change_pct ?? 0, rank: index + 1,
    })).join('');
  } else {
    if (moversSummaryChip) moversSummaryChip.textContent = 'Data belum tersedia';
    document.getElementById('movers-list').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Belum ada data penggerak</strong><span class="dashboard-widget-state-note">Top movers akan muncul setelah scheduler memperbarui basis data.</span></div>';
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
    if (summaryEl) summaryEl.textContent = 'Belum ada pick unggulan.';
    mount.innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">AI Picks sementara kosong</strong><span class="dashboard-widget-state-note">Universe kandidat sedang tipis. Buka AI Picks untuk hasil lebih lengkap.</span><a href="#ai-picks" class="btn btn-secondary portfolio-action-btn mt-10">Buka AI Picks</a></div>';
    return;
  }

  if (summaryEl) summaryEl.textContent = `${payload?.summary?.eligible_count || picks.length} kandidat lolos filter.`;
  const alternatives = picks.slice(1, 3);
  mount.innerHTML = `
    <div class="dash-ai-pick-featured">
      <a href="#ai-picks" class="dash-ai-pick-featured-link">
        <div class="dash-ai-pick-head">
          <div>
            <span class="dash-intel-kicker">Featured · ${featured.ticker}</span>
            <strong>${featured.name || featured.ticker}</strong>
          </div>
          <div class="dash-ai-pick-score">${nf(featured.score, 1)}</div>
        </div>
        <p class="dash-ai-pick-fit">${featured.fit_label || 'Kandidat terbaik untuk mode swing.'}</p>
        <div class="dash-ai-pick-metrics">
          <div><span>Keyakinan</span><strong>${featured.confidence || '-'}</strong></div>
          <div><span>Change</span><strong>${pf(featured.change_pct ?? 0)}</strong></div>
          <div><span>Vol</span><strong>${nf(featured.volume_ratio, 2)}x</strong></div>
        </div>
        <div class="dash-ai-pick-summary">
          <span>${featured.reason_labels?.[0] || 'Likuiditas dan teknikal mendukung.'}</span>
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
        <button class="btn" data-dash-ai-pick-open-detail="${featured.ticker}">Buka Detail</button>
        <a href="#ai-picks" class="dash-ai-pick-cta">Buka AI Picks</a>
      </div>
    </div>`;
  wireFeaturedPickDetail(featured, payload?.mode || 'swing');
  wireAltPickDetails(alternatives, payload?.mode || 'swing');
}

async function loadNews(){
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
      }
    } else {
      document.getElementById('ihsg-chart-subtitle').textContent = 'Data IHSG menunggu scheduler.';
      return;
    }

    const canvasHeight = ctx.height || 320;
    const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, canvasHeight);
    g.addColorStop(0, 'rgba(16,185,129,.36)');
    g.addColorStop(1, 'rgba(16,185,129,0)');
    if (ihsgChart) ihsgChart.destroy();
    ihsgChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#10b981', backgroundColor: g, borderWidth: 2, pointRadius: labels.length > 30 ? 0 : 2, fill: true, tension: .42 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
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
