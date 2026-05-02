import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260502a';
import { observeElements } from '../main.js?v=20260502c';

export async function renderSettings(root) {
    root.innerHTML = `
      <section class="settings-page-pro stagger-reveal">
        <div class="settings-hero">
          <div class="settings-hero-copy">
            <div class="settings-meta-pill">SYSTEM SETTINGS</div>
            <h1>Workspace Controls</h1>
            <p>Atur densitas data, perilaku refresh, dan preferensi antarmuka dengan shell yang lebih tenang.</p>
          </div>
          <div class="settings-status-rail">
            <div class="settings-status-label">Connected</div>
            <div class="settings-status-value">Local backend sync</div>
          </div>
        </div>

        <div class="settings-layout">
          <div class="settings-toggle-panel panel flex-col gap-6">
            <div class="settings-section-head">
              <h2>Interface Engine</h2>
              <span>Database-backed controls</span>
            </div>
            
            <div class="settings-toggle-grid">
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">High-Density Tables</div>
                        <div class="text-sm text-muted">Compress table rows to maximize visible data points.</div>
                    </div>
                    <input id="setting-compact" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
                
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">Auto-refresh Scanner</div>
                        <div class="text-sm text-muted">Continuously poll backend for institutional signals when filters change.</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
            </div>

            <div class="settings-actions-row">
                <span id="settings-status" class="text-xs text-dim mono strong" style="letter-spacing:0.05em;">CONNECTED TO LOCAL BACKEND</span>
                <button id="save-settings" class="btn btn-primary settings-save-btn">Save Configuration</button>
            </div>
          </div>

          <div class="settings-note-rail panel flex-col gap-4">
            <h2 class="settings-note-title"><i data-lucide="terminal" style="width:14px;"></i> Terminal Notes</h2>
            <div class="settings-note-stack">
                <div class="settings-note-card">
                    <strong style="color:var(--text-main)">CMD+K / CTRL+K</strong> triggers the command palette from anywhere for rapid ticker lookup.
                </div>
                <div class="settings-note-card">
                    Theme adapts automatically. Manual override is available in the top right corner.
                </div>
                <div class="settings-note-card">
                    Scanner results are delayed by 15 minutes unless connected to a Pro data feed.
                </div>
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
