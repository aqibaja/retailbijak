import { fetchNews } from '../api.js?v=20260505f';

const NEWS_CACHE_KEY = 'retailbijak.news.cache';

function getNewsId(n, index) { return n.id || n.link || `news-${index}`; }

function generateFallbackGradient(title, source) {
  const colors = [
    ['#10b981','#059669'], ['#6366f1','#4f46e5'], ['#f59e0b','#d97706'],
    ['#ef4444','#dc2626'], ['#06b6d4','#0891b2'], ['#8b5cf6','#7c3aed'],
  ];
  const hash = (title || source || '').length % colors.length;
  const [c1, c2] = colors[hash];
  const initials = (title || 'N').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'N';
  return { c1, c2, initials };
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min || 1}m`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}j`;
  const day = Math.floor(hour / 24);
  return `${day}h`;
}

function sourceCategory(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('idx') || s.includes('pengumuman')) return 'IDX';
  if (s.includes('rss') || s.includes('feed')) return 'RSS';
  if (s.includes('retailbijak')) return 'Intel';
  return (source || 'Market').toUpperCase();
}

export async function renderNews(root) {
    root.innerHTML = `
      <section class="market-overview-page">
        <div class="market-overview-head">
          <div class="market-head-copy">
            <div class="market-row-kicker">Intel Pasar</div>
            <h1 style="font-size:clamp(24px,2.8vw,36px);letter-spacing:-.03em">Berita & Intelijen Pasar</h1>
            <p style="max-width:680px">Ringkasan berita pasar, pengumuman emiten, dan intelijen data IDX dalam satu aliran.</p>
            <div class="market-meta-rail" style="margin-top:6px">
              <div class="market-session-pill is-muted" id="news-count">Memuat...</div>
              <input type="text" id="news-search-input" class="form-input" placeholder="Cari berita berdasarkan saham (BBCA, BMRI...)" style="width:280px;height:32px;font-size:12px;padding:0 12px;background:rgba(15,23,41,.6);border:1px solid var(--border-subtle);border-radius:999px;color:var(--text-main);outline:none">
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div id="news-featured" class="market-section-group-grid" style="grid-template-columns:1.4fr 1fr;gap:18px">
            <div class="market-card market-card-hero" id="news-featured-main" style="min-height:280px">
              <div class="skeleton skeleton-card" style="height:280px"></div>
            </div>
            <div class="flex-col gap-3" id="news-featured-side">
              <div class="skeleton skeleton-card" style="height:130px"></div>
              <div class="skeleton skeleton-card" style="height:130px"></div>
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div class="market-section-group-head">
            <div class="market-section-group-title">Aliran Berita <span id="news-filter-label"></span></div>
            <p>Semua berita dan pengumuman dari berbagai sumber terintegrasi.</p>
          </div>
          <div id="news-stream" class="market-section-group-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
            <div class="skeleton skeleton-card" style="height:120px"></div>
            <div class="skeleton skeleton-card" style="height:120px"></div>
            <div class="skeleton skeleton-card" style="height:120px"></div>
            <div class="skeleton skeleton-card" style="height:120px"></div>
          </div>
        </div>
      </section>`;

    try {
        const res = await fetchNews(30);
        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data.slice(0, 30) : [];

        document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;

        if (!items.length) {
          document.querySelectorAll('[id^=news-]').forEach(el => {
            if (el.id !== 'news-count') el.innerHTML = '<div class="dashboard-widget-state" style="grid-column:1/-1"><strong class="dashboard-widget-state-title">Belum ada berita</strong><span class="dashboard-widget-state-note">Berita akan muncul setelah scheduler berjalan. Cek kembali nanti.</span></div>';
          });
          return;
        }

        // Featured: first item as hero, next 2 as side
        const hero = items[0];
        const side = items.slice(1, 3);
        const stream = items.slice(3);

        // Render featured hero
        const { c1, c2, initials } = generateFallbackGradient(hero.title, hero.source);
        document.getElementById('news-featured-main').innerHTML = `
          <a href="${hero.link}" ${String(hero.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} style="text-decoration:none;display:flex;flex-direction:column;justify-content:flex-end;height:100%;border-radius:20px;background:linear-gradient(135deg,${c1},${c2});padding:28px;position:relative;overflow:hidden">
            <div style="position:absolute;top:20px;right:20px;background:rgba(0,0,0,.3);backdrop-filter:blur(8px);border-radius:999px;padding:6px 14px;font-size:10px;font-weight:800;color:#fff;letter-spacing:.08em;text-transform:uppercase">${sourceCategory(hero.source)}</div>
            <div style="font-size:clamp(20px,2.5vw,28px);font-weight:800;color:#fff;line-height:1.2;letter-spacing:-.02em;text-shadow:0 2px 12px rgba(0,0,0,.3)">${hero.title || 'Intel Pasar'}</div>
            <div style="margin-top:10px;display:flex;gap:10px;font-size:12px;color:rgba(255,255,255,.75)"><span>${hero.source || 'Market'}</span><span>•</span><span>${relativeTime(hero.published_at)}</span></div>
          </a>`;

        // Render side featured
        document.getElementById('news-featured-side').innerHTML = side.map(n => {
          const { c1, c2 } = generateFallbackGradient(n.title, n.source);
          return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-featured-side-card" style="text-decoration:none;background:linear-gradient(135deg,${c1}22,${c2}15)">
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><span style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)">${sourceCategory(n.source)}</span><span style="font-size:9px;color:var(--text-dim)">${relativeTime(n.published_at)}</span></div>
            <strong style="font-size:12px;color:var(--text-main);line-height:1.4">${n.title || 'Intel Pasar'}</strong>
          </a>`;
        }).join('');

        // Render stream (2-column grid)
        document.getElementById('news-stream').innerHTML = stream.map((n, i) => streamCardHtml(n, i)).join('');

        // Search filter — store all items for filtering
        window.__newsAllItems = stream;
        const searchInput = document.getElementById('news-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function() {
            const q = this.value.trim().toUpperCase();
            const label = document.getElementById('news-filter-label');
            if (!q || q.length < 2) {
              // Reset to all
              document.getElementById('news-stream').innerHTML = window.__newsAllItems.map((n, i) => streamCardHtml(n, i)).join('');
              if (label) label.textContent = '';
              return;
            }
            const filtered = window.__newsAllItems.filter(n =>
              (n.title || '').toUpperCase().includes(q) ||
              (n.summary || '').toUpperCase().includes(q)
            );
            if (label) label.textContent = filtered.length ? `· filter "${this.value}" (${filtered.length})` : '· tidak ditemukan';
            document.getElementById('news-stream').innerHTML = filtered.length
              ? filtered.map((n, i) => streamCardHtml(n, i)).join('')
              : '<div class="dashboard-widget-state" style="grid-column:1/-1"><strong class="dashboard-widget-state-title">Tidak ditemukan</strong><span class="dashboard-widget-state-note">Coba kata kunci lain.</span></div>';
          });
        }

    } catch (err) {
        document.getElementById('news-count').textContent = 'GAGAL';
        const stream = document.getElementById('news-stream');
        if (stream) stream.innerHTML = `<div class="dashboard-widget-state" style="grid-column:1/-1"><strong class="dashboard-widget-state-title">Gagal memuat berita</strong><span class="dashboard-widget-state-note">${err.message || 'Coba refresh halaman.'}</span></div>`;
    }
}

function streamCardHtml(n, i) {
  const { c1, c2, initials } = generateFallbackGradient(n.title, n.source);
  const hasImage = n.image_url && n.image_url.length > 4;
  const thumbHtml = hasImage
    ? `<img src="${n.image_url}" alt="" loading="lazy" style="width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div style="display:none;min-width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${c1},${c2});align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff">${initials}</div>`
    : `<div style="min-width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff">${initials}</div>`;
  return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-card-stream" style="text-decoration:none;border-left-color:${c1}">
    ${thumbHtml}
    <div style="flex:1;min-width:0">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px"><span style="font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim)">${sourceCategory(n.source)}</span><span style="font-size:8px;color:var(--text-dim)">${relativeTime(n.published_at)}</span></div>
      <strong style="font-size:12px;color:var(--text-main);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${n.title || 'Intel Pasar'}</strong>
      ${n.summary ? `<div style="margin-top:3px;font-size:10px;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${n.summary.replace(/<[^>]*>/g,'')}</div>` : ''}
    </div>
  </a>`;
}
