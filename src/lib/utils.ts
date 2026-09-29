import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  let tableHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  tableHtml += '<head><meta charset="utf-8"/><style>th { background-color: #059669; color: white; font-weight: bold; } td, th { border: 1px solid #CBD5E1; padding: 6px 10px; font-family: sans-serif; font-size: 12px; } .text { mso-number-format:"\\@"; }</style></head><body>';
  tableHtml += '<table><thead><tr>';
  keys.forEach((k) => {
    tableHtml += `<th>${k}</th>`;
  });
  tableHtml += '</tr></thead><tbody>';
  rows.forEach((row) => {
    tableHtml += '<tr>';
    keys.forEach((k) => {
      const val = row[k] === null || row[k] === undefined ? '' : String(row[k]);
      const isText = k.toLowerCase().includes('roll') || k.toLowerCase().includes('number') || k.toLowerCase().includes('time') || k.toLowerCase().includes('status');
      tableHtml += `<td class="${isText ? 'text' : ''}">${val.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody></table></body></html>';

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

