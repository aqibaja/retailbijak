import { fetchMarketSummary, fetchSectorSummary } from '../api.js?v=20260430e';
import { observeElements } from '../main.js?v=20260430e';

const fallbackSectors = [
  { sector: 'Finance', change_pct: 1.2, total: 128 },
  { sector: 'Technology', change_pct: -2.4, total: 34 },
  { sector: 'Energy', change_pct: 1.8, total: 72 },
  { sector: 'Consumer', change_pct: 0.3, total: 88 },
  { sector: 'Property', change_pct: -0.8, total: 59 },
  { sector: 'Basic Materials', change_pct: 0.5, total: 95 },
  { sector: 'Healthcare', change_pct: 0.6, total: 26 },
  { sector: 'Infrastructure', change_pct: 0.9, total: 41 },
  { sector: 'Transport', change_pct: -1.2, total: 25 },
  { sector: 'Industrials', change_pct: 1.5, total: 57 },
];

const fmt = (n, digits = 2) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: digits });
const pct = (n) => `${Number(n ?? 0) >= 0 ? '+' : ''}${Number(n ?? 0).toFixed(2)}%`;

function normalizeSectors(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  if (!rows.length) return fallbackSectors.map(s => ({ ...s, source: 'DEMO' }));
  return rows.map((r, idx) => ({
    sector: r.sector || r.name || `Sector ${idx + 1}`,
    change_pct: Number(r.change_pct ?? r.avg_change_pct ?? r.change ?? 0),
    total: Number(r.count ?? r.total ?? 0),
    source: payload?.source || payload?.status || 'LIVE',
  }));
}

function renderSectorCard(s) {
  const up = Number(s.change_pct) >= 0;
  const intensity = Math.min(Math.abs(Number(s.change_pct || 0)) / 4, 1);
  const bg = up ? `rgba(16,185,129,${0.06 + intensity * 0.14})` : `rgba(239,68,68,${0.06 + intensity * 0.14})`;
  const border = up ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)';
  return `
    <div class="p-4" style="background:${bg}; border:1px solid ${border}; border-radius:var(--radius-md); min-height:92px; display:flex; flex-direction:column; justify-content:space-between;">
      <div class="flex justify-between items-start gap-2">
        <div class="text-xs text-muted uppercase truncate strong" title="${s.sector}">${s.sector}</div>
        <span class="mono text-xs text-dim">${s.total || '-'}</span>
      </div>
      <div class="mono strong ${up ? 'text-up' : 'text-down'} text-lg">${pct(s.change_pct)}</div>
    </div>`;
}

export async function renderMarket(root) {
  root.innerHTML = `
    <section class="grid grid-cols-12 stagger-reveal">
      <div class="col-span-12 flex justify-between items-end mb-4">
        <div>
          <h1 class="text-3xl mb-2" data-i18n="market_overview" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Market Overview</h1>
          <p class="text-base" style="color:var(--text-muted);">Backend-linked sector performance, market breadth, and flow intelligence</p>
        </div>
        <div id="market-source" class="badge" style="background:rgba(99,102,241,0.1); color:#a5b4fc; border:1px solid rgba(99,102,241,0.2);">SYNCING</div>
      </div>

      <div class="col-span-8 flex-col gap-6">
        <div class="panel">
          <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom:1px solid var(--border-subtle);">
            <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Sector Performance</h3>
            <span id="sector-count" class="mono text-xs text-dim">LOADING</span>
          </div>
          <div id="sector-grid" class="grid grid-cols-5 gap-3">
            ${Array(10).fill('<div class="skeleton skeleton-shimmer" style="height:92px;border-radius:var(--radius-md);"></div>').join('')}
          </div>
        </div>

        <div class="panel">
          <div class="flex justify-between items-center mb-4 pb-4" style="border-bottom:1px solid var(--border-subtle);">
            <h3 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Market Pulse</h3>
            <span id="market-pulse" class="mono text-xs text-up strong" style="background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:4px;">BACKEND</span>
          </div>
          <div class="grid grid-cols-4 gap-3">
            <div class="p-4" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);"><div class="text-xs text-dim strong uppercase">IHSG</div><div id="m-value" class="mono strong text-main text-lg mt-2">--</div></div>
            <div class="p-4" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);"><div class="text-xs text-dim strong uppercase">Change</div><div id="m-change" class="mono strong text-lg mt-2">--</div></div>
            <div class="p-4" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);"><div class="text-xs text-dim strong uppercase">Volume</div><div id="m-volume" class="mono strong text-main text-lg mt-2">--</div></div>
            <div class="p-4" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);"><div class="text-xs text-dim strong uppercase">Value</div><div id="m-trade-value" class="mono strong text-main text-lg mt-2">--</div></div>
          </div>
        </div>
      </div>

      <div class="col-span-4 flex-col gap-4">
        <div class="panel flex-col">
          <h3 class="text-xs uppercase text-dim strong mb-4 border-b pb-2" style="border-bottom:1px solid var(--border-subtle); letter-spacing:0.08em;">Breadth Today</h3>
          <div class="flex-col gap-3">
            <div class="flex justify-between items-center"><span class="text-sm text-muted strong">Advancers</span><span id="m-adv" class="mono strong text-up text-base">--</span></div>
            <div class="flex justify-between items-center"><span class="text-sm text-muted strong">Decliners</span><span id="m-dec" class="mono strong text-down text-base">--</span></div>
            <div class="flex justify-between items-center"><span class="text-sm text-muted strong">Unchanged</span><span id="m-unc" class="mono strong text-main text-base">--</span></div>
          </div>
          <div class="mt-4 pt-4" style="border-top:1px solid var(--border-subtle);">
            <div id="bias-label" class="text-xs text-dim mb-2 strong uppercase" style="letter-spacing:0.05em;">BREADTH BIAS</div>
            <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;"><div id="bias-fill" style="width:50%; height:100%; background:var(--primary-color); border-radius:3px;"></div></div>
          </div>
        </div>

        <div class="panel flex-col accent-top" style="flex:1;">
          <h3 class="text-xs uppercase strong mb-4 flex items-center gap-2" style="color:#a5b4fc; letter-spacing:0.05em;"><i data-lucide="zap" style="width:14px;"></i> Intelligence Notes</h3>
          <div id="market-notes" class="flex-col gap-3 text-sm text-muted">
            <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">Loading market intelligence from backend aggregates...</div>
          </div>
        </div>
      </div>
    </section>`;

  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const [summary, sectorPayload] = await Promise.all([
    fetchMarketSummary().catch(() => null),
    fetchSectorSummary().catch(() => null),
  ]);

  const sectors = normalizeSectors(sectorPayload);
  const source = sectorPayload?.status || sectorPayload?.source || summary?.source || (sectorPayload?.data?.length ? 'LIVE DATA' : 'DEMO FALLBACK');
  document.getElementById('market-source').textContent = String(source).toUpperCase();
  document.getElementById('sector-count').textContent = `${sectors.length} SECTORS`;
  document.getElementById('sector-grid').innerHTML = sectors.map(renderSectorCard).join('');

  const adv = Number(summary?.advancers ?? 328);
  const dec = Number(summary?.decliners ?? 271);
  const unc = Number(summary?.unchanged ?? 143);
  const breadthPct = Math.round((adv / Math.max(adv + dec, 1)) * 100);
  document.getElementById('m-value').textContent = fmt(summary?.value ?? 7080.63);
  document.getElementById('m-change').textContent = pct(summary?.change_pct ?? 0.12);
  document.getElementById('m-change').className = `mono strong text-lg mt-2 ${Number(summary?.change_pct ?? 0.12) >= 0 ? 'text-up' : 'text-down'}`;
  document.getElementById('m-volume').textContent = summary?.volume ? fmt(summary.volume, 1) : '8.4T';
  document.getElementById('m-trade-value').textContent = summary?.trade_value ? `Rp ${fmt(summary.trade_value, 1)}` : 'Rp 9.2T';
  document.getElementById('m-adv').textContent = fmt(adv, 0);
  document.getElementById('m-dec').textContent = fmt(dec, 0);
  document.getElementById('m-unc').textContent = fmt(unc, 0);
  document.getElementById('bias-fill').style.width = `${breadthPct}%`;
  document.getElementById('bias-label').textContent = breadthPct >= 55 ? 'BULLISH BIAS' : breadthPct <= 45 ? 'BEARISH BIAS' : 'NEUTRAL BREADTH';

  const best = [...sectors].sort((a, b) => b.change_pct - a.change_pct)[0];
  const worst = [...sectors].sort((a, b) => a.change_pct - b.change_pct)[0];
  document.getElementById('market-notes').innerHTML = `
    <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle); border-left:2px solid var(--accent-indigo);">Best sector: <strong style="color:var(--text-main)">${best?.sector || 'N/A'}</strong> at <span class="${best?.change_pct >= 0 ? 'text-up' : 'text-down'} mono strong">${pct(best?.change_pct || 0)}</span>.</div>
    <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">Weakest sector: <strong style="color:var(--text-main)">${worst?.sector || 'N/A'}</strong> at <span class="${worst?.change_pct >= 0 ? 'text-up' : 'text-down'} mono strong">${pct(worst?.change_pct || 0)}</span>.</div>
    <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">Breadth ratio: ${fmt(adv,0)} advancers vs ${fmt(dec,0)} decliners. Data path: <span class="mono">/api/market-summary</span> + <span class="mono">/api/sector-summary</span>.</div>
  `;
}
