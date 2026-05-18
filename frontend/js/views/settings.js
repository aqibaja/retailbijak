import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260518F';
import { observeElements } from '../main.js?v=20260518F';
import { t as _t } from '../i18n.js?v=20260518F';
const t = (key, params) => (window.t ? window.t(key, params) : _t(key, params));

const DEFAULT_STOCK_MODEL = 'google/gemma-4-26b-a4b-it';
const DEFAULT_PICKS_MODEL = 'google/gemma-4-26b-a4b-it';

function normalizeMaskedKey(value) {
  return (value || '').trim();
}

export async function renderSettings(root) {
    document.title = `RetailBijak — ${t('settings_view.title')}`;
    root.innerHTML = `
      <section class="settings-page-pro stagger-reveal">
        <div class="settings-hero">
          <div class="settings-hero-copy">
            <div class="settings-meta-pill">${t('settings_view.meta_pill')}</div>
            <h1>${t('settings_view.heading')}</h1>
            <p>${t('settings_view.description')}</p>
          </div>
          <div class="settings-status-rail">
            <div class="settings-status-label">${t('settings_view.status_label')}</div>
            <div class="settings-status-value">${t('settings_view.status_value')}</div>
          </div>
        </div>

        <div class="settings-layout">
          <div class="settings-toggle-panel panel flex-col gap-6">
            <div class="settings-section-head">
              <h2>${t('settings_view.interface_engine_section')}</h2>
              <span>${t('settings_view.interface_engine_desc')}</span>
            </div>
            
            <div class="settings-toggle-grid">
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">${t('settings_view.compact_table_label')}</div>
                        <div class="text-sm text-muted">${t('settings_view.compact_table_desc')}</div>
                    </div>
                    <input id="setting-compact" type="checkbox" class="settings-checkbox" />
                </label>
                
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">${t('settings_view.auto_refresh_label')}</div>
                        <div class="text-sm text-muted">${t('settings_view.auto_refresh_desc')}</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" class="settings-checkbox" />
                </label>
            </div>

            <div class="settings-section-head mt-8">
              <h2>${t('settings_view.openrouter_section')}</h2>
              <span>${t('settings_view.openrouter_desc')}</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-openrouter-key">
                <span class="settings-field-label">${t('settings_view.api_key_label')}</span>
                <div class="pos-relative">
                  <input id="setting-openrouter-key" class="settings-text-input" type="password" placeholder="${t('settings_view.api_key_placeholder')}" autocomplete="off" />
                  <button id="toggle-key-visibility" type="button" class="btn btn-icon settings-key-toggle" title="${t('settings_view.key_toggle_title_show')}">T</button>
                </div>
                <small class="text-xs text-dim">${t('settings_view.api_key_hint')}</small>
              </label>

              <label class="settings-field-card" for="setting-openrouter-site-url">
                <span class="settings-field-label">${t('settings_view.site_url_label')}</span>
                <input id="setting-openrouter-site-url" class="settings-text-input" type="text" placeholder="${t('settings_view.site_url_placeholder')}" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-app-name">
                <span class="settings-field-label">${t('settings_view.app_name_label')}</span>
                <input id="setting-openrouter-app-name" class="settings-text-input" type="text" placeholder="${t('settings_view.app_name_placeholder')}" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-stock-model">
                <span class="settings-field-label">${t('settings_view.stock_model_label')}</span>
                <input id="setting-openrouter-stock-model" class="settings-text-input" type="text" placeholder="${DEFAULT_STOCK_MODEL}" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-picks-model">
                <span class="settings-field-label">${t('settings_view.picks_model_label')}</span>
                <input id="setting-openrouter-picks-model" class="settings-text-input" type="text" placeholder="${DEFAULT_PICKS_MODEL}" autocomplete="off" />
              </label>
            </div>

            <div class="settings-actions-row">
                <span id="settings-status" class="text-xs text-dim mono strong settings-status-text">${t('settings_view.status_connected')}</span>
                <button id="save-settings" type="button" class="btn btn-primary settings-save-btn">${t('settings_view.save_button')}</button>
            </div>
          </div>

          <div class="settings-note-rail panel flex-col gap-4">
            <h2 class="settings-note-title"><i data-lucide="terminal" class="lucide-sm"></i> ${t('settings_view.terminal_notes_title')}</h2>
            <div class="settings-note-stack">
                <div class="settings-note-card">
                    <strong class="settings-note-strong">⌘K / Ctrl+K</strong> ${t('settings_view.terminal_note_1').replace('⌘K / Ctrl+K membuka palet perintah dari mana saja untuk pencarian kode saham yang lebih cepat.', '').trim()}
                </div>
                <div class="settings-note-card">
                    ${t('settings_view.terminal_note_2')}
                </div>
                <div class="settings-note-card">
                    ${t('settings_view.terminal_note_3')}
                </div>
              <div class="settings-note-card">
                  ${t('settings_view.terminal_note_4', { stock_model: DEFAULT_STOCK_MODEL, picks_model: DEFAULT_PICKS_MODEL })}
              </div>
              <div class="settings-note-card">
                  ${t('settings_view.terminal_note_5')}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    observeElements();

    let settings;
    try { settings = await fetchSettings(); } catch (e) { settings = null; console.warn('fetchSettings failed', e); }
    const compact = document.getElementById('setting-compact');
    const refresh = document.getElementById('setting-refresh');
    const openrouterKey = document.getElementById('setting-openrouter-key');
    const openrouterSiteUrl = document.getElementById('setting-openrouter-site-url');
    const openrouterAppName = document.getElementById('setting-openrouter-app-name');
    const openrouterStockModel = document.getElementById('setting-openrouter-stock-model');
    const openrouterPicksModel = document.getElementById('setting-openrouter-picks-model');

    compact.checked = settings?.compact_table_rows || false;
    refresh.checked = settings?.auto_refresh_screener || false;
    compact.disabled = false;
    refresh.disabled = false;

    // Key visibility toggle
    const toggleBtn = document.getElementById('toggle-key-visibility');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = openrouterKey.type === 'password';
        openrouterKey.type = isPassword ? 'text' : 'password';
        toggleBtn.textContent = isPassword ? 'S' : 'T';
        toggleBtn.title = isPassword ? t('settings_view.key_toggle_title_hide') : t('settings_view.key_toggle_title_show');
      });
    }

    openrouterKey.value = normalizeMaskedKey(settings?.openrouter_api_key_masked);
    openrouterSiteUrl.value = settings?.openrouter_site_url || '';
    openrouterAppName.value = settings?.openrouter_app_name || 'RetailBijak';
    openrouterStockModel.value = settings?.openrouter_stock_analysis_model || DEFAULT_STOCK_MODEL;
    openrouterPicksModel.value = settings?.openrouter_ai_picks_model || DEFAULT_PICKS_MODEL;

    const status = document.getElementById('settings-status');
    if (status) {
      const runtimeState = settings?.openrouter_runtime_state || 'disabled';
      status.textContent = settings
        ? (runtimeState === 'ok'
          ? t('settings_view.status_openrouter_ok')
          : runtimeState === 'invalid'
            ? t('settings_view.status_openrouter_invalid')
            : t('settings_view.status_connected'))
        : t('settings_view.status_fallback');
      status.title = settings?.openrouter_runtime_message || '';
    }

    if (!settings) showToast(t('settings_view.toast_fallback'), 'info');
    
    document.getElementById('save-settings').addEventListener('click', async () => {
        const btn = document.getElementById('save-settings');
        btn.disabled = true;
        btn.textContent = t('settings_view.saving_button');
        
        const payload = {
            compact_table_rows: compact.checked,
            auto_refresh_screener: refresh.checked,
            openrouter_api_key: openrouterKey.value.trim(),
            openrouter_site_url: openrouterSiteUrl.value.trim(),
            openrouter_app_name: openrouterAppName.value.trim() || 'RetailBijak',
            openrouter_stock_analysis_model: openrouterStockModel.value.trim() || DEFAULT_STOCK_MODEL,
            openrouter_ai_picks_model: openrouterPicksModel.value.trim() || DEFAULT_PICKS_MODEL,
        };
        const saved = await updateSettings(payload).catch(e => {
            console.warn('updateSettings failed', e);
            btn.disabled = false;
            btn.textContent = t('settings_view.save_button');
            showToast(t('settings_view.toast_save_failed'), 'error');
            return null;
        });
        
        btn.disabled = false;
        btn.textContent = t('settings_view.save_button');
        
        if (!saved || saved.ok !== true) {
            showToast(t('settings_view.toast_sync_failed'), 'error');
            return;
        }
        
        openrouterKey.value = normalizeMaskedKey(saved?.openrouter_api_key_masked || payload.openrouter_api_key);
        if (status) {
          const runtimeState = saved?.openrouter_runtime_state || 'disabled';
          status.textContent = runtimeState === 'ok'
            ? t('settings_view.status_openrouter_ok')
            : runtimeState === 'invalid'
              ? t('settings_view.status_openrouter_invalid')
              : t('settings_view.status_connected');
          status.title = saved?.openrouter_runtime_message || '';
        }
        showToast(t('settings_view.toast_save_success'), 'success');
    });
}

