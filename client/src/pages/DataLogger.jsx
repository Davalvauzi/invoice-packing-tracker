import React, { useState, useEffect } from 'react';
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
  ArrowUpDown,
  Calendar,
  Building2,
  Truck,
  RotateCcw,
  Eye,
  X,
  Layers,
  Box,
  Image as ImageIcon
} from 'lucide-react';

export default function DataLogger({ 
  openPrintTab, 
  onOpenInvoiceModal, 
  onOpenPackingListModal, 
  refreshTrigger 
}) {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, customerFilter, deliveryFilter, startDate, endDate, sortBy, sortOrder, refreshTrigger]);

  const fetchFilterOptions = async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/delivery-terms')
      ]);
      setCustomers(await cRes.json());
      setDeliveryTerms(await dRes.json());
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
      if (deliveryFilter !== 'ALL') params.append('terms_of_delivery', deliveryFilter);
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
    setDeliveryFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setSortBy('id');
    setSortOrder('DESC');
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

  // Aggregated Summary Statistics
  const totalInvoices = logs.filter(l => l.doc_type === 'INVOICE').length;
  const totalPackingLists = logs.filter(l => l.doc_type === 'PACKING_LIST').length;
  const totalBoxes = logs.reduce((acc, curr) => acc + (Number(curr.box_qty) || 0), 0);
  const totalPallets = logs.reduce((acc, curr) => acc + (Number(curr.pallet_qty) || 0), 0);

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
      'Drawing URL',
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
      `"${(l.image_url || '').replace(/"/g, '""')}"`,
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
            onClick={fetchLogs}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Dokumen</span>
          <span className="text-xl font-extrabold text-slate-900">{logs.length}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 block">Invoice</span>
          <span className="text-xl font-extrabold text-emerald-800">{totalInvoices}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-teal-700 block">Packing List</span>
          <span className="text-xl font-extrabold text-teal-800">{totalPackingLists}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-600 block">Total Box</span>
          <span className="text-xl font-extrabold text-slate-800 font-mono">{totalBoxes.toLocaleString()}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-600 block">Total Palet</span>
          <span className="text-xl font-extrabold text-slate-800 font-mono">{totalPallets.toLocaleString()}</span>
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

        {/* Row 2: Customer, Delivery Terms, Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          
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

          {/* Terms of Delivery Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-slate-400" /> Terms of Delivery
            </label>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium cursor-pointer"
            >
              <option value="ALL">-- Semua Delivery Terms --</option>
              {deliveryTerms.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
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

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="px-3 py-3.5 w-12 text-center">No</th>
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
                <th className="px-3 py-3.5 text-center">Lampiran</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
                    Memuat data logger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
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
                          : 'bg-teal-100 text-teal-800'
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
                    <td className="px-3 py-3 text-center">
                      {log.image_url ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          <ImageIcon className="w-3 h-3" /> Ada
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPrintTab(log.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', log.ref_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                          title="Buka / Cetak PDF di Tab Baru"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded mb-1.5 ${
                  selectedLog.doc_type === 'INVOICE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-teal-100 text-teal-800'
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
                <Trash2 className="w-3.5 h-3.5" /> Hapus dari Data Logger
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    openPrintTab(selectedLog.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', selectedLog.ref_id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Buka Dokumen PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
