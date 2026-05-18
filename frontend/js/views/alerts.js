/**
 * Alerts View — Price & RSI alert management
 * Fase 28.3.1 — Enhanced: inline form, toggle, filter, delete, validation
 */
import { apiFetch, showToast } from '../api.js';
import { t as _t } from '../i18n.js?v=20260518C';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

let allAlerts     = [];
let allTriggered  = [];
let activeFilter  = 'all'; // all | active | triggered

const CONDITION_LABELS = {
    price_above:   { label: 'Harga >',      icon: '📈', color: 'var(--up-color)'      },
    price_below:   { label: 'Harga <',      icon: '📉', color: 'var(--down-color)'    },
    rsi_above:     { label: 'RSI >',        icon: '⚡', color: 'var(--accent-indigo)' },
    rsi_below:     { label: 'RSI <',        icon: '⚡', color: 'var(--warn-color)'    },
    volume_spike:  { label: 'Volume Spike', icon: '🔊', color: '#f59e0b'              },
};

export async function renderAlerts(root) {
    if (!root) return;
    document.title = 'RetailBijak — Alert Harga';

    activeFilter = 'all';
    allAlerts    = [];
    allTriggered = [];

    root.innerHTML = `
        <div class="page-container">
            <!-- Header -->
            <div class="page-header">
                <div>
                    <h1 class="page-title">🔔 Alert Harga</h1>
                    <p class="page-subtitle">Pantau pergerakan saham dengan notifikasi otomatis.</p>
                </div>
            </div>

            <!-- Create Alert Form (always visible) -->
            <div class="card" id="alert-create-card" style="padding:20px;border-radius:14px;margin-bottom:20px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
                    <i data-lucide="bell-plus" style="width:18px;height:18px;color:var(--accent-blue)"></i>
                    <h3 style="margin:0;font-size:15px;font-weight:700">Buat Alert Baru</h3>
                </div>
                <form id="alert-form" onsubmit="return false" novalidate>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;flex-wrap:wrap">
                        <!-- Ticker -->
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">KODE SAHAM *</label>
                            <input
                                type="text"
                                id="alert-ticker"
                                class="form-input"
                                placeholder="Contoh: BBCA"
                                style="text-transform:uppercase;width:100%;box-sizing:border-box"
                                maxlength="10"
                                autocomplete="off"
                            />
                            <div class="field-error" id="err-ticker" style="display:none;font-size:11px;color:var(--down-color);margin-top:3px">Ticker tidak boleh kosong</div>
                        </div>
                        <!-- Condition -->
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">KONDISI *</label>
                            <select id="alert-condition" class="form-input" style="width:100%;box-sizing:border-box">
                                <option value="price_above">📈 Harga di atas (Price &gt;)</option>
                                <option value="price_below">📉 Harga di bawah (Price &lt;)</option>
                                <option value="rsi_above">⚡ RSI di atas (RSI &gt;)</option>
                                <option value="rsi_below">⚡ RSI di bawah (RSI &lt;)</option>
                                <option value="volume_spike">🔊 Volume Spike</option>
                            </select>
                        </div>
                        <!-- Value -->
                        <div>
                            <label style="font-size:11px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px">NILAI *</label>
                            <input
                                type="number"
                                id="alert-value"
                                class="form-input"
                                placeholder="Contoh: 9500"
                                step="any"
                                min="0"
                                style="width:100%;box-sizing:border-box"
                            />
                            <div class="field-error" id="err-value" style="display:none;font-size:11px;color:var(--down-color);margin-top:3px">Nilai harus berupa angka</div>
                        </div>
                        <!-- Submit -->
                        <div>
                            <button type="submit" class="btn btn-primary" id="btn-save-alert" style="white-space:nowrap;height:38px;padding:0 18px">
                                <i data-lucide="save" style="width:14px;height:14px"></i> Simpan
                            </button>
                        </div>
                    </div>
                    <div id="alert-form-hint" style="margin-top:8px;font-size:11px;color:var(--text-muted)">
                        💡 Alert dicek setiap 2 menit. Notifikasi muncul saat kondisi terpenuhi.
                    </div>
                </form>
            </div>

            <!-- Filter chips -->
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
                <button class="chip chip-active" data-filter="all">Semua</button>
                <button class="chip" data-filter="active">✅ Aktif</button>
                <button class="chip" data-filter="triggered">⏰ Terpicu</button>
                <span id="alert-count" style="margin-left:auto;font-size:12px;color:var(--text-muted)"></span>
            </div>

            <!-- Alert list -->
            <div id="alerts-content">
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${[1,2,3].map(() => `<div class="skeleton" style="height:60px;border-radius:10px"></div>`).join('')}
                </div>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Filter chips
    root.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            root.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('chip-active'));
            btn.classList.add('chip-active');
            activeFilter = btn.dataset.filter;
            renderAlertList(root);
        });
    });

    // Ticker input: auto-uppercase
    root.querySelector('#alert-ticker').addEventListener('input', (e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
        hideError('err-ticker');
    });

    // Value input: hide error on change
    root.querySelector('#alert-value').addEventListener('input', () => hideError('err-value'));

    // Form submit
    root.querySelector('#alert-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleCreateAlert(root);
    });

    await loadAlerts(root);
}

async function loadAlerts(root) {
    try {
        const [alertsRes, triggeredRes] = await Promise.all([
            apiFetch('/alerts'),
            apiFetch('/alerts/triggered?limit=50'),
        ]);
        allAlerts    = Array.isArray(alertsRes?.data)    ? alertsRes.data    : [];
        allTriggered = Array.isArray(triggeredRes?.data) ? triggeredRes.data : [];

        // Fetch current prices for all unique tickers
        const tickers = [...new Set(allAlerts.map(a => a.ticker).filter(Boolean))];
        if (tickers.length) {
            try {
                const priceRes = await apiFetch(`/top-movers?limit=200&sort=gainers`);
                const priceMap = {};
                (priceRes?.data || []).forEach(s => { priceMap[s.ticker] = s.price || s.close; });
                // Also try losers
                const lossRes = await apiFetch(`/top-movers?limit=200&sort=losers`);
                (lossRes?.data || []).forEach(s => { if (!priceMap[s.ticker]) priceMap[s.ticker] = s.price || s.close; });
                allAlerts = allAlerts.map(a => ({ ...a, _current_price: priceMap[a.ticker] || null }));
            } catch(e) { /* price fetch optional */ }
        }

        renderAlertList(root);
    } catch (e) {
        const content = document.getElementById('alerts-content');
        if (content) content.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">⚠️</div>
                <strong class="empty-state-title">Gagal Memuat</strong>
                <span class="empty-state-desc">Coba refresh halaman.</span>
                <button class="btn btn-primary mt-12" onclick="location.reload()">Muat Ulang</button>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }
}

function renderAlertList(root) {
    const content  = document.getElementById('alerts-content');
    const countEl  = document.getElementById('alert-count');
    if (!content) return;

    // Build triggered map
    const triggeredMap = {};
    allTriggered.forEach(t => { triggeredMap[t.alert_id] = t; });

    // Filter
    let data = [...allAlerts];
    if (activeFilter === 'active') {
        data = data.filter(a => a.active && !triggeredMap[a.id]);
    } else if (activeFilter === 'triggered') {
        data = data.filter(a => !!triggeredMap[a.id]);
    }

    if (countEl) countEl.textContent = `${data.length} alert`;

    if (allAlerts.length === 0) {
        content.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">🔕</div>
                <strong class="empty-state-title">Belum ada alert. Buat alert pertama kamu!</strong>
                <span class="empty-state-desc">Isi form di atas untuk mulai memantau saham favoritmu.</span>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (data.length === 0) {
        content.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">📭</div>
                <strong class="empty-state-title">Tidak ada alert</strong>
                <span class="empty-state-desc">Tidak ada alert untuk filter "${activeFilter}".</span>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }

    content.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:8px" id="alert-list">
            ${data.map(a => renderAlertRow(a, triggeredMap[a.id])).join('')}
        </div>
        ${allTriggered.length > 0 ? renderTriggeredHistory() : ''}
    `;

    if (window.lucide) lucide.createIcons();
    bindAlertRowEvents(root);
}

function renderAlertRow(a, triggered) {
    const meta       = CONDITION_LABELS[a.alert_type] || { label: a.alert_type, icon: '🔔', color: 'var(--text-muted)' };
    const isTriggered= !!triggered;
    const isActive   = a.active && !isTriggered;
    const statusLabel= isTriggered ? '⏰ Terpicu' : (a.active ? '✅ Aktif' : '⏸ Nonaktif');
    const statusColor= isTriggered ? '#f59e0b' : (a.active ? 'var(--up-color)' : 'var(--text-muted)');
    const dateStr    = a.created_at ? new Date(a.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '—';
    const valueStr   = a.value != null
        ? (a.alert_type?.startsWith('rsi') ? a.value.toFixed(1) : Number(a.value).toLocaleString('id-ID'))
        : '—';

    return `
        <div class="card alert-row" data-id="${a.id}" style="padding:14px 16px;border-radius:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;${isTriggered ? 'border-left:3px solid #f59e0b' : isActive ? 'border-left:3px solid var(--up-color)' : 'border-left:3px solid var(--border-subtle);opacity:.7'}">
            <!-- Ticker -->
            <div style="min-width:60px">
                <a href="#stock/${a.ticker}" style="font-weight:800;font-family:var(--font-mono);color:var(--text-main);text-decoration:none;font-size:15px">${a.ticker}</a>
            </div>
            <!-- Condition badge -->
            <div style="flex:1;min-width:120px">
                <span class="badge" style="background:${meta.color}18;color:${meta.color};border:1px solid ${meta.color}30;font-size:11px">
                    ${meta.icon} ${meta.label}
                </span>
                <span style="font-family:var(--font-mono);font-weight:700;font-size:14px;margin-left:8px">${valueStr}</span>
                ${a._current_price ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">Harga kini: <span style="font-family:var(--font-mono);color:${a.alert_type==='price_above'?(a._current_price>=a.value?'var(--up-color)':'var(--text-muted)'):(a._current_price<=a.value?'var(--down-color)':'var(--text-muted)')}">${Number(a._current_price).toLocaleString('id-ID')}</span></div>` : ''}
            </div>
            <!-- Status -->
            <div style="min-width:90px">
                <span style="font-size:12px;font-weight:600;color:${statusColor}">${statusLabel}</span>
                <div style="font-size:11px;color:var(--text-muted);margin-top:1px">${dateStr}</div>
            </div>
            <!-- Toggle -->
            <div style="display:flex;align-items:center;gap:4px">
                <label class="toggle-switch" title="${a.active ? 'Nonaktifkan' : 'Aktifkan'}" style="cursor:pointer;display:flex;align-items:center;gap:6px">
                    <input type="checkbox" class="alert-toggle" data-id="${a.id}" ${a.active ? 'checked' : ''} style="display:none" />
                    <div class="toggle-track" style="width:36px;height:20px;border-radius:10px;background:${a.active ? 'var(--up-color,#10b981)' : 'var(--border-subtle)'};position:relative;transition:background .2s">
                        <div style="position:absolute;top:2px;left:${a.active ? '18px' : '2px'};width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>
                    </div>
                </label>
            </div>
            <!-- Delete -->
            <button class="btn-icon delete-alert" data-id="${a.id}" title="Hapus alert" style="color:var(--down-color);opacity:.7;transition:opacity .15s">
                <i data-lucide="trash-2" style="width:15px;height:15px"></i>
            </button>
        </div>
    `;
}

function renderTriggeredHistory() {
    if (!allTriggered.length) return '';
    return `
        <div style="margin-top:24px">
            <h3 style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--text-secondary)">⏰ Riwayat Terpicu</h3>
            <div class="table-wrapper" style="overflow-x:auto">
                <table class="table" style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="border-bottom:1px solid var(--border-subtle)">
                            <th style="text-align:left;padding:9px 12px">Saham</th>
                            <th style="text-align:left;padding:9px 12px">Kondisi</th>
                            <th style="text-align:right;padding:9px 12px">Trigger</th>
                            <th style="text-align:right;padding:9px 12px">Harga Saat Itu</th>
                            <th style="text-align:right;padding:9px 12px">Waktu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allTriggered.map(t => {
                            const meta = CONDITION_LABELS[t.alert_type] || { label: t.alert_type, icon: '🔔', color: 'var(--text-muted)' };
                            const trigVal = t.trigger_value != null ? Number(t.trigger_value).toLocaleString('id-ID') : '—';
                            const curVal  = t.current_value != null ? Number(t.current_value).toLocaleString('id-ID') : '—';
                            const timeStr = t.triggered_at  ? new Date(t.triggered_at).toLocaleString('id-ID') : '—';
                            return `
                                <tr style="border-bottom:1px solid var(--border-subtle)">
                                    <td style="padding:9px 12px"><a href="#stock/${t.ticker}" class="mono strong" style="color:var(--text-main);text-decoration:none;font-weight:700">${t.ticker}</a></td>
                                    <td style="padding:9px 12px"><span class="badge" style="background:${meta.color}18;color:${meta.color};font-size:11px">${meta.icon} ${meta.label}</span></td>
                                    <td style="padding:9px 12px;text-align:right;font-family:var(--font-mono);font-weight:600">${trigVal}</td>
                                    <td style="padding:9px 12px;text-align:right;font-family:var(--font-mono)">${curVal}</td>
                                    <td style="padding:9px 12px;text-align:right;font-size:11px;color:var(--text-muted)">${timeStr}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function bindAlertRowEvents(root) {
    // Delete
    root.querySelectorAll('.delete-alert').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
        btn.addEventListener('mouseleave', () => { btn.style.opacity = '.7'; });
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm('Hapus alert ini?')) return;
            try {
                const res = await apiFetch(`/alerts/${id}`, { method: 'DELETE' });
                if (res?.ok || res?.status === 'ok') {
                    showToast('Alert dihapus', 'success');
                    allAlerts = allAlerts.filter(a => String(a.id) !== String(id));
                    renderAlertList(root);
                } else {
                    showToast('Gagal menghapus alert', 'error');
                }
            } catch {
                showToast('Gagal menghapus alert', 'error');
            }
        });
    });

    // Toggle enable/disable
    root.querySelectorAll('.alert-toggle').forEach(chk => {
        chk.addEventListener('change', async () => {
            const id     = chk.dataset.id;
            const active = chk.checked;
            try {
                const res = await apiFetch(`/alerts/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active }),
                });
                if (res?.ok || res?.status === 'ok' || res?.id) {
                    showToast(active ? 'Alert diaktifkan' : 'Alert dinonaktifkan', 'success');
                    const alert = allAlerts.find(a => String(a.id) === String(id));
                    if (alert) alert.active = active;
                    renderAlertList(root);
                } else {
                    showToast('Gagal mengubah status alert', 'error');
                    chk.checked = !active; // revert
                }
            } catch {
                showToast('Gagal mengubah status alert', 'error');
                chk.checked = !active;
            }
        });
    });
}

async function handleCreateAlert(root) {
    const tickerEl = document.getElementById('alert-ticker');
    const condEl   = document.getElementById('alert-condition');
    const valueEl  = document.getElementById('alert-value');
    const saveBtn  = document.getElementById('btn-save-alert');

    const ticker    = (tickerEl?.value || '').trim().toUpperCase();
    const condition = condEl?.value || 'price_above';
    const rawValue  = valueEl?.value || '';
    const value     = parseFloat(rawValue);

    // Validation
    let valid = true;
    if (!ticker) {
        showError('err-ticker');
        tickerEl?.focus();
        valid = false;
    }
    if (!rawValue || isNaN(value) || value < 0) {
        showError('err-value');
        if (valid) valueEl?.focus();
        valid = false;
    }
    if (!valid) return;

    // Disable button during save
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan…'; }

    try {
        const res = await apiFetch('/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, alert_type: condition, value }),
        });

        if (res?.ok || res?.status === 'ok' || res?.id) {
            showToast(res?.message || `Alert ${ticker} berhasil dibuat!`, 'success');
            // Reset form
            if (tickerEl) tickerEl.value = '';
            if (valueEl)  valueEl.value  = '';
            if (condEl)   condEl.value   = 'price_above';
            // Reload
            await loadAlerts(root);
        } else {
            showToast(res?.detail || 'Gagal membuat alert', 'error');
        }
    } catch {
        showToast('Gagal membuat alert. Coba lagi.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled    = false;
            saveBtn.innerHTML   = '<i data-lucide="save" style="width:14px;height:14px"></i> Simpan';
            if (window.lucide) lucide.createIcons();
        }
    }
}

// ── Form helpers ──────────────────────────────────────────

function showError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}
