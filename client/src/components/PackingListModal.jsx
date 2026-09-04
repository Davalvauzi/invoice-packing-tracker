import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Upload, 
  CheckCircle, 
  Image as ImageIcon, 
  X, 
  PlusCircle, 
  AlertCircle,
  Printer,
  Copy
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PackingListModal({ isOpen, onClose, openPrintTab, onSuccess }) {
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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
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
              <p className="text-[11px] text-teal-200">Form Spesifikasi Pengemasan & Logistik (Modal Pop-up)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors"
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
                  className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 flex items-center gap-1"
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

          {/* Quick Copy from Recent Invoice */}
          {recentInvoices.length > 0 && !submittedDoc && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                <Copy className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="truncate">Salin data dari Invoice yang ada:</span>
              </div>
              <select 
                onChange={(e) => {
                  const inv = recentInvoices.find(i => String(i.id) === e.target.value);
                  if (inv) copyFromInvoice(inv);
                }}
                defaultValue=""
                className="text-xs font-mono py-1 px-2.5 rounded-lg border border-slate-300 bg-white cursor-pointer"
              >
                <option value="" disabled>-- Pilih Invoice --</option>
                {recentInvoices.slice(0, 5).map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.customer_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form id="packing-list-modal-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 font-mono text-xs"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs"
                />
              </div>
            </div>

            {/* Row 2: Customer Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                CUSTOMER NAME <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs bg-white cursor-pointer"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.customer_name}>
                    {c.customer_name} {c.customer_id ? `(${c.customer_id})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 3: Part Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                PART NAME & PART NO
              </label>
              <input
                type="text"
                list="parts-list-pl-modal"
                placeholder="Pilih katalog atau ketik..."
                value={formData.part_name}
                onChange={handlePartSelect}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs"
              />
              <datalist id="parts-list-pl-modal">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`} />
                ))}
              </datalist>
            </div>

            {/* Row 4: Customer PO & Terms of Delivery */}
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 text-xs"
                />
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

            {/* Row 5: Box Qty & Pallet Qty */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  BOX QTY
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.box_qty}
                  onChange={(e) => setFormData({ ...formData, box_qty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 font-mono text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  PALLET QTY
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.pallet_qty}
                  onChange={(e) => setFormData({ ...formData, pallet_qty: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-600 font-mono text-xs bg-white"
                />
              </div>
            </div>

            {/* Row 6: Dimensions (L x W x H) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-2">
                DIMENSIONS (L x W x H) & UNIT
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">LENGTH</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="P"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">WIDTH</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="L"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">HEIGHT</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="T"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">UNIT</span>
                  <select
                    value={formData.unit_note}
                    onChange={(e) => setFormData({ ...formData, unit_note: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
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
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">
                    Add Drawing / Packaging Photo
                  </span>
                  <p className="text-[10px] text-slate-400">Sketsa penataan atau foto part</p>
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
              form="packing-list-modal-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 cursor-pointer"
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
