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
