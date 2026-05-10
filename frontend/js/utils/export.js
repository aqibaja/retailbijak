// ─── CSV Export Utility ──────────────────────────
// Fase 21.2.1 — Shared export function for all views
// Usage: exportCSV('filename.csv', ['Header1', 'Header2'], [['val1', 'val2'], ...])

export function exportCSV(filename, headers, rows) {
    if (!rows || !rows.length) {
        console.warn('CSV export: no data');
        return;
    }
    
    // BOM for Excel compatibility with Unicode
    const bom = '\uFEFF';
    
    // Build CSV content
    const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const dataLines = rows.map(row => 
        row.map(cell => {
            const str = cell == null ? '' : String(cell);
            return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
    );
    
    const csv = bom + [headerLine, ...dataLines].join('\n');
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
