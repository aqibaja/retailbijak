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
