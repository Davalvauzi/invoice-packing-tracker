import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Save, 
  Check, 
  Globe, 
  Phone, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  Award,
  PenTool,
  Hash,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  Database,
  Sparkles,
  Trash2,
  AlertTriangle,
  Eraser,
  Sliders,
  X,
  CheckSquare,
  Square,
  Info
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function WebsiteSettings({ refreshTrigger }) {
  const { showSuccess, showError, showWarning, confirmDialog } = useNotification();
  const [settings, setSettings] = useState({
    company_name: '',
    company_address_line1: '',
    company_address_line2: '',
    company_phone: '',
    company_fax: '',
    company_website: '',
    company_logo_url: '',
    iso_cert_logo_url: '',
    tuv_cert_logo_url: '',
    hts_code_invoice: '8504.40.90',
    hts_code_do: '8504.40.00',
    bank_drawn_in_favour: '',
    bank_name: '',
    bank_account_no: '',
    bank_swift_code: '',
    bank_branch: '',
    bank_currency: 'USD',
    country_of_origin: 'INDONESIA',
    manufacture_name_address: '',
    prepared_by_name: '',
    prepared_by_title: '',
    prepared_by_sign_url: '',
    authorized_sign_name: '',
    authorized_sign_title: '',
    authorized_sign_url: '',
    doc_control_code: 'FRM-ACC-01 Rev.02'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [uploadingField, setUploadingField] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan');
      const updated = await res.json();
      setSettings(updated);
      setSaveSuccess(true);
      showSuccess('Pengaturan website & template faktur berhasil disimpan!');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      showError(err.message, 'Gagal Menyimpan Pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingField(fieldName);
    try {
      const res = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload gagal');
      const data = await res.json();
      setSettings(prev => ({ ...prev, [fieldName]: data.url }));
      showSuccess('Logo berhasil diunggah dan disimpan!');
    } catch (err) {
      showError(err.message, 'Gagal Mengunggah Logo');
    } finally {
      setUploadingField(null);
    }
  };

  const [generatingDummy, setGeneratingDummy] = useState(false);
  const [clearingDummy, setClearingDummy] = useState(false);
  const [dummyStats, setDummyStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Handle ESC key to close custom dummy modal
  useEffect(() => {
    if (!isCustomModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCustomModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomModalOpen]);

  const [seederConfig, setSeederConfig] = useState({
    count: 10,
    dateRangeMonths: 6,
    includePL: true,
    includeDO: true,
    currencies: ['USD', 'IDR', 'JPY']
  });

  const fetchDummyStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/dummy-data/stats');
      if (res.ok) {
        const data = await res.json();
        setDummyStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dummy stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'demo-data') {
      fetchDummyStats();
    }
  }, [activeTab]);

  const handleGenerateDummy = async (isCustom = false) => {
    if (!isCustom) {
      const ok = await confirmDialog({
        title: 'Jalankan Database Seeder (Preset 10 Faktur)',
        message: 'Apakah Anda yakin ingin men-generate 10 transaksi faktur sintetis murni acak lengkap dengan master customer industri, katalog part, harga, tanggal tersebar 6 bulan terakhir, serta dokumen turunan (Packing List & DO)?',
        confirmText: 'Ya, Jalankan Seeder',
        type: 'info'
      });
      if (!ok) return;
    }
    setGeneratingDummy(true);
    try {
      const payload = isCustom ? seederConfig : {
        count: 10,
        dateRangeMonths: 6,
        includePL: true,
        includeDO: true,
        currencies: ['USD', 'IDR', 'JPY']
      };
      const res = await fetch('/api/dummy-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message, 'Database Seeder Berhasil');
        if (isCustom) setIsCustomModalOpen(false);
        fetchSettings();
        fetchDummyStats();
      } else {
        showError(data.error || 'Terjadi kesalahan saat generate data');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setGeneratingDummy(false);
    }
  };

  const handleClearDummy = async (modeInput = 'dummy_only') => {
    const mode = typeof modeInput === 'string' ? modeInput : 'dummy_only';
    let title = 'Konfirmasi Pembersihan';
    let msg = '';
    let confirmType = 'warning';
    let confirmBtnText = 'Ya, Bersihkan';

    if (mode === 'dummy_only') {
      title = 'Hapus Data Dummy Saja';
      msg = 'Hanya data bertanda DUMMY (Customer sampel, Produk sampel, dan Dokumen contoh) yang akan dihapus.\n\nData asli/manual buatan Anda dijamin TETAP AMAN tersimpan.\n\nLanjutkan pembersihan data dummy?';
      confirmType = 'warning';
      confirmBtnText = 'Hapus Dummy Saja';
    } else if (mode === 'transactions') {
      title = 'Reset Seluruh Transaksi';
      msg = 'Apakah Anda yakin ingin MENGHAPUS SEMUA TRANSAKSI (Invoice, Packing List, Delivery Order, dan Data Logger)?\n\nMaster data customer dan katalog produk tetap aman tersimpan.';
      confirmType = 'danger';
      confirmBtnText = 'Hapus Semua Transaksi';
    } else if (mode === 'all') {
      title = 'PERINGATAN KERAS: Reset Total Database';
      msg = 'PERINGATAN KERAS: Seluruh database (transaksi & master data) akan dikosongkan total kembali seperti baru!\n\nTindakan ini tidak dapat dibatalkan.\n\nApakah Anda benar-benar yakin?';
      confirmType = 'danger';
      confirmBtnText = 'Ya, Kosongkan Total';
    }

    const ok = await confirmDialog({
      title,
      message: msg,
      confirmText: confirmBtnText,
      type: confirmType
    });
    if (!ok) return;

    setClearingDummy(true);
    try {
      const res = await fetch('/api/dummy-data/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(data.message, 'Database Bersih!');
        fetchDummyStats();
      } else {
        showError(data.error || 'Terjadi kesalahan saat pembersihan');
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setClearingDummy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-800" />
        <p className="text-sm font-medium">Memuat pengaturan website & template dokumen...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Website & Template Settings</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi profil perusahaan, logo, data bank, HTS Code, tanda tangan, dan kode formulir ISO untuk cetak dokumen.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            saveSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-emerald-800 hover:bg-emerald-900 text-white disabled:opacity-50'
          }`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'SIMPAN PERUBAHAN'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
        {[
          { id: 'company', label: 'Profil Perusahaan (Kop)', icon: Building2 },
          { id: 'logos', label: 'Logo & Sertifikasi', icon: Award },
          { id: 'hts', label: 'HTS Code & Kode Dokumen', icon: Hash },
          { id: 'bank', label: 'Bank & Remittance', icon: CreditCard },
          { id: 'signatures', label: 'Tanda Tangan / Otorisasi', icon: PenTool },
          { id: 'demo-data', label: 'Data Dummy & Reset', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Form Body */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* TAB 1: Company Profile */}
        {activeTab === 'company' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Warna Ungu Dokumen (Kop Perusahaan)
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Identitas & Kontak Perusahaan</h2>
              <p className="text-xs text-slate-500">
                Informasi ini akan tercetak pada bagian atas tengah template dokumen.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Resmi Perusahaan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={settings.company_name}
                onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-bold"
                placeholder="Contoh: PT. PATCO ELEKTRONIK TEKNOLOGI"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alamat Baris 1
                </label>
                <input
                  type="text"
                  value={settings.company_address_line1}
                  onChange={e => setSettings({ ...settings, company_address_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="Contoh: Kawasan Industri MM2100 Blok LL-1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alamat Baris 2 (Kota, Kode Pos, Negara)
                </label>
                <input
                  type="text"
                  value={settings.company_address_line2}
                  onChange={e => setSettings({ ...settings, company_address_line2: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="Contoh: Cikarang Barat, Bekasi 17520 - INDONESIA"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={settings.company_phone}
                  onChange={e => setSettings({ ...settings, company_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="+62 21 8980300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Fax
                </label>
                <input
                  type="text"
                  value={settings.company_fax}
                  onChange={e => setSettings({ ...settings, company_fax: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="+62 21 8980301"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={settings.company_website}
                  onChange={e => setSettings({ ...settings, company_website: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="www.patco.co.id"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Country of Origin & Manufacture Info (Merah Kanan Bawah)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    value={settings.country_of_origin}
                    onChange={e => setSettings({ ...settings, country_of_origin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-bold"
                    placeholder="COUNTRY OF ORIGIN: INDONESIA"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Negara Asal (Default: INDONESIA)</span>
                </div>
                <div className="sm:col-span-2">
                  <textarea
                    rows={2}
                    value={settings.manufacture_name_address}
                    onChange={e => setSettings({ ...settings, manufacture_name_address: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                    placeholder="Manufacture Name & Address..."
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Logos & Certifications */}
        {activeTab === 'logos' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Logo Perusahaan & Sertifikasi Dokumen</h2>
              <p className="text-xs text-slate-500">
                Upload file gambar (PNG / JPG / SVG) untuk logo perusahaan dan sertifikasi akreditasi yang muncul di header dokumen.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Logo 1: Company Logo (Left) */}
              <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded block w-fit mb-2">
                    Logo Utama (Kiri Atas)
                  </span>
                  <p className="text-xs font-bold text-slate-800 mb-1">Logo Perusahaan (Contoh: PATCO)</p>
                  <p className="text-[11px] text-slate-400 mb-3">Format PNG transparan atau SVG direkomendasikan.</p>

                  <div className="h-28 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 mb-3 overflow-hidden">
                    {settings.company_logo_url ? (
                      <img 
                        src={settings.company_logo_url} 
                        alt="Company Logo" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-2xl tracking-tighter">
                        <div className="border-2 border-emerald-800 px-3 py-1 rounded-full">
                          PATCO
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'company_logo_url' ? 'Mengunggah...' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, 'company_logo_url')}
                    />
                  </label>
                  {settings.company_logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, company_logo_url: '' })}
                      className="text-[10px] text-red-500 hover:underline block text-center mt-1.5"
                    >
                      Reset ke Logo Default
                    </button>
                  )}
                </div>
              </div>

              {/* Logo 2: ISO Certification (Right) */}
              <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded block w-fit mb-2">
                    Sertifikasi (Kanan Atas)
                  </span>
                  <p className="text-xs font-bold text-slate-800 mb-1">Logo ISO 9001 / 14001 (Bureau Veritas)</p>
                  <p className="text-[11px] text-slate-400 mb-3">Tanda akreditasi mutu standar internasional.</p>

                  <div className="h-28 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 mb-3 overflow-hidden">
                    {settings.iso_cert_logo_url ? (
                      <img 
                        src={settings.iso_cert_logo_url} 
                        alt="ISO Cert Logo" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-red-700 block uppercase">ISO 9001 / 14001</span>
                        <span className="text-[9px] text-slate-500 block">BUREAU VERITAS</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'iso_cert_logo_url' ? 'Mengunggah...' : 'Upload Logo ISO'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, 'iso_cert_logo_url')}
                    />
                  </label>
                  {settings.iso_cert_logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, iso_cert_logo_url: '' })}
                      className="text-[10px] text-red-500 hover:underline block text-center mt-1.5"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>

              {/* Logo 3: TUV SUD (Right) */}
              <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded block w-fit mb-2">
                    Sertifikasi (Kanan Atas)
                  </span>
                  <p className="text-xs font-bold text-slate-800 mb-1">Logo TUV SUD (ISO 13485)</p>
                  <p className="text-[11px] text-slate-400 mb-3">Tanda sertifikasi keamanan perangkat.</p>

                  <div className="h-28 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-3 mb-3 overflow-hidden">
                    {settings.tuv_cert_logo_url ? (
                      <img 
                        src={settings.tuv_cert_logo_url} 
                        alt="TUV SUD Logo" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-[10px] font-extrabold text-blue-900 block">TÜV SÜD</span>
                        <span className="text-[9px] text-slate-500 block">ISO 13485</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'tuv_cert_logo_url' ? 'Mengunggah...' : 'Upload Logo TUV'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, 'tuv_cert_logo_url')}
                    />
                  </label>
                  {settings.tuv_cert_logo_url && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, tuv_cert_logo_url: '' })}
                      className="text-[10px] text-red-500 hover:underline block text-center mt-1.5"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: HTS Code & Document Code */}
        {activeTab === 'hts' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Warna Kuning & Merah Kanan Bawah
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Pengaturan HTS Code & Kode Kontrol Dokumen</h2>
              <p className="text-xs text-slate-500">
                Kode HTS dibedakan secara otomatis antara dokumen Invoice dan Delivery Order sesuai permintaan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  HTS Code (Invoice) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.hts_code_invoice}
                  onChange={e => setSettings({ ...settings, hts_code_invoice: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-amber-600 font-mono font-bold bg-white"
                  placeholder="Contoh: 8504.40.90"
                />
                <p className="text-[11px] text-amber-900/80 mt-1.5">
                  Tercetak di atas tabel bagian kanan template Invoice: <b>HTS CODE : {settings.hts_code_invoice || '8504.40.90'}</b>
                </p>
              </div>

              <div className="p-4 bg-cyan-50/60 rounded-xl border border-cyan-200/80">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  HTS Code (Delivery Order)
                </label>
                <input
                  type="text"
                  value={settings.hts_code_do}
                  onChange={e => setSettings({ ...settings, hts_code_do: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-cyan-600 font-mono font-bold bg-white"
                  placeholder="Contoh: 8504.40.00"
                />
                <p className="text-[11px] text-cyan-900/80 mt-1.5">
                  Digunakan untuk dokumen Delivery Order (dibedakan sesuai arahan Anda).
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Kode Kontrol Formulir ISO (Merah Kanan Paling Bawah)
              </label>
              <div className="max-w-xs">
                <input
                  type="text"
                  value={settings.doc_control_code}
                  onChange={e => setSettings({ ...settings, doc_control_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-mono font-bold"
                  placeholder="FRM-ACC-01 Rev.02"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tercetak kecil di pojok paling kanan bawah kertas A4.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Bank Account & Remittance */}
        {activeTab === 'bank' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded">
                Warna Merah Kiri Bawah
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Data Rekening Bank & Instruksi Pembayaran</h2>
              <p className="text-xs text-slate-500">
                Instruksi pembayaran resmi yang akan muncul di bawah tabel Invoice untuk customer transfer dana.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                All Payment to be drawn in favour of:
              </label>
              <input
                type="text"
                value={settings.bank_drawn_in_favour}
                onChange={e => setSettings({ ...settings, bank_drawn_in_favour: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-bold"
                placeholder="PT. PATCO ELEKTRONIK TEKNOLOGI"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={settings.bank_name}
                  onChange={e => setSettings({ ...settings, bank_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="BANK CENTRAL ASIA (BCA)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nomor Rekening Bank
                </label>
                <input
                  type="text"
                  value={settings.bank_account_no}
                  onChange={e => setSettings({ ...settings, bank_account_no: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-mono font-bold"
                  placeholder="898-0123-456"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  value={settings.bank_swift_code}
                  onChange={e => setSettings({ ...settings, bank_swift_code: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-mono"
                  placeholder="CENAIDJA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Cabang Bank
                </label>
                <input
                  type="text"
                  value={settings.bank_branch}
                  onChange={e => setSettings({ ...settings, bank_branch: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700"
                  placeholder="KCU Cikarang Industrial Estate"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mata Uang Rekening
                </label>
                <input
                  type="text"
                  value={settings.bank_currency}
                  onChange={e => setSettings({ ...settings, bank_currency: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 font-mono font-bold"
                  placeholder="USD"
                />
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: Signatures & Authorization */}
        {activeTab === 'signatures' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded">
                Warna Merah Area Tanda Tangan
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">Tanda Tangan & Otorisasi Dokumen</h2>
              <p className="text-xs text-slate-500">
                Pengaturan dua kolom tanda tangan pada bagian bawah invoice (Pembuat Dokumen & Authorized Signature).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Signer 1: Prepared By (Left) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs pb-2 border-b border-slate-200">
                  <PenTool className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Kolom Tanda Tangan 1 (Kiri)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Judul Jabatan / Kolom
                  </label>
                  <input
                    type="text"
                    value={settings.prepared_by_title}
                    onChange={e => setSettings({ ...settings, prepared_by_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 bg-white"
                    placeholder="Prepared By"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nama Penandatangan
                  </label>
                  <input
                    type="text"
                    value={settings.prepared_by_name}
                    onChange={e => setSettings({ ...settings, prepared_by_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 bg-white font-semibold"
                    placeholder="Nama Staf / Supervisor"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Gambar TTD Digital (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    {settings.prepared_by_sign_url && (
                      <img 
                        src={settings.prepared_by_sign_url} 
                        alt="Sign" 
                        className="h-10 border rounded bg-white p-1" 
                      />
                    )}
                    <label className="py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                      <Upload className="w-3 h-3 inline mr-1" />
                      <span>Upload TTD</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, 'prepared_by_sign_url')}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Signer 2: Authorized Signature (Right) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs pb-2 border-b border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Kolom Tanda Tangan 2 (Kanan - Otorisasi)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Judul Jabatan / Kolom
                  </label>
                  <input
                    type="text"
                    value={settings.authorized_sign_title}
                    onChange={e => setSettings({ ...settings, authorized_sign_title: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 bg-white"
                    placeholder="Authorized Signature"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Nama Pejabat / Departemen
                  </label>
                  <input
                    type="text"
                    value={settings.authorized_sign_name}
                    onChange={e => setSettings({ ...settings, authorized_sign_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-emerald-700 bg-white font-semibold"
                    placeholder="Finance & Accounting Dept"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Gambar TTD / Stempel Digital (Opsional)
                  </label>
                  <div className="flex items-center gap-2">
                    {settings.authorized_sign_url && (
                      <img 
                        src={settings.authorized_sign_url} 
                        alt="Auth Sign" 
                        className="h-10 border rounded bg-white p-1" 
                      />
                    )}
                    <label className="py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                      <Upload className="w-3 h-3 inline mr-1" />
                      <span>Upload TTD / Stempel</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, 'authorized_sign_url')}
                      />
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: Data Dummy & Reset */}
        {activeTab === 'demo-data' && (
          <div className="space-y-4">
            
            {/* Bar Status Ringkas */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-700">Status Data:</span>
                {dummyStats ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${dummyStats.dummy.customers > 0 || dummyStats.dummy.invoices > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {dummyStats.dummy.customers > 0 || dummyStats.dummy.invoices > 0 ? (
                        <>● Dummy Aktif: <strong>{dummyStats.dummy.customers}</strong> Cust, <strong>{dummyStats.dummy.parts}</strong> Part, <strong>{dummyStats.dummy.invoices}</strong> Faktur</>
                      ) : (
                        <>✓ Database Bersih dari Data Dummy</>
                      )}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      Total Data: <strong>{dummyStats.total.customers}</strong> Cust, <strong>{dummyStats.total.parts}</strong> Part, <strong>{dummyStats.total.invoices}</strong> Faktur
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">Memuat status...</span>
                )}
              </div>
              <button
                type="button"
                onClick={fetchDummyStats}
                disabled={statsLoading}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium cursor-pointer transition-colors"
                title="Perbarui status data dummy"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Compact 3-Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              
              {/* Card 1: Input Data Dummy (Procedural Seeder) */}
              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">Database Seeder</h3>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                      Procedural
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Generate transaksi acak sintetis (Customer, Part, Tanggal tersebar, Multi-kurs, serta Packing List & DO terkait).
                  </p>
                  <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2.5 space-y-1 border border-slate-100">
                    <div>• <strong>Murni Acak & Realistis</strong> (Bukan template kaku)</div>
                    <div>• <strong>Multi-Currency</strong> (USD, IDR, JPY) & PPN</div>
                    <div>• <strong>Auto Link Tree View</strong> (Invoice → PL → DO)</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateDummy(false)}
                    disabled={generatingDummy}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {generatingDummy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{generatingDummy ? 'Mengisi...' : '⚡ Preset (10 Data)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomModalOpen(true)}
                    disabled={generatingDummy}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Custom Seeder...</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Hapus Data Dummy Saja */}
              <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                        <Eraser className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">Hapus Data Dummy Saja</h3>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Aman
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Menghapus <strong>HANYA</strong> data bertanda dummy / hasil seeder. Master customer dan invoice riil yang Anda buat manual <strong>tetap utuh</strong>.
                  </p>
                  <div className="text-[11px] text-emerald-800 bg-emerald-50/60 rounded-lg p-2 space-y-0.5 border border-emerald-100">
                    <div className="font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Proteksi Data Asli Aktif
                    </div>
                    <div className="text-[10px] text-slate-500">Cocok digunakan setelah demo pengujian selesai tanpa risiko menghapus data penting buatan sendiri.</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleClearDummy('dummy_only')}
                    disabled={clearingDummy}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {clearingDummy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
                    <span>{clearingDummy ? 'Membersihkan...' : 'Hapus Data Dummy Saja'}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Pembersihan Total */}
              <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-rose-100 text-rose-800 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">Pembersihan Total</h3>
                    </div>
                    <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100">
                      Permanen
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pilihan pembersihan massal untuk mereset riwayat transaksi atau mengosongkan seluruh isi database.
                  </p>
                  <div className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
                    <div>• <strong>Reset Transaksi</strong>: Hapus invoice, PL & log (Master customer & part aman).</div>
                    <div>• <strong>Reset Total</strong>: Kosongkan seluruh tabel database.</div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleClearDummy('transactions')}
                    disabled={clearingDummy}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Transaksi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearDummy('all')}
                    disabled={clearingDummy}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Reset Total</span>
                  </button>
                </div>
              </div>

            </div>

            {/* MODAL: Kustomisasi Database Seeder */}
            {isCustomModalOpen && (
              <div 
                onClick={() => setIsCustomModalOpen(false)}
                className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]"
                >
                  
                  {/* Header Modal */}
                  <div className="px-7 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shadow-xs">
                        <Sliders className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Custom Database Seeder</h3>
                        <p className="text-xs text-slate-500">Atur parameter dan kuantitas data transaksi sintetis dengan leluasa</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCustomModalOpen(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title="Tutup (ESC)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Body Modal (2 Columns Wide Layout) */}
                  <div className="p-7 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Kolom Kiri: Kuantitas & Rentang Waktu */}
                    <div className="space-y-6">
                      {/* Parameter 1: Jumlah Data Faktur */}
                      <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            Jumlah Transaksi Faktur
                          </span>
                          <span className="text-emerald-700 font-extrabold text-sm px-2.5 py-0.5 bg-emerald-100/70 rounded-lg">{seederConfig.count} Faktur</span>
                        </label>
                        
                        {/* Quick Chips */}
                        <div className="grid grid-cols-4 gap-2">
                          {[5, 10, 25, 50].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSeederConfig(prev => ({ ...prev, count: val }))}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                seederConfig.count === val 
                                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-800/20' 
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {val} Data
                            </button>
                          ))}
                        </div>

                        {/* Manual Numeric Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={seederConfig.count}
                            onChange={e => setSeederConfig(prev => ({ ...prev, count: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                            placeholder="Ketik angka kustom (1 - 100)"
                          />
                          <span className="text-xs font-semibold text-slate-400 shrink-0 px-2">Maks. 100</span>
                        </div>
                      </div>

                      {/* Parameter 2: Rentang Waktu Tanggal */}
                      <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          Rentang Waktu Tanggal Dokumen
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '1 Bulan Lalu', value: 1 },
                            { label: '3 Bulan Lalu', value: 3 },
                            { label: '6 Bulan Lalu', value: 6 }
                          ].map(item => (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => setSeederConfig(prev => ({ ...prev, dateRangeMonths: item.value }))}
                              className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                                seederConfig.dateRangeMonths === item.value
                                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-800/20'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                          Tanggal faktur akan diacak tersebar sehingga grafik riwayat dan filter tanggal di Data Logger tampil dinamis & realistis.
                        </p>
                      </div>
                    </div>

                    {/* Kolom Kanan: Mata Uang & Relasi Tree View */}
                    <div className="space-y-6">
                      {/* Parameter 3: Variasi Mata Uang */}
                      <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          Mata Uang yang Diacak
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { code: 'USD', name: 'Dollar (USD)', symbol: '$' },
                            { code: 'IDR', name: 'Rupiah (IDR)', symbol: 'Rp' },
                            { code: 'JPY', name: 'Yen (JPY)', symbol: '¥' }
                          ].map(curr => {
                            const isChecked = seederConfig.currencies.includes(curr.code);
                            return (
                              <label 
                                key={curr.code} 
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-500' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSeederConfig(prev => ({ ...prev, currencies: [...prev.currencies, curr.code] }));
                                    } else {
                                      if (seederConfig.currencies.length > 1) {
                                        setSeederConfig(prev => ({ ...prev, currencies: prev.currencies.filter(c => c !== curr.code) }));
                                      }
                                    }
                                  }}
                                  className="sr-only"
                                />
                                <span className="text-lg font-black font-mono mb-0.5">{curr.symbol}</span>
                                <span className="text-xs">{curr.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Parameter 4: Relasi Dokumen Turunan */}
                      <div className="bg-slate-50/90 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          Dokumen Turunan Otomatis (Hierarki Tree View)
                        </label>

                        <div className="space-y-2.5">
                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer shadow-2xs">
                            <input
                              type="checkbox"
                              checked={seederConfig.includePL}
                              onChange={e => setSeederConfig(prev => ({ ...prev, includePL: e.target.checked }))}
                              className="mt-0.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-800">Otomatis buatkan Packing List (PL)</span>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                Menautkan invoice dengan data kemasan box, pallet, dan dimensi part.
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-pointer shadow-2xs">
                            <input
                              type="checkbox"
                              checked={seederConfig.includeDO}
                              onChange={e => setSeederConfig(prev => ({ ...prev, includeDO: e.target.checked }))}
                              className="mt-0.5 rounded border-slate-300 text-emerald-800 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-800">Otomatis buatkan Delivery Order (DO)</span>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                Menghasilkan surat jalan pengiriman fisik sesuai nomor PO terkait.
                              </p>
                            </div>
                          </label>
                        </div>

                        <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-[11px] text-emerald-900 leading-relaxed">
                          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            Dokumen turunan otomatis ditautkan ke invoice induk sehingga tombol ekspansi <strong>Tree View `[ &gt; ]`</strong> di Data Logger langsung memiliki relasi lengkap.
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footer Modal */}
                  <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:inline">Tekan <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">ESC</kbd> untuk menutup</span>
                    <div className="flex items-center gap-2.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsCustomModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateDummy(true)}
                        disabled={generatingDummy}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {generatingDummy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{generatingDummy ? 'Sedang Men-generate...' : `🚀 Generate ${seederConfig.count} Data Sekarang`}</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </form>

    </div>
  );
}
