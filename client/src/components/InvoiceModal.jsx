import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Image as ImageIcon, 
  X, 
  PlusCircle, 
  AlertCircle,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function InvoiceModal({ isOpen, onClose, openPrintTab, onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    customer_id: '',
    payment_term: '',
    terms_of_delivery: '',
    customer_po_no: '',
    part_name: '',
    no_of_pallet: '',
    no_of_box: '',
    notes: '',
    image_url: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDoc, setSubmittedDoc] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
    }
  }, [isOpen]);

  const loadMasterData = async () => {
    try {
      const [cRes, pRes, dRes, partRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payment-terms'),
        fetch('/api/delivery-terms'),
        fetch('/api/parts')
      ]);

      const [cData, pData, dData, partData] = await Promise.all([
        cRes.json(),
        pRes.json(),
        dRes.json(),
        partRes.json()
      ]);

      setCustomers(cData);
      setPaymentTerms(pData);
      setDeliveryTerms(dData);
      setParts(partData);

      if (pData.length > 0 && !formData.payment_term) {
        setFormData(prev => ({ ...prev, payment_term: pData[0].name }));
      }
      if (dData.length > 0 && !formData.terms_of_delivery) {
        setFormData(prev => ({ ...prev, terms_of_delivery: dData[0].name }));
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
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

  const handlePartChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, part_name: val }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_number.trim()) {
      alert('Mohon isi INVOICE NUMBER');
      return;
    }
    if (!formData.customer_name.trim()) {
      alert('Mohon pilih CUSTOMER NAME');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.image_url;

      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append('drawing', selectedFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          finalImageUrl = upJson.url;
        }
      }

      const postRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl
        })
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan invoice');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);

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
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedDoc(null);
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData({
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      customer_name: customers[0]?.customer_name || '',
      customer_id: customers[0]?.customer_id || '',
      payment_term: paymentTerms[0]?.name || '',
      terms_of_delivery: deliveryTerms[0]?.name || '',
      customer_po_no: '',
      part_name: '',
      no_of_pallet: '',
      no_of_box: '',
      notes: '',
      image_url: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Bar (Emerald VBA Style) */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">INVOICE FORM</h2>
              <p className="text-[11px] text-emerald-200">Form Pembuatan Faktur Tagihan (Modal Pop-up)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
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
                  className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Buka Tab PDF Lagi
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Input Baru
                </button>
              </div>
            </div>
          )}

          <form id="invoice-modal-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Row 1: Invoice Number & Date */}
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                />
              </div>
            </div>

            {/* Row 2: Customer Name & Customer ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  CUSTOMER NAME <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customer_name}
                  onChange={handleCustomerChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs bg-white cursor-pointer"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-slate-50"
                />
              </div>
            </div>

            {/* Row 3: Payment Term & Delivery Terms */}
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

            {/* Row 4: Customer PO No & Part Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  CUSTOMER PO NO
                </label>
                <input
                  type="text"
                  placeholder="Contoh: PO-AHM-2026-99"
                  value={formData.customer_po_no}
                  onChange={(e) => setFormData({ ...formData, customer_po_no: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  PART NAME & PART NO
                </label>
                <input
                  type="text"
                  list="parts-list-modal"
                  placeholder="Pilih katalog atau ketik..."
                  value={formData.part_name}
                  onChange={handlePartChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 text-xs"
                />
                <datalist id="parts-list-modal">
                  {parts.map(p => (
                    <option key={p.id} value={`${p.part_name} (${p.part_no})`} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Row 5: Pallet & Box Quantities */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  NO OF PALLETE
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.no_of_pallet}
                  onChange={(e) => setFormData({ ...formData, no_of_pallet: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  NO OF BOX
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.no_of_box}
                  onChange={(e) => setFormData({ ...formData, no_of_box: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 font-mono text-xs bg-white"
                />
              </div>
            </div>

            {/* Row 6: Add Drawing */}
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">
                    Add Drawing / File Image
                  </span>
                  <p className="text-[10px] text-slate-400">Format gambar teknis (PNG/JPG)</p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Berkas</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {previewUrl && (
                <div className="mt-3 flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                  <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                  <div className="flex-1 truncate text-xs">
                    <p className="font-semibold text-slate-800 truncate">{selectedFile?.name}</p>
                  </div>
                  <button type="button" onClick={removeImage} className="p-1 text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </form>

        </div>

        {/* Modal Footer Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            Reset Form
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
