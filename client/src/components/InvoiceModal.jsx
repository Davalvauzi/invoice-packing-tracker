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
  Truck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from '../context/NotificationContext';

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
    part_name: '',
    part_no: '',
    no_of_pallet: '',
    no_of_box: '',
    qty_per_box: '',
    total_qty: '',
    unit_price: '',
    currency: 'USD',
    total_amount: '',
    vat_rate: 0.11,
    vat_amount: '',
    grand_total: '',
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

  // Re-calculate totals when box, qty_per_box, total_qty, or unit_price changes
  useEffect(() => {
    const box = parseFloat(formData.no_of_box) || 0;
    const perBox = parseFloat(formData.qty_per_box) || 0;
    
    // Calculate total qty if box & qty_per_box provided, otherwise use current total_qty
    let computedTotalQty = formData.total_qty;
    if (box > 0 && perBox > 0) {
      computedTotalQty = String(box * perBox);
    }

    const totalQtyNum = parseFloat(computedTotalQty) || 0;
    const priceNum = parseFloat(formData.unit_price) || 0;

    const subtotal = totalQtyNum * priceNum;
    const vat = subtotal * (formData.vat_rate || 0.11);
    const grand = subtotal + vat;

    setFormData(prev => ({
      ...prev,
      total_qty: computedTotalQty,
      total_amount: subtotal > 0 ? subtotal.toFixed(2) : '',
      vat_amount: vat > 0 ? vat.toFixed(2) : '',
      grand_total: grand > 0 ? grand.toFixed(2) : ''
    }));
  }, [formData.no_of_box, formData.qty_per_box, formData.unit_price, formData.vat_rate]);

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

  const handlePartSelect = (e) => {
    const selectedVal = e.target.value;
    // Check if user selected from datalist or typed
    const found = parts.find(p => 
      p.part_name === selectedVal || 
      p.part_no === selectedVal || 
      `${p.part_name} (${p.part_no})` === selectedVal
    );

    if (found) {
      setFormData(prev => ({
        ...prev,
        part_name: found.part_name,
        part_no: found.part_no || '',
        qty_per_box: found.qty_per_box ? String(found.qty_per_box) : prev.qty_per_box,
        unit_price: (found.price !== null && found.price !== undefined) ? String(found.price) : prev.unit_price
      }));
    } else {
      setFormData(prev => ({ ...prev, part_name: selectedVal }));
    }
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

    setIsSubmitting(true);
    try {
      const postRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan invoice');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);
      showSuccess('Invoice berhasil dibuat dan disimpan!');

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
      part_name: '',
      part_no: '',
      no_of_pallet: '',
      no_of_box: '',
      qty_per_box: '',
      total_qty: '',
      unit_price: '',
      currency: 'USD',
      total_amount: '',
      vat_rate: 0.11,
      vat_amount: '',
      grand_total: '',
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

              {/* Row 4: Terms & PO No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    CUSTOMER PO NO
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PO-AHM-2026-99"
                    value={formData.customer_po_no}
                    onChange={(e) => setFormData({ ...formData, customer_po_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Data Produk & Kalkulasi Invoice (Kuning) */}
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider pb-2 border-b border-emerald-200">
                <Package className="w-4 h-4 text-emerald-700" />
                Data Produk, Jumlah Box & Harga (Perhitungan Otomatis)
              </div>

              {/* Part Name & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    PILIH DARI KATALOG PRODUK / PART NAME *
                  </label>
                  <input
                    type="text"
                    list="parts-list-invoice"
                    placeholder="Pilih katalog atau ketik nama produk..."
                    value={formData.part_name}
                    onChange={handlePartSelect}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-semibold"
                  />
                  <datalist id="parts-list-invoice">
                    {parts.map(p => (
                      <option key={p.id} value={`${p.part_name} (${p.part_no})`}>
                        {p.part_name} - {p.part_no} | {p.qty_per_box ? `${p.qty_per_box} pcs/box` : ''} | {p.price ? `$${p.price}` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    PART NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: FLG-CVR-202"
                    value={formData.part_no}
                    onChange={(e) => setFormData({ ...formData, part_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Quantities & Price Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    NO OF PALLETE
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.no_of_pallet}
                    onChange={(e) => setFormData({ ...formData, no_of_pallet: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    NO OF BOX <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 10"
                    value={formData.no_of_box}
                    onChange={(e) => setFormData({ ...formData, no_of_box: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-400 font-mono text-xs font-bold text-emerald-950 bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    QTY PER BOX (PCS)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 100"
                    value={formData.qty_per_box}
                    onChange={(e) => setFormData({ ...formData, qty_per_box: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-400 font-mono text-xs font-bold text-emerald-950 bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    TOTAL QTY (PCS)
                  </label>
                  <input
                    type="number"
                    placeholder="Auto (Box x Qty)"
                    value={formData.total_qty}
                    onChange={(e) => setFormData({ ...formData, total_qty: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold bg-slate-50 text-center"
                  />
                </div>
              </div>

              {/* Price & Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    UNIT PRICE (USD $) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="0.0000"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-emerald-400 bg-white font-mono font-bold text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Total Amount dihitung dari: Total Qty × Unit Price
                  </p>
                </div>

                {/* Calculation summary banner */}
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-3.5 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">TOTAL USD:</span>
                    <span className="font-mono font-bold">$ {formData.total_amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">VAT 11% USD:</span>
                    <span className="font-mono font-semibold text-emerald-300">$ {formData.vat_amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-700">
                    <span className="font-bold text-white uppercase">TOTAL AMOUNT USD:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">$ {formData.grand_total || '0.00'}</span>
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
