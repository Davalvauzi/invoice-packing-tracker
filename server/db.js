const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    address TEXT,
    contact_person TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS delivery_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_name TEXT NOT NULL,
    part_no TEXT NOT NULL,
    length REAL DEFAULT 0,
    width REAL DEFAULT 0,
    height REAL DEFAULT 0,
    unit TEXT DEFAULT 'mm',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS part_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    price REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    effective_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT,
    payment_term TEXT,
    terms_of_delivery TEXT,
    customer_po_no TEXT,
    part_name TEXT,
    no_of_pallet INTEGER DEFAULT 0,
    no_of_box INTEGER DEFAULT 0,
    image_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS packing_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_po_no TEXT,
    part_name TEXT,
    terms_of_delivery TEXT,
    box_qty INTEGER DEFAULT 0,
    pallet_qty INTEGER DEFAULT 0,
    length REAL DEFAULT 0,
    width REAL DEFAULT 0,
    height REAL DEFAULT 0,
    unit_note TEXT,
    image_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS delivery_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    do_number TEXT NOT NULL,
    do_date TEXT NOT NULL,
    invoice_number TEXT,
    customer_name TEXT NOT NULL,
    customer_id TEXT,
    customer_po_no TEXT,
    part_name TEXT,
    pallet_qty INTEGER DEFAULT 0,
    box_qty INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS data_logger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_type TEXT NOT NULL, -- 'INVOICE' | 'PACKING_LIST' | 'DELIVERY_ORDER'
    doc_number TEXT NOT NULL,
    doc_date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT,
    po_no TEXT,
    part_name TEXT,
    box_qty INTEGER DEFAULT 0,
    pallet_qty INTEGER DEFAULT 0,
    terms_of_delivery TEXT,
    payment_term TEXT,
    dimensions TEXT,
    image_url TEXT,
    notes TEXT,
    ref_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    company_name TEXT DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI',
    company_address_line1 TEXT DEFAULT 'Kawasan Industri MM2100 Blok LL-1',
    company_address_line2 TEXT DEFAULT 'Cikarang Barat, Bekasi 17520 - INDONESIA',
    company_phone TEXT DEFAULT '+62 21 8980300',
    company_fax TEXT DEFAULT '+62 21 8980301',
    company_website TEXT DEFAULT 'www.patco.co.id',
    company_logo_url TEXT DEFAULT '',
    iso_cert_logo_url TEXT DEFAULT '',
    tuv_cert_logo_url TEXT DEFAULT '',
    hts_code_invoice TEXT DEFAULT '8504.40.90',
    hts_code_do TEXT DEFAULT '8504.40.00',
    bank_drawn_in_favour TEXT DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI',
    bank_name TEXT DEFAULT 'BANK CENTRAL ASIA (BCA)',
    bank_account_no TEXT DEFAULT '123-456-7890',
    bank_swift_code TEXT DEFAULT 'CENAIDJA',
    bank_branch TEXT DEFAULT 'KCU Cikarang Industrial Estate',
    bank_currency TEXT DEFAULT 'USD',
    country_of_origin TEXT DEFAULT 'INDONESIA',
    manufacture_name_address TEXT DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI, Kawasan Industri MM2100, Bekasi, Jawa Barat, Indonesia',
    prepared_by_name TEXT DEFAULT 'Staff Ekspor / Logistik',
    prepared_by_title TEXT DEFAULT 'Prepared By',
    prepared_by_sign_url TEXT DEFAULT '',
    authorized_sign_name TEXT DEFAULT 'Finance & Accounting Dept',
    authorized_sign_title TEXT DEFAULT 'Authorized Signature',
    authorized_sign_url TEXT DEFAULT '',
    doc_control_code TEXT DEFAULT 'FRM-ACC-01 Rev.02',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for existing data.sqlite
const migrationColumns = [
  'ALTER TABLE data_logger ADD COLUMN terms_of_delivery TEXT',
  'ALTER TABLE data_logger ADD COLUMN payment_term TEXT',
  'ALTER TABLE data_logger ADD COLUMN dimensions TEXT',
  'ALTER TABLE data_logger ADD COLUMN image_url TEXT',
  'ALTER TABLE data_logger ADD COLUMN notes TEXT',
  'ALTER TABLE data_logger ADD COLUMN grand_total REAL DEFAULT 0',
  'ALTER TABLE data_logger ADD COLUMN unit_price REAL DEFAULT 0',
  'ALTER TABLE data_logger ADD COLUMN currency TEXT DEFAULT "USD"',
  // Parts pricing & box capacity
  'ALTER TABLE parts ADD COLUMN qty_per_box INTEGER DEFAULT 0',
  'ALTER TABLE parts ADD COLUMN price REAL DEFAULT 0',
  // Customer Bill To & Ship To
  'ALTER TABLE customers ADD COLUMN bill_to TEXT',
  'ALTER TABLE customers ADD COLUMN ship_to TEXT',
  // Invoices financial calculation and HTS code
  'ALTER TABLE invoices ADD COLUMN bill_to TEXT',
  'ALTER TABLE invoices ADD COLUMN ship_to TEXT',
  'ALTER TABLE invoices ADD COLUMN hts_code TEXT',
  'ALTER TABLE invoices ADD COLUMN qty_per_box INTEGER DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN total_qty INTEGER DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN unit_price REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN total_amount REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN vat_rate REAL DEFAULT 11',
  'ALTER TABLE invoices ADD COLUMN vat_amount REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN grand_total REAL DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT "USD"',
  // Dummy flags to allow safe deletion of dummy data only
  'ALTER TABLE customers ADD COLUMN is_dummy INTEGER DEFAULT 0',
  'ALTER TABLE parts ADD COLUMN is_dummy INTEGER DEFAULT 0',
  'ALTER TABLE invoices ADD COLUMN is_dummy INTEGER DEFAULT 0',
  'ALTER TABLE packing_lists ADD COLUMN is_dummy INTEGER DEFAULT 0',
  'ALTER TABLE delivery_orders ADD COLUMN is_dummy INTEGER DEFAULT 0',
  'ALTER TABLE data_logger ADD COLUMN is_dummy INTEGER DEFAULT 0'
];
for (const sql of migrationColumns) {
  try {
    db.exec(sql);
  } catch (err) {
    // Column already exists, ignore
  }
}

// Ensure 100% removal of PPC Moulding Services and sample part 105110195
try {
  db.exec(`
    DELETE FROM customers WHERE customer_id = '120077' OR customer_name LIKE '%PPC Moulding%';
    DELETE FROM parts WHERE part_no = '105110195' OR part_name LIKE '%Stator Flex Cable%';
    DELETE FROM invoices WHERE invoice_number = '10-26010002' OR customer_name LIKE '%PPC Moulding%';
    DELETE FROM packing_lists WHERE invoice_number = '10-26010002';
    DELETE FROM data_logger WHERE doc_number = '10-26010002' OR customer_name LIKE '%PPC Moulding%';
  `);
} catch (err) {
  // Ignore
}


// Seed initial data if tables are empty
function seedIfEmpty() {
  // Ensure default settings row exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO settings (
        id, company_name, company_address_line1, company_address_line2, 
        company_phone, company_fax, company_website, hts_code_invoice, hts_code_do,
        bank_drawn_in_favour, bank_name, bank_account_no, bank_swift_code, bank_branch,
        country_of_origin, manufacture_name_address, doc_control_code
      ) VALUES (
        1, 'PT. PATCO ELEKTRONIK TEKNOLOGI', 'Kawasan Industri MM2100 Blok LL-1', 'Cikarang Barat, Bekasi 17520 - INDONESIA',
        'Phone : +62 21 8980300', 'Fax : +62 21 8980301', 'Website : www.patco.co.id', '8504.40.90', '8504.40.00',
        'PT. PATCO ELEKTRONIK TEKNOLOGI', 'BANK CENTRAL ASIA (BCA)', '898-0123-456', 'CENAIDJA', 'KCU Cikarang MM2100',
        'INDONESIA', 'PT. PATCO ELEKTRONIK TEKNOLOGI\nKawasan Industri MM2100, Cikarang Barat, Jawa Barat - INDONESIA',
        'FRM-ACC-01 Rev.02'
      )
    `).run();
  }

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (customerCount === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (customer_id, customer_name, address, bill_to, ship_to, contact_person, phone, is_dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertCustomer.run(
      'CUST-001', 
      'PT. Astra Honda Motor', 
      'Kawasan Industri MM2100, Cikarang Barat, Bekasi',
      'PT. Astra Honda Motor\nHead Office & Accounting Dept.\nJl. Laksda Yos Sudarso, Sunter 1, Jakarta Utara 14350',
      'PT. Astra Honda Motor - Plant 3\nKawasan Industri MM2100 Blok LL-1, Cikarang Barat, Bekasi',
      'Budi Santoso', 
      '+62 21 8980300'
    );
    insertCustomer.run(
      'CUST-002', 
      'PT. Toyota Motor Manufacturing Indonesia', 
      'Kawasan KIIC, Karawang Barat',
      'PT. Toyota Motor Manufacturing Indonesia\nFinance Department\nJl. Yos Sudarso Sunter II, Jakarta 14330',
      'PT. Toyota Motor Manufacturing Indonesia - Karawang Plant 1\nKawasan Industri KIIC Lot DD 1, Karawang',
      'Ahmad Hidayat', 
      '+62 21 8904500'
    );
  } else {
    // Fill sample bill_to & ship_to if empty
    db.exec(`
      UPDATE customers 
      SET bill_to = COALESCE(bill_to, customer_name || '\nAccounting & Finance Dept.\n' || address),
          ship_to = COALESCE(ship_to, customer_name || ' - Receiving Warehouse\n' || address)
      WHERE bill_to IS NULL OR bill_to = ''
    `);
  }

  const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payment_terms').get().count;
  if (paymentCount === 0) {
    const insertPayment = db.prepare('INSERT INTO payment_terms (name, description) VALUES (?, ?)');
    insertPayment.run('COD (Cash on Delivery)', 'Pembayaran tunai saat barang diterima');
    insertPayment.run('Net 14 Days', 'Jatuh tempo 14 hari setelah invoice diterima');
    insertPayment.run('Net 30 Days', 'Jatuh tempo 30 hari setelah invoice diterima');
    insertPayment.run('Net 60 Days', 'Jatuh tempo 60 hari setelah invoice diterima');
    insertPayment.run('T/T in Advance', 'Transfer bank di muka 100%');
  }

  const deliveryCount = db.prepare('SELECT COUNT(*) as count FROM delivery_terms').get().count;
  if (deliveryCount === 0) {
    const insertDelivery = db.prepare('INSERT INTO delivery_terms (name, description) VALUES (?, ?)');
    insertDelivery.run('FOB (Free on Board)', 'Penjual menanggung biaya sampai barang di atas kapal');
    insertDelivery.run('CIF (Cost, Insurance & Freight)', 'Penjual menanggung biaya kirim dan asuransi');
    insertDelivery.run('EXW (Ex Works)', 'Pembeli mengambil barang langsung di gudang penjual');
    insertDelivery.run('DAP (Delivered at Place)', 'Diantar langsung ke lokasi pembeli');
    insertDelivery.run('DDP (Delivered Duty Paid)', 'Diantar sampai tempat dengan bea masuk ditanggung penjual');
    insertDelivery.run('Loco Gudang Pembeli', 'Pengiriman lokal sampai gudang customer');
  }

  const partCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;
  if (partCount === 0) {
    const insertPart = db.prepare(`
      INSERT INTO parts (part_name, part_no, length, width, height, unit, qty_per_box, price, is_dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertPart.run('Bracket Engine Mount RH', 'BKT-ENG-001', 450, 300, 250, 'mm', 50, 4.50);
    insertPart.run('Cover Side Upper LH', 'CVR-SD-102', 600, 200, 150, 'mm', 100, 2.75);
    insertPart.run('Shaft Drive Axle Front', 'SHF-AX-554', 750, 120, 120, 'mm', 25, 12.80);
    insertPart.run('Housing Clutch Outer', 'HSG-CL-880', 320, 320, 180, 'mm', 40, 8.20);
  } else {
    // Ensure existing sample parts have default qty_per_box and price if 0
    db.exec(`
      UPDATE parts SET qty_per_box = 50, price = 4.50 WHERE (qty_per_box IS NULL OR qty_per_box = 0) AND part_no = 'BKT-ENG-001';
      UPDATE parts SET qty_per_box = 100, price = 2.75 WHERE (qty_per_box IS NULL OR qty_per_box = 0) AND part_no = 'CVR-SD-102';
      UPDATE parts SET qty_per_box = 25, price = 12.80 WHERE (qty_per_box IS NULL OR qty_per_box = 0) AND part_no = 'SHF-AX-554';
      UPDATE parts SET qty_per_box = 40, price = 8.20 WHERE (qty_per_box IS NULL OR qty_per_box = 0) AND part_no = 'HSG-CL-880';
      UPDATE parts SET qty_per_box = 50, price = 5.00 WHERE qty_per_box IS NULL OR qty_per_box = 0;
    `);
  }

  // Seed initial price history for parts that have no history yet
  try {
    const existingParts = db.prepare('SELECT id, price FROM parts').all();
    const insertHistory = db.prepare(`
      INSERT INTO part_price_history (part_id, price, currency, effective_date, notes)
      VALUES (?, ?, 'USD', '2026-01-01', 'Harga Dasar Awal')
    `);
    for (const p of existingParts) {
      const hasHist = db.prepare('SELECT COUNT(*) as count FROM part_price_history WHERE part_id = ?').get(p.id).count;
      if (hasHist === 0) {
        insertHistory.run(p.id, p.price || 5.00);
      }
    }
  } catch (err) {
    console.error('Price history initial seed error:', err);
  }
}

seedIfEmpty();

module.exports = db;
