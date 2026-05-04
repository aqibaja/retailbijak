1|import { fetchNews, fetchMarketSummary, fetchSectorSummary, fetchTopMovers, fetchIhsgChart, fetchMarketBreadth, fetchAiPicks } from '../api.js?v=20260505b';
     2|import { observeElements, animateValue } from '../main.js?v=20260504e';
     3|
     4|const AI_PICKS_CONTEXT_KEY = 'retailbijak.ai_picks.context';
     5|
     6|const SUGGESTION_PRESETS = [
     7|  { ticker: 'BBCA', reason: 'Relative strength bertahan di atas pivot harian.' },
     8|  { ticker: 'BMRI', reason: 'Bank besar tetap jadi fokus saat tape defensif.' },
     9|  { ticker: 'GOTO', reason: 'Momentum aktif untuk trader agresif intraday.' },
    10|  { ticker: 'BRPT', reason: 'Rotasi sektor dan volatility cocok untuk watchlist cepat.' },
    11|  { ticker: 'TLKM', reason: 'Quality defensive name untuk pullback map.' },
    12|  { ticker: 'ANTM', reason: 'Komoditas tetap menarik saat flow sektor bergeser.' },
    13|];
    14|
    15|const nf = (n, d = 2) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: d });
    16|const pf = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${Number(n ?? 0).toFixed(2)}%`;
    17|
    18|function safeSessionStorageSet(key, value) {
    19|  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
    20|}
    21|
    22|function buildAiPickContext(item, mode = 'swing') {
    23|  return JSON.stringify({
    24|    ticker: item?.ticker || '', mode, source_route: '#dashboard', source_label: 'Top AI Pick Today',
    25|    score: item?.score ?? null, confidence: item?.confidence || null, fit_label: item?.fit_label || '',
    26|    entry_zone: item?.entry_zone ?? null, target_zone: item?.target_zone ?? null, invalidation: item?.invalidation ?? null,
    27|    reason_labels: Array.isArray(item?.reason_labels) ? item.reason_labels.slice(0, 3) : [], risk_note: item?.risk_note || '',
    28|  });
    29|}
    30|
    31|export async function renderDashboard(root) {
    32|  document.title = 'RetailBijak — Dashboard';
    33|  root.innerHTML = `
    34|  <section class="dashboard-pro stagger-reveal">
    35|    <div class="dash-hero-pro panel">
    36|      <div class="dash-copy">
    37|        <div class="screener-kicker">RUANG KERJA IDX</div>
    38|        <h1>Dashboard Pasar</h1>
    39|        <p class="dash-hero-lead">Pantau IHSG, breadth, dan penggerak utama dalam satu layar.</p>
    40|        <div class="dash-actions dash-actions-compact">
    41|          <a href="#screener" class="btn btn-primary dash-primary-cta">Jalankan Pemindai</a>
    42|          <a href="#market" class="btn dash-secondary-cta">Ikhtisar Pasar</a>
    43|        </div>
    44|        <div class="dash-summary-strip dash-summary-strip-compact dash-mobile-stack">
    45|          <div class="dash-summary-card">
    46|            <span>Bias Pasar</span>
    47|            <strong id="dash-bias-label">Memuat...</strong>
    48|            <small id="dash-bias-note">Menyiapkan breadth dan konteks tape.</small>
    49|          </div>
    50|          <div class="dash-summary-card">
    51|            <span>Penguat Utama</span>
    52|            <strong id="dash-lead-gainer">Memuat...</strong>
    53|            <small id="dash-lead-gainer-note">Menunggu top movers valid.</small>
    54|          </div>
    55|          <div class="dash-summary-card">
    56|            <span>Sektor Utama</span>
    57|            <strong id="dash-lead-sector">Memuat...</strong>
    58|            <small id="dash-lead-sector-note">Snapshot rotasi sektor.</small>
    59|          </div>
    60|        </div>
    61|      </div>
    62|      <div class="dash-quote-card dash-mobile-status">
    63|        <div class="dash-quote-meta"><span class="badge" id="market-fold-badge">SYNC</span><span class="mono text-xs text-dim" id="market-fold-status">loading...</span></div>
    64|        <div class="text-xs text-dim mb-2" id="market-data-date">Data IDX: loading...</div>
    65|        <div class="text-xs text-dim uppercase strong">IHSG</div>
    66|        <div class="flex justify-between items-end gap-3"><div class="mono strong dash-big" id="ihsg-value">—</div><div class="mono strong text-up" id="ihsg-change">—</div></div>
    67|        <div class="dashboard-metrics mt-3"><div><span>Open</span><strong id="ihsg-open">—</strong></div><div><span>High</span><strong id="ihsg-high" class="text-up">—</strong></div><div><span>Low</span><strong id="ihsg-low" class="text-down">—</strong></div></div>
    68|        <div class="dash-quote-freshness" id="dash-quote-freshness">Sinkronisasi: menunggu ringkasan pasar.</div>
    69|      </div>
    70|    </div>
    71|
    72|    <div class="dash-grid-pro dash-mobile-shell">
    73|      <div class="panel dash-chart-panel">
    74|        <div class="flex justify-between items-center mb-3">
    75|          <div><h3 class="panel-title">IHSG Chart</h3><p class="text-xs text-dim" id="ihsg-chart-subtitle">Data dari IDX</p></div>
    76|          <div class="dashboard-chip-row">
    77|            <button class="btn btn-mini ihsg-range" data-range="1W">1W</button>
    78|            <button class="btn btn-primary btn-mini ihsg-range" data-range="1M">1M</button>
    79|            <button class="btn btn-mini ihsg-range" data-range="1Q">1Q</button>
    80|          </div>
    81|        </div>
    82|        <div class="dash-chart-context"><span class="dash-chart-context-chip" id="dash-chart-bias-chip">Bias dihitung</span><strong id="dash-chart-readout">IHSG readout menunggu data.</strong></div>
    83|        <div class="dashboard-chart-wrap"><canvas id="ihsgMainChart"></canvas></div>
    84|      </div>
    85|      <div class="panel dash-movers-panel">
    86|        <div class="flex justify-between items-center mb-3">
    87|          <div><h3 class="panel-title">Penggerak Teratas</h3><div class="dash-movers-summary"><span class="dash-movers-summary-chip" id="dash-movers-summary-chip">Tape dimuat</span></div></div>
    88|          <a href="#market" class="text-xs text-primary strong">Lihat Semua</a>
    89|        </div>
    90|        <div id="movers-list" class="flex-col gap-2"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyiapkan data</strong></div></div>
    91|      </div>
    92|    </div>
    93|
    94|    <div class="dash-bottom-grid dash-bottom-grid-phase2 dash-bottom-grid-mobile">
    95|      <div class="panel"><h3 class="panel-title mb-3">Intelijen Pasar</h3><div id="market-intel" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Menyusun ringkasan</strong><span class="dashboard-widget-state-note">Merangkum breadth, sektor, dan rencana intraday.</span></div></div></div>
    96|      <div class="panel"><h3 class="panel-title mb-3">AI Picks</h3><div id="dash-ai-pick-summary" class="text-xs text-muted mb-2">Menyiapkan pick unggulan...</div><div id="dash-ai-pick-widget"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengambil pick</strong><span class="dashboard-widget-state-note">Menarik kandidat dengan score tertinggi.</span></div></div></div>
    97|      <div class="panel"><h3 class="panel-title mb-3">Berita Terbaru</h3><div id="news-container" class="intel-list"><div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Mengumpulkan berita</strong><span class="dashboard-widget-state-note">Menarik berita terbaru dari feed.</span></div></div></div>
    98|    </div>
    99|  </section>`;
   100|  observeElements();
   101|  if (typeof lucide !== 'undefined') lucide.createIcons();
   102|  const [market] = await Promise.all([loadMarketSummary(), loadNews(), loadIntel(), loadMovers(), loadAiPickWidget()]);
   103|  initChart(market);
   104|  setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.dataset.val || '0'), 900)), 100);
   105|}
   106|
   107|async function loadMarketSummary(){
   108|  const summary = await fetchMarketSummary();
   109|  const isLive = summary && summary.status !== 'no_data' && summary.value;
   110|  document.getElementById('market-fold-status').textContent = isLive ? 'DB SYNCED' : 'IDX REFERENCE';
   111|  document.getElementById('market-fold-badge').textContent = isLive ? 'DB' : 'REF';
   112|  const dataDate = summary?.data_date || (summary?.updated_at ? String(summary.updated_at).slice(0,10) : null);
   113|  const dateEl = document.getElementById('market-data-date');
   114|  if (dateEl) dateEl.textContent = dataDate ? `Data ${dataDate} · sync 18:00 WIB` : 'Data belum tersedia';
   115|  const freshnessEl = document.getElementById('dash-quote-freshness');
   116|  if (freshnessEl) freshnessEl.textContent = dataDate ? `Sinkronisasi: ${dataDate}` : 'Sinkronisasi: menunggu data.';
   117|  const v = summary?.value ?? null, c = Number(summary?.change_pct ?? 0);
   118|  document.getElementById('ihsg-value').textContent = v != null ? nf(v, 2) : '—';
   119|  const ch = document.getElementById('ihsg-change'); ch.textContent = v != null ? pf(c) : '—'; ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
   120|  document.getElementById('ihsg-open').textContent = summary?.open != null ? nf(summary.open) : '—';
   121|  document.getElementById('ihsg-high').textContent = summary?.high != null ? nf(summary.high) : '—';
   122|  document.getElementById('ihsg-low').textContent = summary?.low != null ? nf(summary.low) : '—';
   123|  const biasLabel = document.getElementById('dash-bias-label');
   124|  const biasNote = document.getElementById('dash-bias-note');
   125|  if (biasLabel) biasLabel.textContent = v == null ? 'Menunggu snapshot' : c >= 0 ? 'Tape Berisiko' : 'Tape Defensif';
   126|  if (biasNote) biasNote.textContent = v == null ? 'Ringkasan belum lengkap.' : c >= 0 ? `IHSG ${pf(c)} dengan bias momentum bertahan.` : `IHSG ${pf(c)} defensif, selektivitas lebih penting.`;
   127|  return summary;
   128|}
   129|
   130|async function loadIntel(){
   131|  const [summary, breadthRes, gainersRes, losersRes, sectorRes] = await Promise.all([
   132|    fetchMarketSummary().catch(() => null),
   133|    fetchMarketBreadth().catch(() => null),
   134|    fetchTopMovers(5, 'gainers').catch(() => null),
   135|    fetchTopMovers(5, 'losers').catch(() => null),
   136|    fetchSectorSummary().catch(() => null),
   137|  ]);
   138|  const sectors = Array.isArray(sectorRes?.data) && sectorRes.data.length
   139|    ? sectorRes.data : [{ sector:'Finance', change_pct:1.2 }, { sector:'Energy', change_pct:0.8 }, { sector:'Technology', change_pct:-1.5 }];
   140|  const best = [...sectors].sort((a,b)=>Number(b.change_pct||0)-Number(a.change_pct||0))[0];
   141|  const breadth = breadthRes?.data || {};
   142|  const adv = Number(breadth.advancing ?? 0);
   143|  const dec = Number(breadth.declining ?? 0);
   144|  const gainers = Array.isArray(gainersRes?.data) ? gainersRes.data : [];
   145|  const losers = Array.isArray(losersRes?.data) ? losersRes.data : [];
   146|  const leadGainer = gainers[0] || null;
   147|  const leadLoser = losers[0] || null;
   148|  const tapeBias = adv === 0 && dec === 0 ? 'menunggu data' : adv >= dec ? 'bias positif' : 'tekanan dominan';
   149|  const planLine = Number(summary?.change_pct ?? 0) >= 0
   150|    ? 'Fokus ke saham pemimpin sektor, validasi volume sebelum entry.'
   151|    : 'Prioritaskan defense, entry bertahap, hindari chasing.';
   152|  const biasLabel = document.getElementById('dash-bias-label');
   153|  const leadGainerEl = document.getElementById('dash-lead-gainer');
   154|  const leadGainerNoteEl = document.getElementById('dash-lead-gainer-note');
   155|  const leadSectorEl = document.getElementById('dash-lead-sector');
   156|  const leadSectorNoteEl = document.getElementById('dash-lead-sector-note');
   157|  const chartBiasChip = document.getElementById('dash-chart-bias-chip');
   158|  const chartReadout = document.getElementById('dash-chart-readout');
   159|  if (biasLabel) biasLabel.textContent = adv === 0 && dec === 0 ? 'Butuh breadth' : adv >= dec ? 'Tape Berisiko' : 'Tape Defensif';
   160|  if (leadGainerEl) leadGainerEl.textContent = leadGainer?.ticker || 'Belum ada';
   161|  if (leadGainerNoteEl) leadGainerNoteEl.textContent = leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin hari ini.` : 'Top movers belum lengkap.';
   162|  if (leadSectorEl) leadSectorEl.textContent = best?.sector || best?.name || 'Finance';
   163|  if (leadSectorNoteEl) leadSectorNoteEl.textContent = `${best?.sector||'Sektor'} rotasi ${pf(best?.change_pct ?? 1.2)}.`;
   164|  if (chartBiasChip) chartBiasChip.textContent = adv === 0 && dec === 0 ? 'Data breadth belum tersedia' : adv >= dec ? 'Breadth mendukung' : 'Breadth melemah';
   165|  if (chartReadout) chartReadout.textContent = `IHSG ${pf(Number(summary?.change_pct ?? 0))} · ${adv} adv vs ${dec} dec · ${planLine}`;
   166|  document.getElementById('market-intel').innerHTML = [
   167|    { kicker: 'Breadth', value: `${adv} vs ${dec}`, note: adv === 0 && dec === 0 ? 'Snapshot belum valid.' : `${tapeBias} untuk first glance.` },
   168|    { kicker: 'Leader', value: leadGainer?.ticker || best?.sector || 'N/A', note: leadGainer ? `${pf(leadGainer.change_pct ?? 0)} memimpin.` : 'Fallback sektoral.' },
   169|    { kicker: 'Sektor', value: best?.sector||best?.name||'Finance', note: `${best?.sector||''} rotasi ${pf(best?.change_pct ?? 1.2)}.` },
   170|    { kicker: 'Plan', value: Number(summary?.change_pct ?? 0) >= 0 ? 'Selektif' : 'Defensif', note: planLine }
   171|  ].map(({ kicker, value, note }, idx)=>`<div class="dash-intel-card ${idx===0?'dash-intel-card-primary':''}"><span class="dash-intel-kicker">${kicker}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
   172|}
   173|
   174|async function loadMovers(){
   175|  const res = await fetchTopMovers(5, 'gainers');
   176|  const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
   177|  const moversSummaryChip = document.getElementById('dash-movers-summary-chip');
   178|  if (items.length) {
   179|    const positiveCount = items.filter(item => Number(item.change_pct ?? 0) >= 0).length;
   180|    if (moversSummaryChip) moversSummaryChip.textContent = `${positiveCount}/${items.length} positif`;
   181|    document.getElementById('movers-list').innerHTML = items.slice(0,5).map((r, index) => row({
   182|      ticker: r.ticker, name: r.name || r.sector || 'Ekuitas IDX', price: r.price ?? 0,
   183|      change: r.change_pct ?? 0, rank: index + 1,
   184|    })).join('');
   185|  } else {
   186|    if (moversSummaryChip) moversSummaryChip.textContent = 'Data belum tersedia';
   187|    document.getElementById('movers-list').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Belum ada data penggerak</strong><span class="dashboard-widget-state-note">Top movers akan muncul setelah scheduler memperbarui basis data.</span></div>';
   188|  }
   189|}
   190|
   191|async function loadAiPickWidget() {
   192|  const mount = document.getElementById('dash-ai-pick-widget');
   193|  const summaryEl = document.getElementById('dash-ai-pick-summary');
   194|  if (!mount) return;
   195|
   196|  const wireFeaturedPickDetail = (featured, mode = 'swing') => {
   197|    const detailButton = mount.querySelector('[data-dash-ai-pick-open-detail]');
   198|    if (!detailButton || !featured?.ticker) return;
   199|    detailButton.addEventListener('click', (event) => {
   200|      event.preventDefault(); event.stopPropagation();
   201|      const ticker = detailButton.getAttribute('data-dash-ai-pick-open-detail');
   202|      if (!ticker) return;
   203|      safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(featured, mode));
   204|      window.location.hash = `#stock/${ticker}`;
   205|    });
   206|  };
   207|
   208|  const wireAltPickDetails = (alternatives = [], mode = 'swing') => {
   209|    mount.querySelectorAll('[data-dash-ai-pick-alt-detail]').forEach((button) => {
   210|      button.addEventListener('click', (event) => {
   211|        event.preventDefault(); event.stopPropagation();
   212|        const ticker = button.getAttribute('data-dash-ai-pick-alt-detail');
   213|        const item = alternatives.find(candidate => candidate.ticker === ticker);
   214|        if (!ticker || !item) return;
   215|        safeSessionStorageSet(AI_PICKS_CONTEXT_KEY, buildAiPickContext(item, mode));
   216|        window.location.hash = `#stock/${ticker}`;
   217|      });
   218|    });
   219|  };
   220|
   221|  const payload = await fetchAiPicks('swing', 3).catch(() => null);
   222|  const picks = Array.isArray(payload?.data) ? payload.data : [];
   223|  const featured = picks[0];
   224|
   225|  if (!featured) {
   226|    if (summaryEl) summaryEl.textContent = 'Belum ada pick unggulan.';
   227|    mount.innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">AI Picks sementara kosong</strong><span class="dashboard-widget-state-note">Universe kandidat sedang tipis. Buka AI Picks untuk hasil lebih lengkap.</span><a href="#ai-picks" class="btn btn-secondary portfolio-action-btn mt-10">Buka AI Picks</a></div>';
   228|    return;
   229|  }
   230|
   231|  if (summaryEl) summaryEl.textContent = `${payload?.summary?.eligible_count || picks.length} kandidat lolos filter.`;
   232|  const alternatives = picks.slice(1, 3);
   233|  mount.innerHTML = `
   234|    <div class="dash-ai-pick-featured">
   235|      <a href="#ai-picks" class="dash-ai-pick-featured-link">
   236|        <div class="dash-ai-pick-head">
   237|          <div>
   238|            <span class="dash-intel-kicker">Featured · ${featured.ticker}</span>
   239|            <strong>${featured.name || featured.ticker}</strong>
   240|          </div>
   241|          <div class="dash-ai-pick-score">${nf(featured.score, 1)}</div>
   242|        </div>
   243|        <p class="dash-ai-pick-fit">${featured.fit_label || 'Kandidat terbaik untuk mode swing.'}</p>
   244|        <div class="dash-ai-pick-metrics">
   245|          <div><span>Keyakinan</span><strong>${featured.confidence || '-'}</strong></div>
   246|          <div><span>Change</span><strong>${pf(featured.change_pct ?? 0)}</strong></div>
   247|          <div><span>Vol</span><strong>${nf(featured.volume_ratio, 2)}x</strong></div>
   248|        </div>
   249|        <div class="dash-ai-pick-summary">
   250|          <span>${featured.reason_labels?.[0] || 'Likuiditas dan teknikal mendukung.'}</span>
   251|        </div>
   252|      </a>
   253|      ${alternatives.length ? `
   254|        <div class="dash-ai-pick-alt-list">
   255|          ${alternatives.map(item => `
   256|            <button class="dash-ai-pick-alt-item" data-dash-ai-pick-alt-detail="${item.ticker}">
   257|              <span class="dash-ai-pick-alt-ticker">${item.ticker}</span>
   258|              <strong>${nf(item.score, 1)}</strong>
   259|              <small>${item.reason_labels?.[0] || item.fit_label || ''}</small>
   260|            </button>`).join('')}
   261|        </div>` : ''}
   262|      <div class="dash-ai-pick-cta-row">
   263|        <button class="btn" data-dash-ai-pick-open-detail="${featured.ticker}">Buka Detail</button>
   264|        <a href="#ai-picks" class="dash-ai-pick-cta">Buka AI Picks</a>
   265|      </div>
   266|    </div>`;
   267|  wireFeaturedPickDetail(featured, payload?.mode || 'swing');
   268|  wireAltPickDetails(alternatives, payload?.mode || 'swing');
   269|}
   270|
   271|async function loadNews(){
   272|  const res = await fetchNews(3);
   273|  const items = Array.isArray(res?.data) && res.data.length ? res.data : [];
   274|  if (items.length) {
   275|    document.getElementById('news-container').innerHTML = items.slice(0,3).map((n, index) => `
   276|      <a href="${n.link && n.link.startsWith('http') ? n.link : '#news'}" ${n.link && n.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="intel-item dash-news-card ${index===0?'dash-news-card-featured':''}">
   277|        <span class="badge">${n.source||'NEWS'}</span>
   278|        <b>${n.title}</b>
   279|        <span class="dash-news-meta">${index===0?'Headline':'Brief'} · ${n.source||'NEWS'}</span>
   280|        ${n.summary ? `<small>${String(n.summary).replace(/<[^>]+>/g,'').slice(0,72)}</small>` : ''}
   281|      </a>`).join('');
   282|  } else {
   283|    document.getElementById('news-container').innerHTML = '<div class="dashboard-widget-state"><strong class="dashboard-widget-state-title">Berita belum tersedia</strong><span class="dashboard-widget-state-note">Feed berita akan muncul setelah scheduler berjalan. Cek halaman Berita untuk update.</span></div>';
   284|  }
   285|}
   286|
   287|const row = (r) => `<a href="#stock/${r.ticker}" class="mover-row dash-mover-row">
   288|  <div class="dash-mover-main">
   289|    <span class="dash-mover-rank">#${r.rank || '—'}</span>
   290|    <div><b class="mono">${r.ticker}</b><small>${r.name || ''}</small></div>
   291|  </div>
   292|  <div class="text-right">
   293|    <b class="mono">${r.price == null ? '—' : nf(r.price,0)}</b>
   294|    <small class="${r.change>=0?'text-up':'text-down'}">${pf(r.change)}</small>
   295|  </div>
   296|</a>`;
   297|
   298|let ihsgChart;
   299|const PERIOD_MAP = { '1W': '1W', '1M': '1M', '1Q': '1Q', '1Y': '1Y' };
   300|
   301|async function loadIhsgChartData(period = '1M') {
   302|  try {
   303|    const chartRes = await fetchIhsgChart(period);
   304|    if (chartRes && chartRes.data && chartRes.data.length > 0) return chartRes;
   305|  } catch (e) { console.warn('IHSG chart fetch failed', e); }
   306|  return null;
   307|}
   308|
   309|function initChart(summary) {
   310|  const ctx = document.getElementById('ihsgMainChart');
   311|  if (!ctx || typeof Chart === 'undefined') return;
   312|
   313|  const render = async (range = '1M') => {
   314|    const chartRes = await loadIhsgChartData(range);
   315|    let labels, data;
   316|
   317|    if (chartRes && chartRes.data.length > 0) {
   318|      labels = chartRes.data.map(p => {
   319|        const d = new Date(p.date);
   320|        return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
   321|      });
   322|      data = chartRes.data.map(p => p.value);
   323|      const sub = document.getElementById('ihsg-chart-subtitle');
   324|      if (sub) {
   325|        const first = chartRes.data[0]?.date || '';
   326|        const last = chartRes.data[chartRes.data.length - 1]?.date || '';
   327|        sub.textContent = `IDX ${chartRes.period} · ${chartRes.count} points`;
   328|      }
   329|    } else {
   330|      document.getElementById('ihsg-chart-subtitle').textContent = 'Data IHSG menunggu scheduler.';
   331|      return;
   332|    }
   333|
   334|    const g = ctx.getContext('2d').createLinearGradient(0, 0, 0, 320);
   335|    g.addColorStop(0, 'rgba(16,185,129,.36)');
   336|    g.addColorStop(1, 'rgba(16,185,129,0)');
   337|    if (ihsgChart) ihsgChart.destroy();
   338|    ihsgChart = new Chart(ctx, {
   339|      type: 'line',
   340|      data: { labels, datasets: [{ data, borderColor: '#10b981', backgroundColor: g, borderWidth: 2, pointRadius: labels.length > 30 ? 0 : 2, fill: true, tension: .42 }] },
   341|      options: {
   342|        responsive: true, maintainAspectRatio: false,
   343|        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `IHSG ${nf(c.parsed.y, 2)}` } } },
   344|        scales: { x: { grid: { display: false }, ticks: { color: '#64748b', maxTicksLimit: 10 } }, y: { position: 'right', grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748b', callback: (v) => nf(v, 0) } } }
   345|      }
   346|    });
   347|  };
   348|  render('1M');
   349|  document.querySelectorAll('.ihsg-range').forEach(btn => btn.addEventListener('click', () => {
   350|    document.querySelectorAll('.ihsg-range').forEach(b => b.classList.remove('btn-primary'));
   351|    btn.classList.add('btn-primary');
   352|    render(btn.dataset.range);
   353|  }));
   354|}
   355|
