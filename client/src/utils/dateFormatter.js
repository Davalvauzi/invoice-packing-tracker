/**
 * Format tanggal ke format: DD-Bulan-YYYY (bahasa Indonesia)
 * Contoh: 2026-08-21 -> 21-Agustus-2026
 */
const ID_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export function formatIndoDate(rawDate, separator = '-') {
  if (!rawDate) return '-';
  const str = String(rawDate).trim();

  // Pola standard ISO / YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const monthNum = parseInt(ymdMatch[2], 10);
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    const monthName = ID_MONTHS[monthNum - 1] || ymdMatch[2];
    return `${day}${separator}${monthName}${separator}${year}`;
  }

  // Fallback parsing objek Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const monthName = ID_MONTHS[d.getMonth()] || String(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}${separator}${monthName}${separator}${year}`;
  }

  return str;
}
