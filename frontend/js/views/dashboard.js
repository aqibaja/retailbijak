import { fetchNews, fetchMarketSummary, fetchSectorSummary } from '../api.js?v=20260430h';
import { observeElements, animateValue } from '../main.js?v=20260430h';

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
        <p>Pantau IHSG, breadth, top movers, dan ide cepat dalam satu layar trading yang padat.</p>
        <div class="dash-actions"><a href="#screener" class="btn btn-primary">Run Scanner</a><a href="#market" class="btn">Market Overview</a></div>
      </div>
      <div class="dash-quote-card">
        <div class="flex justify-between items-start mb-3"><span class="badge" id="market-fold-badge">SYNC</span><span class="mono text-xs text-dim" id="market-fold-status">loading...</span></div>
        <div class="text-xs text-dim uppercase strong">IHSG Composite</div>
        <div class="flex justify-between items-end gap-3"><div class="mono strong dash-big" id="ihsg-value">7.080,63</div><div class="mono strong text-up" id="ihsg-change">+0.12%</div></div>
        <div class="dashboard-metrics mt-3"><div><span>Open</span><strong id="ihsg-open">7.096</strong></div><div><span>High</span><strong id="ihsg-high" class="text-up">7.126</strong></div><div><span>Low</span><strong id="ihsg-low" class="text-down">7.063</strong></div></div>
      </div>
    </div>

    <div class="dash-grid-pro">
      <div class="panel dash-chart-panel">
        <div class="flex justify-between items-center mb-3"><div><h3 class="panel-title">IHSG Intraday Chart</h3><p class="text-xs text-dim">Fallback chart aktif bila data live kosong</p></div><div class="dashboard-chip-row"><button class="btn btn-primary btn-mini">1D</button><button class="btn btn-mini">1W</button><button class="btn btn-mini">1M</button></div></div>
        <div class="dashboard-chart-wrap"><canvas id="ihsgMainChart"></canvas></div>
      </div>
      <div class="panel dash-movers-panel"><div class="flex justify-between items-center mb-3"><h3 class="panel-title">Top Movers</h3><a href="#market" class="text-xs text-primary strong">View All</a></div><div id="movers-list" class="flex-col gap-2">${MOVERS.map(row).join('')}</div></div>
    </div>

    <div class="dash-bottom-grid">
      <div class="panel"><h3 class="panel-title mb-3">Market Intelligence</h3><div id="market-intel" class="intel-list"><div class="intel-item">Loading intelligence...</div></div></div>
      <div class="panel"><h3 class="panel-title mb-3">Suggestions</h3><div class="suggestion-grid">${['BBCA','BMRI','GOTO','BRPT','TLKM','ANTM'].map(t=>`<a href="#stock/${t}" class="suggestion-pill"><span>${t}</span><small>Open detail</small></a>`).join('')}</div></div>
      <div class="panel"><h3 class="panel-title mb-3">Latest News</h3><div id="news-container" class="intel-list"><div class="intel-item">Loading news...</div></div></div>
    </div>
  </section>`;
  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  await Promise.all([loadMarketSummary(), loadNews(), loadIntel()]);
  initChart();
  setTimeout(() => document.querySelectorAll('.val-counter').forEach(el => animateValue(el, 0, parseInt(el.dataset.val || '0'), 900)), 100);
}

async function loadMarketSummary(){
  const summary = await fetchMarketSummary();
  const isLive = summary && summary.status !== 'no_data' && summary.value;
  document.getElementById('market-fold-status').textContent = isLive ? 'LIVE DATA' : 'DEMO SNAPSHOT';
  document.getElementById('market-fold-badge').textContent = isLive ? 'LIVE' : 'DEMO';
  const v = summary?.value ?? 7080.63, c = Number(summary?.change_pct ?? 0.12);
  document.getElementById('ihsg-value').textContent = nf(v, 2);
  const ch = document.getElementById('ihsg-change'); ch.textContent = pf(c); ch.className = `mono strong ${c>=0?'text-up':'text-down'}`;
  document.getElementById('ihsg-open').textContent = nf(summary?.open ?? 7096.61);
  document.getElementById('ihsg-high').textContent = nf(summary?.high ?? 7126.06);
  document.getElementById('ihsg-low').textContent = nf(summary?.low ?? 7063.99);
}
async function loadIntel(){
  const [m,s] = await Promise.all([fetchMarketSummary().catch(()=>null), fetchSectorSummary().catch(()=>null)]);
  const sectors = Array.isArray(s?.data)&&s.data.length?s.data:[{sector:'Finance',change_pct:1.2},{sector:'Energy',change_pct:0.8},{sector:'Technology',change_pct:-1.5}];
  const best = [...sectors].sort((a,b)=>Number(b.change_pct||0)-Number(a.change_pct||0))[0];
  const adv = Number(m?.advancers ?? 328), dec = Number(m?.decliners ?? 271);
  document.getElementById('market-intel').innerHTML = [
    `Breadth: <b>${adv}</b> advancers vs <b>${dec}</b> decliners — bias ${adv>=dec?'positif':'hati-hati'}.`,
    `Sector leader: <b>${best?.sector||best?.name||'Finance'}</b> (${pf(best?.change_pct ?? 1.2)}).`,
    `Plan: prioritaskan entry bertahap, validasi volume, hindari chasing saat candle melebar.`
  ].map(x=>`<div class="intel-item">${x}</div>`).join('');
}
async function loadNews(){
  const res = await fetchNews(3); const items = (Array.isArray(res?.data)&&res.data.length?res.data:FALLBACK_NEWS);
  document.getElementById('news-container').innerHTML = items.slice(0,3).map(n=>`<a href="${n.link||'#news'}" class="intel-item"><span class="badge">${n.source||'NEWS'}</span><b>${n.title}</b></a>`).join('');
}
const row = (r) => `<a href="#stock/${r.ticker}" class="mover-row"><div><b class="mono">${r.ticker}</b><small>${r.name}</small></div><div class="text-right"><b class="mono">${nf(r.price,0)}</b><small class="${r.change>=0?'text-up':'text-down'}">${pf(r.change)}</small></div></a>`;
function initChart(){
  const ctx = document.getElementById('ihsgMainChart'); if(!ctx || typeof Chart==='undefined') return;
  const g = ctx.getContext('2d').createLinearGradient(0,0,0,320); g.addColorStop(0,'rgba(16,185,129,.36)'); g.addColorStop(1,'rgba(16,185,129,0)');
  new Chart(ctx,{type:'line',data:{labels:['09:00','10:00','11:00','13:00','14:00','15:00','16:00'],datasets:[{data:[7060,7075,7070,7088,7082,7096,7080.63],borderColor:'#10b981',backgroundColor:g,borderWidth:2,pointRadius:0,fill:true,tension:.42}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#64748b'}},y:{position:'right',grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#64748b'}}}}});
}
