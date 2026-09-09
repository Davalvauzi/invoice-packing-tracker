const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pgConfig = {
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'invoice_track'
};

const pool = new Pool(pgConfig);
const sqliteDb = new DatabaseSync(path.join(__dirname, 'data.sqlite'));

async function createPostgresSchema(client) {
  console.log('📦 Membuat skema tabel di PostgreSQL...');

  await client.query(`
    -- 1. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_id VARCHAR(100) UNIQUE,
      customer_name VARCHAR(255) NOT NULL,
      address TEXT,
      bill_to TEXT,
      ship_to TEXT,
      contact_person VARCHAR(255),
      phone VARCHAR(100),
      is_dummy SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Payment Terms
    CREATE TABLE IF NOT EXISTS payment_terms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );

    -- 3. Delivery Terms
    CREATE TABLE IF NOT EXISTS delivery_terms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );

    -- 4. Parts Catalog
    CREATE TABLE IF NOT EXISTS parts (
      id SERIAL PRIMARY KEY,
      part_name VARCHAR(255) NOT NULL,
      part_no VARCHAR(100) NOT NULL,
      length NUMERIC DEFAULT 0,
      width NUMERIC DEFAULT 0,
      height NUMERIC DEFAULT 0,
      unit VARCHAR(20) DEFAULT 'mm',
      qty_per_box INTEGER DEFAULT 0,
      box_per_pallet INTEGER DEFAULT 0,
      price NUMERIC DEFAULT 0,
      is_dummy SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Part Price History
    CREATE TABLE IF NOT EXISTS part_price_history (
      id SERIAL PRIMARY KEY,
      part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      price NUMERIC NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      effective_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_id VARCHAR(100),
      payment_term VARCHAR(100),
      terms_of_delivery VARCHAR(100),
      customer_po_no VARCHAR(100),
      part_name VARCHAR(255),
      no_of_pallet INTEGER DEFAULT 0,
      no_of_box INTEGER DEFAULT 0,
      image_url TEXT,
      notes TEXT,
      items TEXT,
      bill_to TEXT,
      ship_to TEXT,
      hts_code VARCHAR(50),
      qty_per_box INTEGER DEFAULT 0,
      total_qty INTEGER DEFAULT 0,
      unit_price NUMERIC DEFAULT 0,
      total_amount NUMERIC DEFAULT 0,
      vat_rate NUMERIC DEFAULT 11,
      vat_amount NUMERIC DEFAULT 0,
      grand_total NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      is_dummy SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Packing Lists
    CREATE TABLE IF NOT EXISTS packing_lists (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(100) NOT NULL,
      invoice_date VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_po_no VARCHAR(100),
      part_name VARCHAR(255),
      terms_of_delivery VARCHAR(100),
      box_qty INTEGER DEFAULT 0,
      pallet_qty INTEGER DEFAULT 0,
      length NUMERIC DEFAULT 0,
      width NUMERIC DEFAULT 0,
      height NUMERIC DEFAULT 0,
      unit_note VARCHAR(20),
      image_url TEXT,
      notes TEXT,
      items TEXT,
      is_dummy SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Delivery Orders
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id SERIAL PRIMARY KEY,
      do_number VARCHAR(100) NOT NULL,
      do_date VARCHAR(50) NOT NULL,
      invoice_number VARCHAR(100),
      customer_name VARCHAR(255) NOT NULL,
      customer_id VARCHAR(100),
      customer_po_no VARCHAR(100),
      part_name VARCHAR(255),
      pallet_qty INTEGER DEFAULT 0,
      box_qty INTEGER DEFAULT 0,
      notes TEXT,
      items TEXT,
      is_dummy SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 9. Data Logger
    CREATE TABLE IF NOT EXISTS data_logger (
      id SERIAL PRIMARY KEY,
      doc_type VARCHAR(50) NOT NULL,
      doc_number VARCHAR(100) NOT NULL,
      doc_date VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_id VARCHAR(100),
      po_no VARCHAR(100),
      part_name VARCHAR(255),
      box_qty INTEGER DEFAULT 0,
      pallet_qty INTEGER DEFAULT 0,
      terms_of_delivery VARCHAR(100),
      payment_term VARCHAR(100),
      dimensions VARCHAR(100),
      image_url TEXT,
      notes TEXT,
      items TEXT,
      ref_id INTEGER,
      grand_total NUMERIC DEFAULT 0,
      unit_price NUMERIC DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      is_dummy SMALLINT DEFAULT 0,
      is_deleted SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Settings
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      company_name VARCHAR(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI',
      company_address_line1 TEXT DEFAULT 'Kawasan Industri MM2100 Blok LL-1',
      company_address_line2 TEXT DEFAULT 'Cikarang Barat, Bekasi 17520 - INDONESIA',
      company_phone VARCHAR(100) DEFAULT '+62 21 8980300',
      company_fax VARCHAR(100) DEFAULT '+62 21 8980301',
      company_website VARCHAR(100) DEFAULT 'www.patco.co.id',
      company_logo_url TEXT DEFAULT '',
      iso_cert_logo_url TEXT DEFAULT '',
      tuv_cert_logo_url TEXT DEFAULT '',
      hts_code_invoice VARCHAR(50) DEFAULT '8504.40.90',
      hts_code_do VARCHAR(50) DEFAULT '8504.40.00',
      bank_drawn_in_favour VARCHAR(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI',
      bank_name VARCHAR(255) DEFAULT 'BANK CENTRAL ASIA (BCA)',
      bank_account_no VARCHAR(100) DEFAULT '123-456-7890',
      bank_swift_code VARCHAR(50) DEFAULT 'CENAIDJA',
      bank_branch VARCHAR(255) DEFAULT 'KCU Cikarang Industrial Estate',
      bank_currency VARCHAR(10) DEFAULT 'USD',
      country_of_origin VARCHAR(100) DEFAULT 'INDONESIA',
      manufacture_name_address TEXT DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI, Kawasan Industri MM2100, Bekasi, Jawa Barat, Indonesia',
      prepared_by_name VARCHAR(255) DEFAULT 'Staff Ekspor / Logistik',
      prepared_by_title VARCHAR(255) DEFAULT 'Prepared By',
      prepared_by_sign_url TEXT DEFAULT '',
      authorized_sign_name VARCHAR(255) DEFAULT 'Finance & Accounting Dept',
      authorized_sign_title VARCHAR(255) DEFAULT 'Authorized Signature',
      authorized_sign_url TEXT DEFAULT '',
      doc_control_code VARCHAR(100) DEFAULT 'FRM-ACC-01 Rev.02',
      show_letterhead SMALLINT DEFAULT 1,
      pl_prepared_by_name VARCHAR(255) DEFAULT 'Staff Warehouse',
      pl_prepared_by_title VARCHAR(255) DEFAULT 'Prepared By',
      pl_authorized_name VARCHAR(255) DEFAULT 'Warehouse Supervisor',
      pl_authorized_title VARCHAR(255) DEFAULT 'Authorized Signature',
      pl_doc_control_code VARCHAR(100) DEFAULT 'FRM-WHS-02 Rev.01',
      do_drawn_in_favour VARCHAR(255) DEFAULT 'PT. PATCO ELEKTRONIK TEKNOLOGI',
      do_sign_col1_title VARCHAR(100) DEFAULT 'Prepared By',
      do_sign_col1_name VARCHAR(255) DEFAULT '',
      do_sign_col2_title VARCHAR(100) DEFAULT 'Checked By',
      do_sign_col2_name VARCHAR(255) DEFAULT '',
      do_sign_col3_title VARCHAR(100) DEFAULT 'Approved By',
      do_sign_col3_name VARCHAR(255) DEFAULT '',
      do_sign_col4_title VARCHAR(100) DEFAULT 'Security',
      do_sign_col4_name VARCHAR(255) DEFAULT '',
      do_sign_col5_title VARCHAR(100) DEFAULT 'Driver',
      do_sign_col5_name VARCHAR(255) DEFAULT '',
      do_sign_col6_title VARCHAR(100) DEFAULT 'Received By',
      do_sign_col6_name VARCHAR(255) DEFAULT '',
      do_doc_control_code VARCHAR(100) DEFAULT 'FRM-WHS-01 Rev.00',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_dl_doc_type ON data_logger(doc_type);
    CREATE INDEX IF NOT EXISTS idx_dl_doc_date ON data_logger(doc_date);
    CREATE INDEX IF NOT EXISTS idx_dl_doc_number ON data_logger(doc_number);
    CREATE INDEX IF NOT EXISTS idx_dl_customer_name ON data_logger(customer_name);
    CREATE INDEX IF NOT EXISTS idx_dl_is_deleted ON data_logger(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_inv_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_pl_inv_number ON packing_lists(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_do_number ON delivery_orders(do_number);

    -- Ensure incremental schema updates
    ALTER TABLE parts ADD COLUMN IF NOT EXISTS box_per_pallet INTEGER DEFAULT 0;
  `);

  console.log('✅ Skema PostgreSQL berhasil dibuat.');
}

async function migrateTableData(client, tableName) {
  try {
    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
    if (!rows || rows.length === 0) {
      console.log(`ℹ️ Tabel ${tableName}: Kosong (0 baris).`);
      return;
    }

    // Bersihkan isi tabel postgres terlebih dahulu agar idenpoten
    await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);

    const columns = Object.keys(rows[0]);
    const colList = columns.map(c => `"${c}"`).join(', ');
    const valPlaceholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `INSERT INTO ${tableName} (${colList}) VALUES (${valPlaceholders})`;

    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        return val !== undefined ? val : null;
      });
      await client.query(insertQuery, values);
    }

    // Sinkronisasi PostgreSQL sequence untuk kolom id (kecuali settings yang id-nya fixed)
    if (tableName !== 'settings') {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${tableName}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${tableName}), 1)
        )
      `);
    }

    console.log(`✅ Tabel ${tableName}: Berhasil migrasi ${rows.length} baris.`);
  } catch (err) {
    console.error(`❌ Gagal migrasi tabel ${tableName}:`, err.message);
    throw err;
  }
}

async function run() {
  console.log('🚀 Memulai migrasi database ke PostgreSQL...');
  console.log(`Target: postgresql://${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await createPostgresSchema(client);

    const tablesToMigrate = [
      'settings',
      'customers',
      'payment_terms',
      'delivery_terms',
      'parts',
      'part_price_history',
      'invoices',
      'packing_lists',
      'delivery_orders',
      'data_logger'
    ];

    for (const table of tablesToMigrate) {
      await migrateTableData(client, table);
    }

    await client.query('COMMIT');
    console.log('\n🎉 SEMUA DATA BERHASIL DIMIGRASIKAN KE POSTGRESQL 100%!');

    // Verifikasi perbandingan baris
    console.log('\n📊 Verifikasi Jumlah Baris (SQLite vs PostgreSQL):');
    for (const table of tablesToMigrate) {
      const sqliteCount = sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
      const pgRes = await client.query(`SELECT COUNT(*) as c FROM ${table}`);
      const pgCount = parseInt(pgRes.rows[0].c);
      const match = sqliteCount === pgCount ? 'MATCH ✅' : 'MISMATCH ❌';
      console.log(` - ${table.padEnd(20)}: SQLite=${sqliteCount}, PG=${pgCount} [${match}]`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n💥 Migrasi dibatalkan karena error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
