import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Package, 
  Database, 
  Settings, 
  Home, 
  Wifi, 
  Copy, 
  Check,
  Plus
} from 'lucide-react';

export default function Navbar({ 
  activeView, 
  setActiveView, 
  onOpenInvoiceModal, 
  onOpenPackingListModal 
}) {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(err => console.error('Failed to fetch network info:', err));
  }, []);

  const copyLanUrl = () => {
    if (!networkInfo) return;
    const port = window.location.port || networkInfo.apiPort || 3001;
    const url = `http://${networkInfo.localIp}:${port}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const navItems = [
    { id: 'dashboard', label: 'Main Menu', icon: Home },
    { id: 'data-logger', label: 'Data Logger', icon: Database },
    { id: 'master-data', label: 'Master Data', icon: Settings },
  ];

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div 
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                Invoice & Packing List <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">Record</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Management & Audit Trail System</p>
            </div>
          </div>

          {/* Navigation Links (Main Views) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Quick Action Modal Buttons & LAN Badge */}
          <div className="flex items-center gap-2.5">
            
            {/* Quick Action Modals */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={onOpenInvoiceModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Buka Form Invoice (Modal)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Invoice Form</span>
              </button>

              <button
                onClick={onOpenPackingListModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Buka Form Packing List (Modal)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Packing List Form</span>
              </button>
            </div>

            {/* LAN Connection Badge */}
            {networkInfo && (
              <div 
                onClick={copyLanUrl}
                title="Klik untuk menyalin alamat IP Wi-Fi (LAN)"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer text-xs transition-colors group"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-medium leading-none">Wi-Fi IP (LAN)</span>
                  <span className="font-mono font-semibold text-slate-700 group-hover:text-emerald-800">
                    {networkInfo.localIp}:{window.location.port || networkInfo.apiPort || 3001}
                  </span>
                </div>
                <button className="text-slate-400 group-hover:text-emerald-700 ml-1 p-0.5 rounded">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-between border-t border-slate-200 py-2 bg-slate-50 px-3 overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-1 py-1 px-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-emerald-800 font-bold bg-emerald-100/50' : 'text-slate-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenInvoiceModal}
            className="px-2 py-1 bg-emerald-800 text-white rounded text-[11px] font-bold"
          >
            + Invoice
          </button>
          <button
            onClick={onOpenPackingListModal}
            className="px-2 py-1 bg-teal-800 text-white rounded text-[11px] font-bold"
          >
            + Packing List
          </button>
        </div>
      </div>
    </header>
  );
}
