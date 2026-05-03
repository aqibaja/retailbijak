import { fetchSettings, updateSettings, showToast } from '../api.js?v=20260503b';
import { observeElements } from '../main.js?v=20260503aa';

export async function renderSettings(root) {
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
                    <input id="setting-compact" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
                
                <label class="settings-toggle-card">
                    <div>
                        <div class="strong mb-1 text-main text-base">Pembaruan Otomatis Pemindai</div>
                        <div class="text-sm text-muted">Minta layanan lokal memperbarui sinyal institusi secara berkala saat filter berubah.</div>
                    </div>
                    <input id="setting-refresh" type="checkbox" style="width:18px; height:18px; accent-color:var(--primary-color);" />
                </label>
            </div>

            <div class="settings-actions-row">
                <span id="settings-status" class="text-xs text-dim mono strong" style="letter-spacing:0.05em;">TERSAMBUNG KE LAYANAN LOKAL</span>
                <button id="save-settings" class="btn btn-primary settings-save-btn">Simpan Konfigurasi</button>
            </div>
          </div>

          <div class="settings-note-rail panel flex-col gap-4">
            <h2 class="settings-note-title"><i data-lucide="terminal" style="width:14px;"></i> Catatan Terminal</h2>
            <div class="settings-note-stack">
                <div class="settings-note-card">
                    <strong style="color:var(--text-main)">⌘K / Ctrl+K</strong> membuka palet perintah dari mana saja untuk pencarian kode saham yang lebih cepat.
                </div>
                <div class="settings-note-card">
                    Tema menyesuaikan otomatis. Penyesuaian manual tetap tersedia di pojok kanan atas.
                </div>
                <div class="settings-note-card">
                    Hasil pemindai tertunda 15 menit kecuali ruang kerja terhubung ke aliran data lanjutan.
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
    const status = document.getElementById('settings-status');
    if (status) status.textContent = settings ? 'TERSAMBUNG KE LAYANAN LOKAL' : 'MEMAKAI PENGATURAN CADANGAN';

    if (!settings) showToast('Sedang memakai pengaturan cadangan', 'info');
    
    document.getElementById('save-settings').addEventListener('click', async () => {
        const btn = document.getElementById('save-settings');
        btn.disabled = true;
        btn.textContent = 'Sedang menyimpan...';
        
        const payload = {
            compact_table_rows: compact.checked,
            auto_refresh_screener: refresh.checked,
        };
        const saved = await updateSettings(payload);
        
        btn.disabled = false;
        btn.textContent = 'Simpan Konfigurasi';
        
        if (!saved || saved.ok !== true) {
            showToast('Konfigurasi gagal disinkronkan', 'error');
            return;
        }
        showToast('Konfigurasi berhasil disinkronkan', 'success');
    });
}
