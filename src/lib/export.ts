export function exportToCSV(columns: string[], rows: unknown[][]): void {
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [columns.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  downloadBlob(lines.join('\n'), 'query-results.csv', 'text/csv;charset=utf-8;');
}

export function exportToJSON(columns: string[], rows: unknown[][]): void {
  const data = rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
  downloadBlob(JSON.stringify(data, null, 2), 'query-results.json', 'application/json');
}

export function exportSQLToFile(sql: string, filename = 'query.sql'): void {
  downloadBlob(sql, filename, 'text/plain');
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
