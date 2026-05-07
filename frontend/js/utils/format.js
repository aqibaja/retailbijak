// ─── Number Formatting Utilities ─────────────────────────
// Single source of truth for all formatting across views
// Use: import { nf, pct, money, fmt } from '../utils/format.js';

// Number format with locale id-ID
// nf(val, digits=2) → "1.234,57"
export const nf = (n, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—'
  : Number(n).toLocaleString('id-ID', { maximumFractionDigits: d });

// Percentage format
// pct(val, digits=2) → "+1,23%" or "-0,50%"
export const pct = (n, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—'
  : `${Number(n).toLocaleString('id-ID', { maximumFractionDigits: d })}%`;

// Percentage with sign (for change display)
// pf(val, digits=2) → "+1,23%" or "-0,50%"
export const pf = (n, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? '—'
  : `${Number(n) >= 0 ? '+' : ''}${Number(n).toLocaleString('id-ID', { maximumFractionDigits: d })}%`;

// Rupiah format
// money(val) → "Rp 1.234" or "Rp 7.450"
export const money = (n) =>
  n == null || Number.isNaN(Number(n)) ? '—'
  : `Rp ${Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

// Large number Rupiah format (T/Jt/M suffixes)
// fmtRp(1_500_000_000_000) → "Rp 1,5T"
export const fmtRp = (n) => {
  const abs = Math.abs(Number(n ?? 0));
  if (abs >= 1_000_000_000_000) return `Rp ${(Number(n) / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000) return `Rp ${(Number(n) / 1_000_000_000).toFixed(1)}M`;
  if (abs >= 1_000_000) return `Rp ${(Number(n) / 1_000_000).toFixed(1)}Jt`;
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
};
// fmt(val, digits=2) → "1.234,57"
export const fmt = (n, digits = 2) =>
  Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: digits });

// ─── Markdown Renderer (lightweight, no deps) ──────────────
export const renderMarkdown = (text) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
  return html;
};
