import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintInvoice({ id, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoiceAndSettings();
  }, [id]);

  useEffect(() => {
    if (invoice) {
      const prevTitle = document.title;
      const code = invoice.invoice_number || invoice.id || '';
      const cleanCode = String(code).replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      document.title = cleanCode ? `invoice-${cleanCode}` : 'invoice';
      return () => {
        document.title = prevTitle;
      };
    }
  }, [invoice]);

  const handlePrint = () => {
    if (invoice) {
      const code = invoice.invoice_number || invoice.id || '';
      const cleanCode = String(code).replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      document.title = cleanCode ? `invoice-${cleanCode}` : 'invoice';
    }
    window.print();
  };

  const fetchInvoiceAndSettings = async () => {
    try {
      const [invRes, setRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch('/api/settings')
      ]);

      if (!invRes.ok) throw new Error('Invoice not found');
      const invData = await invRes.json();
      const setData = await setRes.json();

      setInvoice(invData);
      setSettings(setData);
      if (setData) {
        setShowLetterhead(setData.show_letterhead !== undefined ? (setData.show_letterhead === 1 || setData.show_letterhead === true) : true);
      }

      if (invData.customer_name) {
        const cRes = await fetch(`/api/customers?name=${encodeURIComponent(invData.customer_name)}`);
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
          <p className="text-slate-600 text-xs font-medium">Menyiapkan dokumen A4 Commercial Invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-['Calibri',sans-serif]">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-3 text-lg font-bold">!</div>
          <h3 className="text-slate-800 font-bold text-sm mb-1">Dokumen Tidak Ditemukan</h3>
          <p className="text-slate-500 text-xs mb-4">Data invoice tidak ditemukan atau ID tidak valid.</p>
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
  const items = Array.isArray(invoice.items)
    ? invoice.items
    : (typeof invoice.items === 'string' && invoice.items.trim().startsWith('[')
        ? (() => { try { return JSON.parse(invoice.items); } catch (e) { return null; } })()
        : null);

  const hasMultipleItems = items && items.length > 0;

  // Quantities & Calculations
  const boxQty = hasMultipleItems
    ? items.reduce((sum, it) => sum + (Number(it.no_of_box) || 0), 0)
    : (Number(invoice.no_of_box) || 0);

  const qtyPerBox = Number(invoice.qty_per_box) || 0;

  const totalQty = hasMultipleItems
    ? items.reduce((sum, it) => sum + (Number(it.total_qty) || ((Number(it.no_of_box) || 0) * (Number(it.qty_per_box) || 0))), 0)
    : (Number(invoice.total_qty) || (boxQty > 0 && qtyPerBox > 0 ? boxQty * qtyPerBox : boxQty));

  const unitPrice = Number(invoice.unit_price) || (hasMultipleItems ? Number(items[0]?.unit_price) || 0 : 0);

  const totalAmount = hasMultipleItems
    ? items.reduce((sum, it) => sum + (Number(it.total_amount) || 0), 0)
    : (Number(invoice.total_amount) || (unitPrice > 0 && totalQty > 0 ? totalQty * unitPrice : 0));

  const vatAmount = Number(invoice.vat_amount) || (totalAmount * 0.11);
  const grandTotal = Number(invoice.grand_total) || (totalAmount + vatAmount);

  // Parse lines for Bill To and Ship To
  const rawBillTo = invoice.bill_to || customer?.bill_to || customer?.address || '';
  let billToLines = rawBillTo.split('\n').map(l => l.trim()).filter(Boolean);
  if (billToLines.length === 0 && invoice.customer_name) {
    billToLines = [invoice.customer_name];
  }

  const rawShipTo = invoice.ship_to || customer?.ship_to || customer?.address || '';
  let shipToLines = rawShipTo.split('\n').map(l => l.trim()).filter(Boolean);
  if (shipToLines.length === 0 && invoice.customer_name) {
    shipToLines = [invoice.customer_name];
  }

  const htsCode = invoice.hts_code || settings?.hts_code_invoice || '8503.00.90';

  // Format numbers
  const formatMoney = (val, decimals = 2) => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <div className="min-h-screen bg-slate-300 py-6 px-4 print:p-0 print:bg-white text-black font-['Calibri',sans-serif] selection:bg-slate-300">
      
      {/* Floating Action Bar (Hidden when printing) */}
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
            Dokumen: <strong className="text-slate-900 font-mono">{invoice.invoice_number}</strong>
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
            title={showLetterhead ? 'Kop surat digital aktif. Klik untuk sembunyikan jika pakai kertas kop resmi.' : 'Kop surat digital nonaktif (kertas kop resmi). Klik untuk tampilkan kop.'}
          >
            <input
              type="checkbox"
              checked={showLetterhead}
              onChange={e => setShowLetterhead(e.target.checked)}
              className="rounded border-slate-400 text-emerald-800 focus:ring-emerald-700 w-3.5 h-3.5 cursor-pointer"
            />
            <span>{showLetterhead ? 'Kop Surat Digital: ON' : 'Kertas Kop Resmi: ON'}</span>
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

      {/* A4 Paper Document Container - Clean, compact, calibrated typography 1:1 */}
      <div className={`print-page max-w-[210mm] mx-auto bg-white shadow-xl px-8 ${showLetterhead ? 'pt-5 pb-5' : 'pt-2 pb-5 print:pt-0'} print:p-0 print:shadow-none min-h-[297mm] text-black text-[7.5pt] leading-[1.2] font-['Calibri',sans-serif]`}>
        
        {/* ========================================================= */}
        {/* 1. HEADER (KOP SURAT RESMI: LOGO BESAR, NAMA & ALAMAT BESAR) */}
        {/* ========================================================= */}
        {showLetterhead && (
          <div className="flex items-start justify-between pb-1">
          
          {/* Logo PATCO & Info Perusahaan */}
          <div className="flex items-start gap-3">
            
            {/* PATCO Green Hexagon Logo (Gede & Proporsional) */}
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

            {/* Vertical Divider Line */}
            <div className="w-[1.5px] bg-black self-stretch min-h-[62px] mx-1"></div>

            {/* Company Profile Text (Nama Perusahaan Besar & Alamat Jelas Gede) */}
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

          {/* Certifications (Bureau Veritas ISO 9001/14001 & TÜV SÜD ISO 13485) */}
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {/* Bureau Veritas */}
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

            {/* TÜV SÜD */}
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
        )}

        {/* ========================================================= */}
        {/* 2. TITLE: INVOICE (Centered cleanly above metadata)        */}
        {/* ========================================================= */}
        <div className={`text-center ${showLetterhead ? 'pt-2 pb-2' : 'pt-0 pb-2'}`}>
          <h1 className="text-[12pt] font-bold tracking-wider text-black uppercase leading-tight">
            INVOICE
          </h1>
        </div>

        {/* ========================================================= */}
        {/* 3. METADATA: BILL TO, Ship to & 4 DOCUMENT ATTRIBUTES      */}
        {/* ========================================================= */}
        <div className="grid grid-cols-12 gap-2 text-[7.5pt] leading-[1.2] items-start">
          
          {/* Left Column: BILL TO : & Ship to : */}
          <div className="col-span-7 pr-4 space-y-2">
            
            {/* BILL TO */}
            <div>
              <div className="font-bold text-[7.5pt] mb-0.5">BILL TO :</div>
              {billToLines.map((line, idx) => (
                <div key={`bill-${idx}`} className={idx === 0 ? "font-bold" : "text-black"}>
                  {line}
                </div>
              ))}
            </div>

            {/* Ship to */}
            <div>
              <div className="font-bold text-[7.5pt] mb-0.5">Ship to :</div>
              {shipToLines.map((line, idx) => (
                <div key={`ship-${idx}`} className={idx === 0 ? "font-bold" : "text-black"}>
                  {line}
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Invoice Attributes (4 lines matching original document) */}
          <div className="col-span-5 pl-2 text-[7.5pt]">
            <div className="space-y-0.5">
              
              {/* Invoice Number */}
              <div className="flex">
                <span className="w-28">Invoice Number</span>
                <span className="w-3">:</span>
                <span className="font-bold font-mono">{invoice.invoice_number}</span>
              </div>

              {/* Invoice Date */}
              <div className="flex">
                <span className="w-28">Invoice Date</span>
                <span className="w-3">:</span>
                <span>{invoice.invoice_date}</span>
              </div>

              {/* Payment Term */}
              <div className="flex">
                <span className="w-28">Payment Term</span>
                <span className="w-3">:</span>
                <span>{invoice.payment_term || '-'}</span>
              </div>

              {/* Terms of Delivery */}
              <div className="flex">
                <span className="w-28">Terms of Delivery</span>
                <span className="w-3">:</span>
                <span>{invoice.terms_of_delivery || '-'}</span>
              </div>

            </div>
          </div>

        </div>

        {/* HTS CODE (Right aligned right above table) */}
        <div className="flex justify-end mt-1 mb-0.5">
          <div className="text-[7.5pt] text-black">
            HTS CODE : <span className="font-mono font-normal">{htsCode}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. PRODUCT TABLE (Calibrated Font & Column Grid)          */}
        {/* ========================================================= */}
        <div className="w-full">
          
          <table 
            className="w-full border-collapse text-[7.5pt] leading-[1.2]"
            style={{ tableLayout: 'fixed' }}
          >
            {/* Column proportions matching test-invoice-form.xlsx */}
            <colgroup>
              <col style={{ width: '5.5%' }} />   {/* No */}
              <col style={{ width: '32.5%' }} />  {/* Part Name and Part Number */}
              <col style={{ width: '12.5%' }} />  {/* Cust PO No. */}
              <col style={{ width: '7.0%' }} />   {/* No of Pallete */}
              <col style={{ width: '6.5%' }} />   {/* No of Box */}
              {/* Boundary: Col 1-5 = 64.0%, Col 6-9 = 36.0% */}
              <col style={{ width: '7.5%' }} />   {/* Qty per Box */}
              <col style={{ width: '7.5%' }} />   {/* Total Qty */}
              <col style={{ width: '7.5%' }} />   {/* Unit Price */}
              <col style={{ width: '13.5%' }} />  {/* Total Amount */}
            </colgroup>

            {/* Table Header: thin black border top & bottom, no vertical borders */}
            <thead>
              <tr className="border-t border-b border-black text-black text-center align-middle text-[7pt] leading-[1.15] h-[26px]">
                <th className="font-normal py-0.5 px-0.5">No</th>
                <th className="font-normal py-0.5 px-1 text-left">Part Name and Part Number</th>
                <th className="font-normal py-0.5 px-0.5">Cust PO No.</th>
                <th className="font-normal py-0.5 px-0.5 leading-tight">No of<br/>Pallete</th>
                <th className="font-normal py-0.5 px-0.5 leading-tight">No of<br/>Box</th>
                <th className="font-normal py-0.5 px-0.5 leading-tight">Qty per<br/>Box</th>
                <th className="font-normal py-0.5 px-0.5">Total Qty</th>
                <th className="font-normal py-0.5 px-0.5">Unit Price</th>
                <th className="font-normal py-0.5 px-0.5">Total Amount</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {hasMultipleItems ? (
                items.map((item, idx) => {
                  const itemBox = Number(item.no_of_box) || 0;
                  const itemQtyPerBox = Number(item.qty_per_box) || 0;
                  const itemTotalQty = Number(item.total_qty) || (itemBox * itemQtyPerBox) || 0;
                  const itemPrice = Number(item.unit_price) || 0;
                  const itemAmount = Number(item.total_amount) || (itemTotalQty * itemPrice) || 0;

                  return (
                    <tr key={idx} className="align-top border-b border-slate-200/50">
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono">{idx + 1}</td>
                      <td className="pt-1.5 pb-1 px-1 text-left">
                        <div className="font-normal">{item.part_name || ''}</div>
                        {item.part_no && (
                          <div className="text-[7pt] font-mono text-black">
                            {item.part_no}
                          </div>
                        )}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono text-[6pt] leading-tight tracking-tight whitespace-nowrap">
                        {item.customer_po_no || invoice.customer_po_no || ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono">
                        {item.no_of_pallet || ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono">
                        {item.no_of_box || ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono">
                        {itemQtyPerBox > 0 ? formatMoney(itemQtyPerBox, 0) : ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-center font-mono">
                        {itemTotalQty > 0 ? formatMoney(itemTotalQty, 0) : ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-right font-mono">
                        {itemPrice > 0 ? formatMoney(itemPrice, 4) : ''}
                      </td>
                      <td className="pt-1.5 pb-1 px-0.5 text-right font-mono">
                        {itemAmount > 0 ? formatMoney(itemAmount, 2) : ''}
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Legacy Single Item Fallback */
                <tr className="align-top">
                  <td className="pt-1.5 px-0.5 text-center font-mono">1</td>
                  <td className="pt-1.5 px-1 text-left">
                    <div className="font-normal">{invoice.part_name || ''}</div>
                    {invoice.part_no && (
                      <div className="text-[7pt] font-mono text-black">
                        {invoice.part_no}
                      </div>
                    )}
                  </td>
                  <td className="pt-1.5 px-0.5 text-center font-mono text-[6pt] leading-tight tracking-tight whitespace-nowrap">
                    {invoice.customer_po_no || ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-center font-mono">
                    {invoice.no_of_pallet || ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-center font-mono">
                    {invoice.no_of_box || ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-center font-mono">
                    {invoice.qty_per_box ? formatMoney(invoice.qty_per_box, 0) : ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-center font-mono">
                    {totalQty ? formatMoney(totalQty, 0) : ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-right font-mono">
                    {unitPrice > 0 ? formatMoney(unitPrice, 4) : ''}
                  </td>
                  <td className="pt-1.5 px-0.5 text-right font-mono">
                    {totalAmount > 0 ? formatMoney(totalAmount, 2) : ''}
                  </td>
                </tr>
              )}

              {/* Space kosong adaptif agar pas 1 lembar A4 baik 1 produk maupun multi-produk */}
              <tr style={{ height: `${hasMultipleItems ? Math.max(20, 96 - Math.max(0, items.length - 2) * 16) : 96}px` }}>
                <td colSpan={9}></td>
              </tr>
            </tbody>

            {/* Table Footer: TOTAL USD, VAT 11% USD, TOTAL AMOUNT USD */}
            {/* SEJAJAR 1:1 DENGAN COUNTRY OF ORIGIN (Mulai tepat di kolom 6 / 64% width) */}
            <tfoot>
              {/* Row 1: TOTAL USD with border-t */}
              <tr className="border-t border-black">
                <td colSpan={5} className="py-0.5"></td>
                <td colSpan={3} className="py-0.5 text-left font-normal pl-2 whitespace-nowrap">
                  TOTAL USD
                </td>
                <td className="py-0.5 text-right font-mono font-normal pr-1">
                  {totalAmount > 0 ? formatMoney(totalAmount, 2) : '0.00'}
                </td>
              </tr>

              {/* Row 2: VAT 11% USD */}
              <tr>
                <td colSpan={5} className="py-0.5"></td>
                <td colSpan={3} className="py-0.5 text-left font-normal pl-2 whitespace-nowrap">
                  VAT 11% USD
                </td>
                <td className="py-0.5 text-right font-mono font-normal pr-1">
                  {vatAmount > 0 ? formatMoney(vatAmount, 2) : '0.00'}
                </td>
              </tr>

              {/* Row 3: TOTAL AMOUNT USD with border-b */}
              <tr className="border-b border-black">
                <td colSpan={5} className="py-0.5 pb-1"></td>
                <td colSpan={3} className="py-0.5 pb-1 text-left font-bold pl-2 whitespace-nowrap">
                  TOTAL AMOUNT USD
                </td>
                <td className="py-0.5 pb-1 text-right font-mono font-bold pr-1">
                  {grandTotal > 0 ? formatMoney(grandTotal, 2) : '0.00'}
                </td>
              </tr>
            </tfoot>

          </table>

        </div>

        {/* ========================================================= */}
        {/* 5. REMITTANCE BANK & COUNTRY OF ORIGIN                    */}
        {/* KANAN (COUNTRY OF ORIGIN) SEJAJAR DENGAN TOTAL USD (64% / 36%) */}
        {/* ========================================================= */}
        <div className="flex text-[7pt] leading-[1.2] text-black pt-2 pb-5">
          
          {/* Left: Bank Remittance Details (64% Width) */}
          <div style={{ width: '64%' }} className="pr-4 space-y-0.5">
            <div>
              All Payment to be drawn in favour of {settings?.bank_drawn_in_favour || settings?.company_name || 'PT. PATCO ELEKTRONIK TEKNOLOGI'}
            </div>
            <div>
              Please send your remittance through our below Bank Account:
            </div>
            <div className="pt-0.5 space-y-0.5 text-[7pt]">
              <div>{settings?.bank_name || 'PT BANK DBS INDONESIA'}</div>
              <div>Account No: {settings?.bank_account_no || '030-13761-68 (USD)'}</div>
              <div>Swift Code : {settings?.bank_swift_code || 'DBSBIDJA'}</div>
              {settings?.bank_branch && (
                <div>Address: {settings.bank_branch}</div>
              )}
            </div>
          </div>

          {/* Right: Country of Origin & Manufacture (36% Width - TEGAK LURUS SEJAJAR DENGAN TOTAL USD) */}
          <div style={{ width: '36%' }} className="pl-2 space-y-0.5">
            <div>
              COUNTRY OF ORIGIN: {settings?.country_of_origin || 'INDONESIA'}
            </div>
            <div>Manufacture Name & Address:</div>
            <div className="font-semibold">{settings?.company_name || 'PT PATCO ELEKTRONIK TEKNOLOGI'}</div>
            <div className="whitespace-pre-line text-[7pt] leading-[1.2]">
              {settings?.manufacture_name_address || 'Gobel Industrial Complex\nJl Teuku Umar Km 29 Cikarang Barat\nBekasi - 17520, Jawa Barat Indonesia'}
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 6. SIGNATURES (COC DIVISION & FA DIVISION)                */}
        {/* ========================================================= */}
        <div className="flex pt-6 text-[7.5pt]">
          
          {/* Prepared By / COC DIVISION (Left 64%) */}
          <div style={{ width: '64%' }} className="flex flex-col items-start pl-8">
            {/* Optional initials or signature image */}
            <div className="h-16 flex items-end justify-start w-44">
              {settings?.prepared_by_sign_url ? (
                <img src={settings.prepared_by_sign_url} alt="Sign" className="h-14 object-contain" />
              ) : (
                <span className="text-[7.5pt] italic text-slate-700 select-none pb-1">Mb</span>
              )}
            </div>
            {/* Signature Underline */}
            <div className="border-b border-black w-44 mb-1"></div>
            {/* Division Title */}
            <div className="font-bold text-[7.5pt]">
              {settings?.prepared_by_title || 'COC DIVISION'}
            </div>
            {settings?.prepared_by_name && (
              <div className="text-[7pt] text-slate-600 font-normal">
                {settings.prepared_by_name}
              </div>
            )}
          </div>

          {/* Authorized Signature / FA DIVISION (Right 36% - Sejajar di bawah Country of Origin) */}
          <div style={{ width: '36%' }} className="flex flex-col items-start pl-2">
            {/* Optional signature image */}
            <div className="h-16 flex items-end justify-start w-44">
              {settings?.authorized_sign_url && (
                <img src={settings.authorized_sign_url} alt="Sign" className="h-14 object-contain" />
              )}
            </div>
            {/* Signature Underline */}
            <div className="border-b border-black w-44 mb-1"></div>
            {/* Division Title */}
            <div className="font-bold text-[7.5pt]">
              {settings?.authorized_sign_title || 'FA DIVISION'}
            </div>
            {settings?.authorized_sign_name && (
              <div className="text-[7pt] text-slate-600 font-normal">
                {settings.authorized_sign_name}
              </div>
            )}
          </div>

        </div>

        {/* Document Control Code at far bottom right */}
        {settings?.doc_control_code && (
          <div className="text-right text-[6.5pt] font-mono text-slate-400 mt-2">
            {settings.doc_control_code}
          </div>
        )}

      </div>

    </div>
  );
}
