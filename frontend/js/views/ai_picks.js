import { fetchAiPicks, saveWatchlistItem, showToast } from '../api.js?v=20260503b';
import { observeElements } from '../main.js?v=20260503ab';

const nf = (n, d = 0) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: d });
const pct = (n) => `${Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

function renderReasonChips(labels = []) {
  return labels.map(label => `<span class="ai-picks-reason-chip">${label}</span>`).join('');
}

function renderFactorMeter(label, value = 0) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)));
  return `
    <div class="ai-picks-factor-meter">
      <div class="ai-picks-factor-meta"><span>${label}</span><strong>${percent}</strong></div>
      <div class="ai-picks-factor-track"><span class="ai-picks-factor-fill" style="width:${percent}%"></span></div>
    </div>`;
}

function renderMetricStrip(item) {
  return `
    <div class="ai-picks-metric-strip">
      <div class="ai-picks-metric-chip"><span>Close</span><strong>${nf(item.latest_close, 2)}</strong></div>
      <div class="ai-picks-metric-chip"><span>Change</span><strong>${pct(item.change_pct)}</strong></div>
      <div class="ai-picks-metric-chip"><span>Vol Ratio</span><strong>${nf(item.volume_ratio, 2)}x</strong></div>
      <div class="ai-picks-metric-chip"><span>Bars</span><strong>${nf(item.bars_count)}</strong></div>
    </div>`;
}

function renderCompareTray(items = []) {
  if (!items.length) {
    return `
      <div class="panel">
        <h3 class="panel-title">Compare Lite</h3>
        <div class="ai-picks-empty">Pilih kandidat untuk membandingkan score, alasan utama, dan risk note.</div>
      </div>`;
  }

  return `
    <div class="panel">
      <h3 class="panel-title">Compare Lite</h3>
      <div class="ai-picks-compare-grid">
        ${items.map(item => `
          <article class="ai-picks-compare-card">
            <div class="ai-picks-compare-head">
              <div>
                <div class="screener-kicker">${item.ticker}</div>
                <strong>${item.score}</strong>
              </div>
              <small>Conf ${item.confidence}</small>
            </div>
            ${renderMetricStrip(item)}
            <div class="ai-picks-factor-list">
              ${renderFactorMeter('Teknikal', item.factor_scores?.technical)}
              ${renderFactorMeter('Likuiditas', item.factor_scores?.liquidity)}
              ${renderFactorMeter('Fundamental', item.factor_scores?.fundamental)}
              ${renderFactorMeter('Katalis', item.factor_scores?.catalyst)}
            </div>
            <ul class="ai-picks-compare-points">
              <li>${item.comparison_points?.technical_label || '-'}</li>
              <li>${item.comparison_points?.liquidity_label || '-'}</li>
              <li>${item.comparison_points?.fundamental_label || '-'}</li>
              <li>${item.comparison_points?.catalyst_label || '-'}</li>
            </ul>
          </article>`).join('')}
      </div>
    </div>`;
}

function renderRankCard(item, mode) {
  return `
    <article class="ai-picks-rank-card panel">
      <div class="ai-picks-rank-head">
        <div>
          <div class="screener-kicker">#${item.rank} · ${item.ticker}</div>
          <h3>${item.name}</h3>
          <p>${item.fit_label}</p>
        </div>
        <div class="ai-picks-score-stack">
          <strong>${nf(item.score, 1)}</strong>
          <small>Confidence ${item.confidence}</small>
        </div>
      </div>
      ${renderMetricStrip(item)}
      <div class="ai-picks-reason-row">${renderReasonChips(item.reason_labels || [])}</div>
      <div class="ai-picks-rank-meta">
        <span>Entry ${nf(item.entry_zone)}</span>
        <span>Target ${nf(item.target_zone)}</span>
        <span>Invalidasi ${nf(item.invalidation)}</span>
      </div>
      <div class="ai-picks-factor-list">
        ${renderFactorMeter('Teknikal', item.factor_scores?.technical)}
        ${renderFactorMeter('Likuiditas', item.factor_scores?.liquidity)}
      </div>
      <div class="ai-picks-rank-actions">
        <a href="#stock/${item.ticker}" class="btn">Buka Detail</a>
        <button class="btn" data-ai-picks-compare="${item.ticker}">Bandingkan</button>
        <button class="btn btn-primary" data-ai-picks-save="${item.ticker}" data-ai-picks-mode="${mode}">Tambah ke Daftar Pantau</button>
      </div>
    </article>`;
}

async function wireQuickActions(root, mode, picks = []) {
  const compareEl = root.querySelector('#ai-picks-compare');

  root.querySelectorAll('[data-ai-picks-save]').forEach(button => {
    button.addEventListener('click', async () => {
      const ticker = button.getAttribute('data-ai-picks-save');
      if (!ticker) return;
      button.disabled = true;
      const res = await saveWatchlistItem({ ticker, notes: `Ditambahkan dari AI Picks (mode ${mode})` });
      button.disabled = false;
      if (res) showToast(`${ticker} ditambahkan ke daftar pantau.`, 'success');
      else showToast(`Gagal menambahkan ${ticker}.`, 'error');
    });
  });

  root.querySelectorAll('[data-ai-picks-compare]').forEach(button => {
    button.addEventListener('click', () => {
      const ticker = button.getAttribute('data-ai-picks-compare');
      const selected = picks.filter(item => item.ticker === ticker || item.rank <= 2).slice(0, 2);
      compareEl.innerHTML = renderCompareTray(selected);
    });
  });
}

export async function renderAiPicks(root) {
  root.innerHTML = `
    <section class="ai-picks-page stagger-reveal">
      <div class="ai-picks-hero panel">
        <div>
          <div class="screener-kicker">CURATED IDEA DESK</div>
          <h1>AI Picks</h1>
          <p>Kurasi kandidat saham berbasis ranking engine explainable dari data market, kualitas, dan katalis.</p>
        </div>
        <div class="ai-picks-mode-switch" data-ai-picks-active-mode="swing">
          <button class="btn btn-primary" data-ai-picks-mode="swing">Swing</button>
          <button class="btn" data-ai-picks-mode="defensive">Defensive</button>
          <button class="btn" data-ai-picks-mode="catalyst">Catalyst</button>
        </div>
      </div>

      <div class="ai-picks-summary-strip">
        <div class="panel ai-picks-summary-card"><span>Tone</span><strong id="ai-picks-tone">Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Universe</span><strong id="ai-picks-universe">Memuat...</strong></div>
        <div class="panel ai-picks-summary-card"><span>Update</span><strong id="ai-picks-updated">Memuat...</strong></div>
      </div>

      <div class="ai-picks-layout">
        <section class="ai-picks-featured" id="ai-picks-featured">
          <div class="ai-picks-featured-card panel">
            <div class="dashboard-widget-state">
              <strong class="dashboard-widget-state-title">Menyiapkan pick unggulan</strong>
              <span class="dashboard-widget-state-note">Menghitung score, confidence, dan kandidat teratas.</span>
            </div>
          </div>
        </section>

        <aside class="ai-picks-compare ai-picks-compare-tray" id="ai-picks-compare">
          <div class="panel">
            <h3 class="panel-title">Compare Lite</h3>
            <div class="ai-picks-empty">Pilih kandidat untuk membandingkan score, alasan utama, dan risk note.</div>
          </div>
        </aside>
      </div>

      <section class="ai-picks-ranked-list" id="ai-picks-ranked-list">
        <div class="panel ai-picks-rank-card">
          <div class="dashboard-widget-state">
            <strong class="dashboard-widget-state-title">Menarik ranked list</strong>
            <span class="dashboard-widget-state-note">Shell ini tetap hidup walau data masih dimuat.</span>
          </div>
        </div>
      </section>
    </section>`;

  observeElements();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const modeSwitch = root.querySelector('.ai-picks-mode-switch');
  const featuredEl = root.querySelector('#ai-picks-featured');
  const listEl = root.querySelector('#ai-picks-ranked-list');
  const compareEl = root.querySelector('#ai-picks-compare');
  const toneEl = root.querySelector('#ai-picks-tone');
  const universeEl = root.querySelector('#ai-picks-universe');
  const updatedEl = root.querySelector('#ai-picks-updated');

  const loadMode = async (mode = 'swing') => {
    modeSwitch.dataset.aiPicksActiveMode = mode;
    modeSwitch.querySelectorAll('[data-ai-picks-mode]').forEach(btn => {
      btn.classList.toggle('btn-primary', btn.getAttribute('data-ai-picks-mode') === mode);
    });

    const payload = await fetchAiPicks(mode, 5);
    toneEl.textContent = payload?.market_context?.breadth_label || 'data belum cukup';
    universeEl.textContent = `${payload?.summary?.eligible_count || 0} kandidat`;
    updatedEl.textContent = payload?.updated_at ? String(payload.updated_at).slice(0, 10) : 'Belum ada';

    const picks = Array.isArray(payload?.data) ? payload.data : [];
    const featured = picks[0];
    if (!featured) {
      featuredEl.innerHTML = `<div class="ai-picks-featured-card panel"><div class="ai-picks-empty">Belum ada kandidat yang cukup kuat untuk mode ini.</div></div>`;
      compareEl.innerHTML = renderCompareTray([]);
      listEl.innerHTML = `<div class="panel ai-picks-rank-card"><div class="ai-picks-empty">Ranked list akan muncul saat universe kandidat tersedia.</div></div>`;
      return;
    }

    featuredEl.innerHTML = `
      <div class="ai-picks-featured-card panel">
        <div class="ai-picks-rank-head">
          <div>
            <div class="screener-kicker">Pick Unggulan · ${featured.ticker}</div>
            <h2>${featured.name}</h2>
            <p>${featured.fit_label}</p>
          </div>
          <div class="ai-picks-score-stack">
            <strong>${nf(featured.score, 1)}</strong>
            <small>Confidence ${featured.confidence}</small>
          </div>
        </div>
        ${renderMetricStrip(featured)}
        <div class="ai-picks-reason-row">${renderReasonChips(featured.reason_labels || [])}</div>
        <div class="ai-picks-rank-meta">
          <span>Entry ${nf(featured.entry_zone)}</span>
          <span>Target ${nf(featured.target_zone)}</span>
          <span>Invalidasi ${nf(featured.invalidation)}</span>
        </div>
        <div class="ai-picks-factor-list">
          ${renderFactorMeter('Teknikal', featured.factor_scores?.technical)}
          ${renderFactorMeter('Likuiditas', featured.factor_scores?.liquidity)}
          ${renderFactorMeter('Fundamental', featured.factor_scores?.fundamental)}
          ${renderFactorMeter('Katalis', featured.factor_scores?.catalyst)}
        </div>
        <p><strong>Risiko Utama:</strong> ${featured.risk_note}</p>
        <div class="ai-picks-rank-actions">
          <a href="#stock/${featured.ticker}" class="btn">Buka Detail</a>
          <button class="btn" data-ai-picks-compare="${featured.ticker}">Bandingkan</button>
          <button class="btn btn-primary" data-ai-picks-save="${featured.ticker}" data-ai-picks-mode="${mode}">Tambah ke Daftar Pantau</button>
        </div>
      </div>`;

    compareEl.innerHTML = renderCompareTray(picks.slice(0, 2));
    listEl.innerHTML = picks.slice(1).map(item => renderRankCard(item, mode)).join('') || `<div class="panel ai-picks-rank-card"><div class="ai-picks-empty">Kandidat tambahan belum tersedia.</div></div>`;
    await wireQuickActions(root, mode, picks);
  };

  modeSwitch.querySelectorAll('[data-ai-picks-mode]').forEach(button => {
    button.addEventListener('click', () => loadMode(button.getAttribute('data-ai-picks-mode') || 'swing'));
  });

  await loadMode('swing');
}
