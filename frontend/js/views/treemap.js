import { apiFetch } from '../api.js';
import { fmt, pct, fmtRp, nf } from '../utils/format.js';
import { t as _t } from '../i18n.js?v=20260518L';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

// ─── Squarify Treemap Algorithm (Bruls/Huizing/van Wijk) ─────
// Pure JS, zero deps. Produces optimal aspect ratio rectangles.

function squarifyLayout(items, containerW, containerH) {
  if (!items.length || !containerW || !containerH) return [];
  const totalValue = items.reduce((s, it) => s + Math.max(0, it.value), 0);
  if (totalValue <= 0) return items.map(it => ({ ...it, x: 0, y: 0, w: 0, h: 0 }));

  // Normalize to area units
  const area = items.map(it => ({ ...it, area: (Math.max(0, it.value) / totalValue) * containerW * containerH }));
  const sorted = area.sort((a, b) => b.area - a.area);
  const result = [];

  function worstRatio(row, w) {
    if (!row.length) return Infinity;
    const sum = row.reduce((s, r) => s + r.area, 0);
    const max = Math.max(...row.map(r => r.area));
    const min = Math.min(...row.map(r => r.area));
    return Math.max((w * w * max) / (sum * sum), (sum * sum) / (w * w * min));
  }

  function layoutRow(row, x, y, w, h) {
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      // Horizontal strip
      let curY = y;
      row.forEach((r, i) => {
        const rh = (r.area / sum) * h;
        result.push({ ...r, x, y: curY, w, h: rh });
        curY += rh;
      });
      return { x: x + w, y };
    } else {
      // Vertical strip
      let curX = x;
      row.forEach((r, i) => {
        const rw = (r.area / sum) * w;
        result.push({ ...r, x: curX, y, w: rw, h });
        curX += rw;
      });
      return { x, y: y + h };
    }
  }

  function squarify(items, x, y, w, h, depth) {
    if (!items.length || w <= 0 || h <= 0) return;
    if ((depth || 0) > 200) { items.forEach(it => result.push({ ...it, x, y, w: w / items.length, h })); return; }
    if (items.length === 1) {
      result.push({ ...items[0], x, y, w, h });
      return;
    }
    const row = [];
    const remaining = [...items];
    let isVertical = h > w;

    while (remaining.length) {
      const item = remaining.shift();
      row.push(item);
      const cur = worstRatio(row, isVertical ? h : w);
      if (remaining.length > 0) {
        const next = worstRatio([...row, remaining[0]], isVertical ? h : w);
        if (next > cur) {
          // Commit this row
          row.pop();
          remaining.unshift(item);
          const sum = row.reduce((s, r) => s + r.area, 0);
          if (isVertical) {
            const rw = Math.max(1, sum / h);
            layoutRow(row, x, y, rw, h);
            x += rw; w = Math.max(0, w - rw);
          } else {
            const rh = Math.max(1, sum / w);
            layoutRow(row, x, y, w, rh);
            y += rh; h = Math.max(0, h - rh);
          }
          squarify(remaining, x, y, w, h, (depth || 0) + 1);
          return;
        }
      }
    }
    // Last row — use layoutRow directly to avoid infinite recursion
    layoutRow(row, x, y, w, h);
  }

  squarify(sorted, 0, 0, containerW, containerH);
  return result;
}

// ─── Color helpers ────────────────────────────────────────────

function changeColorClass(changePct) {
  if (changePct == null) return 'treemap-neutral';
  const abs = Math.abs(changePct);
  if (changePct >= 0) {
    if (abs >= 5) return 'treemap-positive-4';
    if (abs >= 3) return 'treemap-positive-3';
    if (abs >= 1) return 'treemap-positive-2';
    return 'treemap-positive-1';
  }
  if (abs >= 5) return 'treemap-negative-4';
  if (abs >= 3) return 'treemap-negative-3';
  if (abs >= 1) return 'treemap-negative-2';
  return 'treemap-negative-1';
}

function changeBgStyle(changePct) {
  if (changePct == null) return 'background:var(--bg-panel)';
  const abs = Math.abs(changePct);
  if (changePct >= 0) {
    const intensity = Math.min(abs / 5, 1);
    const g = Math.round(185 + (70 - 185) * intensity);
    const b = Math.round(129 + (70 - 129) * intensity);
    return `background:rgba(16,${g},${b},${0.15 + 0.35 * intensity})`;
  }
  const intensity = Math.min(abs / 5, 1);
  const r = Math.round(248 + (220 - 248) * intensity);
  const g2 = Math.round(113 + (70 - 113) * intensity);
  const b2 = Math.round(113 + (70 - 113) * intensity);
  return `background:rgba(${r},${g2},${b2},${0.15 + 0.35 * intensity})`;
}

function changeTextColor(changePct) {
  if (changePct == null) return 'var(--text-muted)';
  return changePct >= 0 ? 'var(--up-color)' : 'var(--down-color)';
}

// ─── Tooltip ──────────────────────────────────────────────────

let tooltipEl = null;
function ensureTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'treemap-tooltip';
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);
  }
}

function showTooltip(e, stock) {
  ensureTooltip();
  const pct = stock.change != null ? (stock.change >= 0 ? '+' : '') + stock.change.toFixed(2) + '%' : '—';
  tooltipEl.innerHTML = `<strong>${stock.ticker}</strong><small>${stock.name || ''}</small><span>Harga: ${stock.price != null ? fmtRp(stock.price) : '—'}</span><span>Perubahan: ${pct}</span>${stock.market_cap ? `<span>Kap: ${fmtRp(stock.market_cap)}</span>` : ''}`;
  tooltipEl.style.display = 'block';
}

function hideTooltip() { if (tooltipEl) tooltipEl.style.display = 'none'; }
document.addEventListener('mousemove', e => { if (tooltipEl && tooltipEl.style.display === 'block') { tooltipEl.style.left = (e.clientX + 14) + 'px'; tooltipEl.style.top = (e.clientY - 10) + 'px'; } });

// ─── Desktop Squarify Render ──────────────────────────────────

function renderSquarifyTreemap(data) {
  if (!data || !data.sectors || !data.sectors.length) {
    return `<div class="treemap-empty"><div class="treemap-empty-icon">📊</div><h3>Data Belum Tersedia</h3><p>Silakan coba lagi nanti.</p></div>`;
  }

  // Prepare sector-level items for squarify
  const sectorItems = data.sectors.filter(s => s.weight > 0).map(s => ({
    sector: s.sector, weight: s.weight, change: s.return_1d,
    stocks: s.stocks || [], value: s.weight,
  }));

  // Sector-level layout
  const container = document.getElementById('treemap-squarify-container');
  const cw = container ? container.clientWidth : window.innerWidth - 80;
  const ch = Math.max(400, window.innerHeight * 0.6);
  const sectorRects = squarifyLayout(sectorItems, cw, ch);

  let html = '';
  sectorRects.forEach((sec, si) => {
    const secChange = sec.change ?? 0;
    const secBg = changeBgStyle(secChange);

    // Stock-level layout within this sector
    const stockItems = (sec.stocks || []).filter(s => s.market_cap > 0 || s.price > 0).map(s => ({
      ticker: s.ticker, name: s.name || '', price: s.price,
      change: s.change, market_cap: s.market_cap, value: Math.max(1, s.market_cap || s.price || 1),
    }));
    if (!stockItems.length) {
      html += `<a class="treemap-sector-sq" style="position:absolute;left:${sec.x}px;top:${sec.y}px;width:${sec.w}px;height:${sec.h}px;overflow:hidden;border-radius:6px;${secBg};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;text-decoration:none;color:inherit" href="#stock/${sec.sector}">
        <span style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80%">${sec.sector}</span>
        <span style="font-size:10px;color:${changeTextColor(secChange)}">${secChange >= 0 ? '+' : ''}${secChange.toFixed(1)}%</span>
      </a>`;
      return;
    }
    const stockRects = squarifyLayout(stockItems, sec.w - 4, sec.h - 24);

    const stocksHtml = stockRects.map(stk => {
      const stkBg = changeBgStyle(stk.change);
      const minDim = Math.min(stk.w, stk.h);
      const showLabel = minDim > 30;
      return `<a href="#stock/${stk.ticker}" class="treemap-stock-sq" style="position:absolute;left:${stk.x + 2}px;top:${stk.y + 22}px;width:${stk.w - 2}px;height:${stk.h - 2}px;border-radius:3px;${stkBg};display:flex;align-items:center;justify-content:center;overflow:hidden;text-decoration:none;color:inherit"
          data-ticker="${stk.ticker}" data-price="${stk.price}" data-change="${stk.change ?? ''}" data-marketcap="${stk.market_cap || 0}" data-name="${(stk.name || '').replace(/"/g, '&quot;')}"
          onmouseenter="treemapStockHover(event)" onmouseleave="treemapStockLeave(event)">
        ${showLabel ? `<span style="font-size:${minDim > 50 ? 11 : 9}px;font-weight:700;font-family:var(--font-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90%;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4)">${stk.ticker}</span>` : ''}
      </a>`;
    }).join('');

    html += `<div class="treemap-sector-sq" style="position:absolute;left:${sec.x}px;top:${sec.y}px;width:${sec.w}px;height:${sec.h}px;overflow:hidden;border-radius:6px;${secBg}">
      <div style="padding:3px 6px;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;justify-content:space-between;align-items:center">
        <span>${sec.sector}</span>
        <span style="color:${changeTextColor(secChange)}">${secChange >= 0 ? '+' : ''}${secChange.toFixed(1)}%</span>
      </div>
      ${stocksHtml}
    </div>`;
  });

  return `<div class="treemap-meta" style="margin-bottom:10px">
    <span class="treemap-date">📅 ${data.date || '—'}</span>
    <span class="treemap-count">${data.total_stocks} saham</span>
    <span class="treemap-legend" style="display:inline-flex;gap:8px;font-size:10px">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,0.2);vertical-align:middle;margin-right:4px"></span> +0-1%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,0.5);vertical-align:middle;margin-right:4px"></span> +1-3%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,0.8);vertical-align:middle;margin-right:4px"></span> +3-5%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,1);vertical-align:middle;margin-right:4px"></span> +5%+</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(248,113,113,0.2);vertical-align:middle;margin-right:4px"></span> -0-1%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(248,113,113,0.5);vertical-align:middle;margin-right:4px"></span> -1-3%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(248,113,113,0.8);vertical-align:middle;margin-right:4px"></span> -3-5%</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(248,113,113,1);vertical-align:middle;margin-right:4px"></span> -5%-</span>
    </span>
  </div>
  <div id="treemap-squarify-container" style="position:relative;width:100%;height:${ch}px;min-height:400px">
    ${html}
  </div>`;
}

// ─── Skeleton loader ──────────────────────────────────────────

function skeletonTreemap() {
  return `<div class="treemap-loading">
    <div class="treemap-loading-header">
      <div class="skeleton-shimmer skeleton-title" style="width:160px;height:20px;border-radius:6px;margin-bottom:8px"></div>
      <div class="skeleton-shimmer skeleton-text" style="width:100px;height:14px;border-radius:4px"></div>
    </div>
    <div class="treemap-loading-grid">
      ${Array(8).fill('').map(() =>
        `<div class="treemap-loading-sector">
          <div class="skeleton-shimmer" style="width:60%;height:12px;border-radius:4px;margin-bottom:6px"></div>
          <div style="display:flex;flex-wrap:wrap;gap:2px">
            ${Array(6).fill('').map(() =>
              `<div class="skeleton-shimmer" style="width:28%;height:24px;border-radius:3px"></div>`
            ).join('')}
          </div>
        </div>`
      ).join('')}
    </div>
  </div>`;
}

// ─── Mobile simplified list view ──────────────────────────────

function renderMobileList(data) {
  if (!data || !data.sectors || !data.sectors.length) {
    return `<div class="treemap-empty"><div class="treemap-empty-icon">📊</div><h3>Data Belum Tersedia</h3><p>Silakan coba lagi nanti.</p></div>`;
  }

  const rows = data.sectors.map(sec => {
    const chg = sec.return_1d;
    const isUp = chg >= 0;
    const pctWidth = Math.min(Math.abs(chg) * 6, 100);
    return `<div class="treemap-mobile-row">
      <div class="treemap-mobile-row-main">
        <span class="treemap-mobile-sector">${sec.sector}</span>
        <span class="treemap-mobile-ret ${isUp ? 'is-up' : 'is-down'}">${isUp ? '+' : ''}${chg.toFixed(1)}%</span>
      </div>
      <div class="treemap-mobile-bar-track">
        <div class="treemap-mobile-bar ${isUp ? 'is-up' : 'is-down'}" style="width:${pctWidth}%"></div>
      </div>
      <div class="treemap-mobile-sub">
        <span>${sec.weight > 0 ? (sec.weight * 100).toFixed(1) + '%' : '—'} pasar</span>
        <span>${(sec.stocks || []).length} saham</span>
      </div>
    </div>`;
  }).join('');

  return `<div class="treemap-mobile-list">
    <div class="treemap-meta">
      <span class="treemap-date">📅 ${data.date || '—'}</span>
      <span class="treemap-count">${data.total_stocks} saham</span>
    </div>
    ${rows}
  </div>`;
}

// ─── Global hover handler ──
window.treemapStockHover = function(e) {
  const el = e.currentTarget;
  const ticker = el.dataset.ticker;
  const name = el.dataset.name || '';
  const price = parseFloat(el.dataset.price);
  const change = el.dataset.change !== '' ? parseFloat(el.dataset.change) : null;
  const marketCap = parseFloat(el.dataset.marketcap) || 0;
  showTooltip(e, { ticker, name, price, change, market_cap: marketCap });
};
window.treemapStockLeave = function(e) { hideTooltip(); };

// ─── Main render export ───────────────────────────────────────

export async function renderTreemap(root) {
  document.title = 'RetailBijak — Treemap Pasar';
  root.innerHTML = `
    <section class="treemap-page stagger-reveal">
      <header class="treemap-page-head">
        <div class="treemap-head-copy">
          <h1>🧩 Treemap Pasar IDX</h1>
          <p>Visualisasi seluruh pasar IDX — ukuran menunjukkan kapitalisasi pasar, warna menunjukkan perubahan harga.</p>
        </div>
        <button id="treemap-refresh" class="market-refresh-btn" type="button">⟳ Muat Ulang</button>
      </header>
      <div id="treemap-loading">${skeletonTreemap()}</div>
      <div id="treemap-content"></div>
    </section>
  `;

  const loadingEl = document.getElementById('treemap-loading');
  const contentEl = document.getElementById('treemap-content');
  const refreshBtn = document.getElementById('treemap-refresh');

  const loadData = async () => {
    if (loadingEl) loadingEl.style.display = '';
    if (contentEl) contentEl.innerHTML = '';
    try {
      const res = await apiFetch('/market/treemap', { timeout: 10000 });
      const isDesktop = window.innerWidth > 767;
      if (!res || !res.sectors || !res.sectors.length) {
        contentEl.innerHTML = `<div class="treemap-empty"><div class="treemap-empty-icon">📊</div><h3>Data Belum Tersedia</h3><p>Silakan coba lagi nanti.</p></div>`;
        return;
      }
      contentEl.innerHTML = isDesktop ? renderSquarifyTreemap(res) : renderMobileList(res);
    } catch (e) {
      console.error('Treemap load error:', e);
      contentEl.innerHTML = `<div class="treemap-empty"><div class="treemap-empty-icon">⚠️</div><h3>Gagal Memuat Treemap</h3><p>${e.message || 'Terjadi kesalahan saat mengambil data pasar.'}</p><button class="market-empty-refresh" onclick="window.location.reload()">Coba Lagi</button></div>`;
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  };

  await loadData();
  if (refreshBtn) refreshBtn.addEventListener('click', loadData);

  // Re-layout on resize
  const resizeHandler = () => {
    const content = document.getElementById('treemap-content');
    if (!content) return;
    clearTimeout(window._treemapResizeTimer);
    window._treemapResizeTimer = setTimeout(async () => {
      try {
        const res = await apiFetch('/market/treemap', { timeout: 8000 });
        if (!res || !res.sectors) return;
        const isDesktop = window.innerWidth > 767;
        content.innerHTML = isDesktop ? renderSquarifyTreemap(res) : renderMobileList(res);
      } catch (e) { /* silent */ }
    }, 400);
  };
  window.addEventListener('resize', resizeHandler);
};
