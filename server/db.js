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
`);

// Safe migrations for existing data.sqlite
const migrationColumns = [
  'ALTER TABLE data_logger ADD COLUMN terms_of_delivery TEXT',
  'ALTER TABLE data_logger ADD COLUMN payment_term TEXT',
  'ALTER TABLE data_logger ADD COLUMN dimensions TEXT',
  'ALTER TABLE data_logger ADD COLUMN image_url TEXT',
  'ALTER TABLE data_logger ADD COLUMN notes TEXT'
];
for (const sql of migrationColumns) {
  try {
    db.exec(sql);
  } catch (err) {
    // Column already exists, ignore
  }
}

// Seed initial data if tables are empty
function seedIfEmpty() {
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (customerCount === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (customer_id, customer_name, address, contact_person, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertCustomer.run('CUST-001', 'PT. Astra Honda Motor', 'Kawasan Industri MM2100, Cikarang Barat, Bekasi', 'Budi Santoso', '+62 21 8980300');
    insertCustomer.run('CUST-002', 'PT. Toyota Motor Manufacturing Indonesia', 'Kawasan KIIC, Karawang Barat', 'Ahmad Hidayat', '+62 21 8904500');
    insertCustomer.run('CUST-003', 'PT. Yamaha Indonesia Motor Mfg', 'Jl. DR. KRT. Radjiman Widyodiningrat, Jakarta Timur', 'Siti Rahma', '+62 21 4607888');
    insertCustomer.run('CUST-004', 'PT. Denso Indonesia', 'Kawasan Industri MM2100 Blok JJ-1, Cikarang', 'Doni Pratama', '+62 21 8980123');
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
      INSERT INTO parts (part_name, part_no, length, width, height, unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPart.run('Bracket Engine Mount RH', 'BKT-ENG-001', 450, 300, 250, 'mm');
    insertPart.run('Cover Side Upper LH', 'CVR-SD-102', 600, 200, 150, 'mm');
    insertPart.run('Shaft Drive Axle Front', 'SHF-AX-554', 750, 120, 120, 'mm');
    insertPart.run('Housing Clutch Outer', 'HSG-CL-880', 320, 320, 180, 'mm');
  }
}

seedIfEmpty();

module.exports = db;
