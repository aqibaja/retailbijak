import { apiFetch, showToast } from '../api.js';
import { nf, pf, money } from '../utils/format.js';
import { observeElements } from '../utils/helpers.js';
import { t as _t } from '../i18n.js?v=20260518H';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

const INITIAL_CAPITAL = 100_000_000; // Rp 100 juta virtual cash

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function renderPaperTrades(root) {
  document.title = 'RetailBijak — Paper Trading';

  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">

      <!-- Header -->
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Virtual Trading</div>
          <h1 class="news-hero-title">Paper Trading</h1>
          <p class="news-hero-sub">Simulasi trading tanpa risiko. Modal virtual Rp100.000.000. Buka posisi, pantau P&amp;L realtime, ukur kemampuan trading-mu!</p>
        </div>
      </div>

      <!-- Summary KPI -->
      <div id="pt-summary" class="market-section-group">
        <div class="skeleton skeleton-card skeleton-h-100"></div>
      </div>

      <!-- Form buka posisi -->
      <div class="market-section-group">
        <div class="market-card">
          <div class="flex justify-between items-center p-4 border-bottom-subtle">
            <h3 class="panel-title m-0">Buka Posisi Baru</h3>
          </div>
          <div class="p-4">
            <div class="flex flex-wrap gap-3 items-end">
              <div style="flex:2;min-width:110px">
                <label class="text-xs text-dim uppercase strong">Kode Saham</label>
                <input type="text" id="pt-ticker" class="form-input" placeholder="BBCA" autocomplete="off" />
              </div>
              <div style="flex:1;min-width:90px">
                <label class="text-xs text-dim uppercase strong">Arah</label>
                <select id="pt-direction" class="form-input">
                  <option value="BUY">BUY (Long)</option>
                  <option value="SELL">SELL (Short)</option>
                </select>
              </div>
              <div style="flex:1;min-width:90px">
                <label class="text-xs text-dim uppercase strong">Lot</label>
                <input type="number" id="pt-lots" class="form-input" value="1" min="1" step="1" />
              </div>
              <div style="flex:2;min-width:120px">
                <label class="text-xs text-dim uppercase strong">Harga Entry (Rp)</label>
                <input type="number" id="pt-price" class="form-input" placeholder="Otomatis dari data" step="1" min="1" />
              </div>
              <div style="flex:2;min-width:140px">
                <label class="text-xs text-dim uppercase strong">Catatan (opsional)</label>
                <input type="text" id="pt-notes" class="form-input" placeholder="Strategi, alasan, dll" />
              </div>
              <div style="flex-shrink:0">
                <button id="btn-open-trade" type="button" class="btn btn-primary">Buka Posisi</button>
              </div>
            </div>
            <div id="pt-form-error" class="text-xs text-down mt-2" style="display:none"></div>
          </div>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="market-section-group">
        <div class="flex gap-2 mb-3">
          <button id="pt-filter-open"   type="button" class="btn btn-sm btn-primary">Terbuka</button>
          <button id="pt-filter-closed" type="button" class="btn btn-sm">Tertutup</button>
        </div>

        <!-- Open positions table -->
        <div id="pt-open-container">
          <div class="skeleton skeleton-card skeleton-h-200"></div>
        </div>

        <!-- Closed positions table -->
        <div id="pt-closed-container" style="display:none">
          <div class="skeleton skeleton-card skeleton-h-200"></div>
        </div>
      </div>

    </section>`;

  // State
  let activeTab = 'open';

  // Initial load
  loadSummary();
  loadOpen();

  // Tab switching
  document.getElementById('pt-filter-open').addEventListener('click', () => {
    activeTab = 'open';
    document.getElementById('pt-filter-open').classList.add('btn-primary');
    document.getElementById('pt-filter-closed').classList.remove('btn-primary');
    document.getElementById('pt-open-container').style.display = '';
    document.getElementById('pt-closed-container').style.display = 'none';
    loadOpen();
  });

  document.getElementById('pt-filter-closed').addEventListener('click', () => {
    activeTab = 'closed';
    document.getElementById('pt-filter-closed').classList.add('btn-primary');
    document.getElementById('pt-filter-open').classList.remove('btn-primary');
    document.getElementById('pt-open-container').style.display = 'none';
    document.getElementById('pt-closed-container').style.display = '';
    loadClosed();
  });

  // Form submit
  document.getElementById('btn-open-trade').addEventListener('click', openTrade);
  document.getElementById('pt-ticker').addEventListener('keydown', e => {
    if (e.key === 'Enter') openTrade();
  });

  observeElements();
}

// ---------------------------------------------------------------------------
// Summary KPI
// ---------------------------------------------------------------------------

async function loadSummary() {
  const el = document.getElementById('pt-summary');
  if (!el) return;
  try {
    const res = await apiFetch('/paper-trades/summary');
    if (!res) { el.innerHTML = ''; return; }

    const portfolioValue = INITIAL_CAPITAL + (res.total_pnl || 0);
    const pctReturn = (portfolioValue - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100;
    const pnlCls = (res.total_pnl || 0) >= 0 ? 'text-up' : 'text-down';
    const sign = v => v > 0 ? '+' : '';

    el.innerHTML = `
      <div class="market-card p-4">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bt-kpi">
            <span class="bt-kpi-label">Modal Virtual</span>
            <strong class="bt-kpi-value">${money(INITIAL_CAPITAL)}</strong>
          </div>
          <div class="bt-kpi">
            <span class="bt-kpi-label">Nilai Portfolio</span>
            <strong class="bt-kpi-value ${pnlCls}">${money(portfolioValue)}</strong>
          </div>
          <div class="bt-kpi">
            <span class="bt-kpi-label">Return</span>
            <strong class="bt-kpi-value ${pnlCls}">${sign(pctReturn)}${pf(pctReturn)}</strong>
          </div>
          <div class="bt-kpi">
            <span class="bt-kpi-label">Total P&amp;L</span>
            <strong class="bt-kpi-value ${pnlCls}">${sign(res.total_pnl)}${money(res.total_pnl || 0)}</strong>
          </div>
          <div class="bt-kpi">
            <span class="bt-kpi-label">Win Rate</span>
            <strong class="bt-kpi-value">${res.win_rate || 0}%
              <span class="text-dim text-xs">(${res.open_count || 0} open)</span>
            </strong>
          </div>
        </div>
      </div>`;
  } catch (e) {
    el.innerHTML = '';
  }
}

// ---------------------------------------------------------------------------
// Open positions table
// ---------------------------------------------------------------------------

async function loadOpen() {
  const el = document.getElementById('pt-open-container');
  if (!el) return;
  el.innerHTML = '<div class="skeleton skeleton-card skeleton-h-200"></div>';

  try {
    const res = await apiFetch('/paper-trades?status=open');
    const trades = res?.data || [];

    if (!trades.length) {
      el.innerHTML = `
        <div class="market-card p-4">
          <div class="empty-state-v2">
            <h3>Belum ada paper trade. Mulai simulasi trading kamu!</h3>
            <p>Gunakan form di atas untuk membuka posisi pertama.</p>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="market-card p-4">
        <h3 class="panel-title mb-3">Posisi Terbuka (${trades.length})</h3>
        <div style="overflow-x:auto">
          <table class="bt-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Arah</th>
                <th class="text-right">Lot</th>
                <th class="text-right">Entry</th>
                <th class="text-right">Harga Kini</th>
                <th class="text-right">P&amp;L (Rp)</th>
                <th class="text-right">P&amp;L (%)</th>
                <th>Tanggal</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${trades.map(t => {
                const pnlCls = (t.pnl || 0) >= 0 ? 'text-up' : 'text-down';
                const sign = t.pnl > 0 ? '+' : '';
                const signPct = t.pnl_pct > 0 ? '+' : '';
                return `<tr>
                  <td><a href="#stock/${t.ticker}" class="mono strong">${t.ticker}</a></td>
                  <td><span class="badge ${t.direction === 'BUY' ? 'badge-primary' : 'badge-warn'}">${t.direction}</span></td>
                  <td class="mono text-right">${nf(t.lots, 0)}</td>
                  <td class="mono text-right">${money(t.entry_price)}</td>
                  <td class="mono text-right">${money(t.current_price)}</td>
                  <td class="mono text-right ${pnlCls}">${sign}${money(t.pnl)}</td>
                  <td class="mono text-right ${pnlCls}">${signPct}${pf(t.pnl_pct)}</td>
                  <td class="mono text-xs">${(t.entry_date || '').slice(0, 10)}</td>
                  <td class="text-right" style="white-space:nowrap">
                    <button type="button" class="btn btn-sm btn-outline pt-close-btn"
                      data-id="${t.id}" data-ticker="${t.ticker}" data-price="${t.current_price}">Tutup</button>
                    <button type="button" class="btn-icon pt-delete-btn" data-id="${t.id}" title="Hapus">
                      <i data-lucide="trash-2" class="lucide-md"></i>
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    // Re-init lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Close buttons — modal prompt
    el.querySelectorAll('.pt-close-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ticker = btn.dataset.ticker;
        const suggested = btn.dataset.price || '';
        const raw = prompt(`Harga tutup untuk ${ticker} (Rp):`, suggested);
        if (raw === null) return; // cancelled
        const exitPrice = parseFloat(raw);
        if (!exitPrice || exitPrice <= 0) {
          showToast('Harga tidak valid', 'warning');
          return;
        }
        try {
          const r = await apiFetch(`/paper-trades/${id}/close`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exit_price: exitPrice }),
          });
          if (r?.ok) {
            showToast(r.message, 'success');
            loadOpen();
            loadSummary();
          } else {
            showToast(r?.detail || r?.message || 'Gagal menutup posisi', 'error');
          }
        } catch (e) {
          showToast('Gagal menutup posisi', 'error');
        }
      });
    });

    // Delete buttons
    el.querySelectorAll('.pt-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus trade ini?')) return;
        try {
          const r = await apiFetch(`/paper-trades/${btn.dataset.id}`, { method: 'DELETE' });
          if (r?.ok) {
            showToast('Trade dihapus', 'success');
            loadOpen();
            loadSummary();
          }
        } catch (e) {
          showToast('Gagal hapus', 'error');
        }
      });
    });

  } catch (e) {
    el.innerHTML = '<div class="market-card p-4"><div class="empty-state-v2"><h3>Gagal memuat posisi terbuka</h3></div></div>';
  }
}

// ---------------------------------------------------------------------------
// Closed positions table
// ---------------------------------------------------------------------------

async function loadClosed() {
  const el = document.getElementById('pt-closed-container');
  if (!el) return;
  el.innerHTML = '<div class="skeleton skeleton-card skeleton-h-200"></div>';

  try {
    const res = await apiFetch('/paper-trades?status=closed');
    const trades = res?.data || [];

    if (!trades.length) {
      el.innerHTML = `
        <div class="market-card p-4">
          <div class="empty-state-v2">
            <h3>Belum ada posisi yang ditutup.</h3>
            <p>Tutup posisi terbuka untuk melihat riwayat P&amp;L.</p>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="market-card p-4">
        <h3 class="panel-title mb-3">Posisi Tertutup (${trades.length})</h3>
        <div style="overflow-x:auto">
          <table class="bt-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Arah</th>
                <th class="text-right">Lot</th>
                <th class="text-right">Entry</th>
                <th class="text-right">Exit</th>
                <th class="text-right">P&amp;L Realized (Rp)</th>
                <th class="text-right">P&amp;L (%)</th>
                <th>Tgl Buka</th>
                <th>Tgl Tutup</th>
                <th class="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${trades.map(t => {
                const pnlCls = (t.pnl || 0) >= 0 ? 'text-up' : 'text-down';
                const sign = t.pnl > 0 ? '+' : '';
                const signPct = t.pnl_pct > 0 ? '+' : '';
                return `<tr>
                  <td><a href="#stock/${t.ticker}" class="mono strong">${t.ticker}</a></td>
                  <td><span class="badge ${t.direction === 'BUY' ? 'badge-primary' : 'badge-warn'}">${t.direction}</span></td>
                  <td class="mono text-right">${nf(t.lots, 0)}</td>
                  <td class="mono text-right">${money(t.entry_price)}</td>
                  <td class="mono text-right">${money(t.exit_price)}</td>
                  <td class="mono text-right ${pnlCls}">${sign}${money(t.pnl)}</td>
                  <td class="mono text-right ${pnlCls}">${signPct}${pf(t.pnl_pct)}</td>
                  <td class="mono text-xs">${(t.entry_date || '').slice(0, 10)}</td>
                  <td class="mono text-xs">${(t.exit_date || '').slice(0, 10)}</td>
                  <td class="text-right">
                    <button type="button" class="btn-icon pt-delete-btn" data-id="${t.id}" title="Hapus">
                      <i data-lucide="trash-2" class="lucide-md"></i>
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    el.querySelectorAll('.pt-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Hapus trade ini?')) return;
        try {
          const r = await apiFetch(`/paper-trades/${btn.dataset.id}`, { method: 'DELETE' });
          if (r?.ok) {
            showToast('Trade dihapus', 'success');
            loadClosed();
            loadSummary();
          }
        } catch (e) {
          showToast('Gagal hapus', 'error');
        }
      });
    });

  } catch (e) {
    el.innerHTML = '<div class="market-card p-4"><div class="empty-state-v2"><h3>Gagal memuat riwayat</h3></div></div>';
  }
}

// ---------------------------------------------------------------------------
// Open new trade
// ---------------------------------------------------------------------------

async function openTrade() {
  const errEl = document.getElementById('pt-form-error');
  const showErr = msg => { errEl.textContent = msg; errEl.style.display = ''; };
  errEl.style.display = 'none';

  const ticker = document.getElementById('pt-ticker').value.trim().toUpperCase();
  const direction = document.getElementById('pt-direction').value;
  const lotsRaw = document.getElementById('pt-lots').value;
  const priceRaw = document.getElementById('pt-price').value;
  const notes = document.getElementById('pt-notes').value.trim();

  // Validation
  if (!ticker) { showErr('Kode saham tidak boleh kosong.'); return; }

  const lots = parseInt(lotsRaw);
  if (!lots || lots <= 0 || isNaN(lots)) { showErr('Jumlah lot harus angka positif.'); return; }

  let price = parseFloat(priceRaw);

  // Auto-fetch price if not provided
  if (!price || price <= 0) {
    try {
      const chart = await apiFetch(`/stocks/${ticker}/chart-data?limit=1`);
      if (chart?.data?.length) price = chart.data[chart.data.length - 1].close;
    } catch (_) {}
    if (!price || price <= 0) {
      showErr('Masukkan harga entry — data harga tidak tersedia untuk ticker ini.');
      return;
    }
  }

  const btn = document.getElementById('btn-open-trade');
  btn.disabled = true;
  btn.textContent = 'Membuka...';

  try {
    const res = await apiFetch('/paper-trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, direction, lots, entry_price: price, notes }),
    });

    if (res?.ok) {
      showToast(res.message, 'success');
      // Reset form
      document.getElementById('pt-ticker').value = '';
      document.getElementById('pt-lots').value = '1';
      document.getElementById('pt-price').value = '';
      document.getElementById('pt-notes').value = '';
      errEl.style.display = 'none';
      // Reload
      loadOpen();
      loadSummary();
    } else {
      showErr(res?.detail || res?.message || 'Gagal membuka posisi.');
    }
  } catch (e) {
    showErr('Gagal membuka posisi. Coba lagi.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buka Posisi';
  }
}
