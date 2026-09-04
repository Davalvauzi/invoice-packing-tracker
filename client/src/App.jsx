import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DataLogger from './pages/DataLogger';
import MasterData from './pages/MasterData';
import PrintInvoice from './pages/PrintInvoice';
import PrintPackingList from './pages/PrintPackingList';
import InvoiceModal from './components/InvoiceModal';
import PackingListModal from './components/PackingListModal';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [printDoc, setPrintDoc] = useState(null);

  // Modal Overlay States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPackingListModalOpen, setIsPackingListModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check URL parameters on mount (enables opening in a fresh new tab!)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');

    if (viewParam && idParam) {
      if (viewParam === 'print-invoice' || viewParam === 'print-packing-list') {
        setPrintDoc({ view: viewParam, id: idParam });
      }
    }
  }, []);

  const openPrintTab = (view, id) => {
    // Open in a new tab with query parameters
    const url = `${window.location.origin}${window.location.pathname}?view=${view}&id=${id}`;
    window.open(url, '_blank');
  };

  const handleDocumentSuccess = (data) => {
    // Trigger re-fetching on Dashboard and DataLogger
    setRefreshTrigger(prev => prev + 1);
  };

  // If in direct print/preview mode (opened in new tab)
  if (printDoc) {
    if (printDoc.view === 'print-invoice') {
      return (
        <PrintInvoice 
          id={printDoc.id} 
          onBack={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setPrintDoc(null);
          }} 
        />
      );
    }
    if (printDoc.view === 'print-packing-list') {
      return (
        <PrintPackingList 
          id={printDoc.id} 
          onBack={() => {
            window.history.replaceState({}, '', window.location.pathname);
            setPrintDoc(null);
          }} 
        />
      );
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-emerald-200 selection:text-emerald-950">
      
      {/* Top Navigation */}
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
        onOpenPackingListModal={() => setIsPackingListModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeView === 'dashboard' && (
          <Dashboard 
            setActiveView={setActiveView} 
            openPrintTab={openPrintTab}
            onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
            onOpenPackingListModal={() => setIsPackingListModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeView === 'data-logger' && (
          <DataLogger 
            openPrintTab={openPrintTab} 
            onOpenInvoiceModal={() => setIsInvoiceModalOpen(true)}
            onOpenPackingListModal={() => setIsPackingListModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeView === 'master-data' && (
          <MasterData 
            setActiveView={setActiveView} 
          />
        )}
      </main>

      {/* Global Invoice Form Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        openPrintTab={openPrintTab}
        onSuccess={handleDocumentSuccess}
      />

      {/* Global Packing List Form Modal */}
      <PackingListModal
        isOpen={isPackingListModalOpen}
        onClose={() => setIsPackingListModalOpen(false)}
        openPrintTab={openPrintTab}
        onSuccess={handleDocumentSuccess}
      />

      {/* Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 no-print">
        <p>© 2026 PT. Global Presisi Logistik Indonesia. Invoice & Packing List Record System.</p>
      </footer>

    </div>
  );
}
