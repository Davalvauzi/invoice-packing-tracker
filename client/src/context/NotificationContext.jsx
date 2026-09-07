import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev.slice(-4), { id, message, type, title }]);
  }, []);

  const showSuccess = useCallback((message, title = 'Berhasil!') => {
    showToast(message, 'success', title);
  }, [showToast]);

  const showError = useCallback((message, title = 'Terjadi Kesalahan') => {
    showToast(message, 'error', title);
  }, [showToast]);

  const showWarning = useCallback((message, title = 'Peringatan') => {
    showToast(message, 'warning', title);
  }, [showToast]);

  const showInfo = useCallback((message, title = 'Informasi') => {
    showToast(message, 'info', title);
  }, [showToast]);

  // Promise-based confirm dialog
  const confirmDialog = useCallback(({
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    type = 'warning' // 'warning' | 'danger' | 'info' | 'success'
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve: (value) => {
          setConfirmState(null);
          resolve(value);
        }
      });
    });
  }, []);

  // Handle ESC key to cancel confirm dialog
  useEffect(() => {
    if (!confirmState) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        confirmState.resolve(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState]);

  return (
    <NotificationContext.Provider value={{
      showToast,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      confirmDialog
    }}>
      {children}

      {/* FLOATING TOAST NOTIFICATIONS (TOP-RIGHT) */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 transform transition-all duration-200 animate-in slide-in-from-top-3 fade-in bg-white ${
                isSuccess ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/95 to-white text-emerald-950' :
                isError ? 'border-rose-200 bg-gradient-to-r from-rose-50/95 to-white text-rose-950' :
                isWarning ? 'border-amber-200 bg-gradient-to-r from-amber-50/95 to-white text-amber-950' :
                'border-slate-200 bg-gradient-to-r from-slate-50/95 to-white text-slate-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-600" />}
              </div>

              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-0.5">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs font-medium leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* WEB CONFIRMATION MODAL DIALOG */}
      {confirmState && (
        <div 
          onClick={() => confirmState.resolve(false)}
          className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Header / Icon Header */}
            <div className={`p-6 pb-4 flex items-start gap-4 ${
              confirmState.type === 'danger' ? 'bg-rose-50/80 border-b border-rose-100' :
              confirmState.type === 'warning' ? 'bg-amber-50/80 border-b border-amber-100' :
              'bg-emerald-50/80 border-b border-emerald-100'
            }`}>
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmState.type === 'danger' ? 'bg-rose-100 text-rose-600' :
                confirmState.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {confirmState.type === 'danger' && <AlertCircle className="w-7 h-7" />}
                {confirmState.type === 'warning' && <AlertTriangle className="w-7 h-7" />}
                {confirmState.type !== 'danger' && confirmState.type !== 'warning' && <Info className="w-7 h-7" />}
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {confirmState.title}
                </h3>
                <span className={`inline-block mt-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  confirmState.type === 'danger' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                  confirmState.type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {confirmState.type === 'danger' ? 'Perhatian Khusus' : 'Konfirmasi Tindakan'}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div className="p-6 py-5 text-xs text-slate-600 leading-relaxed space-y-2 whitespace-pre-line">
              {confirmState.message}
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {confirmState.cancelText}
              </button>

              <button
                type="button"
                autoFocus
                onClick={() => confirmState.resolve(true)}
                className={`px-5 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-98 ${
                  confirmState.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : confirmState.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    : 'bg-emerald-800 hover:bg-emerald-900 shadow-emerald-800/25'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
