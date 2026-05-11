// ─── Macro/Economic Dashboard ───────────────────────────────
// 26.4.2 — Macro/Economic Dashboard
// API: GET /api/macro, GET /api/macro/{indicator}
// Chart.js line chart per indicator with card layout

import { apiFetch } from '../api.js?v=202605120200';

// ─── Module State ──────────────────────────────────────────
let macroData = [];
let chartInstances = {};

// ─── Helpers ───────────────────────────────────────────────
function fmtValue(val, unit) {
  if (val == null) return '—';
  if (unit === '%') return `${Number(val).toFixed(2)}%`;
  if (unit === '$B') return `$${Number(val).toFixed(1)}B`;
  return String(val);
}

function trendArrow(trend) {
  if (trend === 'up') return '<span class="text-up" style="font-size:18px">▲</span>';
  if (trend === 'down') return '<span class="text-down" style="font-size:18px">▼</span>';
  return '<span style="font-size:18px;color:var(--text-dim)">—</span>';
}

function skeletonCards(n = 5) {
  return `<div class="macro-grid">${Array(n).fill(`
    <div class="macro-card skeleton-card" style="min-height:220px;border-radius:12px">
      <div class="skeleton" style="height:20px;width:40%;margin-bottom:12px"></div>
      <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px"></div>
      <div class="skeleton" style="height:120px;width:100%;margin-top:12px"></div>
    </div>
  `).join('')}</div>`;
}

function errorBlock(msg) {
  return `<div class="empty-state-card" style="min-height:40vh">
    <div class="empty-state-icon">⚠️</div>
    <strong class="empty-state-title" style="color:var(--down-color)">Gagal Memuat Data</strong>
    <span class="empty-state-desc">${msg || 'Terjadi kesalahan saat mengambil data makro.'}</span>
  </div>`;
}

// ─── Chart Drawing ─────────────────────────────────────────
function drawMiniChart(canvasId, data, min, max, color = '#10b981') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padding = { top: 8, bottom: 8, left: 4, right: 4 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const labels = data.map(d => String(d.year));
  const n = values.length;
  if (n < 2) return;

  const yMin = min !== undefined ? min : Math.min(...values);
  const yMax = max !== undefined ? max : Math.max(...values);
  const yRange = yMax - yMin || 1;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Grid line (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  const midY = padding.top + chartH - ((0 - yMin) / yRange) * chartH;
  ctx.beginPath();
  ctx.moveTo(padding.left, midY);
  ctx.lineTo(w - padding.right, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '05');

  // Points
  const points = values.map((v, i) => ({
    x: padding.left + (i / (n - 1)) * chartW,
    y: padding.top + chartH - ((v - yMin) / yRange) * chartH,
  }));

  // Fill area
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[n - 1].x, padding.top + chartH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(11, 18, 32, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Year labels (first and last)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(labels[0], padding.left, h - 6);
  ctx.textAlign = 'right';
  ctx.fillText(labels[n - 1], w - padding.right, h - 6);
}

// ─── Render Macro Dashboard ───────────────────────────────
export async function renderMacro(root) {
  if (!root) return;

  root.innerHTML = `
    <div class="macro-page">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700;color:var(--text-main);margin:0">📊 Macro & Ekonomi</h1>
          <p class="page-subtitle" style="font-size:13px;color:var(--text-muted);margin-top:4px">Indikator makroekonomi Indonesia — BI Rate, Inflasi, GDP, Neraca Dagang, Cadangan Devisa.</p>
        </div>
      </div>

      <div id="macro-loading">
        <div class="flex items-center justify-center" style="padding:60px 0;color:var(--text-dim)">
          <span>Memuat data makroekonomi...</span>
        </div>
      </div>
      <div id="macro-content" style="display:none"></div>
    </div>
  `;

  try {
    await loadMacroData(root);
  } catch (err) {
    console.error('[Macro] Error:', err);
    const content = root.querySelector('#macro-content') || root.querySelector('#macro-loading');
    if (content) {
      content.innerHTML = errorBlock(err.message || 'Gagal mengambil data.');
      content.style.display = 'block';
    }
  }

  root._macroRefresh = () => loadMacroData(root, true);
}

async function loadMacroData(root, force = false) {
  const loading = root.querySelector('#macro-loading');
  const content = root.querySelector('#macro-content');

  try {
    const payload = await apiFetch('/api/macro', {}, force);
    if (!payload || !payload.indicators) {
      throw new Error('Response tidak valid');
    }

    macroData = payload.indicators;
    renderCards(content, macroData);
    loading.style.display = 'none';
    content.style.display = 'block';

    // Draw charts after DOM update
    requestAnimationFrame(() => {
      macroData.forEach(indicator => {
        const canvasId = `macro-chart-${indicator.indicator_name}`;
        drawMiniChart(
          canvasId,
          indicator.data || [],
          indicator.min,
          indicator.max,
          indicator.indicator_name === 'bi_rate' ? '#6366f1' :
          indicator.indicator_name === 'cpi' ? '#f59e0b' :
          indicator.indicator_name === 'gdp' ? '#10b981' :
          indicator.indicator_name === 'trade_balance' ? '#3b82f6' :
          '#8b5cf6'
        );
      });
    });
  } catch (err) {
    console.error('[Macro] Load error:', err);
    if (content) {
      content.innerHTML = errorBlock(err.message);
      content.style.display = 'block';
    }
    if (loading) loading.style.display = 'none';
  }
}

function renderCards(container, indicators) {
  if (!indicators || indicators.length === 0) {
    container.innerHTML = `<div class="empty-state-card">
      <div class="empty-state-icon">📊</div>
      <strong class="empty-state-title">Belum Ada Data</strong>
      <span class="empty-state-desc">Data makroekonomi belum tersedia. Jalankan macro_updater untuk seed data.</span>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div class="macro-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
      ${indicators.map(ind => `
        <div class="macro-card" style="background:var(--bg-panel);border:1px solid var(--border-subtle);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:20px">${ind.icon || '📊'}</span>
                <span style="font-weight:600;font-size:14px;color:var(--text-main)">${ind.label || ind.indicator_name}</span>
              </div>
              <div style="display:flex;align-items:baseline;gap:8px">
                <span class="mono" style="font-size:28px;font-weight:700;color:var(--text-main)">${fmtValue(ind.current_value, ind.unit)}</span>
                ${trendArrow(ind.trend)}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                Tahun terakhir: ${ind.data && ind.data.length > 0 ? ind.data[ind.data.length - 1].year : '—'}
              </div>
            </div>
            <div class="freshness-badge" style="background:var(--bg-elevated);border-radius:6px;padding:3px 8px;font-size:10px;color:var(--text-muted);white-space:nowrap">
              ${ind.data ? `${ind.data.length} tahun` : '0 tahun'}
            </div>
          </div>
          <div style="flex:1;min-height:120px;position:relative">
            <canvas id="macro-chart-${ind.indicator_name}" style="width:100%;height:120px;display:block"></canvas>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Responsive Re-draw on Resize ──────────────────────────
let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    macroData.forEach(indicator => {
      const canvasId = `macro-chart-${indicator.indicator_name}`;
      drawMiniChart(
        canvasId,
        indicator.data || [],
        indicator.min,
        indicator.max,
        indicator.indicator_name === 'bi_rate' ? '#6366f1' :
        indicator.indicator_name === 'cpi' ? '#f59e0b' :
        indicator.indicator_name === 'gdp' ? '#10b981' :
        indicator.indicator_name === 'trade_balance' ? '#3b82f6' :
        '#8b5cf6'
      );
    });
  }, 250);
});
