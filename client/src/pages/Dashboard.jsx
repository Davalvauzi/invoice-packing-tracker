import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Package, 
  Truck,
  Database, 
  Settings, 
  ArrowRight, 
  Printer, 
  Clock, 
  CheckCircle2,
  Layers,
  ChevronRight,
  ChevronDown,
  ListTree,
  List,
  CornerDownRight
} from 'lucide-react';

export default function Dashboard({ 
  setActiveView, 
  openPrintTab, 
  onOpenInvoiceModal, 
  onOpenPackingListModal,
  onOpenDeliveryOrderModal,
  refreshTrigger 
}) {
  const [allLogs, setAllLogs] = useState([]);
  const [viewMode, setViewMode] = useState('tree');
  const [expandedRows, setExpandedRows] = useState({});
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalPackingLists: 0,
    totalDeliveryOrders: 0,
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

      setAllLogs(logs);

      const invCount = logs.filter(l => l.doc_type === 'INVOICE').length;
      const plCount = logs.filter(l => l.doc_type === 'PACKING_LIST').length;
      const doCount = logs.filter(l => l.doc_type === 'DELIVERY_ORDER').length;

      setStats({
        totalInvoices: invCount,
        totalPackingLists: plCount,
        totalDeliveryOrders: doCount,
        totalCustomers: custs.length,
        recentLogs: logs.slice(0, 5)
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tree View Helpers
  const toggleRow = (docNum) => {
    setExpandedRows(prev => ({
      ...prev,
      [docNum]: !prev[docNum]
    }));
  };

  const treeData = useMemo(() => {
    const invoices = allLogs.filter(l => l.doc_type === 'INVOICE');
    const children = allLogs.filter(l => l.doc_type !== 'INVOICE');

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

      // 1. Direct doc_number match
      if (invoiceMap.has(child.doc_number)) {
        parentEntry = invoiceMap.get(child.doc_number);
      } 
      // 2. Reference in terms_of_delivery: 'Ref Inv: ...'
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

    // Take the 5 most recent parent invoices
    return {
      invoiceTrees: Array.from(invoiceMap.values()).slice(0, 5),
      orphans: orphans.slice(0, 5)
    };
  }, [allLogs]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header Greeting & Overview */}
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Main Menu Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sistem terintegrasi pembuatan & pelacakan Invoice, Packing List, Delivery Order, dan Riwayat Data Log.
        </p>
      </div>

      {/* Main Action Menu Cards (Mirip Tombol VBA dengan Modal Pop-up) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-10">
        
        {/* Card 1: Invoice Form (Opens Modal) */}
        <div 
          onClick={onOpenInvoiceModal}
          className="group relative bg-gradient-to-br from-emerald-700 to-teal-900 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-emerald-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-500/40 text-emerald-100 px-2 py-0.5 rounded mb-1.5">
              Dokumen Keuangan
            </span>
            <h2 className="text-base sm:text-lg font-bold mb-1 group-hover:text-emerald-200 transition-colors">
              Invoice Form
            </h2>
            <p className="text-[11px] sm:text-xs text-emerald-100/80 mb-4 leading-relaxed">
              Buka form invoice, catat ke log, dan cetak PDF A4.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-200 pt-3 border-t border-white/10 mt-auto">
            <span>Buka Modal</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Packing List Form (Opens Modal) */}
        <div 
          onClick={onOpenPackingListModal}
          className="group relative bg-gradient-to-br from-teal-700 to-emerald-900 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-teal-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white">
              <Package className="w-5 h-5" />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-500/40 text-teal-100 px-2 py-0.5 rounded mb-1.5">
              Dokumen Logistik
            </span>
            <h2 className="text-base sm:text-lg font-bold mb-1 group-hover:text-teal-200 transition-colors">
              Packing List Form
            </h2>
            <p className="text-[11px] sm:text-xs text-teal-100/80 mb-4 leading-relaxed">
              Buka form pengemasan, dimensi, box, dan palet.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-teal-200 pt-3 border-t border-white/10 mt-auto">
            <span>Buka Modal</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Delivery Order Form (Opens Modal) */}
        <div 
          onClick={onOpenDeliveryOrderModal}
          className="group relative bg-gradient-to-br from-[#0b4d53] to-[#083a3f] rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-teal-950/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-400/30 text-teal-100 px-2 py-0.5 rounded mb-1.5">
              Surat Jalan Fisik
            </span>
            <h2 className="text-base sm:text-lg font-bold mb-1 group-hover:text-teal-200 transition-colors">
              Delivery Order
            </h2>
            <p className="text-[11px] sm:text-xs text-teal-100/80 mb-4 leading-relaxed">
              Buka surat jalan nomor DO, customer, PO, dan part.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-teal-200 pt-3 border-t border-white/10 mt-auto">
            <span>Buka Modal</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Data Logger */}
        <div 
          onClick={() => setActiveView('data-logger')}
          className="group relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-slate-900/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white">
              <Database className="w-5 h-5" />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-200 px-2 py-0.5 rounded mb-1.5">
              Audit Trail Tree
            </span>
            <h2 className="text-base sm:text-lg font-bold mb-1 group-hover:text-slate-300 transition-colors">
              Data Logger
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300/80 mb-4 leading-relaxed">
              Lihat riwayat transaksi tree, filter, dan ekspor.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-3 border-t border-white/10 mt-auto">
            <span>Buka Log ({stats.totalInvoices + stats.totalPackingLists + stats.totalDeliveryOrders})</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 5: Master Data */}
        <div 
          onClick={() => setActiveView('master-data')}
          className="group relative bg-gradient-to-br from-blue-800 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-blue-950/15 cursor-pointer transform hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 text-white">
              <Settings className="w-5 h-5" />
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded mb-1.5">
              Konfigurasi
            </span>
            <h2 className="text-base sm:text-lg font-bold mb-1 group-hover:text-blue-200 transition-colors">
              Master Data
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-100/80 mb-4 leading-relaxed">
              Kelola master customer, terms, dan katalog part.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-blue-200 pt-3 border-t border-white/10 mt-auto">
            <span>Kelola ({stats.totalCustomers} Cust)</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
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
          <div className="p-2.5 rounded-lg bg-teal-50 text-[#0b4d53]">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Delivery Order</p>
            <p className="text-lg font-bold text-slate-900">{stats.totalDeliveryOrders}</p>
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
      </div>

      {/* Recent Submissions Section (Tree View & Flat View) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
        
        {/* Table Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">5 Transaksi Dokumen Terakhir</h3>
              <p className="text-[11px] text-slate-400">Tampilan transaksi mutakhir dengan sistem hirarki induk-anakan</p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('data-logger')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Buka Data Logger Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tree Toolbar Controls */}
        <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg border border-slate-300/60">
              <button
                onClick={() => setViewMode('tree')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={expandAll}
                  className="px-2 py-0.5 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors cursor-pointer"
                >
                  Buka Semua
                </button>
                <button
                  onClick={collapseAll}
                  className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  Tutup Semua
                </button>
              </div>
            )}
          </div>

          {viewMode === 'tree' && (
            <p className="text-[11px] text-slate-500 italic">
              💡 Induk: <b>Invoice</b> ➔ Anakan: <b>Packing List & Delivery Order</b>
            </p>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  {viewMode === 'tree' ? 'Tree' : 'No'}
                </th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">No. Dokumen</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Customer PO</th>
                <th className="px-4 py-3">Part Specification</th>
                <th className="px-3 py-3 text-center">Box</th>
                <th className="px-3 py-3 text-center">Pallet</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-slate-400">
                    Belum ada transaksi yang diinput. Klik tombol menu di atas untuk membuat dokumen pertama.
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
                      <React.Fragment key={`dash-tree-${inv.id}`}>
                        {/* Parent Invoice Row */}
                        <tr className="bg-white hover:bg-emerald-50/40 transition-colors group">
                          <td className="px-2 py-3 text-center" onClick={() => toggleRow(inv.doc_number)}>
                            {hasChildren ? (
                              <button
                                type="button"
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  isExpanded ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={isExpanded ? 'Tutup anakan' : 'Buka anakan'}
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-300 font-mono">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide bg-emerald-100 text-emerald-800">
                                INVOICE
                              </span>
                              {hasChildren && (
                                <div className="flex items-center gap-1">
                                  {plCount > 0 && (
                                    <span className="text-[9px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-bold border border-teal-200">
                                      {plCount} PL
                                    </span>
                                  )}
                                  {doCount > 0 && (
                                    <span className="text-[9px] bg-cyan-50 text-[#0b4d53] px-1.5 py-0.5 rounded font-bold border border-cyan-200">
                                      {doCount} DO
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-900 whitespace-nowrap">
                            {inv.doc_number}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {inv.doc_date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[170px] truncate">
                            {inv.customer_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                            {inv.po_no || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">
                            {inv.part_name || '-'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {inv.box_qty || 0}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {inv.pallet_qty || 0}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => openPrintTab('print-invoice', inv.ref_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Buka / Cetak PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </td>
                        </tr>

                        {/* Child Rows (Packing List & Delivery Order) */}
                        {isExpanded && group.children.map((child) => (
                          <tr 
                            key={`dash-child-${child.id}`}
                            className="bg-slate-50/70 hover:bg-slate-100/90 transition-colors border-l-4 border-l-emerald-600"
                          >
                            <td className="px-2 py-2.5 text-center text-slate-400">
                              <CornerDownRight className="w-3.5 h-3.5 ml-auto mr-1 text-slate-400" />
                            </td>
                            <td className="px-4 py-2.5 font-medium whitespace-nowrap">
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
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                              {child.doc_date}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-700 max-w-[170px] truncate">
                              {child.customer_name}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                              {child.po_no || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">
                              {child.part_name || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                              {child.box_qty || 0}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                              {child.pallet_qty || 0}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              {child.doc_type === 'PACKING_LIST' && (
                                <button
                                  onClick={() => openPrintTab('print-packing-list', child.ref_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  title="Buka / Cetak PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>PDF</span>
                                </button>
                              )}
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
                        <td colSpan={10} className="px-4 py-2 font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                          📁 Dokumen Lainnya / Tanpa Induk Invoice Terhubung ({treeData.orphans.length})
                        </td>
                      </tr>
                      {treeData.orphans.map((orphan, oIdx) => (
                        <tr key={`dash-orphan-${orphan.id}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                            {oIdx + 1}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                              orphan.doc_type === 'PACKING_LIST'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-cyan-100 text-[#0b4d53]'
                            }`}>
                              {orphan.doc_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {orphan.doc_number}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {orphan.doc_date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-[170px] truncate">
                            {orphan.customer_name}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                            {orphan.po_no || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">
                            {orphan.part_name || '-'}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {orphan.box_qty || 0}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                            {orphan.pallet_qty || 0}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {orphan.doc_type === 'PACKING_LIST' && (
                              <button
                                onClick={() => openPrintTab('print-packing-list', orphan.ref_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Buka / Cetak PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              ) : (
                /* FLAT VIEW MODE */
                stats.recentLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
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
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {log.doc_number}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {log.doc_date}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[170px] truncate">
                      {log.customer_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {log.po_no || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">
                      {log.part_name || '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                      {log.box_qty || 0}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                      {log.pallet_qty || 0}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {log.doc_type !== 'DELIVERY_ORDER' && (
                        <button
                          onClick={() => openPrintTab(log.doc_type.toLowerCase() === 'invoice' ? 'print-invoice' : 'print-packing-list', log.ref_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Buka / Cetak PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      )}
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
