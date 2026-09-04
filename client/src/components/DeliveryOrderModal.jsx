import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle, 
  X, 
  PlusCircle, 
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DeliveryOrderModal({ isOpen, onClose, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [parts, setParts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    do_number: '',
    do_date: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    customer_name: '',
    customer_id: '',
    customer_po_no: '',
    part_name: '',
    pallet_qty: '',
    box_qty: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDoc, setSubmittedDoc] = useState(null);

  // Disable body scroll & listen for Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [cRes, partRes, invRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/parts'),
        fetch('/api/invoices')
      ]);

      const [cData, partData, invData] = await Promise.all([
        cRes.json(),
        partRes.json(),
        invRes.json()
      ]);

      setCustomers(cData);
      setParts(partData);
      setRecentInvoices(invData);
    } catch (err) {
      console.error('Failed to load master data for Delivery Order:', err);
    }
  };

  const handleCustomerChange = (e) => {
    const custName = e.target.value;
    const found = customers.find(c => c.customer_name === custName);
    setFormData(prev => ({
      ...prev,
      customer_name: custName,
      customer_id: found ? (found.customer_id || '') : prev.customer_id
    }));
  };

  const handleInvoiceSelect = (invNum) => {
    const found = recentInvoices.find(i => i.invoice_number === invNum);
    if (found) {
      setFormData(prev => ({
        ...prev,
        invoice_number: found.invoice_number,
        customer_name: found.customer_name || prev.customer_name,
        customer_id: found.customer_id || prev.customer_id,
        customer_po_no: found.customer_po_no || prev.customer_po_no,
        part_name: found.part_name || prev.part_name,
        box_qty: found.no_of_box || prev.box_qty,
        pallet_qty: found.no_of_pallet || prev.pallet_qty
      }));
    } else {
      setFormData(prev => ({ ...prev, invoice_number: invNum }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.do_number.trim()) {
      alert('Mohon isi DELIVERY ORDER NUMBER');
      return;
    }
    if (!formData.customer_name.trim()) {
      alert('Mohon pilih CUSTOMER NAME');
      return;
    }

    setIsSubmitting(true);
    try {
      const postRes = await fetch('/api/delivery-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan Delivery Order');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onSuccess) {
        onSuccess(savedData);
      }

    } catch (err) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedDoc(null);
    setFormData({
      do_number: '',
      do_date: new Date().toISOString().slice(0, 10),
      invoice_number: '',
      customer_name: customers[0]?.customer_name || '',
      customer_id: customers[0]?.customer_id || '',
      customer_po_no: '',
      part_name: '',
      pallet_qty: '',
      box_qty: '',
      notes: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Bar (VBA Dark Teal Header with Close Button) */}
        <div className="bg-[#0b4d53] px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">DELIVERY ORDER FORM</h2>
              <p className="text-[11px] text-teal-200">Surat Jalan Pengiriman Barang Fisik (Modal Pop-up)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Scrollable Form */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1 bg-slate-100/50">
          
          {/* Success Banner if submitted */}
          {submittedDoc && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Delivery Order Berhasil Disimpan & Dicatat!</p>
                  <p className="text-emerald-700">No. DO: <span className="font-mono font-semibold">{submittedDoc.do_number}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold"
              >
                Buat DO Baru
              </button>
            </div>
          )}

          {/* Form Container (Clean Windows VBA style form box) */}
          <form id="do-modal-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Link to Invoice (Enables Tree Hierarchy) */}
            {recentInvoices.length > 0 && (
              <div className="bg-teal-50/80 border border-teal-200 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-teal-900 text-xs">
                  <LinkIcon className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <span className="font-bold block">Tautkan ke Invoice Induk (Tree View)</span>
                    <span className="text-[11px] text-teal-700">Pilih nomor invoice untuk mengisi otomatis data customer, PO, dan part.</span>
                  </div>
                </div>
                <select
                  value={formData.invoice_number}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-semibold text-teal-900 cursor-pointer max-w-[180px]"
                >
                  <option value="">-- Pilih Invoice --</option>
                  {recentInvoices.map((inv) => (
                    <option key={inv.id} value={inv.invoice_number}>
                      {inv.invoice_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Row 1: Delivery Order Number & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  DELIVERY ORDER NUMBER <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: DO-2026-001"
                  value={formData.do_number}
                  onChange={(e) => setFormData({ ...formData, do_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-white shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  DELIVERY ORDER DATE <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.do_date}
                  onChange={(e) => setFormData({ ...formData, do_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white shadow-2xs"
                />
              </div>
            </div>

            {/* Row 2: Customer Name */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                CUSTOMER NAME <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_name}
                onChange={handleCustomerChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white cursor-pointer shadow-2xs"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.customer_name}>
                    {c.customer_name} {c.customer_id ? `(${c.customer_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Part Name & Part No */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                PART NAME & PART NO
              </label>
              <input
                type="text"
                list="do-parts-list"
                placeholder="Pilih katalog atau ketik nama part..."
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white shadow-2xs"
              />
              <datalist id="do-parts-list">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`} />
                ))}
              </datalist>
            </div>

            {/* Row 4: Customer PO Number */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                CUSTOMER PO NUMBER
              </label>
              <input
                type="text"
                placeholder="Contoh: PO-AHM-9910"
                value={formData.customer_po_no}
                onChange={(e) => setFormData({ ...formData, customer_po_no: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-white shadow-2xs"
              />
            </div>

            {/* Row 5: Total Pallet & Total Box */}
            <div className="grid grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  TOTAL PALLET
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.pallet_qty}
                  onChange={(e) => setFormData({ ...formData, pallet_qty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                  TOTAL BOX
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.box_qty}
                  onChange={(e) => setFormData({ ...formData, box_qty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-white"
                />
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 uppercase mb-1">
                Catatan Ekspedisi / No Polisi Truk (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Truk B 1234 CD / Supir: Pak Joko"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white"
              />
            </div>

          </form>

        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Reset Form
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Tutup
            </button>
            {/* SUBMIT Button matching the blue VBA style in screenshot */}
            <button
              type="submit"
              form="do-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center min-w-[120px] px-6 py-2 bg-[#0070c0] hover:bg-[#005a9e] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase shadow-md disabled:opacity-50 cursor-pointer transition-all active:scale-95"
            >
              <span>{isSubmitting ? 'Menyimpan...' : 'SUBMIT'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
