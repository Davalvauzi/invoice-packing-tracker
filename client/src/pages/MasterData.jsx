import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  Truck, 
  Layers, 
  Plus, 
  Trash2, 
  Check, 
  ArrowLeft,
  Edit2,
  X,
  Copy,
  DollarSign,
  Package,
  Clock,
  History,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function MasterData({ setActiveView }) {
  const { showSuccess, showError, showWarning, confirmDialog } = useNotification();
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('docutrack_master_tab') || 'customers';
  }); // 'customers' | 'payment' | 'delivery' | 'parts'

  useEffect(() => {
    sessionStorage.setItem('docutrack_master_tab', activeTab);
  }, [activeTab]);
  
  // Data States
  const [customers, setCustomers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);

  // Modal / Form States
  const [customerForm, setCustomerForm] = useState({
    id: null,
    customer_id: '',
    customer_name: '',
    bill_to: '',
    ship_to: '',
    address: '',
    contact_person: '',
    phone: ''
  });

  const [termForm, setTermForm] = useState({ id: null, name: '', description: '' });

  const [partForm, setPartForm] = useState({
    id: null,
    part_name: '',
    part_no: '',
    qty_per_box: '',
    box_per_pallet: '',
    price: '',
    length: '',
    width: '',
    height: '',
    unit: 'mm'
  });

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Handle ESC key to close price history modal
  useEffect(() => {
    if (!historyModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setHistoryModalOpen(false);
        setEditingHistoryId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyModalOpen]);

  const [selectedPartForHistory, setSelectedPartForHistory] = useState(null);
  const [priceHistoryList, setPriceHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [historyForm, setHistoryForm] = useState({
    price: '',
    currency: 'USD',
    effective_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const handleOpenPriceHistory = async (part) => {
    setSelectedPartForHistory(part);
    setHistoryModalOpen(true);
    setEditingHistoryId(null);
    setHistoryForm({
      price: '',
      currency: part.active_currency || 'USD',
      effective_date: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    fetchPriceHistory(part.id);
  };

  const fetchPriceHistory = async (partId) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/parts/${partId}/prices`);
      const data = await res.json();
      if (res.ok) {
        setPriceHistoryList(data.prices || []);
      }
    } catch (err) {
      console.error('Failed to load price history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSavePriceHistory = async (e) => {
    e.preventDefault();
    if (!historyForm.price || isNaN(Number(historyForm.price))) {
      showWarning('Mohon masukkan nominal harga yang valid');
      return;
    }
    if (!historyForm.effective_date) {
      showWarning('Mohon pilih tanggal mulai berlaku');
      return;
    }

    try {
      let res;
      if (editingHistoryId) {
        res = await fetch(`/api/parts/prices/${editingHistoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historyForm)
        });
      } else {
        res = await fetch(`/api/parts/${selectedPartForHistory.id}/prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historyForm)
        });
      }

      if (res.ok) {
        setEditingHistoryId(null);
        setHistoryForm({
          price: '',
          currency: historyForm.currency,
          effective_date: new Date().toISOString().slice(0, 10),
          notes: ''
        });
        showSuccess(editingHistoryId ? 'Riwayat penyesuaian harga berhasil diperbarui' : 'Penyesuaian harga baru berhasil disimpan');
        fetchPriceHistory(selectedPartForHistory.id);
        fetchAllMasterData();
      } else {
        const errData = await res.json();
        showError('Gagal: ' + (errData.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };

  const handleEditHistoryItem = (item) => {
    setEditingHistoryId(item.id);
    setHistoryForm({
      price: item.price,
      currency: item.currency || 'USD',
      effective_date: item.effective_date,
      notes: item.notes || ''
    });
  };

  const handleDeleteHistoryItem = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Riwayat Harga',
      message: 'Apakah Anda yakin ingin menghapus catatan riwayat harga ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/parts/prices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Catatan riwayat harga berhasil dihapus');
        fetchPriceHistory(selectedPartForHistory.id);
        fetchAllMasterData();
      } else {
        const errData = await res.json();
        showError('Gagal: ' + (errData.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      showError('Error: ' + err.message);
    }
  };


  useEffect(() => {
    fetchAllMasterData();
  }, []);

  const fetchAllMasterData = async () => {
    try {
      const [cRes, pRes, dRes, ptRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/payment-terms'),
        fetch('/api/delivery-terms'),
        fetch('/api/parts')
      ]);
      setCustomers(await cRes.json());
      setPaymentTerms(await pRes.json());
      setDeliveryTerms(await dRes.json());
      setParts(await ptRes.json());
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setCustomerForm({
      id: null,
      customer_id: '',
      customer_name: '',
      bill_to: '',
      ship_to: '',
      address: '',
      contact_person: '',
      phone: ''
    });
    setPartForm({
      id: null,
      part_name: '',
      part_no: '',
      qty_per_box: '',
      box_per_pallet: '',
      price: '',
      length: '',
      width: '',
      height: '',
      unit: 'mm'
    });
    setTermForm({ id: null, name: '', description: '' });
    setIsAdding(true);
  };

  // Customer handlers
  const handleEditCustomer = (c) => {
    setEditingId(c.id);
    setCustomerForm({
      id: c.id,
      customer_id: c.customer_id || '',
      customer_name: c.customer_name || '',
      bill_to: c.bill_to || c.address || '',
      ship_to: c.ship_to || c.address || '',
      address: c.address || '',
      contact_person: c.contact_person || '',
      phone: c.phone || ''
    });
    setIsAdding(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.customer_name.trim()) return showWarning('Nama customer wajib diisi');
    
    // Auto sync address with bill_to if address empty
    const payload = {
      ...customerForm,
      address: customerForm.address || customerForm.bill_to
    };

    try {
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showSuccess(editingId ? 'Customer berhasil diperbarui' : 'Customer baru berhasil ditambahkan');
        setIsAdding(false);
        setEditingId(null);
        fetchAllMasterData();
      } else {
        showError('Gagal menyimpan customer');
      }
    } catch (err) {
      showError('Gagal menyimpan customer: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Customer',
      message: 'Apakah Anda yakin ingin menghapus data customer ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      showSuccess('Customer berhasil dihapus');
      fetchAllMasterData();
    } catch (err) {
      showError('Gagal menghapus customer');
    }
  };

  // Term handlers (Payment / Delivery)
  const handleSaveTerm = async (e, type) => {
    e.preventDefault();
    if (!termForm.name.trim()) return showWarning('Nama term wajib diisi');
    const endpoint = type === 'payment' ? '/api/payment-terms' : '/api/delivery-terms';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termForm)
      });
      if (res.ok) {
        showSuccess('Term berhasil disimpan');
        setTermForm({ id: null, name: '', description: '' });
        setIsAdding(false);
        fetchAllMasterData();
      }
    } catch (err) {
      showError('Gagal menyimpan term');
    }
  };

  const handleDeleteTerm = async (id, type) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Term',
      message: 'Apakah Anda yakin ingin menghapus term ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger'
    });
    if (!confirmed) return;

    const endpoint = type === 'payment' ? `/api/payment-terms/${id}` : `/api/delivery-terms/${id}`;
    try {
      await fetch(endpoint, { method: 'DELETE' });
      showSuccess('Term berhasil dihapus');
      fetchAllMasterData();
    } catch (err) {
      showError('Gagal menghapus term');
    }
  };

  // Part handlers
  const handleEditPart = (pt) => {
    setEditingId(pt.id);
    setPartForm({
      id: pt.id,
      part_name: pt.part_name || '',
      part_no: pt.part_no || '',
      qty_per_box: pt.qty_per_box ?? '',
      box_per_pallet: pt.box_per_pallet ?? '',
      price: pt.price ?? '',
      length: pt.length ?? '',
      width: pt.width ?? '',
      height: pt.height ?? '',
      unit: pt.unit || 'mm'
    });
    setIsAdding(true);
  };

  const handleSavePart = async (e) => {
    e.preventDefault();
    if (!partForm.part_name.trim()) return showWarning('Nama part wajib diisi');
    try {
      const url = editingId ? `/api/parts/${editingId}` : '/api/parts';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partForm)
      });
      if (res.ok) {
        showSuccess(editingId ? 'Katalog part berhasil diperbarui' : 'Part baru berhasil ditambahkan');
        setIsAdding(false);
        setEditingId(null);
        fetchAllMasterData();
      } else {
        showError('Gagal menyimpan part / produk');
      }
    } catch (err) {
      showError('Gagal menyimpan part: ' + err.message);
    }
  };

  const handleDeletePart = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Hapus Katalog Part',
      message: 'Apakah Anda yakin ingin menghapus katalog produk/part ini?',
      confirmText: 'Ya, Hapus',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await fetch(`/api/parts/${id}`, { method: 'DELETE' });
      showSuccess('Part berhasil dihapus');
      fetchAllMasterData();
    } catch (err) {
      showError('Gagal menghapus part');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => setActiveView('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Main Menu
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Master Data & Template
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi data berulang (Customer dengan Bill To/Ship To, Data Produk/Harga, Payment Terms, Delivery Terms) untuk otomatisasi pengisian dokumen.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveTab('customers'); setIsAdding(false); setEditingId(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'customers'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Information ({customers.length})
        </button>

        <button
          onClick={() => { setActiveTab('parts'); setIsAdding(false); setEditingId(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'parts'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          Data Produk & Harga ({parts.length})
        </button>

        <button
          onClick={() => { setActiveTab('payment'); setIsAdding(false); setEditingId(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'payment'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Terms ({paymentTerms.length})
        </button>

        <button
          onClick={() => { setActiveTab('delivery'); setIsAdding(false); setEditingId(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'delivery'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Terms of Delivery ({deliveryTerms.length})
        </button>
      </div>

      {/* Action Bar for Adding */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          {activeTab === 'customers' && 'Daftar Customer (Bill To & Ship To)'}
          {activeTab === 'parts' && 'Daftar Produk / Part Catalog (Harga & Qty Per Box)'}
          {activeTab === 'payment' && 'Daftar Ketentuan Pembayaran (Payment Terms)'}
          {activeTab === 'delivery' && 'Daftar Ketentuan Pengiriman (Terms of Delivery)'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
                setEditingId(null);
              } else {
                handleOpenAdd();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs transition-colors cursor-pointer"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAdding ? 'Tutup Form' : 'Tambah Baru'}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form Container */}
      {isAdding && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2">
          
          {/* CUSTOMER FORM */}
          {activeTab === 'customers' && (
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">
                  {editingId ? 'Edit Data Customer' : 'Input Customer Baru'}
                </h4>
                {editingId && (
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-mono px-2 py-0.5 rounded font-bold">
                    Editing ID #{editingId}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer ID</label>
                  <input
                    type="text"
                    placeholder="Contoh: CUST-005"
                    value={customerForm.customer_id}
                    onChange={(e) => setCustomerForm({ ...customerForm, customer_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Perusahaan / Customer *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Sumber Maju Bersama"
                    value={customerForm.customer_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      BILL TO (Alamat Penagihan Invoice)
                    </label>
                    <span className="text-[10px] text-slate-500">Muncul di Invoice "BILL TO"</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Nama PT, Gedung, Jalan, Kota, Kode Pos untuk penagihan..."
                    value={customerForm.bill_to}
                    onChange={(e) => setCustomerForm({ ...customerForm, bill_to: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      SHIP TO (Alamat Pengiriman Barang)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomerForm({ ...customerForm, ship_to: customerForm.bill_to })}
                      className="text-[10px] text-emerald-800 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Samakan dgn Bill To
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Nama PT / Plant / Gudang penerima pengiriman fisik..."
                    value={customerForm.ship_to}
                    onChange={(e) => setCustomerForm({ ...customerForm, ship_to: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kontak Person (PIC)</label>
                  <input
                    type="text"
                    placeholder="Bpk. Hendra / Purchasing Dept"
                    value={customerForm.contact_person}
                    onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Telepon / HP</label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx / (021) 8980..."
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Customer'}
                </button>
              </div>
            </form>
          )}

          {/* DATA PRODUK / PART FORM */}
          {activeTab === 'parts' && (
            <form onSubmit={handleSavePart} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">
                  {editingId ? 'Edit Data Produk' : 'Input Produk / Part Baru'}
                </h4>
                {editingId && (
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-mono px-2 py-0.5 rounded font-bold">
                    Editing ID #{editingId}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Part / Deskripsi Produk *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cover Side Flange"
                    value={partForm.part_name}
                    onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: FLG-CVR-202"
                    value={partForm.part_no}
                    onChange={(e) => setPartForm({ ...partForm, part_no: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono font-bold text-emerald-900"
                  />
                </div>
              </div>

              {/* Qty Per Box, Box Per Pallet & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-100/40 p-3.5 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Qty Per Box (Pcs / Unit dalam 1 Box)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 100"
                    value={partForm.qty_per_box}
                    onChange={(e) => setPartForm({ ...partForm, qty_per_box: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-300 bg-white font-mono font-bold text-slate-900"
                  />
                  <p className="text-[10px] text-emerald-800 mt-1">
                    *Otomatis mengisi perhitungan Total Qty saat memilih part ini di Invoice.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Box Per Pallet (Kapasitas Box / Pallet)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 24"
                    value={partForm.box_per_pallet}
                    onChange={(e) => setPartForm({ ...partForm, box_per_pallet: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-300 bg-white font-mono font-bold text-slate-900"
                  />
                  <p className="text-[10px] text-emerald-800 mt-1">
                    *Otomatis menghitung Box & Total Qty saat input Pallet di Invoice/PL/DO.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Harga Satuan / Price (USD $)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="Contoh: 0.1500"
                      value={partForm.price}
                      onChange={(e) => setPartForm({ ...partForm, price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-emerald-300 bg-white font-mono font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-800 mt-1">
                    *Otomatis mengisi Unit Price di Invoice dan menghitung Total Amount & PPN.
                  </p>
                </div>
              </div>

              {/* Dimensi */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Panjang (L)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={partForm.length}
                    onChange={(e) => setPartForm({ ...partForm, length: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lebar (W)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={partForm.width}
                    onChange={(e) => setPartForm({ ...partForm, width: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tinggi (H)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={partForm.height}
                    onChange={(e) => setPartForm({ ...partForm, height: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Satuan</label>
                  <select
                    value={partForm.unit}
                    onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="inch">inch</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 cursor-pointer"
                >
                  {editingId ? 'Simpan Perubahan Produk' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          )}

          {/* PAYMENT / DELIVERY TERMS FORM */}
          {(activeTab === 'payment' || activeTab === 'delivery') && (
            <form onSubmit={(e) => handleSaveTerm(e, activeTab)} className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-900 uppercase">
                Input {activeTab === 'payment' ? 'Payment Term' : 'Delivery Term'} Baru
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Ketentuan / Kode *</label>
                  <input
                    type="text"
                    required
                    placeholder={activeTab === 'payment' ? "Contoh: Net 45 Days" : "Contoh: CIF Tanjung Priok"}
                    value={termForm.name}
                    onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                  <input
                    type="text"
                    placeholder="Penjelasan ringkas ketentuan..."
                    value={termForm.description}
                    onChange={(e) => setTermForm({ ...termForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 cursor-pointer"
                >
                  Simpan Ketentuan
                </button>
              </div>
            </form>
          )}

        </div>
      )}

      {/* Tables for each Tab */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* CUSTOMERS TABLE */}
        {activeTab === 'customers' && (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Customer ID</th>
                <th className="px-5 py-3">Nama Perusahaan</th>
                <th className="px-5 py-3">Bill To (Invoice)</th>
                <th className="px-5 py-3">Ship To (Pengiriman)</th>
                <th className="px-5 py-3">Kontak</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data customer terdaftar. Silakan klik tombol "Tambah Baru".
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">{c.customer_id || '-'}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.customer_name}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs whitespace-pre-line text-[11px]">
                      {c.bill_to || c.address || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs whitespace-pre-line text-[11px]">
                      {c.ship_to || c.address || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{c.contact_person || '-'}</div>
                      {c.phone && <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditCustomer(c)}
                          className="p-1 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* PARTS / PRODUK TABLE */}
        {activeTab === 'parts' && (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Part Name</th>
                <th className="px-5 py-3">Part Number</th>
                <th className="px-5 py-3 text-center">Qty / Box</th>
                <th className="px-5 py-3 text-center">Box / Pallet</th>
                <th className="px-5 py-3 text-right">Harga Satuan & Riwayat</th>
                <th className="px-5 py-3">Dimensi Default (L x W x H)</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Belum ada katalog produk / part. Silakan klik tombol "Tambah Baru".
                  </td>
                </tr>
              ) : (
                parts.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{pt.part_name}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">{pt.part_no}</td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold">
                      {pt.qty_per_box ? `${pt.qty_per_box} pcs` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-emerald-800">
                      {pt.box_per_pallet ? `${pt.box_per_pallet} box` : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-emerald-900">
                          {pt.active_currency || 'USD'} {Number(pt.price || 0).toFixed(4)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPriceHistory(pt)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                          title="Lihat & kelola riwayat perubahan harga barang ini"
                        >
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Riwayat</span>
                          {pt.price_history_count > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-800 text-[10px] font-extrabold">
                              {pt.price_history_count}
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {pt.length || pt.width || pt.height 
                        ? `${pt.length || 0} x ${pt.width || 0} x ${pt.height || 0} ${pt.unit || 'mm'}`
                        : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditPart(pt)}
                          className="p-1 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Edit Produk / Harga"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePart(pt.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Hapus Part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* PAYMENT TERMS TABLE */}
        {activeTab === 'payment' && (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Nama Payment Term</th>
                <th className="px-5 py-3">Deskripsi / Penjelasan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentTerms.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{p.name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{p.description || '-'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteTerm(p.id, 'payment')}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* DELIVERY TERMS TABLE */}
        {activeTab === 'delivery' && (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Nama Terms of Delivery</th>
                <th className="px-5 py-3">Deskripsi / Penjelasan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryTerms.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{d.name}</td>
                  <td className="px-5 py-3.5 text-slate-500">{d.description || '-'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteTerm(d.id, 'delivery')}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* PRICE HISTORY MODAL */}
      {historyModalOpen && selectedPartForHistory && (
        <div 
          onClick={() => { setHistoryModalOpen(false); setEditingHistoryId(null); }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-wide uppercase">
                    Riwayat Perubahan Harga Barang
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-emerald-200">
                    <span className="font-bold text-white text-[13px]">{selectedPartForHistory.part_name}</span>
                    <span>•</span>
                    <span className="font-mono bg-emerald-950/70 px-2.5 py-0.5 rounded text-[11px] text-emerald-300 font-extrabold tracking-wide border border-emerald-700/50">
                      PART NO: {selectedPartForHistory.part_no}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setHistoryModalOpen(false); setEditingHistoryId(null); }}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Notice Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 leading-relaxed">
                  <span className="font-bold">Ketentuan Riwayat Harga:</span> Kenaikan atau penurunan harga berlaku otomatis untuk dokumen invoice baru yang dibuat berdasarkan tanggal faktur. <strong>Dokumen invoice masa lalu yang sudah tersimpan tidak akan berubah nilainya</strong> demi menjaga keabsahan transaksi riil.
                </div>
              </div>

              {/* Form Input / Edit Harga */}
              <form onSubmit={handleSavePriceHistory} className="bg-slate-50/80 p-5 sm:p-6 rounded-2xl border border-slate-200/90 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span>{editingHistoryId ? 'Koreksi Riwayat Harga' : 'Tambah Penyesuaian Harga Baru'}</span>
                  </h4>
                  {editingHistoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHistoryId(null);
                        setHistoryForm({
                          price: '',
                          currency: 'USD',
                          effective_date: new Date().toISOString().slice(0, 10),
                          notes: ''
                        });
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Mulai Berlaku (Tanggal) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={historyForm.effective_date}
                      onChange={(e) => setHistoryForm({ ...historyForm, effective_date: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-2xs transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Mata Uang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={historyForm.currency}
                      onChange={(e) => setHistoryForm({ ...historyForm, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-2xs transition-all"
                    >
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="IDR">IDR (Rp - Rupiah)</option>
                      <option value="JPY">JPY (¥ - Japanese Yen)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Nominal Harga Satuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      required
                      placeholder="0.0000"
                      value={historyForm.price}
                      onChange={(e) => setHistoryForm({ ...historyForm, price: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-mono font-bold text-emerald-950 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Alasan / Catatan Perubahan Harga (Opsional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Contoh: Kenaikan biaya material Q3 2026, Negosiasi kontrak tahunan, dll"
                      value={historyForm.notes}
                      onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 shadow-2xs transition-all"
                    />
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-all shrink-0 cursor-pointer shadow-xs active:scale-98"
                    >
                      {editingHistoryId ? 'Update Riwayat' : '+ Simpan Harga'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Tabel Riwayat Harga */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-700" />
                    Timeline Perubahan Harga ({priceHistoryList.length})
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 whitespace-nowrap">Periode Berlaku (Range)</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Harga Satuan</th>
                        <th className="px-5 py-3">Keterangan / Alasan</th>
                        <th className="px-5 py-3 text-right whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingHistory ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                            Memuat data riwayat...
                          </td>
                        </tr>
                      ) : priceHistoryList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                            Belum ada riwayat perubahan harga untuk part ini.
                          </td>
                        </tr>
                      ) : (
                        priceHistoryList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {item.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                  Aktif Sekarang
                                </span>
                              ) : item.status === 'FUTURE' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                                  Akan Datang
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  Riwayat Lampau
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-mono whitespace-nowrap">
                              <div className="inline-flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                                <span className="font-bold text-slate-800">{item.range_start || item.effective_date}</span>
                                <span className="text-slate-400 font-extrabold text-[11px] px-0.5">s/d</span>
                                <span className={`font-bold ${
                                  (item.range_end && item.range_end.includes('Sekarang'))
                                    ? 'text-emerald-700 font-extrabold'
                                    : item.range_end === 'Seterusnya'
                                    ? 'text-blue-700 font-extrabold'
                                    : 'text-slate-700'
                                }`}>
                                  {item.range_end || (item.status === 'ACTIVE' ? 'Sekarang (Berjalan)' : 'Seterusnya')}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono font-black text-emerald-950 text-sm whitespace-nowrap">
                              {item.currency || 'USD'} {Number(item.price).toFixed(4)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 text-xs">
                              {item.notes || '-'}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleEditHistoryItem(item)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit catatan ini"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePriceHistory(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus catatan ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => { setHistoryModalOpen(false); setEditingHistoryId(null); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
