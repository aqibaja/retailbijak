import { fetchNews } from '../api.js?v=20260505b';

export async function renderNews(root) {
    root.innerHTML = `
      <section class="news-container news-page-pro">
        <div class="news-header">
          <div class="news-header-copy">
            <div class="news-kicker">Intel Pasar</div>
            <h1>Berita Terbaru</h1>
            <p>Ringkasan berita pasar yang dibentuk menjadi kartu editorial ringkas dan mudah discan.</p>
          </div>
          <div class="news-head-meta">
            <div class="news-count-pill" id="news-count">...</div>
            <div class="news-refresh-note">Feed akan diperbarui otomatis saat sumber berubah.</div>
          </div>
        </div>
        
        <div id="news-list" class="news-grid news-grid-pro">
            <div id="news-status" class="news-status-shell">Memuat feed intel pasar...</div>
        </div>
      </section>`;

    try {
        const res = await fetchNews(20);
        const list = document.getElementById('news-list');
        const status = document.getElementById('news-status');
        
        const items = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data : [
            { title:'IHSG dan saham big cap jadi fokus investor hari ini', source:'RetailBijak', summary:'Market brief internal berbasis universe IDX.', link:'#market', published_at:new Date().toISOString() },
            { title:'Perbankan, energi, dan teknologi masuk radar rotasi sektor', source:'RetailBijak', summary:'Gunakan scanner untuk validasi momentum dan risiko.', link:'#screener', published_at:new Date().toISOString() }
        ];
        
        document.getElementById('news-count').textContent = `${items.length} ITEM INTEL`;
        status.style.display = 'none';

        list.innerHTML = items.map((n, index) => {
            const time = n.published_at ? new Date(n.published_at).toLocaleDateString() : '';
            const source = n.source || 'MARKET';
            
            let imageUrl = n.image_url || '';
            if (!imageUrl && n.summary && n.summary.includes('<img')) {
                const match = n.summary.match(/src="([^"]+)"/);
                if (match) imageUrl = match[1];
            }

            return `
                <a href="${n.link}" ${String(n.link||'').startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="news-card news-card-pro stagger-reveal ${index === 0 ? 'news-card-featured' : ''}" style="transition-delay: ${index * 0.05}s;">
                    <div class="news-image-wrap">
                        ${imageUrl ? `<img src="${imageUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : ''}
                        <div class="news-image-fallback ${imageUrl ? 'is-hidden' : ''}">
                           <i data-lucide="newspaper" style="width:48px; color:rgba(99,102,241,0.4);"></i>
                        </div>
                    </div>
                    <div class="news-content">
                        <span class="news-badge">${source}</span>
                        <h3 class="news-title">${n.title}</h3>
                        <div class="news-meta">
                            <span class="news-source">${source}</span>
                            <span class="news-dot">•</span>
                            <span>${time}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
        
        setTimeout(() => {
            document.querySelectorAll('.news-card').forEach(c => c.classList.add('is-visible'));
        }, 50);
        
    } catch (err) {
        document.getElementById('news-status').textContent = 'Gagal memuat berita: ' + err.message;
    }
}
