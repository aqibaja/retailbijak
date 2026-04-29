import { fetchSettings, updateSettings, showToast } from '../api.js';
import { observeElements } from '../main.js';

export async function renderSettings(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-4">
          <div>
            <h1 class="text-2xl strong mb-2">Workspace Controls</h1>
            <p class="text-muted">Configure data density and interface preferences</p>
          </div>
          <div class="badge badge-primary">SYSTEM SETTINGS</div>
        </div>

        <div class="col-span-8 panel flex-col gap-4">
            <div class="flex-col gap-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:16px;">
                <h2 class="text-xs uppercase text-muted strong">Interface Engine</h2>
                
                <label class="flex justify-between items-center p-3" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); cursor:pointer; transition:border-color 0.2s;">
                    <div>
                        <div class="strong mb-1">High-Density Tables</div>
                        <div class="text-xs text-dim">Compress table rows to maximize visible data points.</div>
                    </div>
                    <input id="setting-compact" type="checkbox" style="width:16px; height:16px; accent-color:var(--primary-color);" />
                </label>
                
                <label class="flex justify-between items-center p-3" style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); cursor:pointer; transition:border-color 0.2s;">
                    <div>
                        <div class="strong mb-1">Auto-refresh Scanner</div>
                        <div class="text-xs text-dim">Continuously poll backend for institutional signals when filters change.</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" style="width:16px; height:16px; accent-color:var(--primary-color);" />
                </label>
            </div>

            <div class="flex justify-between items-center">
                <span class="text-xs text-dim mono">Settings are persisted to database.</span>
                <button id="save-settings" class="btn btn-primary">Save Configuration</button>
            </div>
        </div>

        <div class="col-span-4 panel flex-col gap-4" style="background:rgba(59,130,246,0.05); border-color:var(--border-focus);">
            <h2 class="text-xs uppercase text-primary strong">Terminal Notes</h2>
            <div class="flex-col gap-3 text-sm text-muted">
                <div class="p-3" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle); border-left:2px solid var(--primary-color);">
                    <strong>CMD+K / CTRL+K</strong> triggers the command palette from anywhere for rapid ticker lookup.
                </div>
                <div class="p-3" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                    Theme adapts automatically. Manual override is available in the top right corner.
                </div>
                <div class="p-3" style="background:var(--bg-elevated); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
                    Scanner results are delayed by 15 minutes unless connected to a Pro data feed.
                </div>
            </div>
        </div>
      </section>
    `;

    observeElements();

    const settings = await fetchSettings();
    const compact = document.getElementById('setting-compact');
    const refresh = document.getElementById('setting-refresh');
    compact.checked = !!settings.compact_table_rows;
    refresh.checked = !!settings.auto_refresh_screener;

    document.getElementById('save-settings').addEventListener('click', async () => {
        const btn = document.getElementById('save-settings');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        const payload = {
            compact_table_rows: compact.checked,
            auto_refresh_screener: refresh.checked,
        };
        const saved = await updateSettings(payload);
        
        btn.disabled = false;
        btn.textContent = 'Save Configuration';
        
        if (!saved || saved.ok !== true) {
            showToast('Failed to sync configuration', 'error');
            return;
        }
        showToast('Configuration synced successfully', 'success');
    });
}
