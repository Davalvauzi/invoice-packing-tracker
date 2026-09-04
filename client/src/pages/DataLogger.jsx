import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Package, 
  Truck,
  ArrowUpDown,
  Calendar,
  Building2,
  RotateCcw,
  Eye,
  X,
  Edit3,
  Save,
  Check,
  ChevronRight,
  ChevronDown,
  ListTree,
  List,
  CornerDownRight
} from 'lucide-react';

export default function DataLogger({ 
  openPrintTab, 
  onOpenInvoiceModal, 
  onOpenPackingListModal, 
  onOpenDeliveryOrderModal,
  refreshTrigger 
}) {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Tree View State ('tree' as default per leader request, or 'flat')
  const [viewMode, setViewMode] = useState('tree');
  const [expandedRows, setExpandedRows] = useState({});

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);

  // Edit Modal State
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Lock body scroll and listen for Escape key on modals
  useEffect(() => {
    if (!selectedLog && !editingLog) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingLog) {
          setEditingLog(null);
        } else if (selectedLog) {
          setSelectedLog(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLog, editingLog]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, customerFilter, startDate, endDate, sortBy, sortOrder, refreshTrigger]);

  const fetchFilterOptions = async () => {
    try {
      const [cRes, dRes, pRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/delivery-terms'),
        fetch('/api/payment-terms')
      ]);
      setCustomers(await cRes.json());
      setDeliveryTerms(await dRes.json());
      setPaymentTerms(await pRes.json());
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('doc_type', typeFilter);
      if (customerFilter !== 'ALL') params.append('customer_name', customerFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (searchTerm) params.append('search', searchTerm);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      const res = await fetch(`/api/data-logger?${params.toString()}`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch data logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const resetFilters = () => {
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setSortBy('id');
    setSortOrder('DESC');
  };

  // Edit Handlers
  const handleOpenEdit = (log) => {
    setEditingLog(log);
    setEditForm({
      doc_number: log.doc_number || '',
      doc_date: log.doc_date || '',
      customer_name: log.customer_name || '',
      customer_id: log.customer_id || '',
      po_no: log.po_no || '',
      part_name: log.part_name || '',
      box_qty: log.box_qty ?? '',
      pallet_qty: log.pallet_qty ?? '',
      terms_of_delivery: log.terms_of_delivery || '',
      payment_term: log.payment_term || '',
      dimensions: log.dimensions || '',
      notes: log.notes || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.doc_number?.trim()) {
      alert('Nomor dokumen tidak boleh kosong');
      return;
    }
    if (!editForm.customer_name?.trim()) {
      alert('Nama customer tidak boleh kosong');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/data-logger/${editingLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!res.ok) {
        throw new Error('Gagal menyimpan perubahan');
      }

      const updatedLog = await res.json();
      
      // Update local logs list
      setLogs(prev => prev.map(item => item.id === editingLog.id ? updatedLog : item));

      // Also update selectedLog if it's currently open
      if (selectedLog && selectedLog.id === editingLog.id) {
        setSelectedLog(updatedLog);
      }

      setEditingLog(null);
    } catch (err) {
      alert('Gagal mengupdate data: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Quick Date Range Helpers
  const setQuickDate = (range) => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().slice(0, 10);

    if (range === 'today') {
      const str = formatDate(today);
      setStartDate(str);
      setEndDate(str);
    } else if (range === 'week') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (range === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (range === 'clear') {
      setStartDate('');
      setEndDate('');
    }
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data log ini?')) return;
    try {
      const res = await fetch(`/api/data-logger/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLogs(logs.filter(l => l.id !== id));
        if (selectedLog?.id === id) setSelectedLog(null);
      }
    } catch (err) {
      alert('Gagal menghapus log');
    }
  };

  // Tree View Helpers
  const toggleRow = (docNum) => {
    setExpandedRows(prev => ({
      ...prev,
      [docNum]: !prev[docNum]
    }));
  };

  // Group logs into Tree Structure (Parent: Invoice, Children: Packing List & Delivery Order)
  const treeData = useMemo(() => {
    const invoices = logs.filter(l => l.doc_type === 'INVOICE');
    const children = logs.filter(l => l.doc_type !== 'INVOICE');

    const invoiceMap = new Map();
    invoices.forEach(inv => {
      invoiceMap.set(inv.doc_number, {
        parent: inv,
        children: []
      });
    });

    const orphans = [];

    children.forEach(child => {
      let parentEntry = null;

      // 1. Direct doc_number match (e.g. child was given the invoice's number)
      if (invoiceMap.has(child.doc_number)) {
        parentEntry = invoiceMap.get(child.doc_number);
      } 
      // 2. Reference in terms_of_delivery or notes: 'Ref Inv: ...'
      else if (child.terms_of_delivery && child.terms_of_delivery.startsWith('Ref Inv: ')) {
        const refNum = child.terms_of_delivery.replace('Ref Inv: ', '').trim();
        if (invoiceMap.has(refNum)) {
          parentEntry = invoiceMap.get(refNum);
        }
      }
      
      // 3. Fallback match by PO No & Customer Name
      if (!parentEntry && child.po_no && child.customer_name) {
        for (const entry of invoiceMap.values()) {
          if (entry.parent.po_no && entry.parent.po_no === child.po_no && entry.parent.customer_name === child.customer_name) {
            parentEntry = entry;
            break;
          }
        }
      }

      if (parentEntry) {
        parentEntry.children.push(child);
      } else {
        orphans.push(child);
      }
    });

    return {
      invoiceTrees: Array.from(invoiceMap.values()),
      orphans
    };
  }, [logs]);

  const expandAll = () => {
    const next = {};
    treeData.invoiceTrees.forEach(item => {
      if (item.children.length > 0) {
        next[item.parent.doc_number] = true;
      }
    });
    setExpandedRows(next);
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  // Aggregated Summary Statistics
  const totalInvoices = logs.filter(l => l.doc_type === 'INVOICE').length;
  const totalPackingLists = logs.filter(l => l.doc_type === 'PACKING_LIST').length;
  const totalDeliveryOrders = logs.filter(l => l.doc_type === 'DELIVERY_ORDER').length;

  // Enhanced CSV Export
  const exportToCsv = () => {
    if (logs.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const headers = [
      'ID', 
      'Tipe Dokumen', 
      'No Dokumen', 
      'Tanggal Dokumen', 
      'Nama Customer', 
      'Customer ID', 
      'Customer PO', 
      'Part Name', 
      'Box Qty', 
      'Pallet Qty', 
      'Terms of Delivery', 
      'Payment Term', 
      'Dimensi', 
      'Catatan',
      'Waktu Input'
    ];

    const rows = logs.map(l => [
      l.id,
      l.doc_type,
      `"${(l.doc_number || '').replace(/"/g, '""')}"`,
      l.doc_date,
      `"${(l.customer_name || '').replace(/"/g, '""')}"`,
      `"${(l.customer_id || '').replace(/"/g, '""')}"`,
      `"${(l.po_no || '').replace(/"/g, '""')}"`,
      `"${(l.part_name || '').replace(/"/g, '""')}"`,
      l.box_qty || 0,
      l.pallet_qty || 0,
      `"${(l.terms_of_delivery || '').replace(/"/g, '""')}"`,
      `"${(l.payment_term || '').replace(/"/g, '""')}"`,
      `"${(l.dimensions || '').replace(/"/g, '""')}"`,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_logger_rekap_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">DATA LOGGER</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekam jejak transaksi dokumen komprehensif, multi-filter, ekspor data, dan riwayat cetak PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenInvoiceModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Invoice Form</span>
          </button>

          <button
            onClick={onOpenPackingListModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 shadow-xs transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>+ Packing List</span>
          </button>

          <button
            onClick={onOpenDeliveryOrderModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0b4d53] text-white rounded-xl text-xs font-bold hover:bg-[#07363b] shadow-xs transition-colors cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>+ Delivery Order</span>
          </button>

          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Based on Current Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Total Dokumen</span>
            <span className="text-2xl font-black text-slate-900">{logs.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-700 block uppercase tracking-wider">Total Invoice</span>
            <span className="text-2xl font-black text-emerald-800">{totalInvoices}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-teal-700 block uppercase tracking-wider">Total Packing List</span>
            <span className="text-2xl font-black text-teal-800">{totalPackingLists}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#0b4d53] block uppercase tracking-wider">Delivery Order</span>
            <span className="text-2xl font-black text-[#0b4d53]">{totalDeliveryOrders}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-[#0b4d53] font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-4">
        
        {/* Row 1: Document Type Tabs & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              onClick={() => setTypeFilter('INVOICE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'INVOICE'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Hanya Invoice
            </button>
            <button
              onClick={() => setTypeFilter('PACKING_LIST')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'PACKING_LIST'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-teal-800 hover:bg-teal-50'
              }`}
            >
              Hanya Packing List
            </button>
            <button
              onClick={() => setTypeFilter('DELIVERY_ORDER')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'DELIVERY_ORDER'
                  ? 'bg-[#0b4d53] text-white shadow-xs'
                  : 'text-[#0b4d53] hover:bg-cyan-50'
              }`}
            >
              Hanya Delivery Order
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari No Doc, Customer, PO, Part..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
            >
              Cari
            </button>
          </form>
        </div>

        {/* Row 2: Customer, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          
          {/* Customer Dropdown Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Filter Customer
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium cursor-pointer"
            >
              <option value="ALL">-- Semua Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.customer_name}>{c.customer_name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>

        </div>

        {/* Row 3: Quick Date Presets & Reset Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Preset Tanggal:</span>
            <button
              onClick={() => setQuickDate('today')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
            >
              Hari Ini
            </button>
            <button
              onClick={() => setQuickDate('week')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setQuickDate('month')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
            >
              Bulan Ini
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => setQuickDate('clear')}
                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded text-[11px]"
              >
                Hapus Rentang Tanggal
              </button>
            )}
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium ml-auto"
          >
            <RotateCcw className="w-3 h-3" /> Reset Semua Filter
          </button>
        </div>

      </div>

      {/* View Mode Bar (Tree vs Flat) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300/60">
            <button
              onClick={() => setViewMode('tree')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'tree'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tampilan Hirarki (Tree)</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'flat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-slate-700" />
              <span>Tampilan Biasa (Flat)</span>
            </button>
          </div>

          {viewMode === 'tree' && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
              >
                Buka Semua
              </button>
              <button
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Tutup Semua
              </button>
            </div>
          )}
        </div>

        {viewMode === 'tree' && (
          <p className="text-[11px] text-slate-500 italic">
            💡 Induk: <b>Invoice</b> ➔ Anakan: <b>Packing List & Delivery Order</b> (klik tanda panah ▶ untuk melipat/membuka)
          </p>
        )}
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="px-3 py-3.5 w-14 text-center">
                  {viewMode === 'tree' ? 'Tree' : 'No'}
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('doc_type')}>
                  <div className="flex items-center gap-1">Tipe <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3.5 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('doc_number')}>
                  <div className="flex items-center gap-1">No. Dokumen <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-3 py-3.5 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('doc_date')}>
                  <div className="flex items-center gap-1">Tanggal <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3.5 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('customer_name')}>
                  <div className="flex items-center gap-1">Customer <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-3 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">Part Specification</th>
                <th className="px-3 py-3.5">Terms / Delivery</th>
                <th className="px-3 py-3.5 text-center cursor-pointer hover:text-slate-800" onClick={() => toggleSort('box_qty')}>
                  <div className="flex items-center justify-center gap-1">Box <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-3 py-3.5 text-center cursor-pointer hover:text-slate-800" onClick={() => toggleSort('pallet_qty')}>
                  <div className="flex items-center justify-center gap-1">Pallet <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
                    Memuat data logger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : viewMode === 'tree' ? (
                /* TREE VIEW MODE */
                <>
                  {treeData.invoiceTrees.map((group, idx) => {
                    const inv = group.parent;
                    const isExpanded = !!expandedRows[inv.doc_number];
                    const hasChildren = group.children.length > 0;
                    const plCount = group.children.filter(c => c.doc_type === 'PACKING_LIST').length;
                    const doCount = group.children.filter(c => c.doc_type === 'DELIVERY_ORDER').length;

                    return (
                      <React.Fragment key={`inv-group-${inv.id}`}>
                        {/* Parent Invoice Row */}
                        <tr 
                          className="bg-white hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                          onClick={() => setSelectedLog(inv)}
                        >
                          <td className="px-2 py-3 text-center" onClick={(e) => { e.stopPropagation(); toggleRow(inv.doc_number); }}>
                            {hasChildren ? (
                              <button
                                type="button"
                                className={`p-1 rounded-md transition-colors ${
                                  isExpanded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={isExpanded ? 'Tutup anakan' : 'Buka anakan'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-300 font-mono">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 text-emerald-800">
                                INVOICE
                              </span>
                              {hasChildren && (
                                <div className="flex items-center gap-1">
                                  {plCount > 0 && (
                                    <span className="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold border border-teal-200" title={`${plCount} Packing List terhubung`}>
                                      {plCount} PL
                                    </span>
                                  )}
                                  {doCount > 0 && (
                                    <span className="text-[9px] bg-cyan-50 text-[#0b4d53] px-1.5 py-0.5 rounded font-bold border border-cyan-200" title={`${doCount} Delivery Order terhubung`}>
                                      {doCount} DO
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-900 whitespace-nowrap group-hover:text-emerald-700">
                            {inv.doc_number}
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                            {inv.doc_date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                            {inv.customer_name}
                            {inv.customer_id && (
                              <span className="block text-[10px] text-slate-400 font-mono font-normal">
                                {inv.customer_id}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                            {inv.po_no || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                            <div className="truncate font-medium">{inv.part_name || '-'}</div>
                            {inv.dimensions && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Dim: {inv.dimensions}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {inv.terms_of_delivery || inv.payment_term || '-'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {inv.box_qty || 0}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {inv.pallet_qty || 0}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(inv)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs transition-colors"
                                title="Edit Data / Koreksi Typo"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedLog(inv)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                                title="Lihat Detail Transaksi"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openPrintTab('print-invoice', inv.ref_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                                title="Buka / Cetak PDF di Tab Baru"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                              <button
                                onClick={() => handleDelete(inv.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Child Rows (Packing List & Delivery Order) */}
                        {isExpanded && group.children.map((child) => (
                          <tr 
                            key={`child-${child.id}`}
                            className="bg-slate-50/70 hover:bg-slate-100/90 transition-colors cursor-pointer border-l-4 border-l-emerald-600"
                            onClick={() => setSelectedLog(child)}
                          >
                            <td className="px-2 py-2.5 text-center text-slate-400">
                              <CornerDownRight className="w-3.5 h-3.5 ml-auto mr-1 text-slate-400" />
                            </td>
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                                child.doc_type === 'PACKING_LIST'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-cyan-100 text-[#0b4d53]'
                              }`}>
                                {child.doc_type === 'PACKING_LIST' ? 'PACKING LIST' : 'DELIVERY ORDER'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap pl-6">
                              <span className="text-slate-400 mr-1.5 font-normal">↳</span>
                              {child.doc_number}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                              {child.doc_date}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 max-w-[180px] truncate">
                              {child.customer_name}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                              {child.po_no || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[200px]">
                              <div className="truncate font-medium">{child.part_name || '-'}</div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                              {child.terms_of_delivery || child.payment_term || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                              {child.box_qty || 0}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                              {child.pallet_qty || 0}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(child)}
                                  className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs transition-colors"
                                  title="Edit Data"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedLog(child)}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                                  title="Lihat Detail"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {child.doc_type === 'PACKING_LIST' && (
                                  <button
                                    onClick={() => openPrintTab('print-packing-list', child.ref_id)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors"
                                    title="Buka / Cetak PDF di Tab Baru"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>PDF</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(child.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus Log"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Standalone / Orphan Documents */}
                  {treeData.orphans.length > 0 && (
                    <>
                      <tr className="bg-slate-100/80 border-t-2 border-slate-300">
                        <td colSpan={11} className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                          📁 Dokumen Lainnya / Tanpa Induk Invoice Terhubung ({treeData.orphans.length})
                        </td>
                      </tr>
                      {treeData.orphans.map((orphan, oIdx) => (
                        <tr 
                          key={`orphan-${orphan.id}`} 
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          onClick={() => setSelectedLog(orphan)}
                        >
                          <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                            {oIdx + 1}
                          </td>
                          <td className="px-3 py-3 font-medium whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                              orphan.doc_type === 'PACKING_LIST'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-cyan-100 text-[#0b4d53]'
                            }`}>
                              {orphan.doc_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap group-hover:text-teal-700">
                            {orphan.doc_number}
                          </td>
                          <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                            {orphan.doc_date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                            {orphan.customer_name}
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                            {orphan.po_no || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                            <div className="truncate font-medium">{orphan.part_name || '-'}</div>
                          </td>
                          <td className="px-3 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {orphan.terms_of_delivery || orphan.payment_term || '-'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {orphan.box_qty || 0}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {orphan.pallet_qty || 0}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(orphan)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs transition-colors"
                                title="Edit Data"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedLog(orphan)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {orphan.doc_type === 'PACKING_LIST' && (
                                <button
                                  onClick={() => openPrintTab('print-packing-list', orphan.ref_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors"
                                  title="Buka / Cetak PDF di Tab Baru"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(orphan.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              ) : (
                /* FLAT VIEW MODE */
                logs.map((log, index) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                        log.doc_type === 'INVOICE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.doc_type === 'PACKING_LIST'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-cyan-100 text-[#0b4d53]'
                      }`}>
                        {log.doc_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap group-hover:text-emerald-700">
                      {log.doc_number}
                    </td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                      {log.doc_date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                      {log.customer_name}
                      {log.customer_id && (
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">
                          {log.customer_id}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {log.po_no || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                      <div className="truncate font-medium">{log.part_name || '-'}</div>
                      {log.dimensions && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Dim: {log.dimensions}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 text-[11px] whitespace-nowrap">
                      {log.terms_of_delivery || log.payment_term || '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                      {log.box_qty || 0}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                      {log.pallet_qty || 0}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(log)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs transition-colors"
                          title="Edit Data / Koreksi Typo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {log.doc_type !== 'DELIVERY_ORDER' && (
                          <button
                            onClick={() => openPrintTab(log.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', log.ref_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                            title="Buka / Cetak PDF di Tab Baru"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Log"
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
        </div>
      </div>

      {/* Quick Details Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded mb-1.5 ${
                  selectedLog.doc_type === 'INVOICE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedLog.doc_type === 'PACKING_LIST'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-cyan-100 text-[#0b4d53]'
                }`}>
                  {selectedLog.doc_type} DETAIL
                </span>
                <h3 className="text-lg font-black text-slate-900 font-mono">
                  {selectedLog.doc_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Nama Customer</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedLog.customer_name}</p>
                  {selectedLog.customer_id && (
                    <p className="text-slate-500 font-mono mt-0.5">ID: {selectedLog.customer_id}</p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tanggal Dokumen</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedLog.doc_date}</p>
                  <p className="text-slate-500 font-mono mt-0.5">Input: {selectedLog.created_at}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-semibold block">CUSTOMER PO NO</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.po_no || '-'}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-semibold block">TERMS OF DELIVERY</span>
                  <span className="font-semibold text-slate-900">{selectedLog.terms_of_delivery || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-400 font-semibold block">PART SPECIFICATION</span>
                <p className="font-bold text-slate-900">{selectedLog.part_name || '-'}</p>
                {selectedLog.dimensions && (
                  <p className="text-slate-500 font-mono mt-0.5">Dimensi (L x W x H): {selectedLog.dimensions}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block">TOTAL BOX QTY</span>
                  <span className="text-lg font-black font-mono text-slate-900">{selectedLog.box_qty || 0} Box</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block">TOTAL PALLET QTY</span>
                  <span className="text-lg font-black font-mono text-slate-900">{selectedLog.pallet_qty || 0} Pallet</span>
                </div>
              </div>

              {/* Drawing image in modal if exists */}
              {selectedLog.image_url && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">LAMPIRAN DRAWING</span>
                  <img
                    src={selectedLog.image_url}
                    alt="Drawing attachment"
                    className="max-h-48 object-contain mx-auto rounded border border-slate-200 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedLog.id)}
                className="text-red-600 hover:text-red-700 font-semibold text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = selectedLog;
                    setSelectedLog(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  title="Koreksi Salah Ketik (Typo)"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data</span>
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tutup
                </button>
                {selectedLog.doc_type !== 'DELIVERY_ORDER' && (
                  <button
                    onClick={() => {
                      openPrintTab(selectedLog.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', selectedLog.ref_id);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Buka PDF</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingLog && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => !isSavingEdit && setEditingLog(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/20 text-white">
                      EDIT {editingLog.doc_type}
                    </span>
                    <span className="font-mono font-bold text-xs opacity-90">{editingLog.doc_number}</span>
                  </div>
                  <h2 className="text-base font-extrabold tracking-tight">Koreksi Data Dokumen</h2>
                </div>
              </div>
              <button
                onClick={() => !isSavingEdit && setEditingLog(null)}
                className="p-1.5 rounded-lg text-amber-100 hover:text-white hover:bg-white/10 transition-colors"
                title="Tutup Modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form id="edit-logger-form" onSubmit={handleSaveEdit} className="overflow-y-auto p-6 space-y-4 text-xs flex-1">
              
              {/* Row 1: Nomor Dokumen & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nomor Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.doc_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, doc_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tanggal Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.doc_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, doc_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Customer Name & Customer ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nama Customer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="edit-customers-list"
                    required
                    value={editForm.customer_name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = customers.find(c => c.customer_name === val);
                      setEditForm(prev => ({
                        ...prev,
                        customer_name: val,
                        customer_id: found?.customer_id || prev.customer_id
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  />
                  <datalist id="edit-customers-list">
                    {customers.map(c => (
                      <option key={c.id} value={c.customer_name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={editForm.customer_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, customer_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 font-mono text-xs bg-slate-50"
                  />
                </div>
              </div>

              {/* Row 3: PO Number & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Customer PO No
                  </label>
                  <input
                    type="text"
                    value={editForm.po_no || ''}
                    onChange={(e) => setEditForm({ ...editForm, po_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Terms of Delivery
                  </label>
                  <input
                    type="text"
                    list="edit-delivery-terms-list"
                    value={editForm.terms_of_delivery || ''}
                    onChange={(e) => setEditForm({ ...editForm, terms_of_delivery: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  />
                  <datalist id="edit-delivery-terms-list">
                    {deliveryTerms.map(d => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Row 4: Payment Term (if Invoice) or Dimensions (if Packing List) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {editingLog.doc_type === 'INVOICE' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Payment Term
                    </label>
                    <input
                      type="text"
                      list="edit-payment-terms-list"
                      value={editForm.payment_term || ''}
                      onChange={(e) => setEditForm({ ...editForm, payment_term: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                    />
                    <datalist id="edit-payment-terms-list">
                      {paymentTerms.map(p => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Dimensi (L x W x H)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 120 x 80 x 100 mm"
                      value={editForm.dimensions || ''}
                      onChange={(e) => setEditForm({ ...editForm, dimensions: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Part Specification
                  </label>
                  <input
                    type="text"
                    value={editForm.part_name || ''}
                    onChange={(e) => setEditForm({ ...editForm, part_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  />
                </div>
              </div>

              {/* Row 5: Quantities Box & Pallet */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    No of Box (Qty)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.box_qty ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, box_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 font-mono text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    No of Pallet (Qty)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.pallet_qty ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, pallet_qty: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 font-mono text-xs bg-white"
                  />
                </div>
              </div>

              {/* Row 6: Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Catatan / Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 text-xs"
                  placeholder="Keterangan tambahan..."
                />
              </div>

            </form>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => !isSavingEdit && setEditingLog(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                form="edit-logger-form"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Menyimpan...' : 'SIMPAN PERUBAHAN'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
