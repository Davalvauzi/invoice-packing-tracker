/**
 * server/seeder.js
 * Dynamic Procedural Database Seeder Engine
 * Menghasilkan dataset sintetis industri yang murni acak, realistis, dan berelasi.
 */

// 1. Kamus Nama Perusahaan Industri Manufaktur Terkemuka
const SAMPLE_COMPANIES = [
  {
    prefix: 'AHM',
    customer_id: 'CUST-AHM-01',
    customer_name: 'PT. Astra Honda Motor',
    address: 'Kawasan Industri MM2100 Blok LL-1, Cikarang Barat, Bekasi 17520',
    bill_to: 'PT. Astra Honda Motor\nFinance & Accounting Division\nJl. Laksda Yos Sudarso, Sunter 1, Jakarta Utara 14350\nTel: +62 21 8980300',
    ship_to: 'PT. Astra Honda Motor - Plant 3 Cikarang\nKawasan Industri MM2100 Blok LL-1, Cikarang Barat, Bekasi 17520',
    contact_person: 'Budi Santoso / Procurement Dept',
    phone: '+62 21 8980300'
  },
  {
    prefix: 'TMMIN',
    customer_id: 'CUST-TMMIN-02',
    customer_name: 'PT. Toyota Motor Manufacturing Indonesia',
    address: 'Kawasan KIIC Lot B-1, Karawang Barat 41361',
    bill_to: 'PT. Toyota Motor Manufacturing Indonesia\nFinance & Accounting Division\nKawasan KIIC Lot B-1, Karawang Barat 41361\nTel: +62 21 8904500',
    ship_to: 'PT. Toyota Motor Manufacturing Indonesia - Karawang Plant 1\nKawasan KIIC Lot B-1, Karawang Barat 41361',
    contact_person: 'Ahmad Hidayat / Purchasing',
    phone: '+62 21 8904500'
  },
  {
    prefix: 'DENSO',
    customer_id: 'CUST-DENSO-03',
    customer_name: 'PT. Denso Indonesia',
    address: 'Kawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520',
    bill_to: 'PT. Denso Indonesia\nAccounting & Tax Dept.\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520\nTel: +62 21 8980123',
    ship_to: 'PT. Denso Indonesia - Receiving Warehouse Plant 2\nKawasan Industri MM2100 Blok JJ-1, Cikarang Barat, Bekasi 17520',
    contact_person: 'Doni Pratama / Material Control',
    phone: '+62 21 8980123'
  },
  {
    prefix: 'YIMM',
    customer_id: 'CUST-YIMM-04',
    customer_name: 'PT. Yamaha Indonesia Motor Mfg.',
    address: 'Jl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920',
    bill_to: 'PT. Yamaha Indonesia Motor Mfg.\nAccounts Payable Section\nJl. Dr. KRT. Radjiman Widyodiningrat, Pulo Gadung, Jakarta Timur 13920',
    ship_to: 'PT. Yamaha Indonesia Motor Mfg. - West Java Factory\nKawasan Industri KIIC Kav. Y-1, Karawang Barat',
    contact_person: 'Rian Kurniawan / Supply Chain',
    phone: '+62 21 4607880'
  },
  {
    prefix: 'EPSON',
    customer_id: 'CUST-EPSON-05',
    customer_name: 'PT. Indonesia Epson Industry',
    address: 'Kawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550',
    bill_to: 'PT. Indonesia Epson Industry\nFinance Department\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550\nTel: +62 21 8970101',
    ship_to: 'PT. Indonesia Epson Industry - Main Logistic Hub\nKawasan Industri EJIP Plot 4E, Cikarang Selatan, Bekasi 17550',
    contact_person: 'Dewi Lestari / Purchasing Sub-Leader',
    phone: '+62 21 8970101'
  },
  {
    prefix: 'PANASONIC',
    customer_id: 'CUST-PANA-06',
    customer_name: 'PT. Panasonic Industrial Devices Batam',
    address: 'Puri Industrial Park 2000, Batam Centre, Kepulauan Riau 29461',
    bill_to: 'PT. Panasonic Industrial Devices Batam\nProcurement & Logistics Dept\nPuri Industrial Park 2000, Batam Centre, Kepulauan Riau 29461',
    ship_to: 'PT. Panasonic Industrial Devices Batam - Receiving Dock\nPuri Industrial Park 2000, Batam Centre, Kepulauan Riau 29461',
    contact_person: 'Hendro Wijaya / Procurement Specialist',
    phone: '+62 778 463100'
  },
  {
    prefix: 'OMRON',
    customer_id: 'CUST-OMRON-07',
    customer_name: 'PT. Omron Manufacturing of Indonesia',
    address: 'Kawasan Industri EJIP Plot 5C, Cikarang Selatan, Bekasi 17550',
    bill_to: 'PT. Omron Manufacturing of Indonesia\nAccounting & Finance\nKawasan Industri EJIP Plot 5C, Cikarang Selatan, Bekasi 17550',
    ship_to: 'PT. Omron Manufacturing of Indonesia - Raw Material WH\nKawasan Industri EJIP Plot 5C, Cikarang Selatan, Bekasi 17550',
    contact_person: 'Siti Rahmawati / SCM Dept',
    phone: '+62 21 8970111'
  },
  {
    prefix: 'SHOWA',
    customer_id: 'CUST-SHOWA-08',
    customer_name: 'PT. Showa Indonesia Manufacturing',
    address: 'Kawasan Industri Jababeka Blok A-3, Cikarang Utara, Bekasi 17530',
    bill_to: 'PT. Showa Indonesia Manufacturing\nFinance Division\nKawasan Industri Jababeka Blok A-3, Cikarang Utara, Bekasi 17530',
    ship_to: 'PT. Showa Indonesia Manufacturing - Plant 1\nKawasan Industri Jababeka Blok A-3, Cikarang Utara, Bekasi 17530',
    contact_person: 'Bambang Irawan / Logistics',
    phone: '+62 21 8934250'
  },
  {
    prefix: 'AISIN',
    customer_id: 'CUST-AISIN-09',
    customer_name: 'PT. Aisin Indonesia Automotive',
    address: 'Kawasan Industri KIIC Lot LL-9, Karawang Barat 41361',
    bill_to: 'PT. Aisin Indonesia Automotive\nAccounting & Finance Dept.\nKawasan Industri KIIC Lot LL-9, Karawang Barat 41361',
    ship_to: 'PT. Aisin Indonesia Automotive - Receiving Bay\nKawasan Industri KIIC Lot LL-9, Karawang Barat 41361',
    contact_person: 'Eko Wahyudi / Purchasing',
    phone: '+62 21 89119200'
  },
  {
    prefix: 'KAYABA',
    customer_id: 'CUST-KYB-10',
    customer_name: 'PT. Kayaba Indonesia',
    address: 'Kawasan Industri MM2100 Blok FF-4, Cikarang Barat, Bekasi 17520',
    bill_to: 'PT. Kayaba Indonesia\nFinance Section\nKawasan Industri MM2100 Blok FF-4, Cikarang Barat, Bekasi 17520',
    ship_to: 'PT. Kayaba Indonesia - Assembly Factory 1\nKawasan Industri MM2100 Blok FF-4, Cikarang Barat, Bekasi 17520',
    contact_person: 'Agus Setiawan / Parts Ordering',
    phone: '+62 21 8981150'
  },
  {
    prefix: 'PPC',
    customer_id: '120077',
    customer_name: 'PPC Moulding Services (Malaysia) Sdn Bhd.',
    address: 'No. 14/No. 21, Jalan I-ParkSAC 3, Taman Perindustrian I-Park SAC, 81400 Senai, Malaysia',
    bill_to: 'PPC Moulding Services (Malaysia) Sdn Bhd.\nNo. 14/No. 21, Jalan I-ParkSAC 3,\nTaman Perindustrian I-Park SAC,\n81400 Senai, Johor, Malaysia\nTel: +60 7 5959 698',
    ship_to: 'PPC Moulding Services (Malaysia) Sdn Bhd.\nNo. 14/No. 21, Jalan I-ParkSAC 3,\nTaman Perindustrian I-Park SAC,\n81400 Senai, Johor, Malaysia',
    contact_person: 'Mr. Tan / Purchasing Department',
    phone: '+60 19774 8955'
  },
  {
    prefix: 'MITSUBISHI',
    customer_id: 'CUST-MMKI-12',
    customer_name: 'PT. Mitsubishi Motors Krama Yudha Indonesia',
    address: 'Kawasan Industri GIIC Blok AN No. 1, Kota Deltamas, Cikarang Pusat 17530',
    bill_to: 'PT. Mitsubishi Motors Krama Yudha Indonesia\nFinance & Accounting Division\nKawasan Industri GIIC Blok AN No. 1, Kota Deltamas, Cikarang Pusat 17530',
    ship_to: 'PT. Mitsubishi Motors Krama Yudha Indonesia - Part Receiving\nKawasan Industri GIIC Blok AN No. 1, Kota Deltamas, Cikarang Pusat 17530',
    contact_person: 'Rizky Pratama / Purchasing Spec',
    phone: '+62 21 80665000'
  }
];

// 2. Kamus Katalog Produk & Part Presisi Manufaktur
const SAMPLE_PARTS = [
  { part_name: '010-0504-09/9 Stator Flex Cable Assy', part_no: '105110195', qty_per_box: 98, price_usd: 4.5027, length: 450, width: 300, height: 250, unit: 'mm' },
  { part_name: 'Bracket Engine Mount RH High-Tensile', part_no: 'BKT-ENG-001', qty_per_box: 50, price_usd: 5.2500, length: 400, width: 250, height: 200, unit: 'mm' },
  { part_name: 'Cover Side Upper LH - Matte Black Spec', part_no: 'CVR-SD-102', qty_per_box: 80, price_usd: 2.8500, length: 500, width: 220, height: 160, unit: 'mm' },
  { part_name: 'Housing Clutch Outer Stamping Spec A', part_no: 'HSG-CL-880', qty_per_box: 40, price_usd: 8.4500, length: 320, width: 320, height: 180, unit: 'mm' },
  { part_name: 'Shaft Drive Axle Front Precision Ground', part_no: 'SHF-AX-554', qty_per_box: 25, price_usd: 12.8000, length: 600, width: 120, height: 120, unit: 'mm' },
  { part_name: 'Terminal Connector 16-Pin Gold Plated', part_no: 'CON-16P-GLD', qty_per_box: 200, price_usd: 1.1500, length: 300, width: 200, height: 150, unit: 'mm' },
  { part_name: 'Armature Rotor Assy 24V Brushless', part_no: 'RTR-ASY-24V', qty_per_box: 30, price_usd: 15.5000, length: 350, width: 250, height: 200, unit: 'mm' },
  { part_name: 'Gasket Cylinder Head Multi-Layer Steel', part_no: 'GSK-CYL-012', qty_per_box: 150, price_usd: 3.2000, length: 420, width: 280, height: 100, unit: 'mm' },
  { part_name: 'Pulley Crankshaft Damper V-Belt Type', part_no: 'PLY-CRK-440', qty_per_box: 20, price_usd: 9.7500, length: 280, width: 280, height: 200, unit: 'mm' },
  { part_name: 'Sensor Oxygen Exhaust Heated 4-Wire', part_no: 'SNS-O2-EXH', qty_per_box: 60, price_usd: 18.2500, length: 300, width: 200, height: 180, unit: 'mm' },
  { part_name: 'Solenoid Valve Purge Control 12V DC', part_no: 'SOL-VLV-12V', qty_per_box: 50, price_usd: 7.6000, length: 320, width: 240, height: 160, unit: 'mm' },
  { part_name: 'Insulator Manifold Intake Heat-Resistant', part_no: 'INS-MNF-008', qty_per_box: 100, price_usd: 2.4000, length: 350, width: 250, height: 180, unit: 'mm' },
  { part_name: 'Stamping Plate Reinforcement B-Pillar', part_no: 'STP-PLT-B01', qty_per_box: 40, price_usd: 6.8000, length: 550, width: 300, height: 150, unit: 'mm' },
  { part_name: 'Oil Seal Crankshaft Rear Viton High Temp', part_no: 'SEAL-CRK-RR', qty_per_box: 250, price_usd: 1.8500, length: 250, width: 250, height: 120, unit: 'mm' },
  { part_name: 'Wiring Harness Main Body Sub-Assy', part_no: 'WRG-HRN-SUB', qty_per_box: 15, price_usd: 34.5000, length: 650, width: 450, height: 300, unit: 'mm' }
];

const PAYMENT_TERMS = ['Net 30 Days', 'Net 45 Days', 'Net 60 Days', 'Ex-Works', 'COD (Cash On Delivery)'];
const DELIVERY_TERMS = ['Ex-Works', 'FOB Tanjung Priok', 'CIF Tanjung Priok', 'Franco Cikarang'];
const HTS_CODES = ['8504.40.90', '8503.00.90', '8708.29.99', '8708.99.90', '8544.30.00'];

// Helper: Random Integer between min and max inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: Pick random element from array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Generate a random date within the last N months
function getRandomPastDate(monthsBack = 6) {
  const now = new Date();
  const daysRange = Math.max(1, monthsBack * 30);
  const randomPastDays = randInt(1, daysRange);
  const targetDate = new Date(now.getTime() - randomPastDays * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().slice(0, 10);
}

/**
 * Main procedural seeder function
 * @param {object} db - SQLite database instance
 * @param {object} options - Seeder configuration options
 */
function runProceduralSeeder(db, options = {}) {
  const {
    count = 10,
    dateRangeMonths = 6,
    includePL = true,
    includeDO = true,
    currencies = ['USD', 'IDR', 'JPY']
  } = options;

  let insertedCustomers = 0;
  let insertedParts = 0;
  let insertedInvoices = 0;
  let insertedPLs = 0;
  let insertedDOs = 0;

  // 1. Seed Payment & Delivery Terms if not present
  PAYMENT_TERMS.forEach(name => {
    const ex = db.prepare('SELECT id FROM payment_terms WHERE name = ?').get(name);
    if (!ex) db.prepare('INSERT INTO payment_terms (name, description) VALUES (?, ?)').run(name, `Ketentuan pembayaran ${name}`);
  });
  DELIVERY_TERMS.forEach(name => {
    const ex = db.prepare('SELECT id FROM delivery_terms WHERE name = ?').get(name);
    if (!ex) db.prepare('INSERT INTO delivery_terms (name, description) VALUES (?, ?)').run(name, `Ketentuan pengiriman ${name}`);
  });

  // 2. Seed Master Customers (randomize or ensure all sample companies exist)
  const insertCust = db.prepare(`
    INSERT INTO customers (customer_id, customer_name, address, bill_to, ship_to, contact_person, phone, is_dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  SAMPLE_COMPANIES.forEach(c => {
    const existing = db.prepare('SELECT id FROM customers WHERE customer_name = ? OR customer_id = ?').get(c.customer_name, c.customer_id);
    if (!existing) {
      insertCust.run(c.customer_id, c.customer_name, c.address, c.bill_to, c.ship_to, c.contact_person, c.phone);
      insertedCustomers++;
    }
  });

  // Get all active customers for sampling
  const allCustomers = db.prepare('SELECT * FROM customers').all();

  // 3. Seed Master Parts (randomize or ensure sample parts exist)
  const insertPart = db.prepare(`
    INSERT INTO parts (part_name, part_no, length, width, height, unit, qty_per_box, price, is_dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const insertPriceHistory = db.prepare(`
    INSERT INTO part_price_history (part_id, price, currency, effective_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  SAMPLE_PARTS.forEach(p => {
    const existing = db.prepare('SELECT id FROM parts WHERE part_name = ? OR part_no = ?').get(p.part_name, p.part_no);
    let partId = existing ? existing.id : null;
    if (!existing) {
      const info = insertPart.run(p.part_name, p.part_no, p.length, p.width, p.height, p.unit, p.qty_per_box, p.price_usd);
      partId = info.lastInsertRowid;
      insertedParts++;

      // Seed 2 chronological price history adjustments for each new part
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      const initialDate = sixMonthsAgo.toISOString().slice(0, 10);

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2);
      const revisedDate = threeMonthsAgo.toISOString().slice(0, 10);

      const oldPrice = +(p.price_usd * 0.95).toFixed(4);
      insertPriceHistory.run(partId, oldPrice, 'USD', initialDate, 'Penetapan harga awal tahun');
      insertPriceHistory.run(partId, p.price_usd, 'USD', revisedDate, 'Penyesuaian fluktuasi bahan baku');
    }
  });

  const allParts = db.prepare('SELECT * FROM parts').all();

  // 4. Generate Procedural Invoices
  // To keep dates realistic and sequential, generate dates first, sort them chronologically
  const generatedDates = [];
  for (let i = 0; i < count; i++) {
    generatedDates.push(getRandomPastDate(dateRangeMonths));
  }
  generatedDates.sort(); // sort from oldest to newest

  const insertInv = db.prepare(`
    INSERT INTO invoices (
      invoice_number, invoice_date, customer_name, customer_id, bill_to, ship_to,
      payment_term, terms_of_delivery, customer_po_no, hts_code,
      part_name, no_of_pallet, no_of_box, qty_per_box, total_qty,
      unit_price, total_amount, vat_rate, vat_amount, grand_total, currency, is_dummy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertPL = db.prepare(`
    INSERT INTO packing_lists (
      invoice_number, invoice_date, customer_name, customer_po_no, part_name,
      terms_of_delivery, box_qty, pallet_qty, length, width, height, unit_note, is_dummy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertDO = db.prepare(`
    INSERT INTO delivery_orders (
      do_number, do_date, invoice_number, customer_name, customer_id,
      customer_po_no, part_name, pallet_qty, box_qty, notes, is_dummy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const insertLog = db.prepare(`
    INSERT INTO data_logger (
      doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
      part_name, box_qty, pallet_qty, ref_id, terms_of_delivery, payment_term,
      dimensions, grand_total, unit_price, currency, is_dummy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (let i = 0; i < count; i++) {
    const invDate = generatedDates[i];
    const [year, month] = invDate.split('-');
    const randomSeq = String(randInt(10, 999)).padStart(3, '0');
    const invoiceNumber = `INV/${year}/${month}/${randomSeq}`;

    // Pick random customer & part
    const customer = pickRandom(allCustomers.length > 0 ? allCustomers : SAMPLE_COMPANIES);
    const part = pickRandom(allParts.length > 0 ? allParts : SAMPLE_PARTS);

    // Pick random currency
    const chosenCurrency = pickRandom(currencies.length > 0 ? currencies : ['USD', 'IDR', 'JPY']);

    // Determine unit price based on currency
    let unitPrice = part.price || 5.0;
    if (chosenCurrency === 'IDR') {
      unitPrice = Math.round((unitPrice * 15800) / 100) * 100; // e.g. Rp 71,100
    } else if (chosenCurrency === 'JPY') {
      unitPrice = Math.round(unitPrice * 152); // e.g. ¥684
    } else {
      unitPrice = +unitPrice.toFixed(4);
    }

    // Boxes & Pallets calculation
    const qtyPerBox = part.qty_per_box || 50;
    const noOfBox = randInt(10, 80);
    const noOfPallet = Math.max(1, Math.ceil(noOfBox / 20));
    const totalQty = noOfBox * qtyPerBox;
    const totalAmount = +(totalQty * unitPrice).toFixed(2);

    // VAT: 60% with PPN 11%, 40% export/zero-rated
    const vatRate = Math.random() > 0.4 ? 11 : 0;
    const vatAmount = +(totalAmount * (vatRate / 100)).toFixed(2);
    const grandTotal = +(totalAmount + vatAmount).toFixed(2);

    const poNumber = `PO-${(customer.customer_name || 'CUST').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase()}-${randInt(1000, 9999)}`;
    const paymentTerm = pickRandom(PAYMENT_TERMS);
    const deliveryTerm = pickRandom(DELIVERY_TERMS);
    const htsCode = pickRandom(HTS_CODES);

    // Check if invoice_number collision exists
    const exInv = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber);
    if (exInv) continue;

    // Insert Invoice
    const invInfo = insertInv.run(
      invoiceNumber, invDate, customer.customer_name, customer.customer_id, customer.bill_to, customer.ship_to,
      paymentTerm, deliveryTerm, poNumber, htsCode,
      part.part_name, noOfPallet, noOfBox, qtyPerBox, totalQty,
      unitPrice, totalAmount, vatRate, vatAmount, grandTotal, chosenCurrency
    );
    const invId = invInfo.lastInsertRowid;

    // Insert Invoice to Data Logger
    insertLog.run(
      'INVOICE', invoiceNumber, invDate, customer.customer_name, customer.customer_id, poNumber,
      part.part_name, noOfBox, noOfPallet, invId, deliveryTerm, paymentTerm,
      `${part.length || 400} x ${part.width || 300} x ${part.height || 200} mm`,
      grandTotal, unitPrice, chosenCurrency
    );
    insertedInvoices++;

    // 5. Linked Packing List (~85% of invoices if includePL is true)
    const shouldMakePL = includePL && (Math.random() <= 0.85);
    if (shouldMakePL) {
      const plDateObj = new Date(invDate);
      plDateObj.setDate(plDateObj.getDate() + randInt(0, 1));
      const plDate = plDateObj.toISOString().slice(0, 10);

      insertPL.run(
        invoiceNumber, plDate, customer.customer_name, poNumber,
        `${part.part_name} (${part.part_no || 'P/N'})`,
        deliveryTerm, noOfBox, noOfPallet,
        part.length || 400, part.width || 300, part.height || 200, part.unit || 'mm'
      );

      insertLog.run(
        'PACKING_LIST', invoiceNumber, plDate, customer.customer_name, customer.customer_id, poNumber,
        part.part_name, noOfBox, noOfPallet, invId,
        `Ref Inv: ${invoiceNumber}`, paymentTerm,
        `${part.length || 400} x ${part.width || 300} x ${part.height || 200} mm`,
        grandTotal, unitPrice, chosenCurrency
      );
      insertedPLs++;
    }

    // 6. Linked Delivery Order (~70% of invoices if includeDO is true)
    const shouldMakeDO = includeDO && (Math.random() <= 0.70);
    if (shouldMakeDO) {
      const doDateObj = new Date(invDate);
      doDateObj.setDate(doDateObj.getDate() + randInt(1, 3));
      const doDate = doDateObj.toISOString().slice(0, 10);
      const doNumber = `DO/${year}/${month}/${String(randInt(10, 999)).padStart(3, '0')}`;

      insertDO.run(
        doNumber, doDate, invoiceNumber, customer.customer_name, customer.customer_id,
        poNumber, part.part_name, noOfPallet, noOfBox,
        `Surat Jalan resmi pengiriman barang fisik sesuai PO: ${poNumber}`
      );

      insertLog.run(
        'DELIVERY_ORDER', doNumber, doDate, customer.customer_name, customer.customer_id, poNumber,
        part.part_name, noOfBox, noOfPallet, invId,
        `Ref Inv: ${invoiceNumber}`, paymentTerm,
        `${part.length || 400} x ${part.width || 300} x ${part.height || 200} mm`,
        grandTotal, unitPrice, chosenCurrency
      );
      insertedDOs++;
    }
  }

  return {
    insertedCustomers,
    insertedParts,
    insertedInvoices,
    insertedPLs,
    insertedDOs
  };
}

module.exports = {
  runProceduralSeeder,
  SAMPLE_COMPANIES,
  SAMPLE_PARTS
};
