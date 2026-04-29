import { animateCards } from '../main.js';
import { fetchSettings, updateSettings, showToast } from '../api.js';

export async function renderSettings(root) {
    root.innerHTML = `
        <section class="mb-4">
            <div class="eyebrow">Workspace controls</div>
            <h1>Settings</h1>
            <p class="text-muted" style="max-width:720px; margin-top:8px;">Atur preferensi tampilan dan perilaku agar workspace tetap nyaman dipakai untuk screening cepat maupun analisis mendalam.</p>
        </section>

        <div class="split-row">
            <section class="card">
                <h2>Interface Preferences</h2>
                <div class="stack" style="gap:14px; margin-top:14px;">
                    <label class="setting-row">
                        <div>
                            <div class="setting-title">Compact table rows</div>
                            <div class="text-muted" style="font-size:12px;">Merapatkan tabel agar lebih banyak data terlihat.</div>
                        </div>
                        <input id="setting-compact" type="checkbox" />
                    </label>
                    <label class="setting-row">
                        <div>
                            <div class="setting-title">Auto-refresh screener results</div>
                            <div class="text-muted" style="font-size:12px;">Memuat ulang hasil screener secara otomatis saat filter berubah.</div>
                        </div>
                        <input id="setting-refresh" type="checkbox" />
                    </label>
                    <div class="flex-between" style="gap:12px; flex-wrap:wrap;">
                        <button id="save-settings" class="btn btn-primary">Save Settings</button>
                        <span class="text-muted" style="font-size:12px;">Saved in backend database</span>
                    </div>
                </div>
            </section>

            <section class="card">
                <h2>Workspace Notes</h2>
                <div class="stack" style="gap:12px; margin-top:14px;">
                    <div class="notice-box">Theme mengikuti preferensi browser dan bisa diganti dari topbar.</div>
                    <div class="notice-box">Pencarian ticker di header langsung membawa kamu ke detail saham.</div>
                    <div class="notice-box">Screener dan portfolio dirancang untuk flow kerja harian yang cepat.</div>
                </div>
            </section>
        </div>
    `;

    animateCards('.card');

    const settings = await fetchSettings();
    const compact = document.getElementById('setting-compact');
    const refresh = document.getElementById('setting-refresh');
    compact.checked = !!settings.compact_table_rows;
    refresh.checked = !!settings.auto_refresh_screener;

    document.getElementById('save-settings').addEventListener('click', async () => {
        const payload = {
            compact_table_rows: compact.checked,
            auto_refresh_screener: refresh.checked,
        };
        const saved = await updateSettings(payload);
        if (!saved || saved.ok !== true) {
            showToast('Failed to save settings', 'error');
            return;
        }
        showToast('Settings saved', 'success');
    });
}
