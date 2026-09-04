import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  PlusCircle, 
  AlertCircle,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function InvoiceForm({ setActiveView, openPrintTab }) {
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
    loadMasterData();
  }, []);

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

      // Default selections if available
      if (pData.length > 0) setFormData(prev => ({ ...prev, payment_term: pData[0].name }));
      if (dData.length > 0) setFormData(prev => ({ ...prev, terms_of_delivery: dData[0].name }));
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

      // Upload image if selected
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

      // Save Invoice
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

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Buka otomatis ke tab baru PDF sesuai instruksi user
      openPrintTab('print-invoice', savedData.id);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Menu
        </button>
        <button
          onClick={() => setActiveView('master-data')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Kelola Master Data (Customer & Terms)
        </button>
      </div>

      {/* Success Modal / Banner */}
      {submittedDoc && (
        <div className="mb-8 bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Invoice Berhasil Disimpan & Dicatat ke Data Logger!
                </h3>
                <p className="text-xs text-emerald-800">
                  Nomor: <span className="font-mono font-bold">{submittedDoc.invoice_number}</span> | Customer: {submittedDoc.customer_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => openPrintTab('print-invoice', submittedDoc.id)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                Buka Tab PDF Lagi
              </button>
              <button
                onClick={resetForm}
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Input Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Form Header Bar (Gaya Excel VBA Hijau Tua) */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-wide uppercase">INVOICE FORM</h2>
              <p className="text-[11px] text-emerald-200">Form Pembuatan Faktur Tagihan & Pengiriman</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-700/60 px-2.5 py-1 rounded font-mono">
            ID: {formData.invoice_number || 'INV-DRAFT'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Row 1: Invoice Number & Invoice Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                INVOICE NUMBER <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: INV/2026/09/001"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 font-mono text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                INVOICE DATE <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm transition-all"
              />
            </div>
          </div>

          {/* Row 2: Customer Name & Customer ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                CUSTOMER NAME <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.customer_name}
                  onChange={handleCustomerChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.customer_name}>
                      {c.customer_name} {c.customer_id ? `(${c.customer_id})` : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                CUSTOMER ID
              </label>
              <input
                type="text"
                placeholder="Auto / Input ID"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 font-mono text-sm bg-slate-50 transition-all"
              />
            </div>
          </div>

          {/* Row 3: Payment Term & Terms of Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                PAYMENT TERM
              </label>
              <select
                value={formData.payment_term}
                onChange={(e) => setFormData({ ...formData, payment_term: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm bg-white transition-all"
              >
                <option value="">-- Pilih Payment Term --</option>
                {paymentTerms.map((term) => (
                  <option key={term.id} value={term.name}>{term.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                TERMS OF DELIVERY
              </label>
              <select
                value={formData.terms_of_delivery}
                onChange={(e) => setFormData({ ...formData, terms_of_delivery: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm bg-white transition-all"
              >
                <option value="">-- Pilih Delivery Term --</option>
                {deliveryTerms.map((term) => (
                  <option key={term.id} value={term.name}>{term.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Customer PO No & Part Name & Part No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                CUSTOMER PO NO
              </label>
              <input
                type="text"
                placeholder="Contoh: PO-AHM-2026-99"
                value={formData.customer_po_no}
                onChange={(e) => setFormData({ ...formData, customer_po_no: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                PART NAME & PART NO
              </label>
              <input
                type="text"
                list="parts-list"
                placeholder="Pilih dari katalog atau ketik manual..."
                value={formData.part_name}
                onChange={handlePartChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-sm transition-all"
              />
              <datalist id="parts-list">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 5: Quantities (Pallete & Box) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                NO OF PALLETE
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.no_of_pallet}
                onChange={(e) => setFormData({ ...formData, no_of_pallet: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 font-mono text-sm bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                NO OF BOX
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.no_of_box}
                onChange={(e) => setFormData({ ...formData, no_of_box: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 font-mono text-sm bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 6: Add Drawing / File Image */}
          <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Add Drawing / Technical Image
                </span>
                <p className="text-xs text-slate-500">
                  Upload gambar sketsa atau drawing part yang akan disematkan pada dokumen PDF.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Pilih Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="mt-4 flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                <img
                  src={previewUrl}
                  alt="Drawing preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-slate-800">{selectedFile?.name || 'Uploaded Drawing'}</p>
                  <p className="text-slate-400 font-mono">{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}</p>
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Hapus gambar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset Form
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-md shadow-emerald-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>Menyimpan & Menyiapkan PDF...</>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  SUBMIT & BUKA PDF
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
