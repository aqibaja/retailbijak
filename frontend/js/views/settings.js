import { fetchSettings, updateSettings, showToast } from '../api.js?v=202605120200';
import { observeElements } from '../utils/helpers.js?v=202605120200';
import { getDeviceId, getMyIdentity, setPin, updateNickname } from '../auth.js?v=202605120200';

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

            <div class="settings-section-head mt-8">
              <h2>🏆 Pencapaian & Progres</h2>
              <span>Streak login, XP, dan badge — makin aktif makin tinggi!</span>
            </div>
            <div id="gamification-card" class="settings-health-grid">
              <div class="text-xs text-dim p-3">Memuat pencapaian...</div>
            </div>

            <div class="settings-section-head mt-8">
              <h2>🗄️ Kesehatan Data</h2>
              <span>Status pipeline dan ketersediaan data di database</span>
            </div>
            <div id="data-health-card" class="settings-health-grid">
              <div class="text-xs text-dim p-3">Memuat status data...</div>
            </div>

            <div class="settings-section-head mt-8">
              <h2>OpenRouter AI</h2>
              <span>Aktifkan ringkasan AI untuk analisis saham dan AI Picks dengan model gratis default.</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-openrouter-key">
                <span class="settings-field-label">API key OpenRouter</span>
                <div class="pos-relative">
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
                <button id="save-settings" type="button" class="btn btn-primary settings-save-btn">Simpan Konfigurasi</button>
            </div>

            <div class="settings-section-head mt-8">
              <h2>🤖 Telegram Alert</h2>
              <span>Dapatkan notifikasi alert saham langsung ke Telegram kamu.</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-telegram-token">
                <span class="settings-field-label">Bot Token</span>
                <div class="pos-relative">
                  <input id="setting-telegram-token" class="settings-text-input" type="password" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" autocomplete="off" />
                  <button id="toggle-telegram-token-visibility" type="button" class="btn btn-icon settings-key-toggle" title="Tampilkan/sembunyikan token">T</button>
                </div>
                <small class="text-xs text-dim">Dapatkan token dari <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> di Telegram.</small>
              </label>

              <label class="settings-field-card" for="setting-telegram-chat-id">
                <span class="settings-field-label">Chat ID</span>
                <input id="setting-telegram-chat-id" class="settings-text-input" type="text" placeholder="123456789 atau @username" autocomplete="off" />
                <small class="text-xs text-dim">Kirim <code>/start</code> ke bot kamu, lalu buka <code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</code> untuk cari chat ID.</small>
              </label>

              <div class="settings-telegram-status-row" style="display:flex;align-items:center;gap:10px;margin-top:4px">
                <span id="telegram-status-indicator" class="text-xs text-dim">⏺️ Telegram tidak dikonfigurasi</span>
              </div>

              <div class="settings-actions-row">
                <button id="test-telegram" type="button" class="btn btn-secondary settings-save-btn" disabled>Test Connection</button>
                <button id="save-telegram" type="button" class="btn btn-primary settings-save-btn">Simpan Telegram</button>
              </div>
            </div>

            <div class="settings-section-head mt-8">
              <h2>📧 Email Briefing</h2>
              <span>Terima ringkasan pasar harian via email setelah bursa tutup.</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-smtp-server">
                <span class="settings-field-label">SMTP Server</span>
                <input id="setting-smtp-server" class="settings-text-input" type="text" placeholder="smtp.gmail.com" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-smtp-port">
                <span class="settings-field-label">Port</span>
                <input id="setting-smtp-port" class="settings-text-input" type="text" placeholder="587" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-smtp-email">
                <span class="settings-field-label">Email</span>
                <input id="setting-smtp-email" class="settings-text-input" type="email" placeholder="email@example.com" autocomplete="off" />
              </label>

              <label class="settings-field-card" for="setting-smtp-password">
                <span class="settings-field-label">Password / App Password</span>
                <div class="pos-relative">
                  <input id="setting-smtp-password" class="settings-text-input" type="password" placeholder="••••••••" autocomplete="off" />
                  <button id="toggle-smtp-password-visibility" type="button" class="btn btn-icon settings-key-toggle" title="Tampilkan/sembunyikan password">T</button>
                </div>
                <small class="text-xs text-dim">Gunakan App Password jika 2FA aktif (Gmail: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">buat di sini</a>).</small>
              </label>

              <div class="settings-telegram-status-row" style="display:flex;align-items:center;gap:10px;margin-top:4px">
                <span id="smtp-status-indicator" class="text-xs text-dim">⏺️ Email belum dikonfigurasi</span>
              </div>

              <div class="settings-actions-row">
                <button id="test-smtp" type="button" class="btn btn-secondary settings-save-btn" disabled>Test Connection</button>
                <button id="save-smtp" type="button" class="btn btn-primary settings-save-btn">Simpan Email</button>
              </div>
            </div>

            <div class="settings-section-head mt-8">
              <h2>🔐 Keamanan Akun</h2>
              <span>Identitas perangkat, PIN akses, dan nickname akun.</span>
            </div>

            <div class="settings-openrouter-stack">
              <label class="settings-field-card" for="setting-device-id">
                <span class="settings-field-label">Device ID</span>
                <input id="setting-device-id" class="settings-text-input" type="text" readonly />
              </label>

              <label class="settings-field-card" for="setting-pin-status">
                <span class="settings-field-label">Status PIN</span>
                <input id="setting-pin-status" class="settings-text-input" type="text" readonly value="Memuat..." />
              </label>

              <div class="settings-section-head" style="margin-top:12px;margin-bottom:8px">
                <span class="settings-field-label">Atur / Ubah PIN</span>
              </div>
              <label class="settings-field-card" for="setting-pin-new">
                <span class="settings-field-label">PIN Baru</span>
                <input id="setting-pin-new" class="settings-text-input" type="password" placeholder="Masukkan 6 digit PIN" maxlength="6" inputmode="numeric" />
              </label>
              <label class="settings-field-card" for="setting-pin-confirm">
                <span class="settings-field-label">Konfirmasi PIN</span>
                <input id="setting-pin-confirm" class="settings-text-input" type="password" placeholder="Ulangi PIN" maxlength="6" inputmode="numeric" />
              </label>

              <div class="settings-actions-row">
                <span id="pin-status-text" class="text-xs text-dim mono strong settings-status-text"></span>
                <button id="save-pin" type="button" class="btn btn-primary settings-save-btn">Simpan PIN</button>
              </div>

              <div class="settings-section-head" style="margin-top:12px;margin-bottom:8px">
                <span class="settings-field-label">Nickname</span>
              </div>
              <label class="settings-field-card" for="setting-nickname">
                <span class="settings-field-label">Nama Panggilan</span>
                <input id="setting-nickname" class="settings-text-input" type="text" placeholder="Nama kamu" />
              </label>

              <div class="settings-actions-row">
                <span id="nickname-status-text" class="text-xs text-dim mono strong settings-status-text"></span>
                <button id="save-nickname" type="button" class="btn btn-primary settings-save-btn">Simpan Nickname</button>
              </div>
            </div>
          </div>

          <div class="settings-sample-data panel flex-col gap-4" style="margin-top:2rem">
            <div class="settings-section-head">
              <h2>🌱 Sample Data</h2>
              <span>Isi portfolio & watchlist dengan data contoh untuk eksplorasi fitur.</span>
            </div>
            <div class="settings-actions-row" style="gap:12px;flex-wrap:wrap">
              <button id="btn-seed-sample" type="button" class="btn btn-primary settings-save-btn" style="background:var(--green,#22c55e);border-color:var(--green,#22c55e);color:#fff">Load Sample Data</button>
              <button id="btn-seed-clear" type="button" class="btn btn-danger settings-save-btn" style="background:var(--red,#ef4444);border-color:var(--red,#ef4444);color:#fff">Clear All Data</button>
            </div>
          </div>

          <div class="settings-note-rail panel flex-col gap-4">
            <h2 class="settings-note-title"><i data-lucide="terminal" class="lucide-sm"></i> Catatan Terminal</h2>
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
    
  lucide.createIcons();
  loadDataHealth();
  loadGamification();

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
        const saved = await updateSettings(payload).catch(e => {
            console.warn('updateSettings failed', e);
            btn.disabled = false;
            btn.textContent = 'Simpan Konfigurasi';
            showToast('Gagal menyimpan konfigurasi', 'error');
            return null;
        });
        
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

    // ─── Telegram Integration ──────────────────────────
    const telegramToken = document.getElementById('setting-telegram-token');
    const telegramChatId = document.getElementById('setting-telegram-chat-id');
    const telegramStatus = document.getElementById('telegram-status-indicator');
    const testTelegramBtn = document.getElementById('test-telegram');
    const saveTelegramBtn = document.getElementById('save-telegram');

    // Token visibility toggle
    const toggleTelegramTokenBtn = document.getElementById('toggle-telegram-token-visibility');
    if (toggleTelegramTokenBtn) {
      toggleTelegramTokenBtn.addEventListener('click', () => {
        const isPassword = telegramToken.type === 'password';
        telegramToken.type = isPassword ? 'text' : 'password';
        toggleTelegramTokenBtn.textContent = isPassword ? 'S' : 'T';
        toggleTelegramTokenBtn.title = isPassword ? 'Sembunyikan token' : 'Tampilkan token';
      });
    }

    // Load Telegram config from settings
    if (settings) {
      telegramToken.value = normalizeMaskedKey(settings?.telegram_bot_token_masked);
      telegramChatId.value = settings?.telegram_chat_id_masked || '';
      updateTelegramStatus(settings);
    }

    function updateTelegramStatus(config) {
      if (!config) {
        telegramStatus.textContent = '⏺️ Telegram tidak dikonfigurasi';
        telegramStatus.style.color = '';
        testTelegramBtn.disabled = true;
        return;
      }
      if (config.telegram_configured) {
        telegramStatus.innerHTML = '🟢 <strong>Telegram terhubung</strong> — notifikasi alert aktif';
        telegramStatus.style.color = 'var(--green, #22c55e)';
        testTelegramBtn.disabled = false;
      } else if (config.telegram_has_bot_token && config.telegram_has_chat_id) {
        telegramStatus.textContent = '🟡 Token dan Chat ID terisi — tekan Test untuk verifikasi';
        telegramStatus.style.color = '';
        testTelegramBtn.disabled = false;
      } else {
        telegramStatus.textContent = '⏺️ Isi Bot Token dan Chat ID untuk mengaktifkan Telegram';
        telegramStatus.style.color = '';
        testTelegramBtn.disabled = true;
      }
    }

    // Save Telegram settings
    saveTelegramBtn.addEventListener('click', async () => {
      saveTelegramBtn.disabled = true;
      saveTelegramBtn.textContent = 'Menyimpan...';

      const payload = {
        bot_token: telegramToken.value.trim(),
        chat_id: telegramChatId.value.trim(),
      };

      try {
        const res = await fetch('/api/settings/telegram/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok) {
          telegramToken.value = normalizeMaskedKey(data?.telegram_bot_token_masked || payload.bot_token);
          telegramChatId.value = data?.telegram_chat_id_masked || payload.chat_id;
          updateTelegramStatus(data);
          showToast('Pengaturan Telegram berhasil disimpan', 'success');
        } else {
          showToast('Gagal menyimpan pengaturan Telegram', 'error');
        }
      } catch (e) {
        console.warn('saveTelegram failed', e);
        showToast('Gagal menyimpan pengaturan Telegram', 'error');
      } finally {
        saveTelegramBtn.disabled = false;
        saveTelegramBtn.textContent = 'Simpan Telegram';
      }
    });

    // Test Telegram connection
    testTelegramBtn.addEventListener('click', async () => {
      testTelegramBtn.disabled = true;
      testTelegramBtn.textContent = 'Menguji...';

      const payload = {
        bot_token: telegramToken.value.trim(),
        chat_id: telegramChatId.value.trim(),
      };

      try {
        const res = await fetch('/api/settings/telegram/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok) {
          showToast('✅ Telegram terhubung! Pesan uji telah dikirim.', 'success');
          updateTelegramStatus({ telegram_configured: true, telegram_has_bot_token: true, telegram_has_chat_id: true });
        } else {
          showToast('❌ ' + (data?.error || 'Gagal terhubung ke Telegram'), 'error');
        }
      } catch (e) {
        console.warn('testTelegram failed', e);
        showToast('Gagal menguji koneksi Telegram', 'error');
      } finally {
        testTelegramBtn.disabled = false;
        testTelegramBtn.textContent = 'Test Connection';
      }
    });

    // ─── SMTP / Email Briefing ──────────────────────────
    const smtpServer = document.getElementById('setting-smtp-server');
    const smtpPort = document.getElementById('setting-smtp-port');
    const smtpEmail = document.getElementById('setting-smtp-email');
    const smtpPassword = document.getElementById('setting-smtp-password');
    const smtpStatus = document.getElementById('smtp-status-indicator');
    const testSmtpBtn = document.getElementById('test-smtp');
    const saveSmtpBtn = document.getElementById('save-smtp');

    // Password visibility toggle
    const toggleSmtpPasswordBtn = document.getElementById('toggle-smtp-password-visibility');
    if (toggleSmtpPasswordBtn) {
      toggleSmtpPasswordBtn.addEventListener('click', () => {
        const isPassword = smtpPassword.type === 'password';
        smtpPassword.type = isPassword ? 'text' : 'password';
        toggleSmtpPasswordBtn.textContent = isPassword ? 'S' : 'T';
        toggleSmtpPasswordBtn.title = isPassword ? 'Sembunyikan password' : 'Tampilkan password';
      });
    }

    function updateSmtpStatus(config) {
      if (!config) {
        smtpStatus.textContent = '⏺️ Email belum dikonfigurasi';
        smtpStatus.style.color = '';
        testSmtpBtn.disabled = true;
        return;
      }
      if (config.smtp_configured) {
        smtpStatus.innerHTML = '🟢 <strong>Email terkonfigurasi</strong> — briefing otomatis aktif';
        smtpStatus.style.color = 'var(--green, #22c55e)';
        testSmtpBtn.disabled = false;
      } else if (config.smtp_server && config.smtp_email) {
        smtpStatus.textContent = '🟡 Server dan email terisi — tekan Test untuk verifikasi';
        smtpStatus.style.color = '';
        testSmtpBtn.disabled = false;
      } else {
        smtpStatus.textContent = '⏺️ Isi SMTP Server dan Email untuk mengaktifkan Email Briefing';
        smtpStatus.style.color = '';
        testSmtpBtn.disabled = true;
      }
    }

    // Load SMTP config
    if (settings) {
      smtpServer.value = settings?.smtp_server || '';
      smtpPort.value = settings?.smtp_port || '587';
      smtpEmail.value = settings?.smtp_email || '';
      updateSmtpStatus(settings);
    }

    // Save SMTP settings
    saveSmtpBtn.addEventListener('click', async () => {
      saveSmtpBtn.disabled = true;
      saveSmtpBtn.textContent = 'Menyimpan...';

      const payload = {
        smtp_server: smtpServer.value.trim(),
        smtp_port: smtpPort.value.trim() || '587',
        smtp_email: smtpEmail.value.trim(),
        smtp_password: smtpPassword.value.trim(),
      };

      try {
        const res = await fetch('/api/settings/smtp/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok) {
          updateSmtpStatus(data);
          smtpPassword.value = '';
          showToast('Pengaturan email berhasil disimpan', 'success');
        } else {
          showToast('Gagal menyimpan pengaturan email', 'error');
        }
      } catch (e) {
        console.warn('saveSmtp failed', e);
        showToast('Gagal menyimpan pengaturan email', 'error');
      } finally {
        saveSmtpBtn.disabled = false;
        saveSmtpBtn.textContent = 'Simpan Email';
      }
    });

    // Test SMTP connection
    testSmtpBtn.addEventListener('click', async () => {
      testSmtpBtn.disabled = true;
      testSmtpBtn.textContent = 'Menguji...';

      const payload = {
        smtp_server: smtpServer.value.trim(),
        smtp_port: smtpPort.value.trim() || '587',
        smtp_email: smtpEmail.value.trim(),
        smtp_password: smtpPassword.value.trim(),
      };

      try {
        const res = await fetch('/api/settings/smtp/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.ok) {
          showToast('✅ SMTP terhubung! Email server siap digunakan.', 'success');
          updateSmtpStatus({ smtp_configured: true, smtp_server: smtpServer.value, smtp_email: smtpEmail.value });
        } else {
          showToast('❌ ' + (data?.error || 'Gagal terhubung ke SMTP'), 'error');
        }
      } catch (e) {
        console.warn('testSmtp failed', e);
        showToast('Gagal menguji koneksi SMTP', 'error');
      } finally {
        testSmtpBtn.disabled = false;
        testSmtpBtn.textContent = 'Test Connection';
      }
    });

    // ─── 🔐 Keamanan Akun ──────────────────────────
    const deviceIdInput = document.getElementById('setting-device-id');
    const pinStatusInput = document.getElementById('setting-pin-status');
    const pinNewInput = document.getElementById('setting-pin-new');
    const pinConfirmInput = document.getElementById('setting-pin-confirm');
    const savePinBtn = document.getElementById('save-pin');
    const pinStatusText = document.getElementById('pin-status-text');
    const nicknameInput = document.getElementById('setting-nickname');
    const saveNicknameBtn = document.getElementById('save-nickname');
    const nicknameStatusText = document.getElementById('nickname-status-text');

    // Load device ID
    const rawDeviceId = getDeviceId();
    deviceIdInput.value = rawDeviceId.length > 12
      ? rawDeviceId.slice(0, 6) + '••••' + rawDeviceId.slice(-4)
      : '••••' + rawDeviceId.slice(-4);

    // Load identity data
    getMyIdentity().then(identity => {
      if (identity) {
        // PIN status
        const pinActive = identity.has_pin;
        pinStatusInput.value = pinActive ? '✅ Aktif' : '❌ Tidak aktif';

        // Nickname
        nicknameInput.value = identity.nickname || '';
      } else {
        pinStatusInput.value = '⚠️ Gagal memuat';
      }
    }).catch(() => {
      pinStatusInput.value = '⚠️ Gagal memuat';
    });

    // Save PIN
    savePinBtn.addEventListener('click', async () => {
      const newPin = pinNewInput.value.trim();
      const confirmPin = pinConfirmInput.value.trim();

      if (!newPin || !confirmPin) {
        pinStatusText.textContent = '❌ Isi kedua field PIN';
        return;
      }
      if (newPin !== confirmPin) {
        pinStatusText.textContent = '❌ PIN tidak cocok';
        return;
      }
      if (newPin.length < 4 || newPin.length > 6) {
        pinStatusText.textContent = '❌ PIN harus 4–6 digit';
        return;
      }

      savePinBtn.disabled = true;
      savePinBtn.textContent = 'Menyimpan...';

      try {
        const res = await setPin(newPin);
        if (res?.ok) {
          pinStatusText.textContent = '✅ PIN berhasil disimpan';
          pinStatusInput.value = '✅ Aktif';
          pinNewInput.value = '';
          pinConfirmInput.value = '';
          showToast('PIN berhasil disimpan', 'success');
        } else {
          pinStatusText.textContent = '❌ ' + (res?.error || 'Gagal menyimpan PIN');
          showToast('Gagal menyimpan PIN', 'error');
        }
      } catch (e) {
        console.warn('setPin failed', e);
        pinStatusText.textContent = '❌ Gagal menyimpan PIN';
        showToast('Gagal menyimpan PIN', 'error');
      } finally {
        savePinBtn.disabled = false;
        savePinBtn.textContent = 'Simpan PIN';
      }
    });

    // Save Nickname
    saveNicknameBtn.addEventListener('click', async () => {
      const name = nicknameInput.value.trim();

      if (!name) {
        nicknameStatusText.textContent = '❌ Nickname tidak boleh kosong';
        return;
      }

      saveNicknameBtn.disabled = true;
      saveNicknameBtn.textContent = 'Menyimpan...';

      try {
        const res = await updateNickname(name);
        if (res?.ok) {
          nicknameStatusText.textContent = '✅ Nickname berhasil disimpan';
          showToast('Nickname berhasil disimpan', 'success');
        } else {
          nicknameStatusText.textContent = '❌ ' + (res?.error || 'Gagal menyimpan nickname');
          showToast('Gagal menyimpan nickname', 'error');
        }
      } catch (e) {
        console.warn('updateNickname failed', e);
        nicknameStatusText.textContent = '❌ Gagal menyimpan nickname';
        showToast('Gagal menyimpan nickname', 'error');
      } finally {
        saveNicknameBtn.disabled = false;
        saveNicknameBtn.textContent = 'Simpan Nickname';
      }
    });

    // ─── Sample Data ────────────────────────────────
    const btnSeedSample = document.getElementById('btn-seed-sample');
    const btnSeedClear = document.getElementById('btn-seed-clear');

    if (btnSeedSample) {
      btnSeedSample.addEventListener('click', async () => {
        btnSeedSample.disabled = true;
        btnSeedSample.textContent = 'Memuat...';
        try {
          const res = await fetch('/api/seed/sample', { method: 'POST' });
          const data = await res.json();
          if (data?.ok) {
            showToast('Sample data loaded!', 'success');
          } else {
            showToast('Gagal memuat sample data', 'error');
          }
        } catch (e) {
          console.warn('seed sample failed', e);
          showToast('Gagal memuat sample data', 'error');
        } finally {
          btnSeedSample.disabled = false;
          btnSeedSample.textContent = 'Load Sample Data';
        }
      });
    }

    if (btnSeedClear) {
      btnSeedClear.addEventListener('click', async () => {
        btnSeedClear.disabled = true;
        btnSeedClear.textContent = 'Menghapus...';
        try {
          const res = await fetch('/api/seed/clear', { method: 'DELETE' });
          const data = await res.json();
          if (data?.ok) {
            showToast('Data cleared', 'success');
          } else {
            showToast('Gagal menghapus data', 'error');
          }
        } catch (e) {
          console.warn('seed clear failed', e);
          showToast('Gagal menghapus data', 'error');
        } finally {
          btnSeedClear.disabled = false;
          btnSeedClear.textContent = 'Clear All Data';
        }
      });
    }
}

// ─── 15.10.3 — Data Health Card ═══════════════════
async function loadDataHealth() {
  const card = document.getElementById('data-health-card');
  if (!card) return;
  try {
    const res = await fetch('/api/system/data-health');
    const data = await res.json();
    const rows = data?.data || {};
    const health = data?.health || {};
    const entries = Object.entries(rows);
    if (!entries.length) {
      card.innerHTML = '<div class="text-xs text-dim p-3">Tidak ada data</div>';
      return;
    }
    const totalOk = data?.tables_with_data || 0;
    const totalEmpty = data?.tables_empty || 0;
    const overallStatus = data?.status || 'unknown';
    const statusIcon = overallStatus === 'healthy' ? '🟢' : overallStatus === 'degraded' ? '🟡' : '🔴';

    card.innerHTML = `
      <div class="p-3" style="font-size:12px">
        <div class="flex items-center gap-2 mb-3" style="font-size:13px">
          <span>${statusIcon}</span>
          <strong>${totalOk}/${data?.total_tables || 0} tabel terisi</strong>
          ${totalEmpty > 0 ? `<span class="text-xs text-dim">(${totalEmpty} kosong)</span>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px">
          ${entries.map(([table, count]) => {
            const h = health[table];
            const icon = count > 0 ? '🟢' : h === 'empty' ? '🔴' : '⚠️';
            const label = table.replace(/_/g, ' ');
            return `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;background:var(--bg-panel);border:1px solid var(--border-subtle)">
              <span style="font-size:11px">${icon}</span>
              <span style="flex:1;text-transform:capitalize;color:var(--text-main)">${label}</span>
              <span class="mono strong" style="font-size:11px">${count != null ? count.toLocaleString('id-ID') : '?'}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="text-xs text-dim mt-2">Update: ${data?.generated_at?.slice(0, 19)?.replace('T', ' ') || '—'}</div>
      </div>`;
  } catch (e) {
    card.innerHTML = `<div class="text-xs text-dim p-3">⚠️ Gagal memuat: ${e.message || ''}</div>`;
  }
}

// ─── Gamification Card ──────────────────────────
function loadGamification() {
  const card = document.getElementById('gamification-card');
  if (!card) return;
  import('../gamification.js?v=202605120200').then(mod => {
    mod.trackLogin();
    mod.renderGamificationCard(card);
  }).catch(() => {
    card.innerHTML = '<div class="text-xs text-dim p-3">⚠️ Gagal memuat pencapaian</div>';
  });
}

