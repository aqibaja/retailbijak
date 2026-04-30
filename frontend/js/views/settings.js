import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260430m';
import { observeElements } from '../main.js?v=20260430m';

export async function renderSettings(root) {
    root.innerHTML = `
      <section class="grid grid-cols-12 stagger-reveal">
        <div class="col-span-12 flex justify-between items-end mb-6">
          <div>
            <h1 class="text-3xl mb-2" style="color:var(--text-main); letter-spacing:-0.04em; font-weight:800;">Workspace Controls</h1>
            <p class="text-base" style="color:var(--text-muted);">Configure data density and interface preferences</p>
          </div>
          <div class="badge badge-primary">SYSTEM SETTINGS</div>
        </div>

        <div class="col-span-8 panel flex-col gap-6">
            <div class="flex-col gap-4" style="border-bottom:1px solid var(--border-subtle); padding-bottom:24px;">
                <h2 class="text-xs uppercase text-dim strong" style="letter-spacing:0.08em;">Interface Engine</h2>
                
                <label class="flex justify-between items-center p-4" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:12px; cursor:pointer; transition:background 0.2s;">
                    <div>
                        <div class="strong mb-1 text-main text-base">High-Density Tables</div>
                        <div class="text-sm text-muted">Compress table rows to maximize visible data points.</div>
                    </div>
                    <input id="setting-compact" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
                
                <label class="flex justify-between items-center p-4" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:12px; cursor:pointer; transition:background 0.2s;">
                    <div>
                        <div class="strong mb-1 text-main text-base">Auto-refresh Scanner</div>
                        <div class="text-sm text-muted">Continuously poll backend for institutional signals when filters change.</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
            </div>

            <div class="flex justify-between items-center pt-2">
                <span class="text-xs text-dim mono strong" style="letter-spacing:0.05em;">SETTINGS ARE PERSISTED TO DATABASE.</span>
                <button id="save-settings" class="btn btn-primary" style="height:44px; padding:0 24px;">Save Configuration</button>
            </div>
        </div>

        <div class="col-span-4 panel flex-col gap-4" style="background:linear-gradient(135deg, rgba(99,102,241,0.05), rgba(15,23,41,0.6)); border-color:rgba(99,102,241,0.2);">
            <h2 class="text-xs uppercase strong flex items-center gap-2" style="color:#a5b4fc; letter-spacing:0.08em;"><i data-lucide="terminal" style="width:14px;"></i> Terminal Notes</h2>
            <div class="flex-col gap-3 text-sm text-muted">
                <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); border-left:2px solid var(--accent-indigo); line-height:1.5;">
                    <strong style="color:var(--text-main)">CMD+K / CTRL+K</strong> triggers the command palette from anywhere for rapid ticker lookup.
                </div>
                <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); line-height:1.5;">
                    Theme adapts automatically. Manual override is available in the top right corner.
                </div>
                <div class="p-3" style="background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.04); line-height:1.5;">
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
    compact.checked = !!settings?.compact_table_rows;
    refresh.checked = !!settings?.auto_refresh_screener;
    compact.disabled = false;
    refresh.disabled = false;
    const status = document.createElement('div');
    status.id = 'settings-status';
    status.className = 'text-xs text-dim mono strong';
    status.style.cssText = 'letter-spacing:0.05em;';
    status.textContent = 'CONNECTED TO LOCAL BACKEND';
    root.querySelector('.col-span-8 .flex.justify-between.items-center.pt-2').prepend(status);

    if (!settings) showToast('Using fallback settings state', 'info');
    
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
