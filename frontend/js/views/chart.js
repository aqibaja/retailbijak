/**
 * Full-Screen Chart View — Dedicated chart page with drawing tools
 * Fase 15.5 — Full-Screen Chart & Drawing Tools
 * Fase 30.2.2 — Chart View Enhance: indicators, SR lines, alert shortcut, fullscreen
 */
import { showToast, apiFetch, fetchDrawings, saveDrawing } from '../api.js';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let activeTicker = null;
let activeTf = '1M';
let chart = null;
let series = null;
let volumeSeries = null;
let candles = [];
let trendLines = [];
let hLines = [];
let fibLines = [];       // Array of {lines:[], data:{t1,p1,t2,p2}}
let fibLabelsContainer = null;
let drawMode = null; // 'trendline' | 'hline' | 'fibonacci' | 'sr' | null
let drawPending = null; // {time, price} for first click

// ── Indicator state ──────────────────────────────────────
let indicatorSeries = {
    sma20: null,
    sma50: null,
    ema20: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
    volumeOverlay: null,  // volume is already rendered; toggle visibility
};
let indicatorState = {
    sma20: false,
    sma50: false,
    ema20: false,
    bb: false,
    volume: true,  // volume shown by default
};

// ── Support/Resistance lines (distinct from hLines drawing tool) ──
let srLines = [];  // Array of {series, price, label el}

const TF_OPTIONS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'MAX'];

export function renderChart(root, ticker) {
    if (!root) return;
    activeTicker = (ticker || '').toUpperCase();
    root.innerHTML = `
        <div class="fullchart-container" id="fullchart-container">
            <div class="fullchart-topbar">
                <button class="btn btn-ghost btn-sm" id="chart-back-btn"><i data-lucide="arrow-left"></i> Kembali</button>
                <h2 class="fullchart-title">${activeTicker}</h2>
                <div class="fullchart-timeframes">
                    ${TF_OPTIONS.map(tf => `<button class="tf-btn ${tf === activeTf ? 'active' : ''}" data-tf="${tf}">${tf}</button>`).join('')}
                </div>
                <div class="fullchart-tools">
                    <button class="btn btn-icon btn-sm" id="tool-trendline" title="Trend Line"><i data-lucide="trending-up"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-hline" title="Horizontal Line"><i data-lucide="minus"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-fib" title="Fibonacci Retracement">📐</button>
                    <button class="btn btn-icon btn-sm" id="tool-sr" title="Support/Resistance Line">〰</button>
                    <button class="btn btn-icon btn-sm" id="tool-clear" title="Clear Drawings"><i data-lucide="eraser"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-save" title="Save Drawings">💾</button>
                    <button class="btn btn-icon btn-sm" id="tool-load" title="Load Drawings">📂</button>
                    <button class="btn btn-icon btn-sm" id="chart-export-btn" title="Download PNG"><i data-lucide="camera"></i></button>
                    <button class="btn btn-icon btn-sm" id="tool-alert" title="Set Price Alert">🔔</button>
                    <button class="btn btn-icon btn-sm" id="tool-fullscreen" title="Fullscreen"><i data-lucide="maximize-2"></i></button>
                </div>
            </div>
            <!-- Indicator toggle panel -->
            <div class="fullchart-indicators" id="fullchart-indicators">
                <span class="indicator-label">Indikator:</span>
                <label class="indicator-toggle"><input type="checkbox" id="ind-sma20"> <span>SMA20</span></label>
                <label class="indicator-toggle"><input type="checkbox" id="ind-sma50"> <span>SMA50</span></label>
                <label class="indicator-toggle"><input type="checkbox" id="ind-ema20"> <span>EMA20</span></label>
                <label class="indicator-toggle"><input type="checkbox" id="ind-bb"> <span>Bollinger</span></label>
                <label class="indicator-toggle"><input type="checkbox" id="ind-volume" checked> <span>Volume</span></label>
            </div>
            <div id="fullchart-wrap" class="fullchart-wrap">
                <div class="skeleton skeleton-chart" style="height:100%;border-radius:0"></div>
            </div>
            <div class="fullchart-info" id="fullchart-info">
                <span>Memuat data...</span>
            </div>
        </div>
    `;

    // Back button
    root.querySelector('#chart-back-btn').addEventListener('click', () => {
        window.location.hash = `#stock/${activeTicker}`;
    });

    // Timeframe buttons
    root.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTf = btn.dataset.tf;
            loadChartData();
        });
    });

    // Drawing tools
    root.querySelector('#tool-trendline')?.addEventListener('click', () => {
        if (drawMode === 'trendline') {
            drawMode = null;
            drawPending = null;
            showToast('✕ Mode trendline dimatikan', 'info');
        } else {
            drawMode = 'trendline';
            drawPending = null;
            showToast('📏 Klik 2 titik pada chart untuk trendline', 'info');
        }
    });
    root.querySelector('#tool-hline')?.addEventListener('click', () => {
        if (drawMode === 'hline') {
            drawMode = null;
            drawPending = null;
            showToast('✕ Mode horizontal line dimatikan', 'info');
        } else {
            drawMode = 'hline';
            drawPending = null;
            showToast('➖ Klik pada level harga untuk horizontal line', 'info');
        }
    });
    root.querySelector('#tool-clear')?.addEventListener('click', clearDrawings);
    root.querySelector('#chart-export-btn')?.addEventListener('click', exportChartPNG);

    // Fibonacci button
    root.querySelector('#tool-fib')?.addEventListener('click', () => {
        if (drawMode === 'fibonacci') {
            drawMode = null;
            drawPending = null;
            showToast('✕ Mode Fibonacci dimatikan', 'info');
        } else {
            drawMode = 'fibonacci';
            drawPending = null;
            showToast('📐 Klik 2 titik untuk Fibonacci', 'info');
        }
    });

    // Save button
    root.querySelector('#tool-save')?.addEventListener('click', saveDrawingsToBackend);
    // Load button
    root.querySelector('#tool-load')?.addEventListener('click', loadDrawingsFromBackend);

    // ── Support/Resistance tool ──────────────────────────
    root.querySelector('#tool-sr')?.addEventListener('click', () => {
        if (drawMode === 'sr') {
            drawMode = null;
            drawPending = null;
            showToast('✕ Mode S/R dimatikan', 'info');
        } else {
            drawMode = 'sr';
            drawPending = null;
            showToast('〰 Klik level harga untuk Support/Resistance', 'info');
        }
    });

    // ── Price alert shortcut ─────────────────────────────
    root.querySelector('#tool-alert')?.addEventListener('click', () => {
        if (!activeTicker) return;
        window.location.hash = `#alerts?ticker=${activeTicker}`;
    });

    // ── Fullscreen button ────────────────────────────────
    root.querySelector('#tool-fullscreen')?.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    // ── Indicator checkboxes ─────────────────────────────
    root.querySelector('#ind-sma20')?.addEventListener('change', (e) => {
        indicatorState.sma20 = e.target.checked;
        applyIndicator('sma20');
    });
    root.querySelector('#ind-sma50')?.addEventListener('change', (e) => {
        indicatorState.sma50 = e.target.checked;
        applyIndicator('sma50');
    });
    root.querySelector('#ind-ema20')?.addEventListener('change', (e) => {
        indicatorState.ema20 = e.target.checked;
        applyIndicator('ema20');
    });
    root.querySelector('#ind-bb')?.addEventListener('change', (e) => {
        indicatorState.bb = e.target.checked;
        applyIndicator('bb');
    });
    root.querySelector('#ind-volume')?.addEventListener('change', (e) => {
        indicatorState.volume = e.target.checked;
        applyIndicator('volume');
    });

    loadChartData();
}

function exportChartPNG() {
    if (!chart || !activeTicker) { showToast('Chart belum siap', 'error'); return; }
    try {
        const dataUrl = chart.takeScreenshot();
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `${activeTicker}_${dateStr}_chart.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('✅ Chart tersimpan sebagai PNG', 'success');
    } catch (e) {
        showToast('Gagal export chart: ' + e.message, 'error');
    }
}

async function loadChartData() {
    const wrap = document.getElementById('fullchart-wrap');
    if (!wrap || !activeTicker) return;

    const info = document.getElementById('fullchart-info');
    if (info) info.innerHTML = `<span>Memuat ${activeTicker} — ${activeTf}...</span>`;

    try {
        const rangeMap = { '1D': 2, '5D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'MAX': 1000 };
        const days = rangeMap[activeTf] || 30;
        const res = await apiFetch(`/stocks/${activeTicker}/chart-data?range=${activeTf}`);
        
        if (!res || !res.data || !res.data.length) {
            wrap.innerHTML = '<div class="empty-state-v2" style="height:60vh"><div class="empty-icon">📉</div><h3>Data tidak tersedia</h3><p>Tidak ada data harga untuk timeframe ini.</p></div>';
            if (info) info.innerHTML = '<span class="text-dim">Data tidak tersedia</span>';
            return;
        }

        candles = res.data.map(r => ({
            time: typeof r.date === 'string' ? r.date.slice(0, 10) : r.date,
            open: Number(r.open ?? r.close),
            high: Number(r.high ?? r.close),
            low: Number(r.low ?? r.close),
            close: Number(r.close),
            volume: Number(r.volume || 0),
        })).filter(c => c.time && c.close > 0);

        if (!candles.length) throw new Error('No valid candles');

        // Clear wrap for chart
        wrap.innerHTML = '<div id="tvchart-full" style="width:100%;height:100%"></div>';
        
        // Initialize LightweightCharts
        if (typeof LightweightCharts === 'undefined') {
            await loadLightweightCharts();
        }
        
        renderFullChart(wrap);
        
        const last = candles[candles.length - 1];
        const change = last.close - (candles.length > 1 ? candles[candles.length - 2].close : last.close);
        const pct = change / (last.close - change) * 100;
        const changeClass = change >= 0 ? 'text-up' : 'text-down';
        if (info) {
            info.innerHTML = `
                <span><strong>${activeTicker}</strong></span>
                <span class="mono">Rp ${last.close.toLocaleString('id-ID')}</span>
                <span class="${changeClass}">${change >= 0 ? '+' : ''}${change.toFixed(0)} (${pct.toFixed(2)}%)</span>
                <span class="text-dim">Vol: ${(last.volume / 1000000).toFixed(1)}M</span>
                <span class="text-dim">${candles.length} candle • ${activeTf}</span>
            `;
        }

    } catch (e) {
        wrap.innerHTML = `<div class="empty-state-v2" style="height:60vh"><div class="empty-icon">⚠️</div><h3>Gagal memuat chart</h3><p>${e.message || 'Coba timeframe lain.'}</p></div>`;
        if (info) info.innerHTML = '<span class="text-dim">Gagal memuat data</span>';
    }
}

function renderFullChart(wrap) {
    if (chart) {
        chart.remove();
        chart = null;
        series = null;
        volumeSeries = null;
    }

    const container = document.getElementById('tvchart-full');
    if (!container) return;

    chart = LightweightCharts.createChart(container, {
        layout: {
            background: { color: 'transparent' },
            textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
            fontSize: 11,
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.04)' },
            horzLines: { color: 'rgba(255,255,255,0.04)' },
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
        handleScroll: true,
        handleScale: true,
    });

    series = chart.addCandlestickSeries({
        upColor: '#34d399',
        downColor: '#f87171',
        borderUpColor: '#34d399',
        borderDownColor: '#f87171',
        wickUpColor: '#34d399',
        wickDownColor: '#f87171',
    });

    volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
    });

    series.setData(candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
    })));

    volumeSeries.setData(candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
    })));

    chart.timeScale().fitContent();

    // Subscribe to chart clicks for drawing
    chart.subscribeClick((param) => {
        if (!drawMode || !param || !param.time) return;
        const time = param.time;
        const price = param.price;
        if (!time || !price) return;

        if (drawMode === 'trendline') {
            if (!drawPending) {
                drawPending = { time, price };
                showToast(`📌 Titik 1: ${time} @ ${price.toFixed(0)} — klik titik kedua`, 'info');
            } else {
                // Draw trendline from drawPending to (time, price)
                drawTrendLine(drawPending.time, drawPending.price, time, price);
                drawPending = null;
                drawMode = null;
                showToast('✅ Trendline selesai', 'success');
            }
        } else if (drawMode === 'hline') {
            drawHorizontalLine(price);
            drawPending = null;
            drawMode = null;
            showToast(`➖ Horizontal line @ ${price.toFixed(0)}`, 'success');
        } else if (drawMode === 'sr') {
            drawSRLine(price);
            drawPending = null;
            drawMode = null;
            showToast(`〰 S/R line @ ${price.toFixed(0)}`, 'success');
        } else if (drawMode === 'fibonacci') {
            if (!drawPending) {
                drawPending = { time, price };
                showToast(`📌 Titik 1: ${time} @ ${price.toFixed(0)} — klik titik kedua`, 'info');
            } else {
                drawFibonacci(drawPending.time, drawPending.price, time, price);
                drawPending = null;
                drawMode = null;
                showToast('📐 Fibonacci selesai', 'success');
            }
        }
    });

    // Create fib labels overlay container
    const chartContainer = document.getElementById('tvchart-full');
    if (chartContainer) {
        chartContainer.style.position = 'relative';
        fibLabelsContainer = document.createElement('div');
        fibLabelsContainer.id = 'fib-labels-container';
        fibLabelsContainer.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;z-index:5;';
        chartContainer.appendChild(fibLabelsContainer);
    }

    // Add previous drawings (from localStorage cache)
    loadDrawings();
    // Load from backend as source of truth
    loadDrawingsFromBackend();
    // Re-apply any active indicators
    reapplyAllIndicators();
}

function drawTrendLine(t1, p1, t2, p2) {
    if (!chart) return;
    try {
        const lineSeries = chart.addLineSeries({
            color: '#6366f1',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        lineSeries.setData([
            { time: t1, value: p1 },
            { time: t2, value: p2 },
        ]);
        trendLines.push(lineSeries);
        saveDrawings();
    } catch (e) {
        console.warn('Trendline error:', e);
    }
}

function drawHorizontalLine(price) {
    if (!chart) return;
    try {
        const lineSeries = chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dotted,
            lastValueVisible: true,
            priceLineVisible: false,
        });
        // Draw across visible range using current time bounds
        const timeScale = chart.timeScale();
        const visibleRange = timeScale.getVisibleLogicalRange();
        if (visibleRange) {
            const from = timeScale.logicalToCoordinate(visibleRange.from);
            const to = timeScale.logicalToCoordinate(visibleRange.to);
            // Use visible time range
            const timeRange = timeScale.getVisibleRange();
            if (timeRange) {
                lineSeries.setData([
                    { time: timeRange.from, value: price },
                    { time: timeRange.to, value: price },
                ]);
            } else {
                // Fallback: just show at center
                const lastCandle = candles[candles.length - 1];
                if (lastCandle) {
                    lineSeries.setData([
                        { time: candles[0].time, value: price },
                        { time: lastCandle.time, value: price },
                    ]);
                }
            }
        } else {
            const lastCandle = candles[candles.length - 1];
            if (lastCandle) {
                lineSeries.setData([
                    { time: candles[0].time, value: price },
                    { time: lastCandle.time, value: price },
                ]);
            }
        }
        hLines.push(lineSeries);
        saveDrawings();
    } catch (e) {
        console.warn('Horizontal line error:', e);
    }
}

/**
 * Draw Fibonacci retracement levels between two points
 */
function drawFibonacci(t1, p1, t2, p2) {
    if (!chart) return;
    try {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const high = Math.max(p1, p2);
        const low = Math.min(p1, p2);
        const range = high - low;
        if (range === 0) {
            showToast('⚠️ Harga sama, tidak bisa Fibonacci', 'warning');
            return;
        }
        const timeScale = chart.timeScale();
        const timeRange = timeScale.getVisibleRange();
        if (!timeRange) return;
        const fromTime = timeRange.from;
        const toTime = timeRange.to;

        const fibEntry = { lines: [], data: { t1, p1, t2, p2 } };

        levels.forEach((ratio) => {
            const price = low + ratio * range;
            // Green gradient for lower levels, red for higher
            const r = ratio; // 0..1
            let color;
            if (r <= 0.382) {
                // Green: from bright green to lighter green
                const intensity = Math.round(155 + r * 100);
                color = `rgb(52,${intensity},153)`;
            } else if (r <= 0.618) {
                // Yellow/amber transition
                color = `rgb(234,${Math.round(179 - (r - 0.382) * 100)},52)`;
            } else {
                // Red: from amber to red
                const g = Math.round(179 - (r - 0.618) * 300);
                color = `rgb(248,${Math.max(g, 50)},113)`;
            }

            const lineSeries = chart.addLineSeries({
                color: color,
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            lineSeries.setData([
                { time: fromTime, value: price },
                { time: toTime, value: price },
            ]);

            fibEntry.lines.push(lineSeries);
        });

        fibLines.push(fibEntry);
        createFibLabels(levels, low, high, range, fromTime, toTime);
        saveDrawings();
        showToast('📐 Fibonacci retracement digambar', 'success');
    } catch (e) {
        console.warn('Fibonacci error:', e);
    }
}

/**
 * Create text labels for Fibonacci levels using div overlay
 */
function createFibLabels(levels, low, high, range, fromTime, toTime) {
    if (!fibLabelsContainer) return;
    const labelGroup = document.createElement('div');
    labelGroup.className = 'fib-label-group';

    levels.forEach((ratio) => {
        const price = low + ratio * range;
        const pct = (ratio * 100).toFixed(1);
        const label = document.createElement('div');
        label.className = 'fib-label';
        label.textContent = `${pct}% (${price.toFixed(0)})`;
        label.style.cssText = `
            position: absolute;
            right: 4px;
            font-size: 10px;
            font-family: monospace;
            padding: 1px 4px;
            border-radius: 2px;
            background: rgba(0,0,0,0.5);
            color: ${ratio <= 0.382 ? '#34d399' : ratio <= 0.618 ? '#facc15' : '#f87171'};
            pointer-events: none;
            white-space: nowrap;
            z-index: 6;
        `;
        // Position will be set later via chart coordinate conversion
        label.dataset.price = price;
        label.dataset.ratio = ratio;
        labelGroup.appendChild(label);
    });

    fibLabelsContainer.appendChild(labelGroup);

    // Schedule position update after chart renders
    requestAnimationFrame(() => updateFibLabelPositions(labelGroup));
}

/**
 * Update Fibonacci label positions based on chart coordinates
 */
function updateFibLabelPositions(labelGroup) {
    if (!chart || !labelGroup || !labelGroup.parentNode) return;
    const timeScale = chart.timeScale();
    const priceScale = chart.priceScale('right');
    const labels = labelGroup.querySelectorAll('.fib-label');
    const containerHeight = fibLabelsContainer ? fibLabelsContainer.clientHeight : 0;
    if (containerHeight === 0) return;

    labels.forEach((label) => {
        const price = parseFloat(label.dataset.price);
        if (isNaN(price)) return;
        try {
            const y = priceScale.priceToCoordinate(price);
            if (y != null && !isNaN(y)) {
                label.style.top = `${y - 6}px`;
                label.style.display = 'block';
            } else {
                label.style.display = 'none';
            }
        } catch (e) {
            label.style.display = 'none';
        }
    });

    // Re-position on next animation frame for scroll/scale changes
    // Store reference for continuous updates
    if (labelGroup._updateRaf) cancelAnimationFrame(labelGroup._updateRaf);
    labelGroup._updateRaf = requestAnimationFrame(() => updateFibLabelPositions(labelGroup));
}

/**
 * Add a single SVG text label to the chart (alternative lightweight approach)
 * Not used when div overlay is active
 */
/* function createSVGLabel(text, price, color) { ... } */

// ─── Backend Persistence ────────────────────────────────

/**
 * Save all current drawings to backend API
 */
async function saveDrawingsToBackend() {
    if (!activeTicker || !chart) {
        showToast('⚠️ Chart belum siap', 'warning');
        return;
    }
    try {
        // Collect trendline data
        const trendlineData = [];
        trendLines.forEach((ls, idx) => {
            try {
                const d = ls.data();
                if (d && d.length >= 2) {
                    trendlineData.push({ t1: d[0].time, p1: d[0].value, t2: d[1].time, p2: d[1].value });
                }
            } catch(e) {}
        });

        // Collect hline data
        const hlineData = [];
        hLines.forEach((ls) => {
            try {
                const d = ls.data();
                if (d && d.length > 0) {
                    hlineData.push({ price: d[0].value });
                }
            } catch(e) {}
        });

        // Collect fib data
        const fibData = fibLines.map(fib => fib.data);

        // First clear existing backend drawings
        await apiFetch(`/chart/${activeTicker}/drawings`, { method: 'DELETE' });

        // Save each drawing individually
        const allDrawings = [
            ...trendlineData.map(d => ({ type: 'trendline', data: d })),
            ...hlineData.map(d => ({ type: 'hline', data: d })),
            ...fibData.map(d => ({ type: 'fibonacci', data: d })),
        ];

        for (const drawing of allDrawings) {
            await saveDrawing(activeTicker, drawing.type, drawing.data);
        }

        showToast('💾 Drawings tersimpan', 'success');
    } catch (e) {
        console.warn('Save to backend error:', e);
        showToast('⚠️ Gagal menyimpan drawings', 'error');
    }
}

/**
 * Load all drawings from backend API and re-draw them
 */
async function loadDrawingsFromBackend() {
    if (!activeTicker || !chart) return;
    try {
        const res = await fetchDrawings(activeTicker);
        if (!res || !res.data || !res.data.length) return;

        // Clear existing drawings first
        clearDrawingsInternal();

        // Re-draw each drawing
        res.data.forEach((drawing) => {
            try {
                if (drawing.type === 'trendline' && drawing.data) {
                    drawTrendLine(drawing.data.t1, drawing.data.p1, drawing.data.t2, drawing.data.p2);
                } else if (drawing.type === 'hline' && drawing.data) {
                    drawHorizontalLine(drawing.data.price);
                } else if (drawing.type === 'fibonacci' && drawing.data) {
                    drawFibonacci(drawing.data.t1, drawing.data.p1, drawing.data.t2, drawing.data.p2);
                }
            } catch(e) {
                console.warn('Re-draw error:', e);
            }
        });

        showToast('📂 Drawings dimuat', 'success');
    } catch (e) {
        console.warn('Load from backend error:', e);
        // Silently fall back to localStorage
    }
}

/**
 * Clear drawings without showing toast or saving (internal use)
 */
function clearDrawingsInternal() {
    trendLines.forEach(l => { try { chart.removeSeries(l); } catch(e) {} });
    hLines.forEach(l => { try { chart.removeSeries(l); } catch(e) {} });
    fibLines.forEach(fib => {
        fib.lines.forEach(l => { try { chart.removeSeries(l); } catch(e) {} });
    });
    // Remove fib label groups
    if (fibLabelsContainer) {
        fibLabelsContainer.querySelectorAll('.fib-label-group').forEach(g => g.remove());
    }
    // Clear S/R lines
    clearSRLines();
    trendLines = [];
    hLines = [];
    fibLines = [];
    drawMode = null;
    drawPending = null;
}

async function loadLightweightCharts() {
    return new Promise((resolve, reject) => {
        if (typeof LightweightCharts !== 'undefined') return resolve();
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function clearDrawings() {
    clearDrawingsInternal();
    localStorage.removeItem(`chart-drawings-${activeTicker}`);
    showToast('Drawing dihapus', 'success');
}

function saveDrawings() {
    if (!activeTicker) return;
    const hlinePrices = [];
    hLines.forEach((ls) => {
        try {
            const d = ls.data();
            if (d && d.length > 0) {
                hlinePrices.push(d[0].value);
            }
        } catch(e) {}
    });
    const trendlineData = [];
    trendLines.forEach((ls) => {
        try {
            const d = ls.data();
            if (d && d.length >= 2) {
                trendlineData.push({ t1: d[0].time, p1: d[0].value, t2: d[1].time, p2: d[1].value });
            }
        } catch(e) {}
    });
    const fibData = fibLines.map(fib => fib.data);
    localStorage.setItem(`chart-drawings-${activeTicker}`, JSON.stringify({
        hlines: hlinePrices,
        trendlines: trendlineData,
        fibs: fibData,
    }));
}

function loadDrawings() {
    if (!activeTicker || !chart) return;
    try {
        const saved = localStorage.getItem(`chart-drawings-${activeTicker}`);
        if (!saved) return;
        const data = JSON.parse(saved);
        if (data.hlines && Array.isArray(data.hlines)) {
            data.hlines.forEach(price => {
                if (price != null) drawHorizontalLine(price);
            });
        }
        if (data.trendlines && Array.isArray(data.trendlines)) {
            data.trendlines.forEach(tl => {
                if (tl && tl.t1) drawTrendLine(tl.t1, tl.p1, tl.t2, tl.p2);
            });
        }
        if (data.fibs && Array.isArray(data.fibs)) {
            data.fibs.forEach(fib => {
                if (fib && fib.t1) drawFibonacci(fib.t1, fib.p1, fib.t2, fib.p2);
            });
        }
    } catch (e) {
        console.warn('Load drawings error:', e);
    }
}

// ═══════════════════════════════════════════════════════════
// FASE 30.2.2 — NEW FEATURES
// ═══════════════════════════════════════════════════════════

// ── 1. Indicator calculations ────────────────────────────

/**
 * Calculate Simple Moving Average
 * @param {number[]} closes - array of close prices
 * @param {number} period
 * @returns {Array<{time,value}>}
 */
function calcSMA(closes, period) {
    const result = [];
    for (let i = period - 1; i < closes.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += closes[i - j];
        result.push({ time: candles[i].time, value: sum / period });
    }
    return result;
}

/**
 * Calculate Exponential Moving Average
 * @param {number[]} closes
 * @param {number} period
 * @returns {Array<{time,value}>}
 */
function calcEMA(closes, period) {
    const k = 2 / (period + 1);
    const result = [];
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push({ time: candles[period - 1].time, value: ema });
    for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
        result.push({ time: candles[i].time, value: ema });
    }
    return result;
}

/**
 * Calculate Bollinger Bands (SMA20 ± 2σ)
 * @param {number[]} closes
 * @param {number} period
 * @returns {{upper, middle, lower}} each Array<{time,value}>
 */
function calcBB(closes, period = 20) {
    const upper = [], middle = [], lower = [];
    for (let i = period - 1; i < closes.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
        const sd = Math.sqrt(variance);
        const t = candles[i].time;
        upper.push({ time: t, value: mean + 2 * sd });
        middle.push({ time: t, value: mean });
        lower.push({ time: t, value: mean - 2 * sd });
    }
    return { upper, middle, lower };
}

/**
 * Apply or remove an indicator overlay on the chart.
 * Called when a checkbox changes, and also after chart re-render.
 * @param {'sma20'|'sma50'|'ema20'|'bb'|'volume'} key
 */
function applyIndicator(key) {
    if (!chart || !candles.length) return;
    const closes = candles.map(c => c.close);

    if (key === 'volume') {
        if (volumeSeries) {
            volumeSeries.applyOptions({ visible: indicatorState.volume });
        }
        return;
    }

    // Helper: remove existing series for this key
    function removeSeries(seriesRef) {
        if (seriesRef) {
            try { chart.removeSeries(seriesRef); } catch (e) {}
        }
    }

    if (key === 'sma20') {
        removeSeries(indicatorSeries.sma20);
        indicatorSeries.sma20 = null;
        if (indicatorState.sma20) {
            const data = calcSMA(closes, 20);
            if (data.length) {
                indicatorSeries.sma20 = chart.addLineSeries({
                    color: '#38bdf8',
                    lineWidth: 1,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    title: 'SMA20',
                });
                indicatorSeries.sma20.setData(data);
            }
        }
    } else if (key === 'sma50') {
        removeSeries(indicatorSeries.sma50);
        indicatorSeries.sma50 = null;
        if (indicatorState.sma50) {
            const data = calcSMA(closes, 50);
            if (data.length) {
                indicatorSeries.sma50 = chart.addLineSeries({
                    color: '#fb923c',
                    lineWidth: 1,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    title: 'SMA50',
                });
                indicatorSeries.sma50.setData(data);
            }
        }
    } else if (key === 'ema20') {
        removeSeries(indicatorSeries.ema20);
        indicatorSeries.ema20 = null;
        if (indicatorState.ema20) {
            const data = calcEMA(closes, 20);
            if (data.length) {
                indicatorSeries.ema20 = chart.addLineSeries({
                    color: '#a78bfa',
                    lineWidth: 1,
                    lastValueVisible: false,
                    priceLineVisible: false,
                    title: 'EMA20',
                });
                indicatorSeries.ema20.setData(data);
            }
        }
    } else if (key === 'bb') {
        removeSeries(indicatorSeries.bbUpper);
        removeSeries(indicatorSeries.bbMiddle);
        removeSeries(indicatorSeries.bbLower);
        indicatorSeries.bbUpper = null;
        indicatorSeries.bbMiddle = null;
        indicatorSeries.bbLower = null;
        if (indicatorState.bb) {
            const bb = calcBB(closes, 20);
            if (bb.upper.length) {
                const bbOpts = { lineWidth: 1, lastValueVisible: false, priceLineVisible: false };
                indicatorSeries.bbUpper = chart.addLineSeries({ ...bbOpts, color: 'rgba(250,204,21,0.6)', title: 'BB+' });
                indicatorSeries.bbUpper.setData(bb.upper);
                indicatorSeries.bbMiddle = chart.addLineSeries({ ...bbOpts, color: 'rgba(250,204,21,0.35)', lineStyle: LightweightCharts.LineStyle.Dashed, title: 'BB mid' });
                indicatorSeries.bbMiddle.setData(bb.middle);
                indicatorSeries.bbLower = chart.addLineSeries({ ...bbOpts, color: 'rgba(250,204,21,0.6)', title: 'BB-' });
                indicatorSeries.bbLower.setData(bb.lower);
            }
        }
    }
}

/**
 * Re-apply all active indicators after chart re-render (new data loaded).
 * Clears stale series references first.
 */
function reapplyAllIndicators() {
    // Reset refs — old chart instance is gone
    indicatorSeries = {
        sma20: null, sma50: null, ema20: null,
        bbUpper: null, bbMiddle: null, bbLower: null,
        volumeOverlay: null,
    };
    ['sma20', 'sma50', 'ema20', 'bb', 'volume'].forEach(k => applyIndicator(k));
}

// ── 2. Support / Resistance horizontal line ──────────────

/**
 * Draw a dashed S/R line with a price label at the right edge.
 * Stored in srLines[] separately from drawing-tool hLines.
 * @param {number} price
 */
function drawSRLine(price) {
    if (!chart || !candles.length) return;
    try {
        const srSeries = chart.addLineSeries({
            color: '#f43f5e',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            lastValueVisible: true,
            priceLineVisible: false,
            title: `S/R ${price.toFixed(0)}`,
        });
        srSeries.setData([
            { time: candles[0].time, value: price },
            { time: candles[candles.length - 1].time, value: price },
        ]);
        srLines.push({ series: srSeries, price });
    } catch (e) {
        console.warn('SR line error:', e);
    }
}

/**
 * Clear all S/R lines from chart and array.
 */
function clearSRLines() {
    srLines.forEach(sr => {
        try { chart.removeSeries(sr.series); } catch (e) {}
    });
    srLines = [];
}

// ── 3. Fullscreen ────────────────────────────────────────

function toggleFullscreen() {
    const container = document.getElementById('fullchart-container');
    if (!container) return;
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            showToast('Fullscreen tidak didukung: ' + err.message, 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

function onFullscreenChange() {
    const btn = document.getElementById('tool-fullscreen');
    if (!btn) return;
    if (document.fullscreenElement) {
        btn.title = 'Exit Fullscreen';
        btn.innerHTML = '<i data-lucide="minimize-2"></i>';
    } else {
        btn.title = 'Fullscreen';
        btn.innerHTML = '<i data-lucide="maximize-2"></i>';
    }
    // Re-render lucide icons for the swapped icon
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // Resize chart to fill new dimensions
    if (chart) {
        const wrap = document.getElementById('fullchart-wrap');
        if (wrap) {
            requestAnimationFrame(() => {
                chart.resize(wrap.clientWidth, wrap.clientHeight);
            });
        }
    }
}
