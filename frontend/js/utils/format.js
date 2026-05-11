// Number formatter utilities for RetailBijak

// Number formatter - Indonesian locale
export function nf(value, decimals = 0) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toLocaleString('id-ID', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

// Percentage formatter
export function pf(value, decimals = 2) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  return (num >= 0 ? '+' : '') + num.toFixed(decimals) + '%';
}

// Compact number formatter (1000 → 1K, 1000000 → 1M)
export function cf(value) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(0);
}

// Currency formatter (IDR)
export function currencyFormat(value) {
  if (value == null || isNaN(value)) return 'Rp —';
  return 'Rp ' + Number(value).toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

// Date formatter
export function dateFormat(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Time formatter
export function timeFormat(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

// Aliases for backward compatibility
export const money = currencyFormat;
export const pct = pf;
export const fmtRp = cf;
export const fmt = nf;

// Markdown renderer (simple — bold, italic, newlines)
export function renderMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// Relative time (e.g., "2 jam lalu")
export function relativeTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return dateFormat(dateStr);
  } catch {
    return dateStr;
  }
}
