import React, { useState, useEffect } from 'react';
import { Printer, X, Download, ArrowLeft, Building2 } from 'lucide-react';

export default function PrintInvoice({ id, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setInvoice(data);

      // Fetch customer details if available
      if (data.customer_name) {
        const cRes = await fetch('/api/customers');
        const cList = await cRes.json();
        const found = cList.find(c => c.customer_name === data.customer_name);
        if (found) setCustomer(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Menyiapkan dokumen PDF Invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <p className="text-red-500 font-semibold">Data invoice tidak ditemukan.</p>
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs">
            Kembali
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 print:p-0 print:bg-white">
      
      {/* Floating Action Bar (Hidden when printing) */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 bg-white p-4 rounded-xl shadow-md border border-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          )}
          <span className="text-xs text-slate-600 font-medium">
            Dokumen: <strong className="text-slate-900 font-mono">{invoice.invoice_number}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF (A4)</span>
          </button>
          <button
            onClick={() => window.close()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* A4 Paper Document Container */}
      <div className="print-page max-w-[210mm] mx-auto bg-white shadow-2xl p-10 print:p-0 print:shadow-none min-h-[297mm] text-slate-900 font-sans">
        
        {/* Company Header (Standard Corporate) */}
        <div className="border-b-2 border-emerald-900 pb-5 mb-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-emerald-900 text-white rounded-lg flex items-center justify-center font-black text-2xl tracking-tighter">
              GPL
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                PT. GLOBAL PRESISI LOGISTIK INDONESIA
              </h1>
              <p className="text-[11px] text-slate-600 leading-tight">
                Industrial Component Manufacturing, Stamping & Precision Assembly
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Kawasan Industri MM2100 Blok C-12, Cikarang Barat, Bekasi 17530 | Telp: +62 21 8990-1234
              </p>
              <p className="text-[10px] text-slate-500">
                Email: billing@globalpresisi.co.id | NPWP: 01.455.789.2-413.000
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-emerald-900 text-white text-sm font-extrabold uppercase tracking-wider rounded">
              COMMERCIAL INVOICE
            </span>
            <p className="text-xs font-mono font-bold text-slate-900 mt-2">
              No: {invoice.invoice_number}
            </p>
            <p className="text-[11px] text-slate-600">
              Date: {invoice.invoice_date}
            </p>
          </div>
        </div>

        {/* Metadata Details (Bill To vs Invoice Info) */}
        <div className="grid grid-cols-2 gap-6 mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          
          {/* Bill To */}
          <div>
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              BILLED TO:
            </h3>
            <p className="font-extrabold text-sm text-slate-900 mb-0.5">
              {invoice.customer_name}
            </p>
            {customer && (
              <>
                <p className="text-slate-600 leading-snug mb-1">
                  {customer.address || 'Alamat Perusahaan Terdaftar'}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold">Attn:</span> {customer.contact_person || '-'} {customer.phone ? `(${customer.phone})` : ''}
                </p>
              </>
            )}
            <p className="font-mono text-slate-500 mt-1">
              Customer ID: {invoice.customer_id || '-'}
            </p>
          </div>

          {/* Shipping & Payment Meta */}
          <div className="border-l border-slate-200 pl-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Customer PO No:</span>
              <span className="font-mono font-bold text-slate-900">{invoice.customer_po_no || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Payment Term:</span>
              <span className="font-semibold text-slate-900">{invoice.payment_term || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Terms of Delivery:</span>
              <span className="font-semibold text-slate-900">{invoice.terms_of_delivery || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Currency:</span>
              <span className="font-mono text-slate-900">IDR / USD</span>
            </div>
          </div>

        </div>

        {/* Table Item Details */}
        <div className="mb-6">
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-emerald-950 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="border border-emerald-900 px-3 py-2.5 w-12 text-center">No</th>
                <th className="border border-emerald-900 px-3 py-2.5">Description of Goods / Part Specification</th>
                <th className="border border-emerald-900 px-3 py-2.5 w-24 text-center">Box Qty</th>
                <th className="border border-emerald-900 px-3 py-2.5 w-24 text-center">Pallet Qty</th>
                <th className="border border-emerald-900 px-3 py-2.5 w-28 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono">1</td>
                <td className="border border-slate-300 px-3 py-4 font-semibold text-slate-900">
                  <div className="text-sm font-bold text-slate-900">{invoice.part_name || 'Industrial Manufactured Component'}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">PO Ref: {invoice.customer_po_no || '-'}</div>
                </td>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono font-bold text-sm">
                  {invoice.no_of_box || 0}
                </td>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono font-bold text-sm">
                  {invoice.no_of_pallet || 0}
                </td>
                <td className="border border-slate-300 px-3 py-4 text-right text-slate-600">
                  Good Order
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-100 font-bold">
              <tr>
                <td colSpan={2} className="border border-slate-300 px-3 py-2.5 text-right uppercase">
                  TOTAL QUANTITY:
                </td>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-black">
                  {invoice.no_of_box || 0} Box
                </td>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-black">
                  {invoice.no_of_pallet || 0} Pallet
                </td>
                <td className="border border-slate-300 px-3 py-2.5"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Technical Drawing Attachment Section if exists */}
        {invoice.image_url && (
          <div className="mb-6 p-4 border border-slate-300 rounded-lg">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Part Drawing / Technical Attachment
            </h4>
            <div className="flex justify-center bg-slate-50 p-2 rounded">
              <img
                src={invoice.image_url}
                alt="Technical Drawing"
                className="max-h-56 object-contain rounded border border-slate-200"
              />
            </div>
          </div>
        )}

        {/* Notes & Bank Details */}
        <div className="mb-8 p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          <p className="font-bold text-slate-800 mb-0.5">Payment Instructions / Bank Transfer:</p>
          <p>Bank Mandiri (Cabang Cikarang MM2100) - A/C: <strong>156-00-128490-1</strong> a/n PT Global Presisi Logistik</p>
          <p>BCA (KCU Cikarang) - A/C: <strong>789-012-3456</strong> a/n PT Global Presisi Logistik</p>
        </div>

        {/* Signatures & Stamp Block */}
        <div className="grid grid-cols-3 gap-6 pt-4 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Prepared By,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( Admin Logistik )</p>
            <p className="text-[10px] text-slate-400">Date: {invoice.invoice_date}</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">Warehouse Checked,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( QC / Supervisor )</p>
            <p className="text-[10px] text-slate-400">Date: ________________</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">Authorized Signature,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( Finance Director )</p>
            <p className="text-[10px] text-slate-400">Company Stamp</p>
          </div>
        </div>

      </div>

    </div>
  );
}
