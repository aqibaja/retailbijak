import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260505b';
import { observeElements } from '../main.js?v=20260504e';

const DEFAULT_STOCK_MODEL = 'google/gemma-4-26b-a4b-it';
const DEFAULT_PICKS_MODEL = 'google/gemma-4-26b-a4b-it';

function normalizeMaskedKey(value) {
  return (value || '').trim();
}

export async function renderSettings(root) {
    document.title = 'RetailBijak — Pengaturan';
    root.innerHTML = `
      <section class="settings-page-pro stagger-reveal">
        <div class="settings-hero">
          <div class="settings-hero-copy">
            <div class="settings-meta-pill">PUSAT PENGATURAN</div>
            <h1>Kontrol Ruang Kerja</h1>
            <p>Atur densitas data, perilaku pembaruan, dan preferensi antarmuka dengan tampilan yang lebih tenang.</p>
          </div>
          <div class="settings-status-rail">
            <div class="settings-status-label">Tersambung</div>
            <div class="settings-status-value">Sinkron ke layanan lokal</div>
          </div>
        </div>

        <div class="settings-layout">
          <div class="settings-toggle-panel panel flex-col gap-6">
            <div class="settings-section-head">
              <h2>Mesin Antarmuka</h2>
              <span>Kontrol yang tersimpan di basis data</span>
            </div>
            
            <div class="settings-toggle-grid">
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">Tabel Lebih Rapat</div>
                        <div class="text-sm text-muted">Padatkan tinggi baris tabel agar lebih banyak data langsung terlihat.</div>
                    </div>
                    <input id="setting-compact" type="checkbox" class="settings-checkbox" />
                </label>
                
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">Pembaruan Otomatis Pemindai</div>
                        <div class="text-sm text-muted">Minta layanan lokal memperbarui sinyal institusi secara berkala saat filter berubah.</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" class="settings-checkbox" />
                </label>
            </div>

            <div class="settings-section-head" style="margin-top:0.5rem;">
              <h2>OpenRouter AI</h2>
              <span>Aktifkan ringkasan AI untuk analisis saham dan AI Picks dengan model gratis default.</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-openrouter-key">
                <span class="settings-field-label">API key OpenRouter</span>
                <div style="position:relative">
                  <input id="setting-openrouter-key" class="settings-text-input" type="password" placeholder="sk-or-..." autocomplete="off" />
                  <button id="toggle-key-visibility" type="button" class="btn btn-icon settings-key-toggle" title="Tampilkan/sembunyikan key">T</button>
                </div>
                <small class="text-xs text-dim">Key disimpan di server · simpan dengan kosong untuk mempertahankan key yang sudah ada.</small>
              </label>

              <label class="settings-field-card" for="setting-openrouter-site-url">
                <span class="settings-field-label">Site URL</span>
                <input id="setting-openrouter-site-url" class="settings-text-input" type="text" placeholder="https://retailbijak.rich27.my.id" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-app-name">
                <span class="settings-field-label">Nama Aplikasi</span>
                <input id="setting-openrouter-app-name" class="settings-text-input" type="text" placeholder="RetailBijak" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-stock-model">
                <span class="settings-field-label">Model Analisis Saham</span>
                <input id="setting-openrouter-stock-model" class="settings-text-input" type="text" placeholder="${DEFAULT_STOCK_MODEL}" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-openrouter-picks-model">
                <span class="settings-field-label">Model AI Picks</span>
                <input id="setting-openrouter-picks-model" class="settings-text-input" type="text" placeholder="${DEFAULT_PICKS_MODEL}" autocomplete="off" />
              </label>
            </div>

            <div class="settings-actions-row">
                <span id="settings-status" class="text-xs text-dim mono strong settings-status-text">TERSAMBUNG KE LAYANAN LOKAL</span>
                <button id="save-settings" class="btn btn-primary settings-save-btn">Simpan Konfigurasi</button>
            </div>
          </div>

          <div class="settings-note-rail panel flex-col gap-4">
            <h2 class="settings-note-title"><i data-lucide="terminal" style="width:14px;"></i> Catatan Terminal</h2>
            <div class="settings-note-stack">
                <div class="settings-note-card">
                    <strong class="settings-note-strong">⌘K / Ctrl+K</strong> membuka palet perintah dari mana saja untuk pencarian kode saham yang lebih cepat.
                </div>
                <div class="settings-note-card">
                    Tema menyesuaikan otomatis. Penyesuaian manual tetap tersedia di pojok kanan atas.
                </div>
                <div class="settings-note-card">
                    Hasil pemindai tertunda 15 menit kecuali ruang kerja terhubung ke aliran data premium lanjutan.
                </div>
              <div class="settings-note-card">
                  Model gratis default: <strong>${DEFAULT_STOCK_MODEL}</strong> untuk analisis saham dan <strong>${DEFAULT_PICKS_MODEL}</strong> untuk AI Picks.
              </div>
              <div class="settings-note-card">
                  Jika status berubah jadi <strong>OpenRouter perlu dicek</strong>, biasanya provider membalas pesan seperti <strong>API key OpenRouter ditolak provider</strong> dan key perlu diganti.
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
        toggleBtn.title = isPassword ? 'Sembunyikan key' : 'Tampilkan key';
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
          ? 'OPENROUTER AKTIF'
          : runtimeState === 'invalid'
            ? 'OpenRouter perlu dicek'
            : 'TERSAMBUNG KE LAYANAN LOKAL')
        : 'MEMAKAI PENGATURAN CADANGAN';
      status.title = settings?.openrouter_runtime_message || '';
    }

    if (!settings) showToast('Sedang memakai pengaturan cadangan', 'info');
    
    document.getElementById('save-settings').addEventListener('click', async () => {
        const btn = document.getElementById('save-settings');
        btn.disabled = true;
        btn.textContent = 'Sedang menyimpan...';
        
        const payload = {
            compact_table_rows: compact.checked,
            auto_refresh_screener: refresh.checked,
            openrouter_api_key: openrouterKey.value.trim(),
            openrouter_site_url: openrouterSiteUrl.value.trim(),
            openrouter_app_name: openrouterAppName.value.trim() || 'RetailBijak',
            openrouter_stock_analysis_model: openrouterStockModel.value.trim() || DEFAULT_STOCK_MODEL,
            openrouter_ai_picks_model: openrouterPicksModel.value.trim() || DEFAULT_PICKS_MODEL,
        };
        const saved = await updateSettings(payload);
        
        btn.disabled = false;
        btn.textContent = 'Simpan Konfigurasi';
        
        if (!saved || saved.ok !== true) {
            showToast('Konfigurasi gagal disinkronkan', 'error');
            return;
        }

        openrouterKey.value = normalizeMaskedKey(saved?.openrouter_api_key_masked || payload.openrouter_api_key);
        if (status) {
          const runtimeState = saved?.openrouter_runtime_state || 'disabled';
          status.textContent = runtimeState === 'ok'
            ? 'OPENROUTER AKTIF'
            : runtimeState === 'invalid'
              ? 'OpenRouter perlu dicek'
              : 'TERSAMBUNG KE LAYANAN LOKAL';
          status.title = saved?.openrouter_runtime_message || '';
        }
        showToast('Konfigurasi berhasil disinkronkan', 'success');
    });
}
