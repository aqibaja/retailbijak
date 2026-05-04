1|import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260505b';
     2|import { observeElements } from '../main.js?v=20260504e';
     3|
     4|const DEFAULT_STOCK_MODEL = 'google/gemma-4-26b-a4b-it';
     5|const DEFAULT_PICKS_MODEL = 'google/gemma-4-26b-a4b-it';
     6|
     7|function normalizeMaskedKey(value) {
     8|  return (value || '').trim();
     9|}
    10|
    11|export async function renderSettings(root) {
    12|    document.title = 'RetailBijak — Pengaturan';
    13|    root.innerHTML = `
    14|      <section class="settings-page-pro stagger-reveal">
    15|        <div class="settings-hero">
    16|          <div class="settings-hero-copy">
    17|            <div class="settings-meta-pill">PUSAT PENGATURAN</div>
    18|            <h1>Kontrol Ruang Kerja</h1>
    19|            <p>Atur densitas data, perilaku pembaruan, dan preferensi antarmuka dengan tampilan yang lebih tenang.</p>
    20|          </div>
    21|          <div class="settings-status-rail">
    22|            <div class="settings-status-label">Tersambung</div>
    23|            <div class="settings-status-value">Sinkron ke layanan lokal</div>
    24|          </div>
    25|        </div>
    26|
    27|        <div class="settings-layout">
    28|          <div class="settings-toggle-panel panel flex-col gap-6">
    29|            <div class="settings-section-head">
    30|              <h2>Mesin Antarmuka</h2>
    31|              <span>Kontrol yang tersimpan di basis data</span>
    32|            </div>
    33|            
    34|            <div class="settings-toggle-grid">
    35|                <label class="settings-toggle-card">
    36|                    <div>
    37|                        <div class="strong mb-1 text-main text-base">Tabel Lebih Rapat</div>
    38|                        <div class="text-sm text-muted">Padatkan tinggi baris tabel agar lebih banyak data langsung terlihat.</div>
    39|                    </div>
    40|                    <input id="setting-compact" type="checkbox" class="settings-checkbox" />
    41|                </label>
    42|                
    43|                <label class="settings-toggle-card">
    44|                    <div>
    45|                        <div class="strong mb-1 text-main text-base">Pembaruan Otomatis Pemindai</div>
    46|                        <div class="text-sm text-muted">Minta layanan lokal memperbarui sinyal institusi secara berkala saat filter berubah.</div>
    47|                    </div>
    48|                    <input id="setting-refresh" type="checkbox" class="settings-checkbox" />
    49|                </label>
    50|            </div>
    51|
    52|            <div class="settings-section-head" class="mt-8">
    53|              <h2>OpenRouter AI</h2>
    54|              <span>Aktifkan ringkasan AI untuk analisis saham dan AI Picks dengan model gratis default.</span>
    55|            </div>
    56|
    57|            <div class="settings-openrouter-stack">
    58|              <label class="settings-field-card" for="setting-openrouter-key">
    59|                <span class="settings-field-label">API key OpenRouter</span>
    60|                <div class="pos-relative">
    61|                  <input id="setting-openrouter-key" class="settings-text-input" type="password" placeholder="sk-or-..." autocomplete="off" />
    62|                  <button id="toggle-key-visibility" type="button" class="btn btn-icon settings-key-toggle" title="Tampilkan/sembunyikan key">T</button>
    63|                </div>
    64|                <small class="text-xs text-dim">Key disimpan di server · simpan dengan kosong untuk mempertahankan key yang sudah ada.</small>
    65|              </label>
    66|
    67|              <label class="settings-field-card" for="setting-openrouter-site-url">
    68|                <span class="settings-field-label">Site URL</span>
    69|                <input id="setting-openrouter-site-url" class="settings-text-input" type="text" placeholder="https://retailbijak.rich27.my.id" autocomplete="off" />
    70|              </label>
    71|
    72|              <label class="settings-field-card" for="setting-openrouter-app-name">
    73|                <span class="settings-field-label">Nama Aplikasi</span>
    74|                <input id="setting-openrouter-app-name" class="settings-text-input" type="text" placeholder="RetailBijak" autocomplete="off" />
    75|              </label>
    76|
    77|              <label class="settings-field-card" for="setting-openrouter-stock-model">
    78|                <span class="settings-field-label">Model Analisis Saham</span>
    79|                <input id="setting-openrouter-stock-model" class="settings-text-input" type="text" placeholder="${DEFAULT_STOCK_MODEL}" autocomplete="off" />
    80|              </label>
    81|
    82|              <label class="settings-field-card" for="setting-openrouter-picks-model">
    83|                <span class="settings-field-label">Model AI Picks</span>
    84|                <input id="setting-openrouter-picks-model" class="settings-text-input" type="text" placeholder="${DEFAULT_PICKS_MODEL}" autocomplete="off" />
    85|              </label>
    86|            </div>
    87|
    88|            <div class="settings-actions-row">
    89|                <span id="settings-status" class="text-xs text-dim mono strong settings-status-text">TERSAMBUNG KE LAYANAN LOKAL</span>
    90|                <button id="save-settings" class="btn btn-primary settings-save-btn">Simpan Konfigurasi</button>
    91|            </div>
    92|          </div>
    93|
    94|          <div class="settings-note-rail panel flex-col gap-4">
    95|            <h2 class="settings-note-title"><i data-lucide="terminal" class="lucide-sm"></i> Catatan Terminal</h2>
    96|            <div class="settings-note-stack">
    97|                <div class="settings-note-card">
    98|                    <strong class="settings-note-strong">⌘K / Ctrl+K</strong> membuka palet perintah dari mana saja untuk pencarian kode saham yang lebih cepat.
    99|                </div>
   100|                <div class="settings-note-card">
   101|                    Tema menyesuaikan otomatis. Penyesuaian manual tetap tersedia di pojok kanan atas.
   102|                </div>
   103|                <div class="settings-note-card">
   104|                    Hasil pemindai tertunda 15 menit kecuali ruang kerja terhubung ke aliran data premium lanjutan.
   105|                </div>
   106|              <div class="settings-note-card">
   107|                  Model gratis default: <strong>${DEFAULT_STOCK_MODEL}</strong> untuk analisis saham dan <strong>${DEFAULT_PICKS_MODEL}</strong> untuk AI Picks.
   108|              </div>
   109|              <div class="settings-note-card">
   110|                  Jika status berubah jadi <strong>OpenRouter perlu dicek</strong>, biasanya provider membalas pesan seperti <strong>API key OpenRouter ditolak provider</strong> dan key perlu diganti.
   111|              </div>
   112|            </div>
   113|          </div>
   114|        </div>
   115|      </section>
   116|    `;
   117|
   118|    observeElements();
   119|
   120|    const settings = await fetchSettings();
   121|    const compact = document.getElementById('setting-compact');
   122|    const refresh = document.getElementById('setting-refresh');
   123|    const openrouterKey = document.getElementById('setting-openrouter-key');
   124|    const openrouterSiteUrl = document.getElementById('setting-openrouter-site-url');
   125|    const openrouterAppName = document.getElementById('setting-openrouter-app-name');
   126|    const openrouterStockModel = document.getElementById('setting-openrouter-stock-model');
   127|    const openrouterPicksModel = document.getElementById('setting-openrouter-picks-model');
   128|
   129|    compact.checked = settings?.compact_table_rows || false;
   130|    refresh.checked = settings?.auto_refresh_screener || false;
   131|    compact.disabled = false;
   132|    refresh.disabled = false;
   133|
   134|    // Key visibility toggle
   135|    const toggleBtn = document.getElementById('toggle-key-visibility');
   136|    if (toggleBtn) {
   137|      toggleBtn.addEventListener('click', () => {
   138|        const isPassword = openrouterKey.type === 'password';
   139|        openrouterKey.type = isPassword ? 'text' : 'password';
   140|        toggleBtn.textContent = isPassword ? 'S' : 'T';
   141|        toggleBtn.title = isPassword ? 'Sembunyikan key' : 'Tampilkan key';
   142|      });
   143|    }
   144|
   145|    openrouterKey.value = normalizeMaskedKey(settings?.openrouter_api_key_masked);
   146|    openrouterSiteUrl.value = settings?.openrouter_site_url || '';
   147|    openrouterAppName.value = settings?.openrouter_app_name || 'RetailBijak';
   148|    openrouterStockModel.value = settings?.openrouter_stock_analysis_model || DEFAULT_STOCK_MODEL;
   149|    openrouterPicksModel.value = settings?.openrouter_ai_picks_model || DEFAULT_PICKS_MODEL;
   150|
   151|    const status = document.getElementById('settings-status');
   152|    if (status) {
   153|      const runtimeState = settings?.openrouter_runtime_state || 'disabled';
   154|      status.textContent = settings
   155|        ? (runtimeState === 'ok'
   156|          ? 'OPENROUTER AKTIF'
   157|          : runtimeState === 'invalid'
   158|            ? 'OpenRouter perlu dicek'
   159|            : 'TERSAMBUNG KE LAYANAN LOKAL')
   160|        : 'MEMAKAI PENGATURAN CADANGAN';
   161|      status.title = settings?.openrouter_runtime_message || '';
   162|    }
   163|
   164|    if (!settings) showToast('Sedang memakai pengaturan cadangan', 'info');
   165|    
   166|    document.getElementById('save-settings').addEventListener('click', async () => {
   167|        const btn = document.getElementById('save-settings');
   168|        btn.disabled = true;
   169|        btn.textContent = 'Sedang menyimpan...';
   170|        
   171|        const payload = {
   172|            compact_table_rows: compact.checked,
   173|            auto_refresh_screener: refresh.checked,
   174|            openrouter_api_key: openrouterKey.value.trim(),
   175|            openrouter_site_url: openrouterSiteUrl.value.trim(),
   176|            openrouter_app_name: openrouterAppName.value.trim() || 'RetailBijak',
   177|            openrouter_stock_analysis_model: openrouterStockModel.value.trim() || DEFAULT_STOCK_MODEL,
   178|            openrouter_ai_picks_model: openrouterPicksModel.value.trim() || DEFAULT_PICKS_MODEL,
   179|        };
   180|        const saved = await updateSettings(payload);
   181|        
   182|        btn.disabled = false;
   183|        btn.textContent = 'Simpan Konfigurasi';
   184|        
   185|        if (!saved || saved.ok !== true) {
   186|            showToast('Konfigurasi gagal disinkronkan', 'error');
   187|            return;
   188|        }
   189|
   190|        openrouterKey.value = normalizeMaskedKey(saved?.openrouter_api_key_masked || payload.openrouter_api_key);
   191|        if (status) {
   192|          const runtimeState = saved?.openrouter_runtime_state || 'disabled';
   193|          status.textContent = runtimeState === 'ok'
   194|            ? 'OPENROUTER AKTIF'
   195|            : runtimeState === 'invalid'
   196|              ? 'OpenRouter perlu dicek'
   197|              : 'TERSAMBUNG KE LAYANAN LOKAL';
   198|          status.title = saved?.openrouter_runtime_message || '';
   199|        }
   200|        showToast('Konfigurasi berhasil disinkronkan', 'success');
   201|    });
   202|}
   203|
