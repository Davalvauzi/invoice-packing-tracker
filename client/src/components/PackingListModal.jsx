import React, { useState, useEffect } from 'react';
import { 
  Package, 
  CheckCircle, 
  X, 
  PlusCircle, 
  AlertCircle, 
  Printer, 
  Copy,
  Plus,
  Trash2,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from '../context/NotificationContext';

const createEmptyPLItem = () => ({
  id: Date.now() + Math.random(),
  part_name: '',
  part_no: '',
  customer_po_no: '',
  box_qty: '',
  pallet_qty: '',
  length: '',
  width: '',
  height: '',
  unit_note: 'mm'
});

export default function PackingListModal({ isOpen, onClose, openPrintTab, onSuccess }) {
  const { showSuccess, showError, showWarning } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    customer_po_no: '',
    part_name: '',
    terms_of_delivery: '',
    box_qty: '',
    pallet_qty: '',
    length: '',
    width: '',
    height: '',
    unit_note: 'mm',
    notes: ''
  });

  // Dynamic Product Items
  const [items, setItems] = useState([createEmptyPLItem()]);

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
      loadInitialData();
    }
  }, [isOpen]);

  // Synchronize aggregate totals from items into formData
  useEffect(() => {
    const totalB = items.reduce((acc, it) => acc + (Number(it.box_qty) || 0), 0);
    const totalP = items.reduce((acc, it) => acc + (Number(it.pallet_qty) || 0), 0);
    
    // Auto-update first item's dimensions into main form for backward-compatibility
    const firstItem = items[0] || {};
    
    setFormData(prev => ({
      ...prev,
      box_qty: totalB > 0 ? String(totalB) : '',
      pallet_qty: totalP > 0 ? String(totalP) : '',
      length: firstItem.length || prev.length || '',
      width: firstItem.width || prev.width || '',
      height: firstItem.height || prev.height || '',
      unit_note: firstItem.unit_note || prev.unit_note || 'mm',
      part_name: items.length === 1 
        ? (firstItem.part_name || '') 
        : `${items.length} Items: ${items.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`
    }));
  }, [items]);

  const loadInitialData = async () => {
    try {
      const [cRes, dRes, partRes, invRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/delivery-terms'),
        fetch('/api/parts'),
        fetch('/api/invoices')
      ]);

      const [cData, dData, partData, invData] = await Promise.all([
        cRes.json(),
        dRes.json(),
        partRes.json(),
        invRes.json()
      ]);

      setCustomers(cData);
      setDeliveryTerms(dData);
      setParts(partData);
      setRecentInvoices(invData);

      if (dData.length > 0 && !formData.terms_of_delivery) {
        setFormData(prev => ({ ...prev, terms_of_delivery: dData[0].name }));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
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
        row.length = found.length ? String(found.length) : (row.length || '');
        row.width = found.width ? String(found.width) : (row.width || '');
        row.height = found.height ? String(found.height) : (row.height || '');
        row.unit_note = found.unit || row.unit_note || 'mm';
      } else {
        row.part_name = selectedVal;
      }
      updated[index] = row;
      return updated;
    });
  };

  const addItemRow = () => {
    const lastPo = items[items.length - 1]?.customer_po_no || formData.customer_po_no || '';
    const newItem = createEmptyPLItem();
    if (lastPo) newItem.customer_po_no = lastPo;
    setItems(prev => [...prev, newItem]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      showWarning('Minimal harus ada 1 produk dalam packing list');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Quick Copy & Auto-Extract from Invoice
  const copyFromInvoice = (inv) => {
    let parsedItems = null;
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      parsedItems = inv.items;
    } else if (typeof inv.items === 'string' && inv.items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(inv.items);
      } catch (e) {
        parsedItems = null;
      }
    }

    if (parsedItems && parsedItems.length > 0) {
      const mapped = parsedItems.map(it => {
        // Find dimensions from parts catalog
        const matchPart = parts.find(p => 
          (p.part_no && it.part_no && p.part_no.toLowerCase() === it.part_no.toLowerCase()) ||
          (p.part_name && it.part_name && p.part_name.toLowerCase() === it.part_name.toLowerCase())
        );

        return {
          id: it.id || (Date.now() + Math.random()),
          part_name: it.part_name || '',
          part_no: it.part_no || '',
          customer_po_no: it.customer_po_no || inv.customer_po_no || '',
          box_qty: String(it.no_of_box || it.box_qty || ''),
          pallet_qty: String(it.no_of_pallet || it.pallet_qty || ''),
          length: matchPart?.length ? String(matchPart.length) : '',
          width: matchPart?.width ? String(matchPart.width) : '',
          height: matchPart?.height ? String(matchPart.height) : '',
          unit_note: matchPart?.unit || 'mm'
        };
      });
      setItems(mapped);
    } else if (inv.part_name) {
      const matchPart = parts.find(p => 
        (p.part_name && inv.part_name && p.part_name.toLowerCase() === inv.part_name.toLowerCase())
      );
      setItems([{
        id: Date.now() + Math.random(),
        part_name: inv.part_name,
        part_no: matchPart?.part_no || '',
        customer_po_no: inv.customer_po_no || '',
        box_qty: String(inv.no_of_box || inv.box_qty || ''),
        pallet_qty: String(inv.no_of_pallet || inv.pallet_qty || ''),
        length: matchPart?.length ? String(matchPart.length) : '',
        width: matchPart?.width ? String(matchPart.width) : '',
        height: matchPart?.height ? String(matchPart.height) : '',
        unit_note: matchPart?.unit || 'mm'
      }]);
    }

    setFormData(prev => ({
      ...prev,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name,
      customer_po_no: inv.customer_po_no || '',
      terms_of_delivery: inv.terms_of_delivery || prev.terms_of_delivery || ''
    }));

    showSuccess(`Data ${parsedItems?.length ? `${parsedItems.length} produk` : ''} berhasil ditarik dari Invoice ${inv.invoice_number}!`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number.trim()) {
      showWarning('Mohon isi INVOICE NUMBER');
      return;
    }
    if (!formData.customer_name.trim()) {
      showWarning('Mohon pilih CUSTOMER NAME');
      return;
    }

    // Validate at least one item has part_name
    const hasValidItem = items.some(it => it.part_name && it.part_name.trim());
    if (!hasValidItem) {
      showWarning('Mohon isi minimal satu nama part/produk');
      return;
    }

    setIsSubmitting(true);
    try {
      const postRes = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: JSON.stringify(items)
        })
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan packing list');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);
      showSuccess('Packing List berhasil dibuat dan disimpan!');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      openPrintTab('print-packing-list', savedData.id);

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
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      customer_name: customers[0]?.customer_name || '',
      customer_po_no: '',
      part_name: '',
      terms_of_delivery: deliveryTerms[0]?.name || '',
      box_qty: '',
      pallet_qty: '',
      length: '',
      width: '',
      height: '',
      unit_note: 'mm',
      notes: ''
    });
    setItems([createEmptyPLItem()]);
  };

  if (!isOpen) return null;

  // Calculate totals for footer
  const totalBox = items.reduce((s, it) => s + (Number(it.box_qty) || 0), 0);
  const totalPallet = items.reduce((s, it) => s + (Number(it.pallet_qty) || 0), 0);
  const totalCbm = items.reduce((acc, it) => {
    const l = Number(it.length) || 0;
    const w = Number(it.width) || 0;
    const h = Number(it.height) || 0;
    const b = Number(it.box_qty) || 1;
    let vol = 0;
    if (it.unit_note === 'cm') vol = (l * w * h) / 1_000_000;
    else if (it.unit_note === 'inch') vol = (l * w * h * 0.000016387);
    else vol = (l * w * h) / 1_000_000_000; // default mm
    return acc + (vol * b);
  }, 0);

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
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">PACKING LIST FORM</h2>
              <p className="text-[11px] text-teal-200">Form Spesifikasi Pengemasan & Logistik (Multi-Product Supported)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          
          {/* Success Banner */}
          {submittedDoc && (
            <div className="bg-teal-50 border border-teal-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-teal-950">Packing List Berhasil Disimpan & Dicatat ke Data Logger!</p>
                  <p className="text-teal-700 font-mono">Ref Inv: {submittedDoc.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openPrintTab('print-packing-list', submittedDoc.id)}
                  className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Buka Tab PDF Lagi
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Input Baru
                </button>
              </div>
            </div>
          )}

          {/* Quick Copy from Recent Invoice */}
          {recentInvoices.length > 0 && !submittedDoc && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                <Copy className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="truncate">Tarik data otomatis dari Invoice yang terdaftar:</span>
              </div>
              <select 
                onChange={(e) => {
                  const inv = recentInvoices.find(i => String(i.id) === e.target.value);
                  if (inv) copyFromInvoice(inv);
                }}
                defaultValue=""
                className="text-xs font-mono py-1 px-2.5 rounded-lg border border-slate-300 bg-white cursor-pointer max-w-[240px]"
              >
                <option value="" disabled>-- Pilih Invoice --</option>
                {recentInvoices.slice(0, 10).map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.customer_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form id="packing-list-modal-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Header Details Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    INVOICE NUMBER <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: INV/2026/09/001"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 font-mono text-xs font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    INVOICE DATE <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Customer Name & Delivery Term */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    CUSTOMER NAME <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs bg-white cursor-pointer font-semibold"
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
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    TERMS OF DELIVERY
                  </label>
                  <select
                    value={formData.terms_of_delivery}
                    onChange={(e) => setFormData({ ...formData, terms_of_delivery: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs bg-white"
                  >
                    <option value="">-- Pilih Delivery Term --</option>
                    {deliveryTerms.map((term) => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Data Produk Multi-Item & Spesifikasi Kemasan (Opsi A) */}
            <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-950 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-teal-700" />
                  Daftar Produk & Dimensi Kemasan ({items.length} Item)
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Produk</span>
                </button>
              </div>

              {/* Datalist parts catalog shared across rows */}
              <datalist id="parts-list-pl-modal">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`}>
                    {p.part_name} - {p.part_no} | {p.length}x{p.width}x{p.height} {p.unit || 'mm'}
                  </option>
                ))}
              </datalist>

              {/* Item Cards List */}
              <div className="space-y-3.5">
                {items.map((item, index) => {
                  const itemL = Number(item.length) || 0;
                  const itemW = Number(item.width) || 0;
                  const itemH = Number(item.height) || 0;
                  const itemB = Number(item.box_qty) || 1;
                  let itemVol = 0;
                  if (item.unit_note === 'cm') itemVol = (itemL * itemW * itemH) / 1_000_000;
                  else if (item.unit_note === 'inch') itemVol = (itemL * itemW * itemH * 0.000016387);
                  else itemVol = (itemL * itemW * itemH) / 1_000_000_000;
                  const estCbm = itemVol * itemB;

                  return (
                    <div 
                      key={item.id || index}
                      className="bg-white rounded-xl border border-teal-200 shadow-xs p-3.5 space-y-3 relative group"
                    >
                      {/* Item Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px] tracking-wide uppercase">
                            Produk #{index + 1}
                          </span>
                          {item.part_name && (
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                              {item.part_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {estCbm > 0 && (
                            <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              Est: {estCbm.toFixed(3)} m³
                            </span>
                          )}
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                              title="Hapus baris produk ini"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span className="hidden sm:inline text-red-600">Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 1: Part Name, Part No, Cust PO No */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                            PILIH KATALOG / PART NAME *
                          </label>
                          <input
                            type="text"
                            list="parts-list-pl-modal"
                            placeholder="Pilih katalog / ketik nama part..."
                            value={item.part_name}
                            onChange={(e) => handlePartSelectForItem(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-semibold focus:border-teal-600"
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
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-teal-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                            CUST PO NO
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: PO-AHM-2026-99"
                            value={item.customer_po_no}
                            onChange={(e) => handleItemChange(index, 'customer_po_no', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-teal-600"
                          />
                        </div>
                      </div>

                      {/* Row 2: Quantities & Dimensions (Opsi A) */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            BOX QTY
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

                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            PALLET QTY
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
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            LENGTH (P)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="P"
                            value={item.length}
                            onChange={(e) => handleItemChange(index, 'length', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            WIDTH (L)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="L"
                            value={item.width}
                            onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            HEIGHT (T)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="T"
                            value={item.height}
                            onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                            SATUAN
                          </label>
                          <select
                            value={item.unit_note || 'mm'}
                            onChange={(e) => handleItemChange(index, 'unit_note', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center cursor-pointer"
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="inch">inch</option>
                            <option value="meter">meter</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Large Add Product Action Button */}
              <button
                type="button"
                onClick={addItemRow}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-600 bg-white/80 hover:bg-teal-50 text-teal-900 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Produk Ke-{items.length + 1}</span>
              </button>

              {/* Summary Bar */}
              <div className="bg-teal-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-teal-200">
                  <Box className="w-4 h-4 text-teal-300" />
                  TOTAL CARGO CARRIER:
                </div>
                <div className="flex items-center gap-4 font-mono font-bold">
                  <span>Total Box: <strong className="text-white text-sm">{totalBox}</strong></span>
                  <span>Total Pallet: <strong className="text-white text-sm">{totalPallet}</strong></span>
                  {totalCbm > 0 && (
                    <span className="bg-white/10 px-2 py-0.5 rounded text-teal-200">
                      Total CBM: <strong className="text-white text-sm">{totalCbm.toFixed(3)} m³</strong>
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CATATAN TAMBAHAN (OPSIONAL)
              </label>
              <textarea
                rows={2}
                placeholder="Instruksi penanganan kargo / nomor kontainer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs"
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
            <button
              type="submit"
              form="packing-list-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'SUBMIT & CETAK PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
