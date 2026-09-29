import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Academic years that have their own question pool and assessments
export const ACADEMIC_YEARS = [1, 2, 3, 4] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export function isAcademicYear(year: unknown): year is AcademicYear {
  return (ACADEMIC_YEARS as readonly number[]).includes(Number(year));
}

/** 2 -> "2nd", 3 -> "3rd", 4 -> "4th" */
export function ordinalYear(year: unknown): string {
  const n = Number(year);
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

/** Badge colours per academic year: 1st sky, 2nd green, 3rd indigo, 4th amber */
export function yearBadgeClasses(year: unknown): { badge: string; dot: string; activeText: string } {
  const n = Number(year);
  if (n === 1) return { badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500', activeText: 'text-sky-700' };
  if (n === 3) return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', activeText: 'text-indigo-700' };
  if (n === 4) return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', activeText: 'text-amber-700' };
  return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', activeText: 'text-emerald-700' };
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


export interface ExportSection {
  title: string;
  rows: Record<string, unknown>[];
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function csvCell(value: unknown): string {
  let cell = value === null || value === undefined ? '' : String(value);
  cell = cell.replace(/"/g, '""');
  return /("|,|\n)/.test(cell) ? `"${cell}"` : cell;
}

/** One CSV file with a titled block per section (sections with no rows are skipped). */
export function exportSectionsToCsv(filename: string, sections: ExportSection[]) {
  const blocks = sections
    .filter((s) => s.rows.length > 0)
    .map((s) => {
      const keys = Object.keys(s.rows[0]);
      return [csvCell(s.title), keys.map(csvCell).join(','), ...s.rows.map((r) => keys.map((k) => csvCell(r[k])).join(','))].join('\n');
    });
  if (blocks.length === 0) return;
  downloadBlob(`${filename}.csv`, blocks.join('\n\n'), 'text/csv;charset=utf-8;');
}

/** One Excel file with a titled table per section (sections with no rows are skipped). */
export function exportSectionsToExcel(filename: string, sections: ExportSection[]) {
  const nonEmpty = sections.filter((s) => s.rows.length > 0);
  if (nonEmpty.length === 0) return;
  const esc = (v: unknown) => (v === null || v === undefined ? '' : String(v)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"/><style>th { background-color: #059669; color: white; font-weight: bold; } td, th { border: 1px solid #CBD5E1; padding: 6px 10px; font-family: sans-serif; font-size: 12px; } .text { mso-number-format:"\\@"; } h3 { font-family: sans-serif; }</style></head><body>';
  for (const section of nonEmpty) {
    const keys = Object.keys(section.rows[0]);
    html += `<h3>${esc(section.title)}</h3><table><thead><tr>`;
    keys.forEach((k) => {
      html += `<th>${esc(k)}</th>`;
    });
    html += '</tr></thead><tbody>';
    section.rows.forEach((row) => {
      html += '<tr>';
      keys.forEach((k) => {
        const kl = k.toLowerCase();
        const isText = kl.includes('roll') || kl.includes('number') || kl.includes('time') || kl.includes('status');
        html += `<td class="${isText ? 'text' : ''}">${esc(row[k])}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table><br/>';
  }
  html += '</body></html>';
  downloadBlob(`${filename}.xls`, html, 'application/vnd.ms-excel;charset=utf-8;');
}
