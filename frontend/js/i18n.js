export const translations = {
    en: {
        'dashboard': 'Dashboard',
        'scanner': 'Scanner',
        'market': 'Market',
        'portfolio': 'Portfolio',
        'news': 'Intelligence',
        'settings': 'Settings',
        'market_overview': 'Market Overview',
        'current_holdings': 'Current Holdings',
        'my_watchlist': 'My Watchlist',
        'search_placeholder': 'Search ticker, company, or sector... (Esc to close)',
        'workspace_controls': 'Workspace Controls',
        'interface_engine': 'Interface Engine',
        'terminal_notes': 'Terminal Notes'
    },
    id: {
        'dashboard': 'Dasbor',
        'scanner': 'Pemindai',
        'market': 'Pasar',
        'portfolio': 'Portofolio',
        'news': 'Berita',
        'settings': 'Pengaturan',
        'market_overview': 'Ringkasan Pasar',
        'current_holdings': 'Kepemilikan Saat Ini',
        'my_watchlist': 'Daftar Pantau',
        'search_placeholder': 'Cari ticker, perusahaan, atau sektor... (Esc tutup)',
        'workspace_controls': 'Kontrol Ruang Kerja',
        'interface_engine': 'Mesin Antarmuka',
        'terminal_notes': 'Catatan Terminal'
    }
};

export function setLanguage(lang) {
    localStorage.setItem('retail-lang', lang);
    applyTranslations();
}

export function applyTranslations() {
    const lang = localStorage.getItem('retail-lang') || 'en';
    const dict = translations[lang] || translations.en;
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = dict[key];
            } else {
                // Ensure we don't wipe out icons, only update text nodes if needed
                // If it's just text, direct assignment works
                el.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
                        node.nodeValue = dict[key];
                    }
                });
                if (el.childNodes.length === 0) el.textContent = dict[key];
            }
        }
    });
}

export function initI18n() {
    applyTranslations();
}
