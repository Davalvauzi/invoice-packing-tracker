import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, FileText, Calendar, Building2 } from 'lucide-react';

export default function SearchableInvoiceSelect({
  invoices = [],
  selectedId = null,
  selectedInvoiceNumber = '',
  onSelect,
  placeholder = 'Cari nomor invoice / customer...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find currently selected invoice
  const currentSelected = useMemo(() => {
    if (selectedId) {
      return invoices.find(i => String(i.id) === String(selectedId));
    }
    if (selectedInvoiceNumber) {
      return invoices.find(i => i.invoice_number === selectedInvoiceNumber);
    }
    return null;
  }, [invoices, selectedId, selectedInvoiceNumber]);

  // Filter invoices by search term (number, customer, PO, part)
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;
    const term = searchTerm.toLowerCase().trim();
    return invoices.filter(inv => {
      const invNum = (inv.invoice_number || '').toLowerCase();
      const custName = (inv.customer_name || '').toLowerCase();
      const poNo = (inv.customer_po_no || '').toLowerCase();
      const partName = (inv.part_name || '').toLowerCase();
      return invNum.includes(term) || custName.includes(term) || poNo.includes(term) || partName.includes(term);
    });
  }, [invoices, searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard ESC
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (inv) => {
    if (onSelect) onSelect(inv);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full min-w-[220px] max-w-[320px] sm:max-w-[360px] flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-teal-300 hover:border-teal-500 rounded-lg text-xs font-mono shadow-2xs transition-all cursor-pointer text-left"
        title="Klik untuk mencari dan memilih invoice"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Search className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          {currentSelected ? (
            <span className="font-bold text-slate-800 truncate">
              {currentSelected.invoice_number}
              <span className="text-slate-500 font-normal font-sans ml-1 text-[11px] truncate">
                ({currentSelected.customer_name})
              </span>
            </span>
          ) : (
            <span className="text-slate-400 font-sans">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-600' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-[320px] sm:w-[380px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Box Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-teal-600 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Ketik nomor invoice, PT / customer, PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white text-xs rounded-lg border border-teal-300 focus:border-teal-600 focus:outline-none font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-0.5">
              <span>Menampilkan {filteredInvoices.length} dari {invoices.length} invoice</span>
              {searchTerm && (
                <span className="text-teal-700 font-semibold truncate max-w-[160px]">"{searchTerm}"</span>
              )}
            </div>
          </div>

          {/* List of Invoices */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredInvoices.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                <p className="font-semibold text-slate-600">Tidak ada invoice ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Coba kata kunci nomor invoice atau customer lain</p>
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isSelected = (currentSelected && String(currentSelected.id) === String(inv.id)) ||
                  (selectedInvoiceNumber && inv.invoice_number === selectedInvoiceNumber);
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => handleSelect(inv)}
                    className={`w-full text-left p-2.5 hover:bg-teal-50/70 transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-teal-50 border-l-3 border-teal-600' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-teal-800 text-xs">
                          {inv.invoice_number}
                        </span>
                        {inv.invoice_date && (
                          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5 inline text-slate-400" />
                            {inv.invoice_date}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-[11px] font-semibold text-slate-800 truncate flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{inv.customer_name}</span>
                      </div>

                      {(inv.customer_po_no || inv.part_name) && (
                        <div className="text-[10px] text-slate-500 truncate">
                          {inv.customer_po_no && <span className="mr-2">PO: <strong className="font-mono text-slate-600">{inv.customer_po_no}</strong></span>}
                          {inv.part_name && <span className="truncate text-slate-500">{inv.part_name}</span>}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
