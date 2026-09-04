import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Package, 
  Database, 
  Settings, 
  ArrowRight, 
  Printer, 
  Plus, 
  Clock, 
  CheckCircle2,
  Layers
} from 'lucide-react';

export default function Dashboard({ 
  setActiveView, 
  openPrintTab, 
  onOpenInvoiceModal, 
  onOpenPackingListModal,
  refreshTrigger 
}) {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalPackingLists: 0,
    totalCustomers: 0,
    recentLogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      const [logsRes, custsRes] = await Promise.all([
        fetch('/api/data-logger'),
        fetch('/api/customers')
      ]);
      const logs = await logsRes.json();
      const custs = await custsRes.json();

      const invCount = logs.filter(l => l.doc_type === 'INVOICE').length;
      const plCount = logs.filter(l => l.doc_type === 'PACKING_LIST').length;

      setStats({
        totalInvoices: invCount,
        totalPackingLists: plCount,
        totalCustomers: custs.length,
        recentLogs: logs.slice(0, 5)
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Greeting & Overview */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Main Menu Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistem terintegrasi pembuatan & pelacakan Invoice, Packing List, dan Riwayat Data Log.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onOpenInvoiceModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Invoice Form (Modal)
          </button>
          <button 
            onClick={onOpenPackingListModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold hover:bg-teal-900 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Packing List (Modal)
          </button>
        </div>
      </div>

      {/* Main Action Menu Cards (Mirip Tombol VBA dengan Modal Pop-up) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Card 1: Invoice Form (Opens Modal) */}
        <div 
          onClick={onOpenInvoiceModal}
          className="group relative bg-gradient-to-br from-emerald-700 to-teal-900 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 text-white">
            <FileText className="w-6 h-6" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded mb-2">
            Dokumen Keuangan
          </span>
          <h2 className="text-xl font-bold mb-1 group-hover:text-emerald-200 transition-colors">
            Invoice Form
          </h2>
          <p className="text-xs text-emerald-100/80 mb-5 leading-relaxed">
            Buka modal form pembuatan invoice, rekam ke Data Logger, dan langsung cetak PDF A4.
          </p>
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-200 pt-3 border-t border-white/10">
            <span>Buka Modal Input</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Packing List Form (Opens Modal) */}
        <div 
          onClick={onOpenPackingListModal}
          className="group relative bg-gradient-to-br from-teal-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg shadow-teal-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 text-white">
            <Package className="w-6 h-6" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-teal-500/40 text-teal-100 px-2 py-0.5 rounded mb-2">
            Dokumen Logistik
          </span>
          <h2 className="text-xl font-bold mb-1 group-hover:text-teal-200 transition-colors">
            Packing List Form
          </h2>
          <p className="text-xs text-teal-100/80 mb-5 leading-relaxed">
            Buka modal form spesifikasi pengemasan, dimensi part, box, palet, dan drawing.
          </p>
          <div className="flex items-center justify-between text-xs font-semibold text-teal-200 pt-3 border-t border-white/10">
            <span>Buka Modal Input</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Data Logger */}
        <div 
          onClick={() => setActiveView('data-logger')}
          className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 text-white">
            <Database className="w-6 h-6" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-slate-700 text-slate-200 px-2 py-0.5 rounded mb-2">
            Audit Trail
          </span>
          <h2 className="text-xl font-bold mb-1 group-hover:text-slate-300 transition-colors">
            Data Logger
          </h2>
          <p className="text-xs text-slate-300/80 mb-5 leading-relaxed">
            Lihat histori transaksi, multi-filter, ekspor CSV/Excel, dan cetak ulang berkas.
          </p>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-3 border-t border-white/10">
            <span>Buka Riwayat ({stats.totalInvoices + stats.totalPackingLists})</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Master Data */}
        <div 
          onClick={() => setActiveView('master-data')}
          className="group relative bg-gradient-to-br from-blue-800 to-indigo-950 rounded-2xl p-6 text-white shadow-lg shadow-blue-950/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden"
        >
          <div className="absolute right-[-10px] top-[-10px] w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 text-white">
            <Settings className="w-6 h-6" />
          </div>
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded mb-2">
            Konfigurasi Template
          </span>
          <h2 className="text-xl font-bold mb-1 group-hover:text-blue-200 transition-colors">
            Master Data
          </h2>
          <p className="text-xs text-blue-100/80 mb-5 leading-relaxed">
            Data customer, payment terms, delivery terms, dan katalog part untuk pengisian cepat.
          </p>
          <div className="flex items-center justify-between text-xs font-semibold text-blue-200 pt-3 border-t border-white/10">
            <span>Kelola Master ({stats.totalCustomers} Customer)</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Invoice</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalInvoices}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Packing List</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalPackingLists}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Master Customer</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Status Sistem</p>
            <p className="text-xs font-bold text-emerald-700">Aktif & Siap LAN</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">5 Transaksi Dokumen Terakhir</h3>
          </div>
          <button
            onClick={() => setActiveView('data-logger')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            Buka Data Logger Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Tipe</th>
                <th className="px-6 py-3">No. Dokumen</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Customer PO</th>
                <th className="px-6 py-3">Part Name</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Belum ada transaksi yang diinput. Klik tombol di atas untuk membuat dokumen pertama.
                  </td>
                </tr>
              ) : (
                stats.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        log.doc_type === 'INVOICE' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-teal-100 text-teal-800'
                      }`}>
                        {log.doc_type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">
                      {log.doc_number}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {log.doc_date}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {log.customer_name}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      {log.po_no || '-'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {log.part_name || '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => openPrintTab(log.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', log.ref_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 font-medium transition-colors"
                        title="Buka / Cetak PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
