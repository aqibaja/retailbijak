import { fetchNews } from '../api.js?v=20260506H';
import { observeElements } from '../main.js?v=20260506g';

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
    document.title = 'RetailBijak — Berita';
    root.innerHTML = `
      <section class="market-overview-page stagger-reveal">
        <div class="market-overview-head">
          <div class="market-head-copy">
            <div class="market-row-kicker">Intel Pasar</div>
            <h1 class="news-hero-title">Berita & Intelijen Pasar</h1>
            <p class="news-hero-sub">Ringkasan berita pasar, pengumuman emiten, dan intelijen data IDX dalam satu aliran.</p>
            <div class="market-meta-rail mt-10">
              <div class="market-session-pill is-muted" id="news-count">Memuat...</div>
              <div class="news-search-wrap">
                <input type="text" id="news-search-input" class="news-search" placeholder="Cari berita (BBCA, BMRI...)" />
                <button id="news-search-clear" class="news-search-clear hidden" aria-label="Hapus filter">&times;</button>
              </div>
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div id="news-featured" class="market-section-group-grid news-featured-grid">
            <div class="market-card news-featured-card" id="news-featured-main">
              <div class="skeleton skeleton-card skeleton-h-280"></div>
            </div>
            <div class="flex-col gap-3" id="news-featured-side">
              <div class="skeleton skeleton-card skeleton-h-110"></div>
              <div class="skeleton skeleton-card skeleton-h-110"></div>
            </div>
          </div>
        </div>
        <div class="market-section-group">
          <div class="market-section-group-head">
            <div class="market-section-group-title">Aliran Berita <span id="news-filter-label"></span></div>
            <p>Semua berita dan pengumuman dari berbagai sumber terintegrasi.</p>
          </div>
          <div id="news-stream" class="news-stream-grid-v2">
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
            <div class="skeleton skeleton-card skeleton-h-80"></div>
          </div>
        </div>
      </section>`;

    try {
        const res = await fetchNews(30);
        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data.slice(0, 30) : [];

        document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;

        if (!items.length) {
          document.querySelectorAll('[id^=news-]').forEach(el => {
            if (el.id !== 'news-count') el.innerHTML = '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Belum ada berita</strong><span class="dashboard-widget-state-note">Berita akan muncul setelah scheduler berjalan.</span></div>';
          });
          return;
        }

        // Featured: first item as hero, next 2 as side
        const hero = items[0];
        const side = items.slice(1, 3);
        const stream = items.slice(3);

        // Render featured hero
        const { c1, c2 } = generateFallbackGradient(hero.title, hero.source);
        const hasHeroImage = hero.image_url && hero.image_url.length > 4;
        const heroBg = hasHeroImage
          ? `background:linear-gradient(180deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.25) 50%,rgba(0,0,0,0.65) 100%),url('${hero.image_url}') center/cover`
          : `background:linear-gradient(135deg,${c1},${c2})`;
        document.getElementById('news-featured-main').innerHTML = `
          <a href="${hero.link}" ${String(hero.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-hero-card" style="${heroBg}">
            <span class="news-hero-badge">${sourceCategory(hero.source)}</span>
            <strong class="news-hero-title-text">${hero.title || 'Intel Pasar'}</strong>
            <div class="news-hero-meta"><span>${hero.source || 'Market'}</span><span>•</span><span>${relativeTime(hero.published_at)}</span></div>
          </a>`;

        // Render side featured
        document.getElementById('news-featured-side').innerHTML = side.map(n => {
          const { c1, c2 } = generateFallbackGradient(n.title, n.source);
          const hasSideImage = n.image_url && n.image_url.length > 4;
          const sideBg = hasSideImage
            ? `background:linear-gradient(180deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.15) 60%,rgba(0,0,0,0.5) 100%),url('${n.image_url}') center/cover`
            : `background:linear-gradient(135deg,${c1}22,${c2}15)`;
          return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-side-card" style="${sideBg}">
            <div class="news-side-source"><span>${sourceCategory(n.source)}</span><span>${relativeTime(n.published_at)}</span></div>
            <strong class="news-side-title">${n.title || 'Intel Pasar'}</strong>
          </a>`;
        }).join('');

        // Render stream (2-column grid)
        document.getElementById('news-stream').innerHTML = stream.map((n, i) => streamCardHtml(n, i)).join('');

        // Search filter
        window.__newsAllItems = stream;
        const searchInput = document.getElementById('news-search-input');
        const clearBtn = document.getElementById('news-search-clear');
        if (searchInput) {
          const updateClearBtn = () => {
            if (!clearBtn) return;
            const hasVal = searchInput.value.trim().length > 0;
            clearBtn.classList.toggle('hidden', !hasVal);
          };
          searchInput.addEventListener('input', function() {
            updateClearBtn();
            const q = this.value.trim().toUpperCase();
            const label = document.getElementById('news-filter-label');
            if (!q || q.length < 2) {
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
              : '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Tidak ditemukan</strong><span class="dashboard-widget-state-note">Coba kata kunci lain.</span></div>';
          });
          if (clearBtn) {
            clearBtn.addEventListener('click', function() {
              searchInput.value = '';
              searchInput.dispatchEvent(new Event('input'));
              searchInput.focus();
            });
          }
        }

        observeElements();

    } catch (err) {
        document.getElementById('news-count').textContent = 'GAGAL';
        const stream = document.getElementById('news-stream');
        if (stream) stream.innerHTML = '<div class="dashboard-widget-state grid-full"><strong class="dashboard-widget-state-title">Gagal memuat berita</strong><span class="dashboard-widget-state-note">Coba refresh halaman.</span></div>';
    }
}

function streamCardHtml(n, i) {
  const { c1, c2, initials } = generateFallbackGradient(n.title, n.source);
  const hasImage = n.image_url && n.image_url.length > 4;
  const thumbHtml = hasImage
    ? `<span class="news-stream-thumb"><img src="${n.image_url}" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.style.background=\'linear-gradient(135deg,${c1},${c2})\';this.parentElement.textContent=\'${initials}\'" /><span class="news-stream-thumb" style="display:none;background:linear-gradient(135deg,${c1},${c2})">${initials}</span></span>`
    : `<span class="news-stream-thumb" style="background:linear-gradient(135deg,${c1},${c2})">${initials}</span>`;
  return `<a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-card-stream" style="border-left-color:${c1}">
    ${thumbHtml}
    <div class="news-stream-body">
      <div class="news-stream-head"><span class="news-stream-source">${sourceCategory(n.source)}</span><span class="news-stream-time">${relativeTime(n.published_at)}</span></div>
      <strong class="news-stream-title">${n.title || 'Intel Pasar'}</strong>
      ${n.summary ? `<div class="news-stream-summary">${n.summary.replace(/<[^>]*>/g,'')}</div>` : ''}
    </div>
  </a>`;
}
