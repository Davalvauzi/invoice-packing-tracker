import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  PlusCircle, 
  AlertCircle,
  Printer,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PackingListForm({ setActiveView, openPrintTab }) {
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
    notes: '',
    image_url: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDoc, setSubmittedDoc] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

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

      if (dData.length > 0) setFormData(prev => ({ ...prev, terms_of_delivery: dData[0].name }));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  // Helper to autofill dimensions when a part is chosen
  const handlePartSelect = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const foundPart = parts.find(p => `${p.part_name} (${p.part_no})` === val || p.part_name === val);
      if (foundPart) {
        return {
          ...prev,
          part_name: val,
          length: foundPart.length || prev.length,
          width: foundPart.width || prev.width,
          height: foundPart.height || prev.height,
          unit_note: foundPart.unit || prev.unit_note
        };
      }
      return { ...prev, part_name: val };
    });
  };

  // Copy data from an existing invoice for efficiency
  const copyFromInvoice = (inv) => {
    setFormData(prev => ({
      ...prev,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name,
      customer_po_no: inv.customer_po_no || '',
      part_name: inv.part_name || '',
      terms_of_delivery: inv.terms_of_delivery || '',
      box_qty: inv.no_of_box || '',
      pallet_qty: inv.no_of_pallet || '',
      image_url: inv.image_url || ''
    }));
    if (inv.image_url) {
      setPreviewUrl(inv.image_url);
    }
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

      // Save Packing List
      const postRes = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: finalImageUrl
        })
      });

      if (!postRes.ok) {
        throw new Error('Gagal menyimpan packing list');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Buka otomatis tab baru PDF sesuai instruksi user
      openPrintTab('print-packing-list', savedData.id);

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
      customer_po_no: '',
      part_name: '',
      terms_of_delivery: deliveryTerms[0]?.name || '',
      box_qty: '',
      pallet_qty: '',
      length: '',
      width: '',
      height: '',
      unit_note: 'mm',
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Kelola Master Data
        </button>
      </div>

      {/* Success Modal / Banner */}
      {submittedDoc && (
        <div className="mb-8 bg-teal-50 border-2 border-teal-500/30 rounded-2xl p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-teal-950">
                  Packing List Berhasil Disimpan & Dicatat ke Data Logger!
                </h3>
                <p className="text-xs text-teal-800">
                  Ref Invoice: <span className="font-mono font-bold">{submittedDoc.invoice_number}</span> | Customer: {submittedDoc.customer_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => openPrintTab('print-packing-list', submittedDoc.id)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 shadow-sm transition-colors"
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

      {/* Quick Fill helper from Invoice */}
      {recentInvoices.length > 0 && !submittedDoc && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Copy className="w-4 h-4 text-teal-700" />
            <span>Tarik data otomatis dari Invoice yang sudah dibuat:</span>
          </div>
          <select 
            onChange={(e) => {
              const inv = recentInvoices.find(i => String(i.id) === e.target.value);
              if (inv) copyFromInvoice(inv);
            }}
            defaultValue=""
            className="text-xs font-mono py-1.5 px-3 rounded-lg border border-slate-300 bg-white cursor-pointer"
          >
            <option value="" disabled>-- Pilih Invoice Terakhir --</option>
            {recentInvoices.slice(0, 5).map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} - {inv.customer_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-wide uppercase">PACKING LIST FORM</h2>
              <p className="text-[11px] text-teal-200">Form Spesifikasi Pengemasan & Dimensi Logistik</p>
            </div>
          </div>
          <span className="text-xs bg-teal-700/60 px-2.5 py-1 rounded font-mono">
            {formData.invoice_number || 'PL-DRAFT'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          
          {/* Row 1: Invoice Number & Date */}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 font-mono text-sm transition-all"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 text-sm transition-all"
              />
            </div>
          </div>

          {/* Row 2: Customer Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              CUSTOMER NAME <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 text-sm bg-white transition-all appearance-none cursor-pointer"
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

          {/* Row 3: Part Name & Part No */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              PART NAME & PART NO
            </label>
            <input
              type="text"
              list="parts-list-pl"
              placeholder="Pilih dari katalog part atau ketik manual..."
              value={formData.part_name}
              onChange={handlePartSelect}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 text-sm transition-all"
            />
            <datalist id="parts-list-pl">
              {parts.map(p => (
                <option key={p.id} value={`${p.part_name} (${p.part_no})`} />
              ))}
            </datalist>
          </div>

          {/* Row 4: Customer PO No & Terms of Delivery */}
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                TERMS OF DELIVERY
              </label>
              <select
                value={formData.terms_of_delivery}
                onChange={(e) => setFormData({ ...formData, terms_of_delivery: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 text-sm bg-white transition-all"
              >
                <option value="">-- Pilih Delivery Term --</option>
                {deliveryTerms.map((term) => (
                  <option key={term.id} value={term.name}>{term.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Box Qty & Pallet Qty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                BOX QTY
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.box_qty}
                onChange={(e) => setFormData({ ...formData, box_qty: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 font-mono text-sm bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                PALLET QTY
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.pallet_qty}
                onChange={(e) => setFormData({ ...formData, pallet_qty: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 font-mono text-sm bg-white transition-all"
              />
            </div>
          </div>

          {/* Row 6: Dimensions (Length, Width, Height) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              DIMENSIONS (L x W x H) & UNIT
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">LENGTH</span>
                <input
                  type="number"
                  step="any"
                  placeholder="P"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-sm bg-white"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">WIDTH</span>
                <input
                  type="number"
                  step="any"
                  placeholder="L"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-sm bg-white"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">HEIGHT</span>
                <input
                  type="number"
                  step="any"
                  placeholder="T"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 font-mono text-sm bg-white"
                />
              </div>

              <div className="col-span-3 sm:col-span-1">
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">UNIT</span>
                <select
                  value={formData.unit_note}
                  onChange={(e) => setFormData({ ...formData, unit_note: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 text-sm bg-white"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                  <option value="meter">meter</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 7: Add Drawing */}
          <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Add Drawing / Packaging Photo
                </span>
                <p className="text-xs text-slate-500">
                  Upload sketsa penataan box/palet atau gambar part teknis untuk dokumen packing list.
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

            {previewUrl && (
              <div className="mt-4 flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                <img
                  src={previewUrl}
                  alt="Drawing preview"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 text-xs">
                  <p className="font-semibold text-slate-800">{selectedFile?.name || 'Attached Drawing'}</p>
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
              className="inline-flex items-center gap-2 px-8 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-md shadow-teal-900/20 disabled:opacity-50 transition-all cursor-pointer"
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
