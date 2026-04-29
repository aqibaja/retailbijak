import { animateCards } from '../main.js';
import { fetchSettings, updateSettings, showToast } from '../api.js';

export async function renderSettings(root) {
    root.innerHTML = `
        <div class="flex-between mb-4"><h1>Settings</h1></div>
        <div class="card" style="max-width:640px;">
            <h2>Interface Preferences</h2>
            <div style="margin-top:14px; display:flex; flex-direction:column; gap:12px;">
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Compact table rows</span><input id="setting-compact" type="checkbox">
                </label>
                <label style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Auto-refresh screener results</span><input id="setting-refresh" type="checkbox">
                </label>
                <button id="save-settings" class="btn btn-primary" style="align-self:flex-start;">Save Settings</button>
                <p style="font-size:12px; color:var(--text-muted);">Saved to backend database so your preferences persist.</p>
            </div>
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
