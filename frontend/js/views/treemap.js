import { apiFetch } from '../api.js?v=20260509B';
import { fmt, pct, fmtRp, nf } from '../utils/format.js?v=20260509B';

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
  return tooltipEl;
}

function showTooltip(e, stock) {
  const tt = ensureTooltip();
  const chg = stock.change;
  const chgStr = chg != null ? (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%' : '--';
  const mcStr = fmtRp(stock.market_cap || 0);
  tt.innerHTML = `
    <div class="treemap-tooltip-ticker">${stock.ticker}</div>
    <div class="treemap-tooltip-name">${stock.name || ''}</div>
    <div class="treemap-tooltip-row"><span>Price</span><span>${fmt(stock.price)}</span></div>
    <div class="treemap-tooltip-row"><span>Change</span><span style="color:${changeTextColor(chg)}">${chgStr}</span></div>
    <div class="treemap-tooltip-row"><span>Market Cap</span><span>${mcStr}</span></div>
  `;
  const rect = e.target.getBoundingClientRect();
  tt.style.display = 'block';
  let left = rect.left + rect.width / 2 - tt.offsetWidth / 2;
  if (left < 8) left = 8;
  if (left + tt.offsetWidth > window.innerWidth - 8) left = window.innerWidth - tt.offsetWidth - 8;
  tt.style.left = left + 'px';
  tt.style.top = (rect.top - tt.offsetHeight - 8) + 'px';
  if (rect.top - tt.offsetHeight < 0) {
    tt.style.top = (rect.bottom + 8) + 'px';
  }
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ─── Treemap rendering ───────────────────────────────────────

function renderTreemap(data) {
  if (!data || !data.sectors || !data.sectors.length) {
    return `<div class="treemap-empty">
      <div class="treemap-empty-icon">📊</div>
      <h3>Data Treemap Belum Tersedia</h3>
      <p>Data pasar IDX belum tersedia untuk ditampilkan dalam bentuk treemap. Coba refresh atau tunggu sesi perdagangan berikutnya.</p>
    </div>`;
  }

  const sectors = data.sectors;

  // Build sector rectangles
  const sectorHtml = sectors.map(sec => {
    const secChange = sec.return_1d;
    const secColorClass = changeColorClass(secChange);
    const secBg = changeBgStyle(secChange);

    // Sub-rectangles for stocks inside this sector
    const stocks = sec.stocks || [];
    const stockHtml = stocks.map(stk => {
      const stkColorClass = changeColorClass(stk.change);
      const stkBg = changeBgStyle(stk.change);
      return `<a href="#stock/${stk.ticker}" class="treemap-stock ${stkColorClass}" style="${stkBg}"
                 data-ticker="${stk.ticker}"
                 data-price="${stk.price}"
                 data-change="${stk.change ?? ''}"
                 data-marketcap="${stk.market_cap ?? 0}"
                 data-name="${(stk.name || '').replace(/"/g, '&quot;')}"
                 onmouseenter="treemapStockHover(event)"
                 onmouseleave="treemapStockLeave(event)">
        <span class="treemap-label">${stk.ticker}</span>
      </a>`;
    }).join('');

    return `<div class="treemap-sector ${secColorClass}" style="--sector-weight:${sec.weight};${secBg.split('background:')[1] ? secBg : ''}" data-sector="${sec.sector}">
      <div class="treemap-sector-header">
        <span class="treemap-sector-name">${sec.sector}</span>
        <span class="treemap-sector-ret" style="color:${changeTextColor(secChange)}">${secChange >= 0 ? '+' : ''}${secChange.toFixed(1)}%</span>
      </div>
      <div class="treemap-sector-stocks">
        ${stockHtml}
      </div>
    </div>`;
  }).join('');

  return `<div class="treemap-container" id="treemap-container">
    <div class="treemap-meta">
      <span class="treemap-date">📅 ${data.date || '—'}</span>
      <span class="treemap-count">${data.total_stocks} saham</span>
      <span class="treemap-legend">
        <span class="legend-item"><span class="legend-swatch legend-up-1"></span> +0-1%</span>
        <span class="legend-item"><span class="legend-swatch legend-up-2"></span> +1-3%</span>
        <span class="legend-item"><span class="legend-swatch legend-up-3"></span> +3-5%</span>
        <span class="legend-item"><span class="legend-swatch legend-up-4"></span> +5%+</span>
        <span class="legend-item"><span class="legend-swatch legend-down-1"></span> -0-1%</span>
        <span class="legend-item"><span class="legend-swatch legend-down-2"></span> -1-3%</span>
        <span class="legend-item"><span class="legend-swatch legend-down-3"></span> -3-5%</span>
        <span class="legend-item"><span class="legend-swatch legend-down-4"></span> -5%-</span>
      </span>
    </div>
    <div class="treemap-grid">
      ${sectorHtml}
    </div>
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

// ─── Global hover handler (attached via onmouseenter in template) ──
window.treemapStockHover = function(e) {
  const el = e.currentTarget;
  const ticker = el.dataset.ticker;
  const name = el.dataset.name || '';
  const price = parseFloat(el.dataset.price);
  const change = el.dataset.change !== '' ? parseFloat(el.dataset.change) : null;
  const marketCap = parseFloat(el.dataset.marketcap) || 0;
  showTooltip(e, { ticker, name, price, change, market_cap: marketCap });
};

window.treemapStockLeave = function(e) {
  hideTooltip();
};

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
        contentEl.innerHTML = renderTreemap(null);
        return;
      }

      if (isDesktop) {
        contentEl.innerHTML = renderTreemap(res);
      } else {
        contentEl.innerHTML = renderMobileList(res);
      }
    } catch (e) {
      console.error('Treemap load error:', e);
      contentEl.innerHTML = `<div class="treemap-empty">
        <div class="treemap-empty-icon">⚠️</div>
        <h3>Gagal Memuat Treemap</h3>
        <p>${e.message || 'Terjadi kesalahan saat mengambil data pasar.'}</p>
        <button class="market-empty-refresh" onclick="window.location.reload()">Coba Lagi</button>
      </div>`;
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  };

  await loadData();

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadData);
  }

  // Re-layout on resize (switch between desktop grid and mobile list)
  const resizeHandler = () => {
    const content = document.getElementById('treemap-content');
    if (!content) return;
    // Only re-render on significant width changes
    clearTimeout(window._treemapResizeTimer);
    window._treemapResizeTimer = setTimeout(async () => {
      try {
        const res = await apiFetch('/market/treemap', { timeout: 8000 });
        if (!res || !res.sectors) return;
        const isDesktop = window.innerWidth > 767;
        content.innerHTML = isDesktop ? renderTreemap(res) : renderMobileList(res);
      } catch (e) {
        // silent fail on resize
      }
    }, 400);
  };
  window.addEventListener('resize', resizeHandler);

  // Stagger animation
  document.querySelectorAll('.treemap-sector').forEach((el, i) => {
    el.style.setProperty('--stagger-delay', `${i * 60}ms`);
    el.classList.add('stagger-item');
  });
};
