import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Package } from 'lucide-react';

export default function PrintPackingList({ id, onBack }) {
  const [packingList, setPackingList] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackingList();
  }, [id]);

  const fetchPackingList = async () => {
    try {
      const res = await fetch(`/api/packing-lists/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setPackingList(data);

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
        <p className="text-slate-500 text-sm">Menyiapkan dokumen PDF Packing List...</p>
      </div>
    );
  }

  if (!packingList) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <p className="text-red-500 font-semibold">Data packing list tidak ditemukan.</p>
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs">
            Kembali
          </button>
        )}
      </div>
    );
  }

  // Calculate volume in CBM if dimensions in mm or cm
  const l = Number(packingList.length) || 0;
  const w = Number(packingList.width) || 0;
  const h = Number(packingList.height) || 0;
  const unit = packingList.unit_note || 'mm';
  
  let cbm = 0;
  if (unit === 'mm') {
    cbm = (l * w * h) / 1_000_000_000;
  } else if (unit === 'cm') {
    cbm = (l * w * h) / 1_000_000;
  } else {
    cbm = (l * w * h);
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 print:p-0 print:bg-white">
      
      {/* Floating Action Bar */}
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
            Dokumen Packing List: <strong className="text-slate-900 font-mono">{packingList.invoice_number}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
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

      {/* A4 Paper Container */}
      <div className="print-page max-w-[210mm] mx-auto bg-white shadow-2xl p-10 print:p-0 print:shadow-none min-h-[297mm] text-slate-900 font-sans">
        
        {/* Company Header */}
        <div className="border-b-2 border-teal-900 pb-5 mb-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-teal-900 text-white rounded-lg flex items-center justify-center font-black text-2xl tracking-tighter">
              GPL
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                PT. GLOBAL PRESISI LOGISTIK INDONESIA
              </h1>
              <p className="text-[11px] text-slate-600 leading-tight">
                Logistics, Industrial Packaging & Distribution Services
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Kawasan Industri MM2100 Blok C-12, Cikarang Barat, Bekasi 17530 | Telp: +62 21 8990-1234
              </p>
              <p className="text-[10px] text-slate-500">
                Email: dispatch@globalpresisi.co.id
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-teal-900 text-white text-sm font-extrabold uppercase tracking-wider rounded">
              PACKING LIST
            </span>
            <p className="text-xs font-mono font-bold text-slate-900 mt-2">
              Ref Inv: {packingList.invoice_number}
            </p>
            <p className="text-[11px] text-slate-600">
              Date: {packingList.invoice_date}
            </p>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-2 gap-6 mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          
          <div>
            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              CONSIGNEE / SHIP TO:
            </h3>
            <p className="font-extrabold text-sm text-slate-900 mb-0.5">
              {packingList.customer_name}
            </p>
            {customer && (
              <>
                <p className="text-slate-600 leading-snug mb-1">
                  {customer.address || 'Alamat Penerima Pengiriman'}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold">PIC:</span> {customer.contact_person || '-'} {customer.phone ? `(${customer.phone})` : ''}
                </p>
              </>
            )}
          </div>

          <div className="border-l border-slate-200 pl-6 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Customer PO No:</span>
              <span className="font-mono font-bold text-slate-900">{packingList.customer_po_no || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Terms of Delivery:</span>
              <span className="font-semibold text-slate-900">{packingList.terms_of_delivery || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Package Mode:</span>
              <span className="font-semibold text-slate-900">Standard Export Wooden Pallet</span>
            </div>
          </div>

        </div>

        {/* Items & Packaging Specs Table */}
        <div className="mb-6">
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-teal-950 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="border border-teal-900 px-3 py-2.5 w-10 text-center">No</th>
                <th className="border border-teal-900 px-3 py-2.5">Item Description & Part Number</th>
                <th className="border border-teal-900 px-3 py-2.5 w-20 text-center">Box Qty</th>
                <th className="border border-teal-900 px-3 py-2.5 w-20 text-center">Pallet Qty</th>
                <th className="border border-teal-900 px-3 py-2.5 w-36 text-center">Dimension (L x W x H)</th>
                <th className="border border-teal-900 px-3 py-2.5 w-24 text-right">Est. Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono">1</td>
                <td className="border border-slate-300 px-3 py-4 font-semibold text-slate-900">
                  <div className="text-sm font-bold text-slate-900">{packingList.part_name || 'Component Cargo Batch'}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">PO Ref: {packingList.customer_po_no || '-'}</div>
                </td>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono font-bold text-sm">
                  {packingList.box_qty || 0}
                </td>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono font-bold text-sm">
                  {packingList.pallet_qty || 0}
                </td>
                <td className="border border-slate-300 px-3 py-4 text-center font-mono font-semibold text-xs text-slate-800">
                  {l > 0 ? `${l} x ${w} x ${h} ${unit}` : '-'}
                </td>
                <td className="border border-slate-300 px-3 py-4 text-right font-mono text-xs text-slate-800">
                  {cbm > 0 ? `${cbm.toFixed(3)} CBM` : '-'}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-100 font-bold">
              <tr>
                <td colSpan={2} className="border border-slate-300 px-3 py-2.5 text-right uppercase">
                  TOTAL CARGO:
                </td>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-black">
                  {packingList.box_qty || 0} Box
                </td>
                <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-sm font-black">
                  {packingList.pallet_qty || 0} Pallet
                </td>
                <td colSpan={2} className="border border-slate-300 px-3 py-2.5 text-right font-mono text-xs text-slate-600">
                  {cbm > 0 ? `Total CBM: ${(cbm * (Number(packingList.box_qty) || 1)).toFixed(3)} m³` : 'Standard Package'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Drawing Section */}
        {packingList.image_url && (
          <div className="mb-6 p-4 border border-slate-300 rounded-lg">
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
              Packing Specification / Drawing Layout
            </h4>
            <div className="flex justify-center bg-slate-50 p-2 rounded">
              <img
                src={packingList.image_url}
                alt="Packing Drawing"
                className="max-h-56 object-contain rounded border border-slate-200"
              />
            </div>
          </div>
        )}

        {/* Handling Notes */}
        <div className="mb-8 p-3 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
          <p className="font-bold text-slate-800 mb-0.5">Handling & Shipping Instructions:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Keep dry and avoid direct rain/sunlight exposure during transit.</li>
            <li>Stacking limit: Maximum 2 pallets high.</li>
            <li>Handle with care: Fragile industrial parts inside.</li>
          </ul>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-4 text-center text-xs">
          <div>
            <p className="text-slate-500 mb-16">Packed By,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( Packing Operator )</p>
            <p className="text-[10px] text-slate-400">Date: {packingList.invoice_date}</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">Inspected / QC,</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( Warehouse Head )</p>
            <p className="text-[10px] text-slate-400">Date: ________________</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">Received By (Driver/Carrier),</p>
            <p className="font-bold border-t border-slate-400 pt-1 text-slate-900">( Ekspedisi / Carrier )</p>
            <p className="text-[10px] text-slate-400">Plate No: _____________</p>
          </div>
        </div>

      </div>

    </div>
  );
}
