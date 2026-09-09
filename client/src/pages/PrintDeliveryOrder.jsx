import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatIndoDate } from '../utils/dateFormatter';

export default function PrintDeliveryOrder({ id, onBack }) {
  const [deliveryOrder, setDeliveryOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (deliveryOrder) {
      const prevTitle = document.title;
      const code = deliveryOrder.do_number || deliveryOrder.invoice_number || deliveryOrder.id || '';
      const cleanCode = String(code).replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      document.title = cleanCode ? `delivery-order-${cleanCode}` : 'delivery-order';
      return () => {
        document.title = prevTitle;
      };
    }
  }, [deliveryOrder]);

  const handlePrint = () => {
    if (deliveryOrder) {
      const code = deliveryOrder.do_number || deliveryOrder.invoice_number || deliveryOrder.id || '';
      const cleanCode = String(code).replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      document.title = cleanCode ? `delivery-order-${cleanCode}` : 'delivery-order';
    }
    window.print();
  };

  const fetchData = async () => {
    try {
      const [doRes, setRes] = await Promise.all([
        fetch(`/api/delivery-orders/${id}`),
        fetch('/api/settings')
      ]);

      if (!doRes.ok) throw new Error('Delivery order not found');
      const doData = await doRes.json();
      const setData = await setRes.json();

      setDeliveryOrder(doData);
      setSettings(setData);
      if (setData) {
        setShowLetterhead(setData.show_letterhead !== undefined ? (setData.show_letterhead === 1 || setData.show_letterhead === true) : true);
      }

      if (doData.customer_name) {
        const cRes = await fetch(`/api/customers?name=${encodeURIComponent(doData.customer_name)}`);
        if (cRes.ok) {
          const found = await cRes.json();
          if (found) setCustomer(found);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-['Calibri',sans-serif]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 text-xs font-medium">Menyiapkan dokumen A4 Delivery Order...</p>
        </div>
      </div>
    );
  }

  if (!deliveryOrder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-['Calibri',sans-serif]">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-3 text-lg font-bold">!</div>
          <h3 className="text-slate-800 font-bold text-sm mb-1">Dokumen Tidak Ditemukan</h3>
          <p className="text-slate-500 text-xs mb-4">Data delivery order tidak ditemukan atau ID tidak valid.</p>
          <div className="flex gap-2 justify-center">
            {onBack ? (
              <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-700 transition cursor-pointer">
                Kembali
              </button>
            ) : (
              <button onClick={() => { window.location.href = '/'; }} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-700 transition cursor-pointer">
                Ke Dashboard
              </button>
            )}
            <button onClick={() => window.close()} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition cursor-pointer">
              Tutup Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-item parsing
  const rawItems = Array.isArray(deliveryOrder.items)
    ? deliveryOrder.items
    : (typeof deliveryOrder.items === 'string' && deliveryOrder.items.trim().startsWith('[')
        ? (() => { try { return JSON.parse(deliveryOrder.items); } catch (e) { return null; } })()
        : null);

  const hasMultipleItems = rawItems && rawItems.length > 0;

  // Helper to extract clean part name and part number
  const extractPartDetails = (rawName, explicitNo) => {
    let name = rawName || '';
    let no = explicitNo || '';
    const match = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      name = match[1].trim();
      if (!no) no = match[2].trim();
    }
    return { name, no };
  };

  const initialPart = extractPartDetails(deliveryOrder.part_name, deliveryOrder.part_no);
  const fallbackBox = Number(deliveryOrder.box_qty) || 0;
  let fallbackQtyPerCtn = Number(deliveryOrder.qty_per_box) || Number(deliveryOrder.qty_per_ctn) || 0;
  let fallbackTotalQty = Number(deliveryOrder.total_qty) || 0;

  if (!fallbackTotalQty && fallbackBox > 0 && fallbackQtyPerCtn > 0) {
    fallbackTotalQty = fallbackBox * fallbackQtyPerCtn;
  }
  if (!fallbackQtyPerCtn && fallbackBox > 0 && fallbackTotalQty > 0) {
    fallbackQtyPerCtn = Math.round(fallbackTotalQty / fallbackBox);
  }

  // Single fallback item
  const fallbackItem = {
    part_name: initialPart.name,
    part_no: initialPart.no,
    our_po_no: deliveryOrder.our_po_no || '',
    cust_po_no: deliveryOrder.customer_po_no || '',
    plt_no: deliveryOrder.pallet_qty ? `1~${deliveryOrder.pallet_qty}` : '1',
    no_of_ctn: fallbackBox,
    qty_per_ctn: fallbackQtyPerCtn,
    total_qty: fallbackTotalQty,
    remark: deliveryOrder.notes || ''
  };

  let cumulativePallet = 1;
  const items = hasMultipleItems ? rawItems.map((it, idx) => {
    const parsed = extractPartDetails(it.part_name, it.part_no);
    const ctn = Number(it.box_qty) || Number(it.no_of_ctn) || Number(it.no_of_box) || 0;
    let qpc = Number(it.qty_per_box) || Number(it.qty_per_ctn) || 0;
    let totQ = Number(it.total_qty) || 0;

    if (!totQ && ctn > 0 && qpc > 0) {
      totQ = ctn * qpc;
    }
    if (!qpc && ctn > 0 && totQ > 0) {
      qpc = Math.round(totQ / ctn);
    }

    // Hitung range pallet berurutan jika tidak ada explicit plt_no
    let pltDisplay = it.plt_no || it.pallet_no || '';
    if (!pltDisplay) {
      const pQty = Number(it.pallet_qty) || Number(it.no_of_pallet) || 0;
      if (pQty > 1) {
        pltDisplay = `${cumulativePallet}~${cumulativePallet + pQty - 1}`;
        cumulativePallet += pQty;
      } else if (pQty === 1) {
        pltDisplay = `${cumulativePallet}`;
        cumulativePallet += 1;
      } else {
        pltDisplay = `${idx + 1}`;
      }
    }

    return {
      part_name: parsed.name,
      part_no: parsed.no,
      our_po_no: it.our_po_no || deliveryOrder.our_po_no || '',
      cust_po_no: it.customer_po_no || it.cust_po_no || deliveryOrder.customer_po_no || '',
      plt_no: pltDisplay,
      no_of_ctn: ctn,
      qty_per_ctn: qpc,
      total_qty: totQ,
      remark: it.remark || it.notes || ''
    };
  }) : [fallbackItem];

  // Totals
  const totalCtn = items.reduce((sum, it) => sum + (Number(it.no_of_ctn) || 0), 0);
  const grandTotalQty = items.reduce((sum, it) => sum + (Number(it.total_qty) || 0), 0);

  // Parse Bill To & Ship To
  const rawBillTo = customer?.bill_to || customer?.address || '';
  let billToLines = rawBillTo.split('\n').map(l => l.trim()).filter(Boolean);
  if (billToLines.length === 0 && deliveryOrder.customer_name) {
    billToLines = [deliveryOrder.customer_name];
  }

  const rawShipTo = customer?.ship_to || customer?.address || '';
  let shipToLines = rawShipTo.split('\n').map(l => l.trim()).filter(Boolean);
  if (shipToLines.length === 0 && deliveryOrder.customer_name) {
    shipToLines = [deliveryOrder.customer_name];
  }

  const formatNum = (val) => {
    if (val === null || val === undefined || isNaN(val) || val === '') return '-';
    if (Number(val) === 0) return '-';
    return Number(val).toLocaleString('en-US');
  };

  const htsCode = settings?.hts_code_do || '8504.40.00';
  const drawnInFavour = settings?.do_drawn_in_favour || settings?.bank_drawn_in_favour || 'PT. PATCO ELEKTRONIK TEKNOLOGI';

  // 6 Signature Columns
  const signatureCols = [
    { title: settings?.do_sign_col1_title || 'Prepared By', name: settings?.do_sign_col1_name || '' },
    { title: settings?.do_sign_col2_title || 'Checked By', name: settings?.do_sign_col2_name || '' },
    { title: settings?.do_sign_col3_title || 'Approved By', name: settings?.do_sign_col3_name || '' },
    { title: settings?.do_sign_col4_title || 'Security', name: settings?.do_sign_col4_name || '' },
    { title: settings?.do_sign_col5_title || 'Driver', name: settings?.do_sign_col5_name || '' },
    { title: settings?.do_sign_col6_title || 'Received By', name: settings?.do_sign_col6_name || '' }
  ];

  return (
    <div className="min-h-screen bg-slate-300 py-6 px-4 print:p-0 print:bg-white text-black font-['Calibri',sans-serif] selection:bg-slate-300">
      
      {/* Floating Action Bar */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 bg-white p-3 rounded-lg shadow border border-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
          )}
          <span className="text-xs text-slate-600 font-medium">
            Dokumen Delivery Order: <strong className="text-slate-900 font-mono">{deliveryOrder.do_number || '-'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Toggle Kop Dokumen / Kertas Kop Bawaan */}
          <label 
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold cursor-pointer select-none transition-colors border ${
              showLetterhead 
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300' 
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
            }`}
            title={showLetterhead ? 'Kop surat digital aktif (logo & alamat tampil). Klik untuk beralih ke kertas pre-printed.' : 'Mode Pre-printed Paper aktif (kop surat kosong namun space tetap terjaga). Klik untuk menampilkan kop digital.'}
          >
            <input
              type="checkbox"
              checked={showLetterhead}
              onChange={e => setShowLetterhead(e.target.checked)}
              className="rounded border-slate-400 text-emerald-800 focus:ring-emerald-700 w-3.5 h-3.5 cursor-pointer"
            />
            <span>{showLetterhead ? 'Kop Surat Digital: ON' : 'Kop Surat: OFF (Pre-printed Paper)'}</span>
          </label>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold shadow transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF (A4)</span>
          </button>
          <button
            onClick={() => window.close()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* A4 Paper Document Container */}
      <div className="print-page max-w-[210mm] mx-auto bg-white shadow-xl px-8 pt-5 pb-5 print:p-0 print:shadow-none min-h-[297mm] text-black text-[7.5pt] leading-[1.2] font-['Calibri',sans-serif] flex flex-col">
        
        <div>
          {/* ================= 1. HEADER KOP RESMI ================= */}
          {/* JIKA OFF (PRE-PRINTED PAPER), KOP KOSONG TETAPI SPACE TETAP ADA */}
          <div 
            className={`flex items-start justify-between pb-1 ${
              !showLetterhead ? 'invisible select-none pointer-events-none' : ''
            }`}
            aria-hidden={!showLetterhead}
          >
              
              {/* Logo PATCO & Alamat */}
              <div className="flex items-start gap-3">
                {settings?.company_logo_url ? (
                  <img 
                    src={settings.company_logo_url} 
                    alt="Logo" 
                    className="h-[56px] w-auto object-contain shrink-0" 
                  />
                ) : (
                  <div className="shrink-0 pt-0.5">
                    <svg viewBox="0 0 170 85" className="h-[56px] w-auto">
                      <polygon points="32,6 138,6 164,42.5 138,79 32,79 6,42.5" fill="#15803d" stroke="#15803d" strokeWidth="2.5" />
                      <polygon points="35,11 135,11 159,42.5 135,74 35,74 11,42.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                      <text 
                        x="85" 
                        y="52" 
                        fill="#ffffff" 
                        fontSize="31" 
                        fontWeight="900" 
                        fontFamily="Arial, Helvetica, sans-serif" 
                        textAnchor="middle" 
                        letterSpacing="1.5"
                      >
                        PATCO
                      </text>
                    </svg>
                  </div>
                )}

                <div className="w-[1.5px] bg-black self-stretch min-h-[62px] mx-1"></div>

                <div className="text-[8pt] leading-[1.25] text-black">
                  <div className="text-[13pt] font-extrabold tracking-tight uppercase leading-tight">
                    {settings?.company_name || 'PT. PATCO ELEKTRONIK TEKNOLOGI'}
                  </div>
                  <div className="mt-0.5">{settings?.company_address_line1 || 'Kawasan Industri MM2100 Blok LL-1'}</div>
                  <div>{settings?.company_address_line2 || 'Cikarang Barat, Bekasi 17520 - INDONESIA'}</div>
                  
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-12">Phone</span>
                    <span>:</span>
                    <span>{settings?.company_phone?.replace(/^Phone\s*:\s*/i, '') || '+62-21 8980300'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-12">Fax</span>
                    <span>:</span>
                    <span>{settings?.company_fax?.replace(/^Fax\s*:\s*/i, '') || '+62-21 8980301'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-12">Website</span>
                    <span>:</span>
                    <span>{settings?.company_website?.replace(/^Website\s*:\s*/i, '') || 'www.patco.co.id'}</span>
                  </div>
                </div>
              </div>

              {/* Certifications (Bureau Veritas & TÜV SÜD) */}
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                {settings?.iso_cert_logo_url ? (
                  <img src={settings.iso_cert_logo_url} alt="ISO" className="h-[46px] w-auto object-contain" />
                ) : (
                  <div className="shrink-0">
                    <svg viewBox="0 0 145 60" className="h-[46px] w-auto">
                      <rect x="0" y="0" width="145" height="60" fill="#b91c1c" rx="1" />
                      <text x="8" y="15" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">ISO 9001</text>
                      <text x="8" y="26" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">ISO 14001</text>
                      <text x="8" y="38" fill="#ffffff" fontSize="7.5" fontWeight="bold" fontFamily="Arial, sans-serif">BUREAU VERITAS</text>
                      <text x="8" y="49" fill="#ffffff" fontSize="7" fontStyle="italic" fontFamily="Arial, sans-serif">Certification</text>
                      <line x1="94" y1="5" x2="94" y2="55" stroke="#ffffff" strokeWidth="0.8" opacity="0.6" />
                      <circle cx="119" cy="30" r="19" fill="#ffffff" />
                      <circle cx="119" cy="30" r="17" fill="none" stroke="#b91c1c" strokeWidth="1" />
                      <text x="119" y="21" fill="#b91c1c" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">BUREAU VERITAS</text>
                      <circle cx="119" cy="30" r="5" fill="#b91c1c" />
                      <text x="119" y="42" fill="#b91c1c" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">1828</text>
                    </svg>
                  </div>
                )}

                {settings?.tuv_cert_logo_url ? (
                  <img src={settings.tuv_cert_logo_url} alt="TUV" className="h-[46px] w-auto object-contain" />
                ) : (
                  <div className="shrink-0">
                    <svg viewBox="0 0 80 60" className="h-[46px] w-auto">
                      <rect x="0" y="0" width="80" height="60" fill="#003893" rx="2" />
                      <polygon points="14,7 66,7 74,15 74,32 66,40 14,40 6,32 6,15" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                      <text x="40" y="21" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="Arial, sans-serif">TÜV</text>
                      <text x="40" y="33" fill="#ffffff" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">SÜD</text>
                      <text x="40" y="52" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="Arial, sans-serif">ISO 13485</text>
                    </svg>
                  </div>
                )}
              </div>
            </div>

          {/* ================= 2. TITLE: DELIVERY ORDER ================= */}
          <div className="text-center pt-3 pb-3">
            <h1 className="text-[12pt] font-bold tracking-wider text-black uppercase leading-tight">
              DELIVERY ORDER
            </h1>
          </div>

          {/* ================= 3. METADATA: BILL TO, SHIP TO & DOC INFO ================= */}
          <div className="grid grid-cols-12 gap-2 text-[7.5pt] leading-[1.2] items-start mb-2">
            
            {/* Kiri (Coretan Pink): BILL TO & Ship to */}
            <div className="col-span-7 pr-2 space-y-2">
              <div>
                <div className="font-bold">BILL TO :</div>
                <div className="pl-0 mt-0.5">
                  <div className="font-bold">{deliveryOrder.customer_name}</div>
                  {billToLines.length > 0 ? (
                    billToLines.map((line, idx) => (
                      <div key={idx} className="leading-tight">
                        {line !== deliveryOrder.customer_name ? line : ''}
                      </div>
                    ))
                  ) : (
                    <div>{customer?.address || '-'}</div>
                  )}
                </div>
              </div>

              <div>
                <div className="font-bold">Ship to :</div>
                <div className="pl-0 mt-0.5">
                  {shipToLines.length > 0 ? (
                    shipToLines.map((line, idx) => (
                      <div key={idx} className="leading-tight">
                        {line}
                      </div>
                    ))
                  ) : (
                    <div>{customer?.address || '-'}</div>
                  )}
                  {customer?.phone && (
                    <div className="mt-0.5">
                      <span>Phone: {customer.phone}</span>
                      {customer?.fax && <span className="ml-3">Fax: {customer.fax}</span>}
                    </div>
                  )}
                  {customer?.contact_person && (
                    <div>Attn: {customer.contact_person}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Kanan (Coretan Ungu): Number, Date & HTS CODE */}
            <div className="col-span-5 pl-2 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <div className="grid grid-cols-12">
                  <span className="col-span-4">Number</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7 font-bold">{deliveryOrder.do_number || '-'}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4">Date</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-7">{formatIndoDate(deliveryOrder.do_date)}</span>
                </div>
              </div>

              {/* Coretan Merah: HTS CODE di kanan tepat di atas tabel */}
              <div className="text-right pt-6">
                <span className="font-bold">HTS CODE : {htsCode}</span>
              </div>
            </div>

          </div>

          {/* PAGE NUMBER (Kanan atas tabel) */}
          <div className="text-right text-[7pt] font-semibold mb-1">
            PAGE : 01
          </div>

          {/* ================= 4. TABEL PRODUK DELIVERY ORDER (BORDERLESS VERTIKAL SESUAI DOKUMEN FISIK) ================= */}
          <table className="w-full border-collapse text-[7.2pt] leading-tight">
            <thead>
              <tr className="border-t border-b border-black text-center font-bold">
                <th className="py-1.5 px-1 w-[35px]">NO</th>
                <th className="py-1.5 px-1 text-left">
                  <div>Part Name and</div>
                  <div>Part Number</div>
                </th>
                <th className="py-1.5 px-1 w-[90px]">
                  <div>Our PO No.</div>
                  <div>Cust PO No.</div>
                </th>
                <th className="py-1.5 px-1 w-[50px]">
                  <div>Plt</div>
                  <div>No.</div>
                </th>
                <th className="py-1.5 px-1 w-[55px]">
                  <div>No of</div>
                  <div>Ctn/Tray</div>
                </th>
                <th className="py-1.5 px-1 w-[55px]">
                  <div>Qty per</div>
                  <div>Ctn/Tray</div>
                </th>
                <th className="py-1.5 px-1 w-[60px]">
                  <div>Total</div>
                  <div>Qty</div>
                </th>
                <th className="py-1.5 px-1 w-[65px]">
                  REMARK
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1.5 px-1 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-1 text-left">
                    <div className="font-bold">{it.part_name}</div>
                    {it.part_no && <div className="text-[6.8pt] font-mono">{it.part_no}</div>}
                  </td>
                  <td className="py-1.5 px-1 text-center font-mono">
                    {it.our_po_no && <div>{it.our_po_no}</div>}
                    {it.cust_po_no && <div className="font-semibold">{it.cust_po_no}</div>}
                    {!it.our_po_no && !it.cust_po_no && '-'}
                  </td>
                  <td className="py-1.5 px-1 text-center font-bold">
                    {it.plt_no}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {it.no_of_ctn > 0 ? formatNum(it.no_of_ctn) : '-'}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {it.qty_per_ctn > 0 ? formatNum(it.qty_per_ctn) : '-'}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono font-bold">
                    {it.total_qty > 0 ? formatNum(it.total_qty) : '-'}
                  </td>
                  <td className="py-1.5 px-1 text-center text-[6.8pt]">
                    {it.remark || '-'}
                  </td>
                </tr>
              ))}

              {/* Ruang kosong tabel adaptif agar tidak meluap ke halaman kedua pada multi-item */}
              <tr style={{ height: `${hasMultipleItems ? Math.max(15, 80 - Math.max(0, items.length - 2) * 15) : 80}px` }}>
                <td colSpan={8}>&nbsp;</td>
              </tr>
            </tbody>

            {/* ================= 5. FOOTER TOTAL ================= */}
            <tfoot>
              <tr className="border-t border-b border-black font-bold">
                <td colSpan={4} className="py-1.5 px-2 text-right">
                  Total
                </td>
                <td className="py-1.5 px-1 text-right font-mono">
                  {totalCtn > 0 ? formatNum(totalCtn) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center">
                  &nbsp;
                </td>
                <td className="py-1.5 px-1 text-right font-mono">
                  {grandTotalQty > 0 ? formatNum(grandTotalQty) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center">
                  &nbsp;
                </td>
              </tr>
            </tfoot>
          </table>

          {/* ================= 6. TEKS REMITTANCE (Coretan Hijau Panjang) ================= */}
          <div className="pt-2 text-[7.2pt] font-semibold">
            <span>All payment to be drawn in favour of </span>
            <span className="font-bold">{drawnInFavour}</span>
          </div>

          {/* Garis Horizontal Pembatas Tanda Tangan (Solid Line Membentang Penuh sesuai Gambar 1) */}
          <div className="border-b border-black w-full mt-2 mb-2"></div>

        </div>

        {/* ================= 7. TANDA TANGAN (6 Kolom Coretan Hijau Bawah) & KODE DOKUMEN (Kuning) ================= */}
        <div className="pt-2 pb-2 print:break-inside-avoid">
          
          {/* 6 Kolom Tanda Tangan Sejajar */}
          <div className="grid grid-cols-6 gap-3 text-center text-[7pt]">
            {signatureCols.map((col, idx) => (
              <div key={idx} className="flex flex-col items-center justify-end">
                <div className="font-bold mb-16 leading-tight">
                  {col.title}
                </div>
                <div className="border-t border-black w-3/4 mx-auto pt-1">
                  {col.name ? (
                    <span className="text-[6.8pt] font-semibold text-slate-800">({col.name})</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Kode Dokumen ISO di pojok kanan bawah (Coretan Kuning) */}
          <div className="text-right text-[6.5pt] font-mono text-slate-700 mt-4">
            {settings?.do_doc_control_code || 'FRM-WHS-01 Rev.00'}
          </div>

        </div>

      </div>

    </div>
  );
}
