import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  CheckCircle, 
  X, 
  PlusCircle, 
  AlertCircle,
  Link as LinkIcon,
  Plus,
  Trash2,
  Package,
  Box
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from '../context/NotificationContext';

const createEmptyDOItem = () => ({
  id: Date.now() + Math.random(),
  part_name: '',
  part_no: '',
  customer_po_no: '',
  pallet_qty: '',
  box_qty: ''
});

export default function DeliveryOrderModal({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError, showWarning } = useNotification();
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

  // Dynamic Product Items
  const [items, setItems] = useState([createEmptyDOItem()]);

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

  // Synchronize aggregate totals from items into formData
  useEffect(() => {
    const totalP = items.reduce((acc, it) => acc + (Number(it.pallet_qty) || 0), 0);
    const totalB = items.reduce((acc, it) => acc + (Number(it.box_qty) || 0), 0);
    
    const firstItem = items[0] || {};
    
    setFormData(prev => ({
      ...prev,
      pallet_qty: totalP > 0 ? String(totalP) : '',
      box_qty: totalB > 0 ? String(totalB) : '',
      part_name: items.length === 1
        ? (firstItem.part_name || '')
        : `${items.length} Items: ${items.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`
    }));
  }, [items]);

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
      let parsedItems = null;
      if (Array.isArray(found.items) && found.items.length > 0) {
        parsedItems = found.items;
      } else if (typeof found.items === 'string' && found.items.trim().startsWith('[')) {
        try {
          parsedItems = JSON.parse(found.items);
        } catch (e) {
          parsedItems = null;
        }
      }

      if (parsedItems && parsedItems.length > 0) {
        const mapped = parsedItems.map(it => ({
          id: it.id || (Date.now() + Math.random()),
          part_name: it.part_name || '',
          part_no: it.part_no || '',
          customer_po_no: it.customer_po_no || found.customer_po_no || '',
          pallet_qty: String(it.no_of_pallet || it.pallet_qty || ''),
          box_qty: String(it.no_of_box || it.box_qty || '')
        }));
        setItems(mapped);
      } else if (found.part_name) {
        const matchPart = parts.find(p => p.part_name && found.part_name && p.part_name.toLowerCase() === found.part_name.toLowerCase());
        setItems([{
          id: Date.now() + Math.random(),
          part_name: found.part_name,
          part_no: matchPart?.part_no || '',
          customer_po_no: found.customer_po_no || '',
          pallet_qty: String(found.no_of_pallet || found.pallet_qty || ''),
          box_qty: String(found.no_of_box || found.box_qty || '')
        }]);
      }

      setFormData(prev => ({
        ...prev,
        invoice_number: found.invoice_number,
        customer_name: found.customer_name || prev.customer_name,
        customer_id: found.customer_id || prev.customer_id,
        customer_po_no: found.customer_po_no || prev.customer_po_no
      }));

      showSuccess(`Data ${parsedItems?.length ? `${parsedItems.length} produk` : ''} berhasil ditautkan dari Invoice ${found.invoice_number}!`);
    } else {
      setFormData(prev => ({ ...prev, invoice_number: invNum }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handlePartSelectForItem = (index, selectedVal) => {
    const found = parts.find(p => 
      p.part_name === selectedVal || 
      p.part_no === selectedVal || 
      `${p.part_name} (${p.part_no})` === selectedVal
    );

    setItems(prev => {
      const updated = [...prev];
      const row = { ...updated[index] };
      if (found) {
        row.part_name = found.part_name;
        row.part_no = found.part_no || '';
      } else {
        row.part_name = selectedVal;
      }
      updated[index] = row;
      return updated;
    });
  };

  const addItemRow = () => {
    const lastPo = items[items.length - 1]?.customer_po_no || formData.customer_po_no || '';
    const newItem = createEmptyDOItem();
    if (lastPo) newItem.customer_po_no = lastPo;
    setItems(prev => [...prev, newItem]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      showWarning('Minimal harus ada 1 part dalam surat jalan');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.do_number.trim()) {
      showWarning('Mohon isi DELIVERY ORDER NUMBER');
      return;
    }
    if (!formData.customer_name.trim()) {
      showWarning('Mohon pilih CUSTOMER NAME');
      return;
    }

    const hasValidItem = items.some(it => it.part_name && it.part_name.trim());
    if (!hasValidItem) {
      showWarning('Mohon isi minimal satu nama part/produk');
      return;
    }

    setIsSubmitting(true);
    try {
      const postRes = await fetch('/api/delivery-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: JSON.stringify(items)
        })
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan Delivery Order');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);
      showSuccess('Delivery Order berhasil dibuat dan disimpan!');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onSuccess) {
        onSuccess(savedData);
      }

    } catch (err) {
      showError('Terjadi kesalahan: ' + err.message);
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
    setItems([createEmptyDOItem()]);
  };

  if (!isOpen) return null;

  const totalPallet = items.reduce((s, it) => s + (Number(it.pallet_qty) || 0), 0);
  const totalBox = items.reduce((s, it) => s + (Number(it.box_qty) || 0), 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-5xl lg:max-w-6xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-teal-900 via-[#0b4d53] to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">DELIVERY ORDER FORM</h2>
              <p className="text-[11px] text-teal-200">Surat Jalan Pengiriman Barang Fisik (Multi-Product Supported)</p>
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
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Buat DO Baru
              </button>
            </div>
          )}

          {/* Form Container */}
          <form id="do-modal-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Link to Invoice (Enables Tree Hierarchy) */}
            {recentInvoices.length > 0 && (
              <div className="bg-teal-50/80 border border-teal-200 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-teal-900 text-xs">
                  <LinkIcon className="w-4 h-4 text-teal-700 shrink-0" />
                  <div>
                    <span className="font-bold block">Tautkan ke Invoice Induk (Tree View)</span>
                    <span className="text-[11px] text-teal-700">Pilih nomor invoice untuk mengisi otomatis data customer, PO, dan part secara instan.</span>
                  </div>
                </div>
                <select
                  value={formData.invoice_number}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-semibold text-teal-900 cursor-pointer max-w-[200px]"
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

            {/* Header Details Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-white shadow-2xs font-bold text-slate-900"
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

              {/* Row 2: Customer Name & Customer ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    CUSTOMER NAME <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customer_name}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white cursor-pointer shadow-2xs font-semibold"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.customer_name}>
                        {c.customer_name} {c.customer_id ? `(${c.customer_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                    CUSTOMER ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto / ID"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 font-mono text-xs bg-slate-100 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Data Multi-Item Part & Surat Jalan */}
            <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-950 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-teal-700" />
                  Daftar Part / Muatan Surat Jalan ({items.length} Item)
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Part</span>
                </button>
              </div>

              {/* Datalist for catalog parts */}
              <datalist id="do-parts-list">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`}>
                    {p.part_name} - {p.part_no}
                  </option>
                ))}
              </datalist>

              {/* Item Cards List */}
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div 
                    key={item.id || index}
                    className="bg-white rounded-xl border border-teal-200 shadow-xs p-3.5 space-y-3 relative group"
                  >
                    {/* Item Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] tracking-wide uppercase">
                          Part #{index + 1}
                        </span>
                        {item.part_name && (
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                            {item.part_name}
                          </span>
                        )}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                          title="Hapus baris part ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span className="hidden sm:inline text-red-600">Hapus</span>
                        </button>
                      )}
                    </div>

                    {/* Row 1: Part Name, Part No, Cust PO No */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          PILIH KATALOG / PART NAME *
                        </label>
                        <input
                          type="text"
                          list="do-parts-list"
                          placeholder="Pilih katalog / ketik nama part..."
                          value={item.part_name}
                          onChange={(e) => handlePartSelectForItem(index, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-semibold focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          PART NUMBER
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: BKT-ENG-001"
                          value={item.part_no}
                          onChange={(e) => handleItemChange(index, 'part_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-teal-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          CUSTOMER PO NO
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: PO-AHM-9910"
                          value={item.customer_po_no}
                          onChange={(e) => handleItemChange(index, 'customer_po_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-teal-700"
                        />
                      </div>
                    </div>

                    {/* Row 2: Pallet Qty & Box Qty */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          JUMLAH PALLET
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.pallet_qty}
                          onChange={(e) => handleItemChange(index, 'pallet_qty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-teal-300 bg-white font-mono text-xs font-bold text-slate-800 text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                          JUMLAH BOX
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.box_qty}
                          onChange={(e) => handleItemChange(index, 'box_qty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-teal-300 bg-white font-mono text-xs font-bold text-slate-800 text-center"
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Summary Bar */}
              <div className="bg-teal-950 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-teal-200">
                  <Box className="w-4 h-4 text-teal-300" />
                  TOTAL PENGIRIMAN SURAT JALAN:
                </div>
                <div className="flex items-center gap-6 font-mono font-bold">
                  <span>Total Pallet: <strong className="text-white text-sm">{totalPallet}</strong></span>
                  <span>Total Box: <strong className="text-white text-sm">{totalBox}</strong></span>
                </div>
              </div>

            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-800 uppercase mb-1">
                CATATAN PENGIRIMAN (OPSIONAL)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan sopir, nomor plat kendaraan, ekspedisi..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-700 text-xs bg-white shadow-2xs"
              />
            </div>

          </form>

        </div>

        {/* Modal Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
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
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="do-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'SIMPAN DELIVERY ORDER'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
