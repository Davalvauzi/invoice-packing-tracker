import React, { useState, useEffect, lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import InvoiceModal from './components/InvoiceModal';
import PackingListModal from './components/PackingListModal';
import DeliveryOrderModal from './components/DeliveryOrderModal';
import { NotificationProvider } from './context/NotificationContext';

// Lazy load modul halaman sekunder & cetak agar bundle utama ringan & cepat dimuat
const DataLogger = lazy(() => import('./pages/DataLogger'));
const MasterData = lazy(() => import('./pages/MasterData'));
const WebsiteSettings = lazy(() => import('./pages/WebsiteSettings'));
const PrintInvoice = lazy(() => import('./pages/PrintInvoice'));
const PrintPackingList = lazy(() => import('./pages/PrintPackingList'));
const PrintDeliveryOrder = lazy(() => import('./pages/PrintDeliveryOrder'));

function AppContent() {
  const [activeView, setActiveView] = useState(() => {
    return sessionStorage.getItem('docutrack_active_view') || 'dashboard';
  });
  const [printDoc, setPrintDoc] = useState(null);

  useEffect(() => {
    sessionStorage.setItem('docutrack_active_view', activeView);
  }, [activeView]);

  // Modal Overlay States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isPackingListModalOpen, setIsPackingListModalOpen] = useState(false);
  const [packingListInvoice, setPackingListInvoice] = useState(null);
  const [isDeliveryOrderModalOpen, setIsDeliveryOrderModalOpen] = useState(false);
  const [deliveryOrderInvoice, setDeliveryOrderInvoice] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditInvoice = (inv) => {
    setEditingInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenPackingListModal = (inv = null) => {
    const validInv = (inv && !inv.nativeEvent && (inv.invoice_number || inv.doc_number)) ? inv : null;
    setPackingListInvoice(validInv);
    setIsPackingListModalOpen(true);
  };

  const handleOpenDeliveryOrderModal = (inv = null) => {
    const validInv = (inv && !inv.nativeEvent && (inv.invoice_number || inv.doc_number)) ? inv : null;
    setDeliveryOrderInvoice(validInv);
    setIsDeliveryOrderModalOpen(true);
  };

  // Check URL parameters on mount (enables opening in a fresh new tab!)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');

    if (viewParam && idParam) {
      if (viewParam === 'print-invoice' || viewParam === 'print-packing-list' || viewParam === 'print-delivery-order') {
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
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-600 text-xs font-medium">Menyiapkan dokumen cetak...</p>
          </div>
        </div>
      }>
        {printDoc.view === 'print-invoice' && (
          <PrintInvoice 
            id={printDoc.id} 
            onBack={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setPrintDoc(null);
            }} 
          />
        )}
        {printDoc.view === 'print-packing-list' && (
          <PrintPackingList 
            id={printDoc.id} 
            onBack={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setPrintDoc(null);
            }} 
          />
        )}
        {printDoc.view === 'print-delivery-order' && (
          <PrintDeliveryOrder 
            id={printDoc.id} 
            onBack={() => {
              window.history.replaceState({}, '', window.location.pathname);
              setPrintDoc(null);
            }} 
          />
        )}
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-emerald-200 selection:text-emerald-950">
      
      {/* Top Navigation */}
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onOpenInvoiceModal={() => {
          setEditingInvoice(null);
          setIsInvoiceModalOpen(true);
        }}
        onOpenPackingListModal={handleOpenPackingListModal}
        onOpenDeliveryOrderModal={handleOpenDeliveryOrderModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        <Suspense fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium mt-3">Memuat modul aplikasi...</p>
          </div>
        }>
          {activeView === 'dashboard' && (
            <Dashboard 
              setActiveView={setActiveView} 
              openPrintTab={openPrintTab}
              onOpenInvoiceModal={() => {
                setEditingInvoice(null);
                setIsInvoiceModalOpen(true);
              }}
              onEditInvoice={handleEditInvoice}
              onOpenPackingListModal={handleOpenPackingListModal}
              onOpenDeliveryOrderModal={handleOpenDeliveryOrderModal}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeView === 'data-logger' && (
            <DataLogger 
              openPrintTab={openPrintTab} 
              onOpenInvoiceModal={() => {
                setEditingInvoice(null);
                setIsInvoiceModalOpen(true);
              }}
              onEditInvoice={handleEditInvoice}
              onOpenPackingListModal={handleOpenPackingListModal}
              onOpenDeliveryOrderModal={handleOpenDeliveryOrderModal}
              refreshTrigger={refreshTrigger}
            />
          )}

          {activeView === 'master-data' && (
            <MasterData 
              setActiveView={setActiveView} 
            />
          )}

          {activeView === 'website-settings' && (
            <WebsiteSettings 
              setActiveView={setActiveView} 
            />
          )}
        </Suspense>
      </main>

      {/* Global Invoice Form Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        openPrintTab={openPrintTab}
        onSuccess={handleDocumentSuccess}
        invoiceToEdit={editingInvoice}
      />

      {/* Global Packing List Form Modal */}
      <PackingListModal
        isOpen={isPackingListModalOpen}
        onClose={() => {
          setIsPackingListModalOpen(false);
          setPackingListInvoice(null);
        }}
        openPrintTab={openPrintTab}
        onSuccess={handleDocumentSuccess}
        initialInvoice={packingListInvoice}
      />

      {/* Global Delivery Order Form Modal */}
      <DeliveryOrderModal
        isOpen={isDeliveryOrderModalOpen}
        onClose={() => {
          setIsDeliveryOrderModalOpen(false);
          setDeliveryOrderInvoice(null);
        }}
        onSuccess={handleDocumentSuccess}
        initialInvoice={deliveryOrderInvoice}
      />

      {/* Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 no-print">
        <p>© 2026 PT. Global Presisi Logistik Indonesia. Invoice & Packing List Record System.</p>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
