/**
 * client/src/utils/formatters.js
 * Utilitas pemformatan string, angka, dan penamaan dokumen cetak
 */

/**
 * Membersihkan nomor dokumen agar aman dijadikan judul halaman / nama default saat print PDF
 * Mengganti karakter terlarang file path (/ \ ? % * : | " < >) dan spasi berlebih menjadi hyphen (-).
 *
 * @param {string|number} code - Nomor dokumen (misal: "INV/2026/09/001")
 * @param {string} prefix - Prefix dokumen (misal: "invoice", "packing-list", "delivery-order")
 * @returns {string} Judul dokumen yang sudah bersih (misal: "invoice-INV-2026-09-001")
 */
export function sanitizeDocumentTitle(code, prefix = 'doc') {
  if (!code) return prefix;
  const cleanCode = String(code)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleanCode ? `${prefix}-${cleanCode}` : prefix;
}
