import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatIndoDate } from '../utils/dateFormatter';
import { sanitizeDocumentTitle } from '../utils/formatters';

export default function PrintPackingList({ id, onBack }) {
  const [packingList, setPackingList] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const [showLetterhead, setShowLetterhead] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (packingList) {
      const prevTitle = document.title;
      document.title = sanitizeDocumentTitle(packingList.invoice_number || packingList.id, 'packing-list');
      return () => {
        document.title = prevTitle;
      };
    }
  }, [packingList]);

  const handlePrint = () => {
    if (packingList) {
      document.title = sanitizeDocumentTitle(packingList.invoice_number || packingList.id, 'packing-list');
    }
    window.print();
  };

  const fetchData = async () => {
    try {
      const [plRes, setRes] = await Promise.all([
        fetch(`/api/packing-lists/${id}`),
        fetch('/api/settings')
      ]);

      if (!plRes.ok) throw new Error('Packing list not found');
      const plData = await plRes.json();
      const setData = await setRes.json();

      setPackingList(plData);
      setSettings(setData);
      if (setData && setData.show_letterhead !== undefined && setData.show_letterhead !== null) {
        setShowLetterhead(setData.show_letterhead === 1 || setData.show_letterhead === true);
      } else {
        setShowLetterhead(false);
      }

      if (plData.customer_name) {
        const cRes = await fetch(`/api/customers?name=${encodeURIComponent(plData.customer_name)}`);
        if (cRes.ok) {
          const found = await cRes.json();
          if (found) setCustomer(found);
        }
      }

      if (plData.invoice_number) {
        try {
          const invRes = await fetch(`/api/invoices/${encodeURIComponent(plData.invoice_number)}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            if (invData) setLinkedInvoice(invData);
          }
        } catch (e) {
          console.warn('Could not fetch linked invoice for packing list:', e);
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
          <p className="text-slate-600 text-xs font-medium">Menyiapkan dokumen A4 Packing List...</p>
        </div>
      </div>
    );
  }

  if (!packingList) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-['Calibri',sans-serif]">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-3 text-lg font-bold">!</div>
          <h3 className="text-slate-800 font-bold text-sm mb-1">Dokumen Tidak Ditemukan</h3>
          <p className="text-slate-500 text-xs mb-4">Data packing list tidak ditemukan atau ID tidak valid.</p>
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
  const rawItems = Array.isArray(packingList.items)
    ? packingList.items
    : (typeof packingList.items === 'string' && packingList.items.trim().startsWith('[')
        ? (() => { try { return JSON.parse(packingList.items); } catch (e) { return null; } })()
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

  const initialPart = extractPartDetails(packingList.part_name, packingList.part_no);
  const fallbackBox = Number(packingList.box_qty) || 0;
  let fallbackQtyPerBox = Number(packingList.qty_per_box) || 0;
  let fallbackTotalQty = Number(packingList.total_qty) || 0;

  if (!fallbackTotalQty && fallbackBox > 0 && fallbackQtyPerBox > 0) {
    fallbackTotalQty = fallbackBox * fallbackQtyPerBox;
  }
  if (!fallbackQtyPerBox && fallbackBox > 0 && fallbackTotalQty > 0) {
    fallbackQtyPerBox = Math.round(fallbackTotalQty / fallbackBox);
  }

  // Rumus CBM: (L * W * H / 1.000.000) * pallet_qty
  const calcCbm = (l, w, h, palletQty = 1) => {
    if (!l || !w || !h) return 0;
    const pQty = Number(palletQty) > 0 ? Number(palletQty) : 1;
    return ((l * w * h) / 1_000_000) * pQty;
  };

  const fallbackL = Number(packingList.length) || 0;
  const fallbackW = Number(packingList.width) || 0;
  const fallbackH = Number(packingList.height) || 0;
  const fallbackU = packingList.unit_note || 'cm';
  const fallbackPallet = Number(packingList.pallet_qty) || 1;
  const fallbackCbmVal = calcCbm(fallbackL, fallbackW, fallbackH, fallbackPallet);

  // Single fallback item
  const fallbackItem = {
    pallet_no: packingList.pallet_qty ? `1~${packingList.pallet_qty}` : '1',
    part_name: initialPart.name,
    part_no: initialPart.no,
    customer_po_no: packingList.customer_po_no || '',
    no_of_box: fallbackBox,
    qty_per_box: fallbackQtyPerBox,
    total_qty: fallbackTotalQty,
    pallet_qty: fallbackPallet,
    net_weight: Number(packingList.net_weight) || (fallbackTotalQty > 0 ? Number((fallbackTotalQty * 0.55).toFixed(2)) : 0),
    gross_weight: Number(packingList.gross_weight) || (fallbackTotalQty > 0 ? Number((fallbackTotalQty * 0.55 * 1.34).toFixed(2)) : 0),
    length: fallbackL,
    width: fallbackW,
    height: fallbackH,
    unit_note: fallbackU,
    cbm: fallbackCbmVal
  };

  let cumulativePallet = 1;
  const items = hasMultipleItems ? rawItems.map((it, idx) => {
    const parsed = extractPartDetails(it.part_name, it.part_no);
    const box = Number(it.no_of_box) || Number(it.box_qty) || 0;
    let qpb = Number(it.qty_per_box) || 0;
    let totQ = Number(it.total_qty) || 0;

    if (!totQ && box > 0 && qpb > 0) {
      totQ = box * qpb;
    }
    if (!qpb && box > 0 && totQ > 0) {
      qpb = Math.round(totQ / box);
    }

    const nw = Number(it.net_weight) || (totQ > 0 ? Number((totQ * 0.55).toFixed(2)) : 0);
    const gw = Number(it.gross_weight) || (nw > 0 ? Number((nw * 1.34).toFixed(2)) : 0);
    const l = Number(it.length) || fallbackL;
    const w = Number(it.width) || fallbackW;
    const h = Number(it.height) || fallbackH;
    const u = it.unit_note || fallbackU;

    // Hitung range pallet berurutan jika tidak ada explicit pallet_no
    let pltDisplay = it.pallet_no || it.plt_no || '';
    const bpp = Number(it.box_per_pallet) || 0;
    let pQty = Number(it.pallet_qty) || Number(it.no_of_pallet) || 0;
    if (!pQty && bpp > 0 && box > 0) {
      pQty = Math.ceil(box / bpp);
    }
    if (!pQty && rawItems.length === 1 && fallbackPallet) {
      pQty = fallbackPallet;
    }

    const cbm = calcCbm(l, w, h, pQty);

    if (!pltDisplay) {
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
      pallet_no: pltDisplay,
      pallet_qty: pQty,
      part_name: parsed.name,
      part_no: parsed.no,
      customer_po_no: it.customer_po_no || it.cust_po_no || packingList.customer_po_no || '',
      no_of_box: box,
      qty_per_box: qpb,
      total_qty: totQ,
      net_weight: nw,
      gross_weight: gw,
      length: l,
      width: w,
      height: h,
      cbm: cbm
    };
  }) : [fallbackItem];

  // Totals
  const totalBoxes = items.reduce((sum, it) => sum + (Number(it.no_of_box) || 0), 0);
  const grandTotalQty = items.reduce((sum, it) => sum + (Number(it.total_qty) || 0), 0);
  const totalPalletQty = items.reduce((sum, it) => sum + (Number(it.pallet_qty) || 0), 0) || Number(packingList.pallet_qty) || 0;
  const totalNetWeight = items.reduce((sum, it) => sum + (Number(it.net_weight) || 0), 0);
  const totalGrossWeight = items.reduce((sum, it) => sum + (Number(it.gross_weight) || 0), 0);
  const totalCbm = items.reduce((sum, it) => sum + (Number(it.cbm) || 0), 0);

  // Parse Ship To (Exclude contact info) - Prioritas: Invoice ship_to -> PL ship_to -> Customer ship_to/address
  const rawShipTo = linkedInvoice?.ship_to || packingList.ship_to || customer?.ship_to || customer?.address || '';
  let shipToLines = rawShipTo
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => !/^(phone|tel|fax|attn|up|pic):/i.test(l));
  if (shipToLines.length === 0 && packingList.customer_name) {
    shipToLines = [packingList.customer_name];
  }

  const formatNum = (val, decimals = 0) => {
    if (val === null || val === undefined || isNaN(val) || val === '') return '-';
    if (decimals === 0 && Number(val) === 0) return '-';
    return Number(val).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

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
            Dokumen Packing List: <strong className="text-slate-900 font-mono">{packingList.invoice_number || '-'}</strong>
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

          {/* ================= 2. TITLE: PACKING LIST ================= */}
          <div className="text-center pt-3 pb-3">
            <h1 className="text-[12pt] font-bold tracking-wider text-black uppercase leading-tight">
              PACKING LIST
            </h1>
          </div>

          {/* ================= 3. METADATA: SHIP TO & DOC INFO ================= */}
          <div className="grid grid-cols-12 gap-2 text-[7.5pt] leading-[1.2] items-start mb-3">
            
            {/* Kiri (Coretan Pink): Ship to */}
            <div className="col-span-7 pr-2">
              <div className="font-bold">Ship to :</div>
              <div className="pl-0 mt-0.5">
                <div className="font-bold">{packingList.customer_name}</div>
                {shipToLines.length > 0 ? (
                  shipToLines.map((line, idx) => (
                    <div key={idx} className="leading-tight">
                      {line !== packingList.customer_name ? line : ''}
                    </div>
                  ))
                ) : (
                  <div>{customer?.address || '-'}</div>
                )}
              </div>
            </div>

            {/* Kanan (Coretan Ungu): Info Dokumen */}
            <div className="col-span-5 pl-2">
              <div className="space-y-1">
                <div className="grid grid-cols-12">
                  <span className="col-span-5">Invoice Number</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-6 font-bold">{packingList.invoice_number || '-'}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5">Invoice Date</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-6">{formatIndoDate(packingList.invoice_date)}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-5">Terms of Delivery</span>
                  <span className="col-span-1">:</span>
                  <span className="col-span-6">{packingList.terms_of_delivery || 'FOB'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* PAGE NUMBER (Kanan atas tabel) */}
          <div className="text-right text-[7pt] font-semibold mb-1">
            PAGE : 01
          </div>

          {/* ================= 4. TABEL PRODUK / PACKING SPECS (BORDERLESS VERTIKAL SESUAI DOKUMEN FISIK) ================= */}
          <table className="w-full border-collapse text-[7.2pt] leading-tight">
            <thead>
              <tr className="border-t border-b border-black text-center font-bold">
                <th rowSpan={2} className="py-1 px-1 w-[45px]">Pallet No</th>
                <th rowSpan={2} className="py-1 px-1 min-w-[70px] whitespace-nowrap">PO No</th>
                <th rowSpan={2} className="py-1 px-1 text-center whitespace-nowrap">
                  Part Name & Part Code
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[50px]">
                  <div>Total Box No</div>
                  <div className="font-normal text-[6.5pt]">( pcs )</div>
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[46px]">
                  <div>Qty/Box</div>
                  <div className="font-normal text-[6.5pt]">( pcs )</div>
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[55px]">
                  <div>Total Qty</div>
                  <div className="font-normal text-[6.5pt]">( pcs )</div>
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[48px]">
                  <div>Pallet Qty</div>
                  <div className="font-normal text-[6.5pt]">( pcs )</div>
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[52px]">
                  <div>Net Weight</div>
                  <div className="font-normal text-[6.5pt]">( Kgs )</div>
                </th>
                <th rowSpan={2} className="py-1 px-1 w-[55px]">
                  <div>Gross Weight</div>
                  <div className="font-normal text-[6.5pt]">( Kgs )</div>
                </th>
                <th colSpan={4} className="py-1 px-1 border-b border-black text-center">
                  Measurement
                </th>
              </tr>
              <tr className="border-b border-black text-center font-bold text-[6.5pt]">
                <th className="py-0.5 px-0.5 w-[22px]">W</th>
                <th className="py-0.5 px-0.5 w-[22px]">H</th>
                <th className="py-0.5 px-0.5 w-[22px]">L</th>
                <th className="py-0.5 px-1 w-[35px]">CBM</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-1 px-1 text-center font-bold">
                    {it.pallet_no}
                  </td>
                  <td className="py-1 px-1 text-center font-mono whitespace-nowrap text-[6.8pt]">
                    {it.customer_po_no ? it.customer_po_no.replace(/\r?\n/g, ', ') : '-'}
                  </td>
                  <td className="py-1 px-1 text-center">
                    <div className="font-bold">{it.part_name}</div>
                    {it.part_no && <div className="text-[6.8pt] font-mono">{it.part_no}</div>}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">
                    {it.no_of_box > 0 ? formatNum(it.no_of_box) : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">
                    {it.qty_per_box > 0 ? formatNum(it.qty_per_box) : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono font-bold">
                    {it.total_qty > 0 ? formatNum(it.total_qty) : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono font-bold">
                    {it.pallet_qty > 0 ? formatNum(it.pallet_qty) : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">
                    {it.net_weight > 0 ? formatNum(it.net_weight, 2) : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono">
                    {it.gross_weight > 0 ? formatNum(it.gross_weight, 2) : '-'}
                  </td>
                  <td className="py-1 px-0.5 text-center font-mono text-[6.8pt]">
                    {it.width > 0 ? it.width : '-'}
                  </td>
                  <td className="py-1 px-0.5 text-center font-mono text-[6.8pt]">
                    {it.height > 0 ? it.height : '-'}
                  </td>
                  <td className="py-1 px-0.5 text-center font-mono text-[6.8pt]">
                    {it.length > 0 ? it.length : '-'}
                  </td>
                  <td className="py-1 px-1 text-center font-mono text-[6.8pt]">
                    {it.cbm > 0 ? Number(it.cbm).toFixed(3) : '-'}
                  </td>
                </tr>
              ))}

              {/* Ruang kosong tabel adaptif agar tidak meluap ke halaman kedua pada multi-item */}
              <tr style={{ height: `${hasMultipleItems ? Math.max(25, 130 - Math.max(0, items.length - 2) * 20) : 130}px` }}>
                <td colSpan={13}>&nbsp;</td>
              </tr>
            </tbody>

            {/* ================= 5. FOOTER TOTAL ================= */}
            <tfoot>
              <tr className="border-t border-b border-black font-bold">
                <td colSpan={3} className="py-1.5 px-2 text-right">
                  Total
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {totalBoxes > 0 ? formatNum(totalBoxes) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center">
                  &nbsp;
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {grandTotalQty > 0 ? formatNum(grandTotalQty) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {totalPalletQty > 0 ? formatNum(totalPalletQty) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {totalNetWeight > 0 ? formatNum(totalNetWeight, 2) : '-'}
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {totalGrossWeight > 0 ? formatNum(totalGrossWeight, 2) : '-'}
                </td>
                <td colSpan={3} className="py-1.5 px-1 text-center">
                  &nbsp;
                </td>
                <td className="py-1.5 px-1 text-center font-mono">
                  {totalCbm > 0 ? Number(totalCbm).toFixed(3) : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ================= 6. TANDA TANGAN (Coretan Hijau) & KODE DOKUMEN (Coretan Kuning) ================= */}
        <div className="pt-16 pb-2 print:break-inside-avoid">
          <div className="grid grid-cols-12 gap-4 items-end">
            
            {/* Tanda Tangan Kiri: Prepared By */}
            <div className="col-span-4 text-center">
              <div className="h-12 flex items-center justify-center">
                {/* Optional digital signature if uploaded */}
              </div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                {settings?.pl_prepared_by_title || 'Prepared By'}
              </div>
              {settings?.pl_prepared_by_name && (
                <div className="text-[7pt] text-slate-700">
                  ( {settings.pl_prepared_by_name} )
                </div>
              )}
            </div>

            {/* Ruang Tengah */}
            <div className="col-span-4"></div>

            {/* Tanda Tangan Kanan: Authorized Signature */}
            <div className="col-span-4 text-center">
              <div className="h-12 flex items-center justify-center">
                {/* Optional authorized sign */}
              </div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                {settings?.pl_authorized_title || 'Authorized Signature'}
              </div>
              {settings?.pl_authorized_name && (
                <div className="text-[7pt] text-slate-700">
                  ( {settings.pl_authorized_name} )
                </div>
              )}
            </div>

          </div>

          {/* Kode Dokumen ISO di pojok kanan bawah (Coretan Kuning) */}
          <div className="text-right text-[6.5pt] font-mono text-slate-700 mt-3">
            {settings?.pl_doc_control_code || 'FRM-WHS-02 Rev.01'}
          </div>

        </div>

      </div>

    </div>
  );
}
