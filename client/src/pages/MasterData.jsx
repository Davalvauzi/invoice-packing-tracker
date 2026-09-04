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
  X
} from 'lucide-react';

export default function MasterData({ setActiveView }) {
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'payment' | 'delivery' | 'parts'
  
  // Data States
  const [customers, setCustomers] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [parts, setParts] = useState([]);

  // Modal / Form States
  const [customerForm, setCustomerForm] = useState({
    customer_id: '',
    customer_name: '',
    address: '',
    contact_person: '',
    phone: ''
  });
  const [termForm, setTermForm] = useState({ name: '', description: '' });
  const [partForm, setPartForm] = useState({
    part_name: '',
    part_no: '',
    length: '',
    width: '',
    height: '',
    unit: 'mm'
  });

  const [isAdding, setIsAdding] = useState(false);

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

  // Customer handlers
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.customer_name.trim()) return alert('Nama customer wajib diisi');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });
      if (res.ok) {
        setCustomerForm({ customer_id: '', customer_name: '', address: '', contact_person: '', phone: '' });
        setIsAdding(false);
        fetchAllMasterData();
      }
    } catch (err) {
      alert('Gagal menyimpan customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!confirm('Hapus customer ini?')) return;
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      fetchAllMasterData();
    } catch (err) {
      alert('Gagal menghapus customer');
    }
  };

  // Term handlers (Payment / Delivery)
  const handleSaveTerm = async (e, type) => {
    e.preventDefault();
    if (!termForm.name.trim()) return alert('Nama term wajib diisi');
    const endpoint = type === 'payment' ? '/api/payment-terms' : '/api/delivery-terms';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termForm)
      });
      if (res.ok) {
        setTermForm({ name: '', description: '' });
        setIsAdding(false);
        fetchAllMasterData();
      }
    } catch (err) {
      alert('Gagal menyimpan term');
    }
  };

  const handleDeleteTerm = async (id, type) => {
    if (!confirm('Hapus term ini?')) return;
    const endpoint = type === 'payment' ? `/api/payment-terms/${id}` : `/api/delivery-terms/${id}`;
    try {
      await fetch(endpoint, { method: 'DELETE' });
      fetchAllMasterData();
    } catch (err) {
      alert('Gagal menghapus term');
    }
  };

  // Part handlers
  const handleSavePart = async (e) => {
    e.preventDefault();
    if (!partForm.part_name.trim()) return alert('Nama part wajib diisi');
    try {
      const res = await fetch('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partForm)
      });
      if (res.ok) {
        setPartForm({ part_name: '', part_no: '', length: '', width: '', height: '', unit: 'mm' });
        setIsAdding(false);
        fetchAllMasterData();
      }
    } catch (err) {
      alert('Gagal menyimpan part');
    }
  };

  const handleDeletePart = async (id) => {
    if (!confirm('Hapus part ini?')) return;
    try {
      await fetch(`/api/parts/${id}`, { method: 'DELETE' });
      fetchAllMasterData();
    } catch (err) {
      alert('Gagal menghapus part');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => setActiveView('dashboard')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Main Menu
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Master Data & Template
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi data template berulang (Customer, Payment Terms, Delivery Terms, Katalog Part) untuk dropdown form.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => { setActiveTab('customers'); setIsAdding(false); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'customers'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Information ({customers.length})
        </button>

        <button
          onClick={() => { setActiveTab('payment'); setIsAdding(false); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'payment'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Terms ({paymentTerms.length})
        </button>

        <button
          onClick={() => { setActiveTab('delivery'); setIsAdding(false); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'delivery'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Terms of Delivery ({deliveryTerms.length})
        </button>

        <button
          onClick={() => { setActiveTab('parts'); setIsAdding(false); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'parts'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Part Catalog ({parts.length})
        </button>
      </div>

      {/* Action Bar for Adding */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          {activeTab === 'customers' && 'Daftar Customer Terdaftar'}
          {activeTab === 'payment' && 'Daftar Ketentuan Pembayaran (Payment Terms)'}
          {activeTab === 'delivery' && 'Daftar Ketentuan Pengiriman (Terms of Delivery)'}
          {activeTab === 'parts' && 'Daftar Spesifikasi Part & Dimensi'}
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs transition-colors"
        >
          {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isAdding ? 'Tutup Form' : 'Tambah Baru'}</span>
        </button>
      </div>

      {/* Add Form Container */}
      {isAdding && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 mb-6 animate-in fade-in slide-in-from-top-2">
          {activeTab === 'customers' && (
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-900 uppercase">Input Customer Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer ID</label>
                  <input
                    type="text"
                    placeholder="Contoh: CUST-005"
                    value={customerForm.customer_id}
                    onChange={(e) => setCustomerForm({ ...customerForm, customer_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    placeholder="Alamat kantor / pabrik customer..."
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Kontak Person / No Telp</label>
                  <input
                    type="text"
                    placeholder="Bpk. Hendra / 0812..."
                    value={customerForm.contact_person}
                    onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900"
                >
                  Simpan Customer
                </button>
              </div>
            </form>
          )}

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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900"
                >
                  Simpan Ketentuan
                </button>
              </div>
            </form>
          )}

          {activeTab === 'parts' && (
            <form onSubmit={handleSavePart} className="space-y-4">
              <h4 className="text-xs font-bold text-emerald-900 uppercase">Input Katalog Part Baru</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Part *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Cover Side Flange"
                    value={partForm.part_name}
                    onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Panjang (L)</label>
                  <input
                    type="number"
                    step="any"
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
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900"
                >
                  Simpan Part
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
                <th className="px-5 py-3">Alamat</th>
                <th className="px-5 py-3">Kontak Person</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">{c.customer_id || '-'}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{c.customer_name}</td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{c.address || '-'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.contact_person || '-'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteCustomer(c.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Hapus Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
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
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PARTS TABLE */}
        {activeTab === 'parts' && (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Part Name</th>
                <th className="px-5 py-3">Part Number</th>
                <th className="px-5 py-3">Dimensi Default (L x W x H)</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parts.map((pt) => (
                <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{pt.part_name}</td>
                  <td className="px-5 py-3.5 font-mono text-emerald-800">{pt.part_no}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">
                    {pt.length} x {pt.width} x {pt.height} {pt.unit}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDeletePart(pt.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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

    </div>
  );
}
