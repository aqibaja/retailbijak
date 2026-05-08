import { apiFetch, showToast } from '../api.js?v=20260510';
import { nf, pf, money } from '../utils/format.js?v=20260508B';
import { observeElements } from '../main.js?v=20260508B';

export async function renderSector(root, sectorName) {
  const sector = decodeURIComponent(sectorName || '').replace(/-/g, ' ');
  document.title = `RetailBijak — ${sector}`;

  root.innerHTML = `
    <section class="market-overview-page stagger-reveal">
      <div class="market-overview-head">
        <div class="market-head-copy">
          <div class="market-row-kicker">Sektor Saham IDX</div>
          <h1 class="news-hero-title" id="sector-title">${sector}</h1>
          <p class="news-hero-sub" id="sector-sub">Memuat data sektor...</p>
        </div>
      </div>
      <div id="sector-content">
        <div class="skeleton skeleton-card skeleton-h-400"></div>
      </div>
    </section>`;

  await loadSectorData(sector);
  observeElements();
}

async function loadSectorData(sector) {
  const container = document.getElementById('sector-content');
  if (!container) return;

  try {
    const res = await apiFetch(`/sectors/${encodeURIComponent(sector)}/stocks`);
    if (!res?.data?.length) {
      container.innerHTML = '<div class="empty-state-v2"><h3>Tidak ada data</h3><p>Sektor tidak ditemukan atau belum ada data saham.</p></div>';
      document.getElementById('sector-sub').textContent = '0 saham terdaftar';
      return;
    }

    const stocks = res.data;
    const subEl = document.getElementById('sector-sub');
    if (subEl) subEl.textContent = `${stocks.length} saham terdaftar`;

    // Summary stats
    const totalCap = stocks.reduce((s, x) => s + (x.market_cap || 0), 0);
    const priced = stocks.filter(s => s.price != null);
    const avgPrice = priced.length ? priced.reduce((s, x) => s + x.price, 0) / priced.length : 0;
    const gainers = stocks.filter(s => s.change > 0).length;
    const losers = stocks.filter(s => s.change < 0).length;

    let html = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div class="stat-tile"><span class="stat-tile-label">Total Market Cap</span><strong class="stat-tile-value">${totalCap ? money(totalCap) : '—'}</strong></div>
        <div class="stat-tile"><span class="stat-tile-label">Rata Harga</span><strong class="stat-tile-value">${avgPrice ? money(avgPrice) : '—'}</strong></div>
        <div class="stat-tile tile-good"><span class="stat-tile-label">Gainer</span><strong class="stat-tile-value">${gainers}</strong></div>
        <div class="stat-tile tile-danger"><span class="stat-tile-label">Loser</span><strong class="stat-tile-value">${losers}</strong></div>
      </div>
      <div class="market-card">
        <div class="market-card-head"><h3 class="panel-title">Daftar Saham</h3></div>
        <div style="overflow-x:auto">
          <table class="bt-table">
            <thead><tr>
              <th>Kode</th><th>Nama</th><th>Sektor</th><th>Industri</th><th>Harga</th><th>Change</th><th>Volume</th><th>Market Cap</th>
            </tr></thead>
            <tbody>
              ${stocks.map(s => {
                const changeCls = s.change > 0 ? 'text-up' : s.change < 0 ? 'text-down' : '';
                const mcap = s.market_cap != null ? money(s.market_cap) : '—';
                return `<tr>
                  <td><a href="#stock/${s.ticker}" class="text-up strong mono">${s.ticker}</a></td>
                  <td class="text-xs">${s.name || '—'}</td>
                  <td class="text-xs text-dim">${s.sector || '—'}</td>
                  <td class="text-xs text-dim">${s.industry || '—'}</td>
                  <td class="mono">${s.price != null ? nf(s.price, 0) : '—'}</td>
                  <td class="mono ${changeCls}">${s.change != null ? (s.change > 0 ? '+' : '') + nf(s.change, 0) : '—'}</td>
                  <td class="mono text-xs text-dim">${s.volume != null ? nf(s.volume, 0) : '—'}</td>
                  <td class="mono text-xs">${mcap}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div class="empty-state-v2"><h3>Gagal memuat</h3><p>${e.message || 'Terjadi kesalahan'}</p></div>`;
  }
}
