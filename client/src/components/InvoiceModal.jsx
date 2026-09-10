import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  CheckCircle2,
  Edit3,
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
  Trash2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNotification } from '../context/NotificationContext';

const createEmptyItem = (isSample = false) => ({
  id: Date.now() + Math.random(),
  part_name: '',
  part_no: '',
  customer_po_no: '',
  no_of_pallet: '',
  no_of_box: '',
  qty_per_box: '',
  box_per_pallet: '',
  total_qty: '',
  unit_price: '',
  total_amount: '',
  is_sample: isSample
});

const buildBillToWithContact = (customer) => {
  if (!customer) return '';
  let lines = (customer.bill_to || customer.address || '').trim();
  const contactLines = [];
  if (customer.phone && !lines.toLowerCase().includes(customer.phone.toLowerCase()) && !/^(tel|phone):/im.test(lines)) {
    contactLines.push(`Tel: ${customer.phone}`);
  }
  if (customer.contact_person && !lines.toLowerCase().includes(customer.contact_person.toLowerCase()) && !/^(attn|pic|up):/im.test(lines)) {
    contactLines.push(`Attn: ${customer.contact_person}`);
  }
  return contactLines.length > 0 ? (lines ? `${lines}\n${contactLines.join('\n')}` : contactLines.join('\n')) : lines;
};

const buildShipToWithoutContact = (customer) => {
  if (!customer) return '';
  let raw = (customer.ship_to || customer.address || '').trim();
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^(phone|tel|fax|attn|up|pic):/i.test(l))
    .join('\n');
};

export default function InvoiceModal({ isOpen, onClose, openPrintTab, onSuccess, invoiceToEdit = null }) {
  const { showSuccess, showError, showWarning } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);

  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

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
    vat_rate: 0,
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
      if (invoiceToEdit) {
        loadInvoiceData(invoiceToEdit);
      }
    } else {
      setIsEditMode(false);
      setEditingInvoiceId(null);
      setSubmittedDoc(null);
    }
  }, [isOpen, invoiceToEdit]);

  const loadMasterDataAndSettings = async () => {
    try {
      const [cRes, pRes, dRes, partRes, sRes, invRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payment-terms'),
        fetch('/api/delivery-terms'),
        fetch('/api/parts'),
        fetch('/api/settings'),
        fetch('/api/invoices')
      ]);

      const [cData, pData, dData, partData, sData, invData] = await Promise.all([
        cRes.json(),
        pRes.json(),
        dRes.json(),
        partRes.json(),
        sRes.json(),
        invRes.json()
      ]);

      setCustomers(cData);
      setPaymentTerms(pData);
      setDeliveryTerms(dData);
      setParts(partData);
      setSettings(sData);
      setRecentInvoices(Array.isArray(invData) ? invData : []);

      if (!isEditMode && !invoiceToEdit) {
        setFormData(prev => ({
          ...prev,
          customer_name: prev.customer_name || (cData[0]?.customer_name || ''),
          customer_id: prev.customer_id || (cData[0]?.customer_id || ''),
          bill_to: prev.bill_to || (cData[0] ? buildBillToWithContact(cData[0]) : ''),
          ship_to: prev.ship_to || (cData[0] ? buildShipToWithoutContact(cData[0]) : ''),
          payment_term: prev.payment_term || (pData[0]?.name || ''),
          terms_of_delivery: prev.terms_of_delivery || (dData[0]?.name || ''),
          hts_code: prev.hts_code || (sData?.hts_code_invoice || '8504.40.90')
        }));
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  const loadInvoiceData = async (inv) => {
    if (!inv) return;
    try {
      // Prioritas resolusi targetId invoice: ref_id dari data_logger, invoice_number, atau ID
      const targetId = (inv.doc_type === 'INVOICE' && inv.ref_id)
        ? inv.ref_id
        : (inv.invoice_number || inv.ref_id || inv.id || inv);
      if (typeof targetId === 'number' || typeof targetId === 'string') {
        const res = await fetch(`/api/invoices/${targetId}`);
        if (res.ok) {
          fullInv = await res.json();
        }
      }

      setIsEditMode(true);
      setEditingInvoiceId(fullInv.id);

      // Parse items
      let loadedItems = [];
      if (fullInv.items) {
        try {
          loadedItems = typeof fullInv.items === 'string' ? JSON.parse(fullInv.items) : fullInv.items;
        } catch (e) {
          loadedItems = [];
        }
      }

      if (!Array.isArray(loadedItems) || loadedItems.length === 0) {
        loadedItems = [{
          id: Date.now(),
          part_name: fullInv.part_name || '',
          part_no: fullInv.part_no || '',
          customer_po_no: fullInv.customer_po_no || '',
          no_of_pallet: fullInv.no_of_pallet !== null && fullInv.no_of_pallet !== undefined ? String(fullInv.no_of_pallet) : '',
          no_of_box: fullInv.no_of_box !== null && fullInv.no_of_box !== undefined ? String(fullInv.no_of_box) : '',
          qty_per_box: fullInv.qty_per_box !== null && fullInv.qty_per_box !== undefined ? String(fullInv.qty_per_box) : '',
          total_qty: fullInv.total_qty !== null && fullInv.total_qty !== undefined ? String(fullInv.total_qty) : '',
          unit_price: fullInv.unit_price !== null && fullInv.unit_price !== undefined ? String(fullInv.unit_price) : '',
          total_amount: fullInv.total_amount !== null && fullInv.total_amount !== undefined ? String(fullInv.total_amount) : '',
          is_sample: false
        }];
      } else {
        loadedItems = loadedItems.map((it, idx) => ({
          id: it.id || (Date.now() + idx),
          part_name: it.part_name || '',
          part_no: it.part_no || '',
          customer_po_no: it.customer_po_no || fullInv.customer_po_no || '',
          no_of_pallet: it.no_of_pallet !== null && it.no_of_pallet !== undefined ? String(it.no_of_pallet) : '',
          no_of_box: it.no_of_box !== null && it.no_of_box !== undefined ? String(it.no_of_box) : '',
          qty_per_box: it.qty_per_box !== null && it.qty_per_box !== undefined ? String(it.qty_per_box) : '',
          total_qty: it.total_qty !== null && it.total_qty !== undefined ? String(it.total_qty) : '',
          unit_price: it.unit_price !== null && it.unit_price !== undefined ? String(it.unit_price) : '',
          total_amount: it.total_amount !== null && it.total_amount !== undefined ? String(it.total_amount) : '',
          is_sample: !!it.is_sample
        }));
      }

      setItems(loadedItems);

      setFormData({
        id: fullInv.id,
        invoice_number: fullInv.invoice_number || '',
        invoice_date: fullInv.invoice_date || new Date().toISOString().slice(0, 10),
        customer_name: fullInv.customer_name || '',
        customer_id: fullInv.customer_id || '',
        bill_to: fullInv.bill_to || '',
        ship_to: fullInv.ship_to || '',
        payment_term: fullInv.payment_term || '',
        terms_of_delivery: fullInv.terms_of_delivery || '',
        customer_po_no: fullInv.customer_po_no || '',
        hts_code: fullInv.hts_code || '8504.40.90',
        currency: fullInv.currency || 'USD',
        vat_rate: 0,
        vat_amount: '0.00',
        total_amount: String(fullInv.total_amount || '0.00'),
        grand_total: String(fullInv.grand_total || '0.00'),
        no_of_pallet: fullInv.no_of_pallet !== null && fullInv.no_of_pallet !== undefined ? String(fullInv.no_of_pallet) : '',
        no_of_box: fullInv.no_of_box !== null && fullInv.no_of_box !== undefined ? String(fullInv.no_of_box) : '',
        total_qty: fullInv.total_qty !== null && fullInv.total_qty !== undefined ? String(fullInv.total_qty) : '',
        notes: fullInv.notes || ''
      });

      showSuccess(`Memuat invoice ${fullInv.invoice_number} dalam mode edit.`);
    } catch (err) {
      console.error('Error loading invoice data:', err);
      showError('Gagal memuat data invoice: ' + err.message);
    }
  };

  // Re-calculate aggregate totals whenever items change
  useEffect(() => {
    const totalBoxes = items.reduce((sum, item) => sum + (parseFloat(item.no_of_box) || 0), 0);
    const totalPallets = items.reduce((sum, item) => sum + (parseFloat(item.no_of_pallet) || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (parseFloat(item.total_qty) || 0), 0);
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);

    setFormData(prev => ({
      ...prev,
      no_of_box: totalBoxes > 0 ? String(totalBoxes) : '',
      no_of_pallet: totalPallets > 0 ? String(totalPallets) : '',
      total_qty: totalQty > 0 ? String(totalQty) : '',
      total_amount: totalAmount > 0 ? totalAmount.toFixed(2) : '0.00',
      vat_rate: 0,
      vat_amount: '0.00',
      grand_total: totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'
    }));
  }, [items]);

  const handleCustomerChange = (e) => {
    const custName = e.target.value;
    const found = customers.find(c => c.customer_name === custName);
    setFormData(prev => ({
      ...prev,
      customer_name: custName,
      customer_id: found ? (found.customer_id || '') : prev.customer_id,
      bill_to: found ? buildBillToWithContact(found) : '',
      ship_to: found ? buildShipToWithoutContact(found) : ''
    }));
  };

  // Item row operations
  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };
      const matchedPart = parts.find(p => 
        p.part_name === row.part_name || 
        p.part_no === row.part_no || 
        `${p.part_name} (${p.part_no})` === row.part_name
      );

      // Khusus Product Sample: Qty bebas tanpa paksaan kalkulasi pallet/box
      if (row.is_sample) {
        if (field === 'total_qty') {
          row.total_qty = value;
        } else if (field === 'unit_price') {
          row.unit_price = value;
        } else if (field === 'no_of_pallet') {
          row.no_of_pallet = value;
        } else if (field === 'no_of_box') {
          row.no_of_box = value;
        } else if (field === 'qty_per_box') {
          row.qty_per_box = value;
        }

        const qtyNum = parseFloat(row.total_qty) || 0;
        const priceNum = parseFloat(field === 'unit_price' ? value : row.unit_price) || 0;
        const subtotal = qtyNum * priceNum;
        row.total_amount = subtotal > 0 ? subtotal.toFixed(2) : (qtyNum > 0 && priceNum === 0 ? '0.00' : '');

        updated[index] = row;
        return updated;
      }

      // Produk Standar:
      // Pastikan box_per_pallet dan qty_per_box terisi dari katalog jika belum ada
      if (!row.box_per_pallet && matchedPart?.box_per_pallet) {
        row.box_per_pallet = String(matchedPart.box_per_pallet);
      }
      if (!row.qty_per_box && matchedPart?.qty_per_box) {
        row.qty_per_box = String(matchedPart.qty_per_box);
      }

      const boxPerPallet = parseFloat(row.box_per_pallet) || 0;
      let perBox = parseFloat(row.qty_per_box) || 0;
      let box = parseFloat(row.no_of_box) || 0;
      let totalQty = parseFloat(row.total_qty) || 0;

      if (field === 'no_of_pallet') {
        const pallet = parseFloat(value) || 0;
        if (pallet > 0 && boxPerPallet > 0) {
          box = Math.round(pallet * boxPerPallet);
          row.no_of_box = String(box);
        } else if (!value) {
          box = 0;
          row.no_of_box = '';
          row.total_qty = '';
        }

        if (box > 0) {
          if (perBox > 0) {
            totalQty = Math.round(box * perBox);
            row.total_qty = String(totalQty);
          } else if (totalQty > 0) {
            perBox = Math.round(totalQty / box);
            if (perBox > 0) row.qty_per_box = String(perBox);
          }
        }
      } else if (field === 'no_of_box') {
        box = parseFloat(value) || 0;
        row.no_of_box = value;
        if (box > 0 && perBox > 0) {
          totalQty = Math.round(box * perBox);
          row.total_qty = String(totalQty);
        } else if (box > 0 && totalQty > 0) {
          perBox = Math.round(totalQty / box);
          if (perBox > 0) row.qty_per_box = String(perBox);
        }
      } else if (field === 'qty_per_box') {
        perBox = parseFloat(value) || 0;
        row.qty_per_box = value;
        if (box > 0 && perBox > 0) {
          totalQty = Math.round(box * perBox);
          row.total_qty = String(totalQty);
        }
      } else if (field === 'total_qty') {
        totalQty = parseFloat(value) || 0;
        row.total_qty = value;
        if (box > 0 && totalQty > 0) {
          perBox = Math.round(totalQty / box);
          if (perBox > 0) row.qty_per_box = String(perBox);
        }
      } else if (field === 'unit_price') {
        row.unit_price = value;
      }

      const finalQty = parseFloat(row.total_qty) || 0;
      const finalPrice = parseFloat(row.unit_price) || 0;
      const subtotal = finalQty * finalPrice;
      row.total_amount = subtotal > 0 ? subtotal.toFixed(2) : (finalQty > 0 && finalPrice === 0 ? '0.00' : '');

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
        if (found.box_per_pallet) row.box_per_pallet = String(found.box_per_pallet);
        if (found.price !== null && found.price !== undefined) row.unit_price = String(found.price);

        // Jika bukan sample, hitung otomatis pallet -> box -> qty
        if (!row.is_sample) {
          const pallet = parseFloat(row.no_of_pallet) || 0;
          const boxPallet = parseFloat(found.box_per_pallet) || 0;
          if (pallet > 0 && boxPallet > 0) {
            row.no_of_box = String(Math.round(pallet * boxPallet));
          }

          const box = parseFloat(row.no_of_box) || 0;
          const perBox = parseFloat(row.qty_per_box) || 0;
          if (box > 0 && perBox > 0) {
            row.total_qty = String(Math.round(box * perBox));
          }
        }

        const qtyNum = parseFloat(row.total_qty) || 0;
        const priceNum = parseFloat(row.unit_price) || 0;
        const subtotal = qtyNum * priceNum;
        row.total_amount = subtotal > 0 ? subtotal.toFixed(2) : (qtyNum > 0 && priceNum === 0 ? '0.00' : '');
      } else {
        row.part_name = selectedVal;
      }
      updated[index] = row;
      return updated;
    });
  };

  const addItemRow = (isSample = false) => {
    const lastPo = items[items.length - 1]?.customer_po_no || '';
    const newItem = createEmptyItem(isSample);
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
      if (!it.is_sample) {
        if (!it.no_of_box || parseFloat(it.no_of_box) <= 0) {
          showWarning(`Mohon isi No of Box untuk produk ke-${i + 1} (${it.part_name})`);
          return;
        }
      } else {
        if (!it.total_qty || parseFloat(it.total_qty) <= 0) {
          showWarning(`Mohon isi Total Qty untuk Sample ke-${i + 1} (${it.part_name})`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        id: isEditMode && editingInvoiceId ? editingInvoiceId : undefined,
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

      const endpoint = isEditMode && editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : '/api/invoices';
      const method = isEditMode && editingInvoiceId ? 'PUT' : 'POST';

      const postRes = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!postRes.ok) {
        throw new Error(isEditMode ? 'Gagal memperbarui invoice' : 'Gagal menyimpan invoice');
      }

      const savedData = await postRes.json();
      setSubmittedDoc(savedData);
      showSuccess(isEditMode 
        ? `Invoice ${savedData.invoice_number} berhasil diperbarui!` 
        : `Invoice berhasil dibuat dengan ${validItems.length} item produk!`
      );

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
    setIsEditMode(false);
    setEditingInvoiceId(null);
    setSubmittedDoc(null);
    setItems([createEmptyItem()]);
    setFormData({
      invoice_number: '',
      invoice_date: new Date().toISOString().slice(0, 10),
      customer_name: customers[0]?.customer_name || '',
      customer_id: customers[0]?.customer_id || '',
      bill_to: customers[0] ? buildBillToWithContact(customers[0]) : '',
      ship_to: customers[0] ? buildShipToWithoutContact(customers[0]) : '',
      payment_term: paymentTerms[0]?.name || '',
      terms_of_delivery: deliveryTerms[0]?.name || '',
      customer_po_no: '',
      hts_code: settings?.hts_code_invoice || '8504.40.90',
      currency: 'USD',
      vat_rate: 0,
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
        <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 transition-colors duration-200 ${
          isEditMode 
            ? 'bg-gradient-to-r from-amber-700 to-amber-900' 
            : 'bg-gradient-to-r from-emerald-800 to-teal-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              {isEditMode ? <Edit3 className="w-5 h-5 text-amber-200" /> : <FileText className="w-5 h-5 text-emerald-300" />}
            </div>
            <div>
              {isEditMode ? (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/80 text-white border border-amber-400/40">
                      <Edit3 className="w-3 h-3" /> MODE EDIT INVOICE
                    </span>
                    <span className="font-mono text-xs text-amber-200 font-bold">{formData.invoice_number}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">KOREKSI DATA INVOICE</h2>
                </div>
              ) : (
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">INVOICE FORM</h2>
                  <p className="text-[11px] text-emerald-200">Form Pembuatan Faktur Tagihan Sesuai Format Resmi</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              isEditMode ? 'text-amber-200' : 'text-emerald-200'
            }`}
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Scrollable Form */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          
          {/* Quick Edit Selector */}
          {!isEditMode && recentInvoices.length > 0 && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Mau koreksi / edit invoice yang sudah ada?</span>
              </div>
              <select
                onChange={(e) => {
                  const inv = recentInvoices.find(i => String(i.id) === e.target.value);
                  if (inv) loadInvoiceData(inv);
                }}
                defaultValue=""
                className="text-xs font-mono py-1.5 px-3 rounded-lg border border-amber-300 bg-white text-slate-800 cursor-pointer w-full sm:w-auto max-w-xs focus:ring-2 focus:ring-amber-400"
              >
                <option value="" disabled>-- Pilih Invoice untuk Diedit --</option>
                {recentInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.customer_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Edit Mode Banner */}
          {isEditMode && (
            <div className="p-3 bg-amber-100/90 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-950 font-bold">
                <Edit3 className="w-4 h-4 text-amber-800 shrink-0" />
                <span>Mode Edit Aktif: Mengubah invoice #{formData.invoice_number}</span>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                Batal Edit (Buat Baru)
              </button>
            </div>
          )}

          {/* Success Banner if submitted */}
          {submittedDoc && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-950">
                    {isEditMode ? 'Perubahan Invoice Berhasil Disimpan!' : 'Invoice Berhasil Disimpan & Dicatat ke Data Logger!'}
                  </p>
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
                  {!isEditMode && formData.invoice_number.trim() && (() => {
                    const matched = recentInvoices.find(
                      inv => inv.invoice_number && inv.invoice_number.toLowerCase() === formData.invoice_number.trim().toLowerCase()
                    );
                    if (!matched) return null;
                    return (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-[11px] text-amber-900 animate-in fade-in">
                        <span>⚠️ No. Invoice ini sudah terdaftar ({matched.customer_name}).</span>
                        <button
                          type="button"
                          onClick={() => loadInvoiceData(matched)}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Muat untuk Edit
                        </button>
                      </div>
                    );
                  })()}
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
                    BILL TO (Alamat Penagihan & Kontak)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Alamat penagihan customer & kontak (Tel, Attn)..."
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
                    rows={3}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-emerald-200 gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-emerald-700" />
                  Daftar Produk & Part Tagihan ({items.length} Item)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addItemRow(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Produk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addItemRow(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold tracking-wide cursor-pointer transition-colors shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Tambah Product Sample</span>
                  </button>
                </div>
              </div>

              {/* Datalist parts catalog shared across rows */}
              <datalist id="parts-list-invoice">
                {parts.map(p => (
                  <option key={p.id} value={`${p.part_name} (${p.part_no})`}>
                    {p.part_name} - {p.part_no} | {p.qty_per_box ? `${p.qty_per_box} pcs/box` : ''} | {p.box_per_pallet ? `${p.box_per_pallet} box/plt` : ''} | {p.price ? `$${p.price}` : ''}
                  </option>
                ))}
              </datalist>

              {/* Item Cards List */}
              <div className="space-y-3.5">
                {items.map((item, index) => (
                  <div 
                    key={item.id || index}
                    className={`rounded-xl border shadow-xs p-3.5 space-y-3 relative group transition-all ${
                      item.is_sample
                        ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-200'
                        : 'bg-white border-emerald-200'
                    }`}
                  >
                    {/* Item Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        {item.is_sample ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] tracking-wide uppercase flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            SAMPLE #{index + 1}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] tracking-wide uppercase">
                            Produk #{index + 1}
                          </span>
                        )}
                        {item.part_name && (
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                            {item.part_name}
                          </span>
                        )}
                        {item.is_sample && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                            Custom Qty Bebas
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
                          className={`w-full px-2.5 py-1.5 rounded-lg border bg-white text-xs font-semibold focus:ring-2 ${
                            item.is_sample
                              ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/20'
                              : 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-600/20'
                          }`}
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
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] font-bold text-slate-600 uppercase">
                            PALLET {item.is_sample && <span className="text-slate-400 font-normal">(Opt)</span>}
                          </label>
                          {!item.is_sample && Number(item.box_per_pallet) > 0 && (
                            <span className="text-[8px] font-semibold text-emerald-600 font-mono" title={`Kapasitas: ${item.box_per_pallet} box / pallet`}>
                              @{item.box_per_pallet}b
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.no_of_pallet}
                          onChange={(e) => handleItemChange(index, 'no_of_pallet', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-white text-center focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          BOX {item.is_sample ? <span className="text-slate-400 font-normal">(Opt)</span> : <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.no_of_box}
                          onChange={(e) => handleItemChange(index, 'no_of_box', e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg border font-mono text-xs font-bold text-center ${
                            item.is_sample
                              ? 'border-slate-300 text-slate-800 bg-white'
                              : 'border-emerald-400 font-bold text-emerald-950 bg-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">
                          QTY / BOX {item.is_sample && <span className="text-slate-400 font-normal">(Opt)</span>}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={item.is_sample ? '-' : 'Pcs'}
                          value={item.qty_per_box}
                          onChange={(e) => handleItemChange(index, 'qty_per_box', e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg border font-mono text-xs font-bold text-center ${
                            item.is_sample
                              ? 'border-slate-300 text-slate-800 bg-white'
                              : 'border-emerald-400 font-bold text-emerald-950 bg-white'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] font-bold text-slate-600 uppercase">
                            TOTAL QTY {item.is_sample ? <span className="text-amber-600 font-bold">*</span> : ''}
                          </label>
                          {item.is_sample && (
                            <span className="text-[8px] text-amber-700 font-bold bg-amber-100 px-1 rounded">Bebas</span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="1"
                          placeholder={item.is_sample ? 'Ketik Qty...' : 'Auto'}
                          value={item.total_qty}
                          onChange={(e) => handleItemChange(index, 'total_qty', e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg border font-mono text-xs font-bold text-center ${
                            item.is_sample
                              ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-300/60 focus:ring-amber-500'
                              : 'border-slate-300 bg-slate-50 text-slate-800'
                          }`}
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

              {/* Add Item Action Buttons (Standar vs Sample) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => addItemRow(false)}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 bg-white/70 hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Produk Ke-{items.length + 1}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addItemRow(true)}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-600 bg-amber-50/60 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>+ Tambah Product Sample (Custom Qty)</span>
                </button>
              </div>

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

                <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-slate-700 sm:pl-4 flex flex-col justify-center">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">TOTAL QTY:</span>
                    <span className="font-mono font-bold text-white">{formData.total_qty || '0'} pcs</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">TOTAL USD:</span>
                    <span className="font-mono font-bold text-white">$ {formData.total_amount || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">VAT 11% USD:</span>
                    <span className="font-mono font-bold text-slate-300">$ 0.00</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-slate-700">
                    <span className="font-bold text-white uppercase">TOTAL AMOUNT USD:</span>
                    <span className="font-mono font-black text-emerald-400 text-base">$ {formData.total_amount || '0.00'}</span>
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
              className={`inline-flex items-center gap-1.5 px-6 py-2 text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm disabled:opacity-50 cursor-pointer transition-colors ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-800 hover:bg-emerald-900'
              }`}
            >
              {isEditMode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
              <span>{isSubmitting ? 'Menyimpan...' : (isEditMode ? 'SIMPAN PERUBAHAN' : 'SUBMIT & CETAK PDF')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
