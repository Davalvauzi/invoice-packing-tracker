import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  X, 
  PlusCircle, 
  AlertCircle,
  Printer,
  Calculator,
  DollarSign,
  Package,
  Building2,
  Truck,
  Plus,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from '../context/NotificationContext';

const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  part_name: '',
  part_no: '',
  customer_po_no: '',
  no_of_pallet: '',
  no_of_box: '',
  qty_per_box: '',
  total_qty: '',
  unit_price: '',
  total_amount: ''
});

export default function InvoiceModal({ isOpen, onClose, openPrintTab, onSuccess }) {
  const { showSuccess, showError, showWarning } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);
  const [settings, setSettings] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    customer_id: '',
    bill_to: '',
    ship_to: '',
    payment_term: '',
    terms_of_delivery: '',
    customer_po_no: '',
    hts_code: '8504.40.90',
    currency: 'USD',
    vat_rate: 0.11,
    vat_amount: '0.00',
    total_amount: '0.00',
    grand_total: '0.00',
    no_of_pallet: '',
    no_of_box: '',
    total_qty: '',
    notes: ''
  });

  // Dynamic Product Items
  const [items, setItems] = useState([createEmptyItem()]);

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
      loadMasterDataAndSettings();
    }
  }, [isOpen]);

  const loadMasterDataAndSettings = async () => {
    try {
      const [cRes, pRes, dRes, partRes, sRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payment-terms'),
        fetch('/api/delivery-terms'),
        fetch('/api/parts'),
        fetch('/api/settings')
      ]);

      const [cData, pData, dData, partData, sData] = await Promise.all([
        cRes.json(),
        pRes.json(),
        dRes.json(),
        partRes.json(),
        sRes.json()
      ]);

      setCustomers(cData);
      setPaymentTerms(pData);
      setDeliveryTerms(dData);
      setParts(partData);
      setSettings(sData);

      setFormData(prev => ({
        ...prev,
        payment_term: prev.payment_term || (pData[0]?.name || ''),
        terms_of_delivery: prev.terms_of_delivery || (dData[0]?.name || ''),
        hts_code: prev.hts_code || (sData?.hts_code_invoice || '8504.40.90')
      }));
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  // Re-calculate aggregate totals whenever items or vat_rate changes
  useEffect(() => {
    const totalBoxes = items.reduce((sum, item) => sum + (parseFloat(item.no_of_box) || 0), 0);
    const totalPallets = items.reduce((sum, item) => sum + (parseFloat(item.no_of_pallet) || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.total_qty) || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
    
    const vatRate = formData.vat_rate !== undefined ? parseFloat(formData.vat_rate) : 0.11;
    const vatAmount = totalAmount * vatRate;
    const grandTotal = totalAmount + vatAmount;

    setFormData(prev => ({
      ...prev,
      no_of_box: totalBoxes > 0 ? String(totalBoxes) : '',
      no_of_pallet: totalPallets > 0 ? String(totalPallets) : '',
      total_qty: totalQty > 0 ? String(totalQty) : '',
      total_amount: totalAmount > 0 ? totalAmount.toFixed(2) : '0.00',
      vat_amount: vatAmount > 0 ? vatAmount.toFixed(2) : '0.00',
      grand_total: grandTotal > 0 ? grandTotal.toFixed(2) : '0.00'
    }));
  }, [items, formData.vat_rate]);

  const handleCustomerChange = (e) => {
    const custName = e.target.value;
    const found = customers.find(c => c.customer_name === custName);
    setFormData(prev => ({
      ...prev,
      customer_name: custName,
      customer_id: found ? (found.customer_id || '') : prev.customer_id,
      bill_to: found ? (found.bill_to || found.address || '') : '',
      ship_to: found ? (found.ship_to || found.address || '') : ''
    }));
  };

  // Item row operations
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      const box = parseFloat(field === 'no_of_box' ? value : row.no_of_box) || 0;
      const perBox = parseFloat(field === 'qty_per_box' ? value : row.qty_per_box) || 0;
      
      let computedQty = row.total_qty;
      if (field === 'no_of_box' || field === 'qty_per_box') {
        if (box > 0 && perBox > 0) {
          computedQty = String(box * perBox);
        }
      } else if (field === 'total_qty') {
        computedQty = value;
      }
      row.total_qty = computedQty;

      const qtyNum = parseFloat(computedQty) || (box * perBox) || 0;
      const priceNum = parseFloat(field === 'unit_price' ? value : row.unit_price) || 0;
      const subtotal = qtyNum * priceNum;
      row.total_amount = subtotal > 0 ? subtotal.toFixed(2) : '';

      updated[index] = row;
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
        if (found.qty_per_box) row.qty_per_box = String(found.qty_per_box);
        if (found.price !== null && found.price !== undefined) row.unit_price = String(found.price);

        const box = parseFloat(row.no_of_box) || 0;
        const perBox = parseFloat(row.qty_per_box) || 0;
        if (box > 0 && perBox > 0) {
          row.total_qty = String(box * perBox);
        }
        const qtyNum = parseFloat(row.total_qty) || 0;
        const priceNum = parseFloat(row.unit_price) || 0;
        const subtotal = qtyNum * priceNum;
        row.total_amount = subtotal > 0 ? subtotal.toFixed(2) : '';
      } else {
        row.part_name = selectedVal;
      }
      updated[index] = row;
      return updated;
    });
  };

  const addItemRow = () => {
    const lastPo = items[items.length - 1]?.customer_po_no || '';
    const newItem = createEmptyItem();
    if (lastPo) newItem.customer_po_no = lastPo;
    setItems(prev => [...prev, newItem]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) {
      showWarning('Minimal harus ada 1 produk dalam invoice');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
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

    const validItems = items.filter(it => it.part_name && it.part_name.trim());
    if (validItems.length === 0) {
      showWarning('Mohon isi minimal 1 Nama Produk / Part');
      return;
    }

    for (let i = 0; i < validItems.length; i++) {
      const it = validItems[i];
      if (!it.no_of_box || parseFloat(it.no_of_box) <= 0) {
        showWarning(`Mohon isi No of Box untuk produk ke-${i + 1} (${it.part_name})`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        items: validItems,
        // Legacy flat columns fallback
        part_name: validItems.length === 1 
          ? validItems[0].part_name 
          : `${validItems.length} Items: ${validItems.map(i => i.part_name).slice(0, 3).join(', ')}${validItems.length > 3 ? '...' : ''}`,
        part_no: validItems[0]?.part_no || '',
        unit_price: validItems[0]?.unit_price || 0,
        qty_per_box: validItems[0]?.qty_per_box || 0,
        customer_po_no: formData.customer_po_no || validItems.map(i => i.customer_po_no).filter(Boolean).join(', ')
      };

      const postRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan invoice');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);
      showSuccess(`Invoice berhasil dibuat dengan ${validItems.length} item produk!`);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Buka otomatis tab baru PDF
      openPrintTab('print-invoice', savedData.id);

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
    setItems([createEmptyItem()]);
    setFormData({
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      customer_name: customers[0]?.customer_name || '',
      customer_id: customers[0]?.customer_id || '',
      bill_to: customers[0]?.bill_to || customers[0]?.address || '',
      ship_to: customers[0]?.ship_to || customers[0]?.address || '',
      payment_term: paymentTerms[0]?.name || '',
      terms_of_delivery: deliveryTerms[0]?.name || '',
      customer_po_no: '',
      hts_code: settings?.hts_code_invoice || '8504.40.90',
      currency: 'USD',
      vat_rate: 0.11,
      vat_amount: '0.00',
      total_amount: '0.00',
      grand_total: '0.00',
      no_of_pallet: '',
      no_of_box: '',
      total_qty: '',
      notes: ''
    });
  };

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-5xl lg:max-w-6xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Bar */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">INVOICE FORM</h2>
              <p className="text-[11px] text-emerald-200">Form Pembuatan Faktur Tagihan Sesuai Format Resmi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Scrollable Form */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          
          {/* Success Banner if submitted */}
          {submittedDoc && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">Invoice Berhasil Disimpan & Dicatat ke Data Logger!</p>
                  <p className="text-emerald-700 font-mono">No: {submittedDoc.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => openPrintTab('print-invoice', submittedDoc.id)}
                  className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 flex items-center gap-1 cursor-pointer"
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

          <form id="invoice-modal-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
            
            {/* Section 1: Dokumen & Customer (Hijau & Biru) */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                <FileText className="w-4 h-4 text-emerald-700" />
                Informasi Dokumen & Customer
              </div>

              {/* Row 1: Invoice Number, Date, HTS Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs font-bold text-slate-900 bg-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    HTS CODE (INVOICE)
                  </label>
                  <input
                    type="text"
                    placeholder="8504.40.90"
                    value={formData.hts_code}
                    onChange={(e) => setFormData({ ...formData, hts_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Customer Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    CUSTOMER NAME <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.customer_name}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white cursor-pointer font-semibold"
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
                    CUSTOMER ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto / ID"
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-slate-100"
                  />
                </div>
              </div>

              {/* Row 3: Bill To & Ship To Addresses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    BILL TO (Alamat Penagihan Invoice)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alamat penagihan customer..."
                    value={formData.bill_to}
                    onChange={(e) => setFormData({ ...formData, bill_to: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    SHIP TO (Alamat Pengiriman Barang)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alamat tujuan pengiriman fisik..."
                    value={formData.ship_to}
                    onChange={(e) => setFormData({ ...formData, ship_to: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Row 4: Terms of Payment & Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    PAYMENT TERM
                  </label>
                  <select
                    value={formData.payment_term}
                    onChange={(e) => setFormData({ ...formData, payment_term: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white"
                  >
                    <option value="">-- Pilih Payment Term --</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.name}>{term.name}</option>
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white"
                  >
                    <option value="">-- Pilih Delivery Term --</option>
                    {deliveryTerms.map((term) => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Data Produk Multi-Item & Kalkulasi Invoice */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-emerald-700" />
                  Daftar Produk & Part Tagihan ({items.length} Item)
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Produk</span>
                </button>
              </div>

              {/* Datalist parts catalog shared across rows */}
              <datalist id="parts-list-invoice">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`}>
                    {p.part_name} - {p.part_no} | {p.qty_per_box ? `${p.qty_per_box} pcs/box` : ''} | {p.price ? `$${p.price}` : ''}
                  </option>
                ))}
              </datalist>

              {/* Item Cards List */}
              <div className="space-y-3.5">
                {items.map((item, index) => (
                  <div 
                    key={item.id || index}
                    className="bg-white rounded-xl border border-emerald-200 shadow-xs p-3.5 space-y-3 relative group"
                  >
                    {/* Item Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] tracking-wide uppercase">
                          Produk #{index + 1}
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
                          title="Hapus baris produk ini"
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
                          PILIH DARI KATALOG / PART NAME *
                        </label>
                        <input
                          type="text"
                          list="parts-list-invoice"
                          placeholder="Pilih katalog / ketik nama part..."
                          value={item.part_name}
                          onChange={(e) => handlePartSelectForItem(index, e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs font-semibold focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          PART NUMBER
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: FLG-CVR-202"
                          value={item.part_no}
                          onChange={(e) => handleItemChange(index, 'part_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          CUST PO NO
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: 726890 - 1 - 22"
                          value={item.customer_po_no}
                          onChange={(e) => handleItemChange(index, 'customer_po_no', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Row 2: Quantities, Price & Subtotal */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          PALLET
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.no_of_pallet}
                          onChange={(e) => handleItemChange(index, 'no_of_pallet', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          BOX <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={item.no_of_box}
                          onChange={(e) => handleItemChange(index, 'no_of_box', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-emerald-400 font-mono text-xs font-bold text-emerald-950 bg-white text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          QTY / BOX
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Pcs"
                          value={item.qty_per_box}
                          onChange={(e) => handleItemChange(index, 'qty_per_box', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-emerald-400 font-mono text-xs font-bold text-emerald-950 bg-white text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          TOTAL QTY
                        </label>
                        <input
                          type="number"
                          placeholder="Auto"
                          value={item.total_qty}
                          onChange={(e) => handleItemChange(index, 'total_qty', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold bg-slate-50 text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          UNIT PRICE ($)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-400 font-bold text-[10px]">$</span>
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full pl-5 pr-1.5 py-1.5 rounded-lg border border-emerald-400 bg-white font-mono font-bold text-xs text-right"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          SUBTOTAL ($)
                        </label>
                        <div className="px-2 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-mono font-bold text-xs text-emerald-900 text-right">
                          ${item.total_amount || '0.00'}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add Item Action Button */}
              <button
                type="button"
                onClick={addItemRow}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-white/70 hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Produk Ke-{items.length + 1}</span>
              </button>

              {/* Grand Totals Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-4 rounded-xl shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1 text-xs">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
                    Ringkasan Muatan & Kargo
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-300">ITEMS</div>
                      <div className="text-base font-black text-white">{items.length}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-300">TOTAL BOX</div>
                      <div className="text-base font-black text-emerald-300">{formData.no_of_box || '0'}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-slate-300">TOTAL PALLET</div>
                      <div className="text-base font-black text-white">{formData.no_of_pallet || '0'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-700 sm:pl-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">SUBTOTAL (TOTAL USD):</span>
                    <span className="font-mono font-bold">$ {formData.total_amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">VAT 11% USD:</span>
                    <span className="font-mono font-semibold text-emerald-300">$ {formData.vat_amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-slate-700">
                    <span className="font-bold text-white uppercase">TOTAL AMOUNT USD:</span>
                    <span className="font-mono font-black text-emerald-400 text-base">$ {formData.grand_total || '0.00'}</span>
                  </div>
                </div>
              </div>

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
              form="invoice-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 cursor-pointer"
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
