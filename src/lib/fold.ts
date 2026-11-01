/**
 * Lowercase + strip Vietnamese diacritics so search is forgiving:
 * "tri an" matches "Trị An", "song hong" matches "Sông Hồng".
 * (Same approach as the app's foldVi helper.)
 */
export function foldVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = foldVi(query.trim());
  if (!q) return true;
  const h = foldVi(haystack);
  return q.split(/\s+/).every((part) => h.includes(part));
}

/** "Thứ 7, 31/10/2026"-style ICT date label from a yyyy-mm-dd key. */
export function formatDateVi(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][
    dt.getUTCDay()
  ];
  return `${dow}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function formatDayMonthVi(yyyyMmDd: string): string {
  const [, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}`;
}
