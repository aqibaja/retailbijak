import { apiFetch, showToast } from '../api.js?v=20260510';

const LABELS = {
  price_above: { label: 'Harga >', icon: 'trending-up', color: 'var(--up-color)' },
  price_below: { label: 'Harga <', icon: 'trending-down', color: 'var(--down-color)' },
  rsi_above: { label: 'RSI >', icon: 'activity', color: 'var(--accent-indigo)' },
  rsi_below: { label: 'RSI <', icon: 'activity', color: 'var(--warn-color)' },
};

export async function renderAlerts(root) {
  document.title = 'RetailBijak — Alert Harga';
  root.innerHTML = `
    <div class="alerts-page">
      <div class="page-header">
        <div>
          <h1>🔔 Alert Harga</h1>
          <p class="page-subtitle">Pantau pergerakan saham dengan notifikasi otomatis.</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" id="btn-create-alert"><i data-lucide="bell-plus" class="lucide-sm"></i> Alert Baru</button>
        </div>
      </div>
      <div id="alerts-content">
        <div class="dashboard-widget-state" style="padding:60px">
          <div class="skeleton" style="width:200px;height:20px;margin:0 auto 8px"></div>
          <div class="skeleton" style="width:140px;height:14px;margin:0 auto"></div>
        </div>
      </div>
    </div>`;
  lucide.createIcons();
  document.getElementById('btn-create-alert')?.addEventListener('click', () => showCreateAlertDialog(root));
  await loadAlerts(root);
}

async function loadAlerts(root) {
  const content = document.getElementById('alerts-content');
  if (!content) return;
  try {
    const [alertsRes, triggeredRes] = await Promise.all([
      apiFetch('/alerts'),
      apiFetch('/alerts/triggered?limit=20'),
    ]);
    const alerts = Array.isArray(alertsRes?.data) ? alertsRes.data : [];
    const triggered = Array.isArray(triggeredRes?.data) ? triggeredRes.data : [];
    const triggeredMap = {};
    triggered.forEach(t => { triggeredMap[t.alert_id] = t; });

    if (!alerts.length) {
      content.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🔕</div>
          <strong class="empty-state-title">Belum Ada Alert</strong>
          <span class="empty-state-desc">Buat alert harga atau RSI untuk memantau saham favorit Anda secara otomatis.</span>
          <button class="btn btn-primary mt-12" id="btn-create-alert-empty"><i data-lucide="bell-plus" class="lucide-md"></i> Buat Alert</button>
        </div>`;
      content.querySelector('#btn-create-alert-empty')?.addEventListener('click', () => showCreateAlertDialog(root));
      lucide.createIcons();
      return;
    }

    content.innerHTML = `
      <div class="table-wrapper">
        <table class="table alerts-table">
          <thead><tr><th>Saham</th><th>Tipe</th><th>Kondisi</th><th>Status</th><th>Dibuat</th><th style="width:40px"></th></tr></thead>
          <tbody>${alerts.map(a => {
            const meta = LABELS[a.alert_type] || { label: a.alert_type, icon: 'bell', color: 'var(--text-muted)' };
            const isTriggered = triggeredMap[a.id];
            const statusClass = isTriggered ? 'alert-triggered' : (a.active ? 'alert-active' : 'alert-disabled');
            const statusText = isTriggered ? 'Terpicu' : (a.active ? 'Aktif' : 'Nonaktif');
            const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID') : '—';
            return `<tr class="${isTriggered ? 'row-triggered' : ''}">
              <td><a href="#stock/${a.ticker}" class="mono strong text-main">${a.ticker}</a></td>
              <td><span class="badge" style="background:${meta.color}15;color:${meta.color}">${meta.label}</span></td>
              <td class="mono strong tabular-nums">${a.value != null ? (a.value % 1 === 0 ? a.value.toLocaleString('id-ID') : a.value.toFixed(2)) : '—'}</td>
              <td><span class="alert-status-badge ${statusClass}">${statusText}</span></td>
              <td class="text-xs text-dim">${dateStr}</td>
              <td class="text-right"><button class="btn-icon delete-alert" data-id="${a.id}" title="Hapus"><i data-lucide="trash-2" class="lucide-sm"></i></button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      ${triggered.length ? `
      <div class="mt-6">
        <h3 class="panel-title mb-3">⏰ Riwayat Terpicu</h3>
        <div class="table-wrapper">
          <table class="table triggered-table">
            <thead><tr><th>Saham</th><th>Tipe</th><th>Trigger</th><th>Harga Saat Itu</th><th>Waktu</th></tr></thead>
            <tbody>${triggered.map(t => `<tr>
              <td><a href="#stock/${t.ticker}" class="mono strong">${t.ticker}</a></td>
              <td class="text-xs text-dim">${t.alert_type?.replace('_', ' ') || '—'}</td>
              <td class="mono strong tabular-nums">${t.trigger_value != null ? (t.trigger_value % 1 === 0 ? t.trigger_value.toLocaleString('id-ID') : t.trigger_value.toFixed(2)) : '—'}</td>
              <td class="mono strong tabular-nums">${t.current_value != null ? (t.current_value % 1 === 0 ? t.current_value.toLocaleString('id-ID') : t.current_value.toFixed(2)) : '—'}</td>
              <td class="text-xs text-dim">${t.triggered_at ? new Date(t.triggered_at).toLocaleString('id-ID') : '—'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}
      <div class="mt-8 text-xs text-dim" style="padding:12px 16px;background:var(--bg-panel);border-radius:12px;border:1px solid var(--border-subtle)">
        <strong>💡 Cara Kerja:</strong> Alert dicek setiap 2 menit. Begitu kondisi terpenuhi, kamu akan mendapat notifikasi toast dan alert masuk ke riwayat.
      </div>`;
    lucide.createIcons();
    bindAlertEvents(root);
  } catch (e) {
    console.warn('loadAlerts failed', e);
    content.innerHTML = '<div class="empty-state-card"><div class="empty-state-icon">⚠️</div><strong class="empty-state-title">Gagal Memuat</strong><span class="empty-state-desc">Coba refresh halaman.</span><button class="btn btn-primary mt-12" onclick="location.reload()">Muat Ulang</button></div>';
    lucide.createIcons();
  }
}

function bindAlertEvents(root) {
  root.querySelectorAll('.delete-alert').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Hapus alert ini?')) return;
      try {
        const res = await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
        if (res?.ok) {
          showToast('Alert dihapus', 'success');
          await loadAlerts(root);
        }
      } catch (e) {
        showToast('Gagal menghapus alert', 'error');
      }
    });
  });
}

async function showCreateAlertDialog(root) {
  const overlay = document.createElement('div');
  overlay.id = 'stock-modal-overlay';
  overlay.innerHTML = `<div class="modal-backdrop"></div>
    <div class="modal-panel" style="width:min(380px,90vw)">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-sm strong m-0">🔔 Alert Baru</h3>
        <button class="btn-icon modal-close-btn"><i data-lucide="x"></i></button>
      </div>
      <form id="alert-form" onsubmit="return false">
        <div class="flex-col gap-3">
          <label class="text-xs text-dim strong">Kode Saham</label>
          <input type="text" id="alert-ticker" class="form-input" placeholder="BBCA" style="text-transform:uppercase" required />
          <label class="text-xs text-dim strong">Tipe Alert</label>
          <select id="alert-type" class="form-input" required>
            <option value="price_above">Harga di atas (Price >)</option>
            <option value="price_below">Harga di bawah (Price <)</option>
            <option value="rsi_above">RSI di atas (RSI >)</option>
            <option value="rsi_below">RSI di bawah (RSI <)</option>
          </select>
          <label class="text-xs text-dim strong">Nilai Ambang</label>
          <input type="number" id="alert-value" class="form-input" placeholder="Ex: 5000" step="any" required />
          <button type="submit" class="btn btn-primary w-full mt-4" id="btn-save-alert"><i data-lucide="bell-plus" class="lucide-sm"></i> Simpan Alert</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  overlay.querySelector('.modal-backdrop').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-close-btn').addEventListener('click', () => overlay.remove());
  lucide.createIcons();

  overlay.querySelector('#alert-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ticker = overlay.querySelector('#alert-ticker').value.trim().toUpperCase();
    const alertType = overlay.querySelector('#alert-type').value;
    const value = parseFloat(overlay.querySelector('#alert-value').value);
    if (!ticker || isNaN(value)) { showToast('Lengkapi semua field', 'error'); return; }
    try {
      const res = await apiFetch('/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, alert_type: alertType, value }),
      });
      if (res?.ok) {
        showToast(res.message || 'Alert dibuat!', 'success');
        overlay.remove();
        document.body.style.overflow = '';
        await loadAlerts(root);
      }
    } catch (e) {
      showToast('Gagal membuat alert', 'error');
    }
  });
}
