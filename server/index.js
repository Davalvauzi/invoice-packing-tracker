const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./db');
const { seedMasterTemplate, generateTransactionsOnly, runProceduralSeeder, SAMPLE_COMPANIES, SAMPLE_PARTS } = require('./seeder');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup to allow LAN access
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically with security headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'drawing-' + uniqueSuffix + ext);
  }
});

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung! Hanya file JPG, PNG, WebP, atau PDF yang diizinkan.'));
    }
  }
});

// Helper to get local network IP (prioritizes active Wi-Fi / LAN, ignores APIPA 169.254.x.x)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Ignore APIPA / unconfigured link-local (169.254.x.x)
        if (iface.address.startsWith('169.254.')) continue;

        candidates.push({
          name: name.toLowerCase(),
          address: iface.address
        });
      }
    }
  }

  // 1. Prioritize Wi-Fi / WLAN adapter
  const wifi = candidates.find(c =>
    c.name.includes('wi-fi') || c.name.includes('wlan') || c.name.includes('wireless')
  );
  if (wifi) return wifi.address;

  // 2. Prioritize standard private LAN IP (192.168.x.x or 10.x.x.x)
  const lan = candidates.find(c =>
    c.address.startsWith('192.168.') || c.address.startsWith('10.')
  );
  if (lan) return lan.address;

  return candidates[0]?.address || 'localhost';
}

// Network info endpoint
app.get('/api/network-info', async (req, res) => {
  res.json({
    localIp: getLocalIP(),
    apiPort: PORT,
    clientPort: 3000
  });
});

// Optimized Dashboard aggregation endpoint (eliminates full data-logger download)
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const counts = await db.prepare(`
      SELECT 
        SUM(CASE WHEN doc_type = 'INVOICE' AND (is_deleted IS NULL OR is_deleted = 0) THEN 1 ELSE 0 END) AS total_invoices,
        SUM(CASE WHEN doc_type = 'PACKING_LIST' AND (is_deleted IS NULL OR is_deleted = 0) THEN 1 ELSE 0 END) AS total_packing_lists,
        SUM(CASE WHEN doc_type = 'DELIVERY_ORDER' AND (is_deleted IS NULL OR is_deleted = 0) THEN 1 ELSE 0 END) AS total_delivery_orders
      FROM data_logger
    `).get();

    const customerCount = Number((await db.prepare('SELECT COUNT(*) as count FROM customers').get())?.count || 0);

    // Retrieve recent logs for tree display (top 50)
    const recentLogs = await db.prepare(`
      SELECT * FROM data_logger 
      WHERE (is_deleted IS NULL OR is_deleted = 0)
      ORDER BY id DESC LIMIT 50
    `).all();

    res.json({
      totalInvoices: Number(counts?.total_invoices || 0),
      totalPackingLists: Number(counts?.total_packing_lists || 0),
      totalDeliveryOrders: Number(counts?.total_delivery_orders || 0),
      totalCustomers: customerCount || 0,
      recentLogs: recentLogs || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('drawing'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ================= WEBSITE / TEMPLATE SETTINGS ================= //

app.get('/api/settings', async (req, res) => {
  try {
    let row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!row) {
      await db.prepare(`
        INSERT INTO settings (id, company_name) VALUES (1, 'PT. PATCO ELEKTRONIK TEKNOLOGI')
      `).run();
      row = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const {
      company_name,
      company_address_line1,
      company_address_line2,
      company_phone,
      company_fax,
      company_website,
      company_logo_url,
      iso_cert_logo_url,
      tuv_cert_logo_url,
      hts_code_invoice,
      hts_code_do,
      bank_drawn_in_favour,
      bank_name,
      bank_account_no,
      bank_swift_code,
      bank_branch,
      bank_currency,
      country_of_origin,
      manufacture_name_address,
      prepared_by_name,
      prepared_by_title,
      prepared_by_sign_url,
      authorized_sign_name,
      authorized_sign_title,
      authorized_sign_url,
      doc_control_code,
      show_letterhead,
      // Packing List fields
      pl_prepared_by_name,
      pl_prepared_by_title,
      pl_authorized_name,
      pl_authorized_title,
      pl_doc_control_code,
      // Delivery Order fields
      do_drawn_in_favour,
      do_sign_col1_title,
      do_sign_col1_name,
      do_sign_col2_title,
      do_sign_col2_name,
      do_sign_col3_title,
      do_sign_col3_name,
      do_sign_col4_title,
      do_sign_col4_name,
      do_sign_col5_title,
      do_sign_col5_name,
      do_sign_col6_title,
      do_sign_col6_name,
      do_doc_control_code
    } = req.body;

    await db.prepare(`
      UPDATE settings
      SET company_name = ?,
          company_address_line1 = ?,
          company_address_line2 = ?,
          company_phone = ?,
          company_fax = ?,
          company_website = ?,
          company_logo_url = ?,
          iso_cert_logo_url = ?,
          tuv_cert_logo_url = ?,
          hts_code_invoice = ?,
          hts_code_do = ?,
          bank_drawn_in_favour = ?,
          bank_name = ?,
          bank_account_no = ?,
          bank_swift_code = ?,
          bank_branch = ?,
          bank_currency = ?,
          country_of_origin = ?,
          manufacture_name_address = ?,
          prepared_by_name = ?,
          prepared_by_title = ?,
          prepared_by_sign_url = ?,
          authorized_sign_name = ?,
          authorized_sign_title = ?,
          authorized_sign_url = ?,
          doc_control_code = ?,
          show_letterhead = ?,
          pl_prepared_by_name = ?,
          pl_prepared_by_title = ?,
          pl_authorized_name = ?,
          pl_authorized_title = ?,
          pl_doc_control_code = ?,
          do_drawn_in_favour = ?,
          do_sign_col1_title = ?,
          do_sign_col1_name = ?,
          do_sign_col2_title = ?,
          do_sign_col2_name = ?,
          do_sign_col3_title = ?,
          do_sign_col3_name = ?,
          do_sign_col4_title = ?,
          do_sign_col4_name = ?,
          do_sign_col5_title = ?,
          do_sign_col5_name = ?,
          do_sign_col6_title = ?,
          do_sign_col6_name = ?,
          do_doc_control_code = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      company_name || '',
      company_address_line1 || '',
      company_address_line2 || '',
      company_phone || '',
      company_fax || '',
      company_website || '',
      company_logo_url || '',
      iso_cert_logo_url || '',
      tuv_cert_logo_url || '',
      hts_code_invoice || '',
      hts_code_do || '',
      bank_drawn_in_favour || '',
      bank_name || '',
      bank_account_no || '',
      bank_swift_code || '',
      bank_branch || '',
      bank_currency || 'USD',
      country_of_origin || '',
      manufacture_name_address || '',
      prepared_by_name || '',
      prepared_by_title || '',
      prepared_by_sign_url || '',
      authorized_sign_name || '',
      authorized_sign_title || '',
      authorized_sign_url || '',
      doc_control_code || '',
      show_letterhead !== undefined ? (show_letterhead ? 1 : 0) : 1,
      pl_prepared_by_name !== undefined ? pl_prepared_by_name : 'Staff Warehouse',
      pl_prepared_by_title !== undefined ? pl_prepared_by_title : 'Prepared By',
      pl_authorized_name !== undefined ? pl_authorized_name : 'Warehouse Supervisor',
      pl_authorized_title !== undefined ? pl_authorized_title : 'Authorized Signature',
      pl_doc_control_code !== undefined ? pl_doc_control_code : 'FRM-WHS-02 Rev.01',
      do_drawn_in_favour !== undefined ? do_drawn_in_favour : 'PT. PATCO ELEKTRONIK TEKNOLOGI',
      do_sign_col1_title !== undefined ? do_sign_col1_title : 'Prepared By',
      do_sign_col1_name !== undefined ? do_sign_col1_name : '',
      do_sign_col2_title !== undefined ? do_sign_col2_title : 'Checked By',
      do_sign_col2_name !== undefined ? do_sign_col2_name : '',
      do_sign_col3_title !== undefined ? do_sign_col3_title : 'Approved By',
      do_sign_col3_name !== undefined ? do_sign_col3_name : '',
      do_sign_col4_title !== undefined ? do_sign_col4_title : 'Security',
      do_sign_col4_name !== undefined ? do_sign_col4_name : '',
      do_sign_col5_title !== undefined ? do_sign_col5_title : 'Driver',
      do_sign_col5_name !== undefined ? do_sign_col5_name : '',
      do_sign_col6_title !== undefined ? do_sign_col6_title : 'Received By',
      do_sign_col6_name !== undefined ? do_sign_col6_name : '',
      do_doc_control_code !== undefined ? do_doc_control_code : 'FRM-WHS-01 Rev.00'
    );

    const updated = await db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logo upload endpoint for settings
app.post('/api/settings/upload-logo', upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ================= DUMMY / SAMPLE DATA MANAGEMENT ================= //

app.get('/api/dummy-data/stats', async (req, res) => {
  try {
    const totalCust = (await db.prepare('SELECT COUNT(*) as c FROM customers').get())?.c || 0;
    const totalParts = (await db.prepare('SELECT COUNT(*) as c FROM parts').get())?.c || 0;
    const totalInv = (await db.prepare('SELECT COUNT(*) as c FROM invoices').get())?.c || 0;
    const totalPL = (await db.prepare('SELECT COUNT(*) as c FROM packing_lists').get())?.c || 0;
    const totalDO = (await db.prepare('SELECT COUNT(*) as c FROM delivery_orders').get())?.c || 0;
    const totalLog = (await db.prepare('SELECT COUNT(*) as c FROM data_logger').get())?.c || 0;

    res.json({
      master: {
        customers: totalCust,
        parts: totalParts
      },
      transactions: {
        invoices: totalInv,
        packing_lists: totalPL,
        delivery_orders: totalDO,
        data_logger: totalLog
      },
      // Backward compatibility fields
      dummy: { customers: totalCust, parts: totalParts, invoices: totalInv, packing_lists: totalPL },
      total: { customers: totalCust, parts: totalParts, invoices: totalInv, packing_lists: totalPL }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Mendapatkan Daftar Template Master Data beserta Kategori & Sektor
app.get('/api/dummy-data/master-templates', async (req, res) => {
  try {
    res.json({
      companies: SAMPLE_COMPANIES,
      parts: SAMPLE_PARTS,
      sectors: [
        { id: 'all', label: 'Semua Sektor' },
        { id: 'automotive_oem', label: 'Otomotif & Alat Berat (OEM)' },
        { id: 'components_tier1', label: 'Komponen Presisi (Tier-1)' },
        { id: 'electronics_precision', label: 'Elektronik & Perangkat Industri' }
      ],
      categories: [
        { id: 'all', label: 'Semua Kategori' },
        { id: 'stamping_mechanical', label: 'Stamping & Mekanikal' },
        { id: 'electrical_sensor', label: 'Elektrikal & Sensor' },
        { id: 'gasket_seals_cases', label: 'Gasket, Seal & Casing' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Khusus: Inisialisasi Template Master Data (Customer & Produk)
app.post('/api/dummy-data/seed-master', async (req, res) => {
  try {
    const result = await seedMasterTemplate(db, req.body || {});
    res.json({
      success: true,
      message: `Berhasil menginisialisasi template Master Data! (+${result.insertedCustomers} Customer baru, +${result.insertedParts} Part baru). Total aktif: ${result.totalCustomers} Customer, ${result.totalParts} Part.`,
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Khusus: Generate Transaksi Saja (Invoices, PL, DO)
app.post('/api/dummy-data/generate', async (req, res) => {
  try {
    const {
      count = 10,
      dateRangeMonths = 6,
      includePL = true,
      includeDO = true,
      currencies = ['USD', 'IDR', 'JPY']
    } = req.body || {};

    const stats = await generateTransactionsOnly(db, {
      count: Math.max(1, Math.min(100, Number(count) || 10)),
      dateRangeMonths: Math.max(1, Math.min(24, Number(dateRangeMonths) || 6)),
      includePL: includePL !== false,
      includeDO: includeDO !== false,
      currencies: Array.isArray(currencies) && currencies.length > 0 ? currencies : ['USD', 'IDR', 'JPY']
    });

    res.json({
      success: true,
      message: `Berhasil men-generate ${stats.insertedInvoices} faktur sintetis, ${stats.insertedPLs} packing list, dan ${stats.insertedDOs} delivery order dari Master Data yang ada!`,
      summary: stats
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/dummy-data/clear', async (req, res) => {
  try {
    const { mode = 'transactions' } = req.body;

    if (mode === 'transactions' || mode === 'dummy_only') {
      // 1. Hapus Hanya Transaksi (Invoices, PL, DO, Logs) - Master Data 100% AMAN
      await db.prepare('DELETE FROM invoices').run();
      await db.prepare('DELETE FROM packing_lists').run();
      await db.prepare('DELETE FROM delivery_orders').run();
      await db.prepare('DELETE FROM data_logger').run();

      return res.json({
        success: true,
        message: 'Seluruh riwayat transaksi (Invoices, Packing Lists, Delivery Orders, dan Logs) berhasil dibersihkan! Master Customer & Part tetap aman tersimpan.'
      });
    }

    if (mode === 'master_only') {
      // 2. Hapus Hanya Master Data (Customers, Parts, Price History, Terms)
      await db.prepare('DELETE FROM part_price_history').run();
      await db.prepare('DELETE FROM customers').run();
      await db.prepare('DELETE FROM parts').run();
      await db.prepare('DELETE FROM payment_terms').run();
      await db.prepare('DELETE FROM delivery_terms').run();

      return res.json({
        success: true,
        message: 'Seluruh Master Data (Customer, Katalog Part, Riwayat Harga, dan Termin) berhasil dibersihkan!'
      });
    }

    if (mode === 'all') {
      // 3. Reset Total Database (Kosongkan Seluruh Tabel)
      await db.prepare('DELETE FROM invoices').run();
      await db.prepare('DELETE FROM packing_lists').run();
      await db.prepare('DELETE FROM delivery_orders').run();
      await db.prepare('DELETE FROM data_logger').run();
      await db.prepare('DELETE FROM part_price_history').run();
      await db.prepare('DELETE FROM customers').run();
      await db.prepare('DELETE FROM parts').run();
      await db.prepare('DELETE FROM payment_terms').run();
      await db.prepare('DELETE FROM delivery_terms').run();

      return res.json({
        success: true,
        message: 'Seluruh database (transaksi & master data) telah berhasil direset total ke titik nol!'
      });
    }

    res.status(400).json({ error: 'Mode pembersihan tidak valid' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= MASTER DATA ROUTES ================= //

// Customers
app.get('/api/customers', async (req, res) => {
  try {
    const { name } = req.query;
    if (name) {
      const row = await db.prepare('SELECT * FROM customers WHERE customer_name = ? LIMIT 1').get(name);
      return res.json(row || null);
    }
    const rows = await db.prepare('SELECT * FROM customers ORDER BY customer_name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { customer_id, customer_name, address, bill_to, ship_to, contact_person, phone } = req.body;
    if (!customer_name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const stmt = await db.prepare(`
      INSERT INTO customers (customer_id, customer_name, address, bill_to, ship_to, contact_person, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = await stmt.run(
      customer_id || null, 
      customer_name, 
      address || '', 
      bill_to || address || '', 
      ship_to || address || '', 
      contact_person || '', 
      phone || ''
    );
    const newCustomer = await db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { customer_id, customer_name, address, bill_to, ship_to, contact_person, phone } = req.body;
    await db.prepare(`
      UPDATE customers
      SET customer_id = ?, customer_name = ?, address = ?, bill_to = ?, ship_to = ?, contact_person = ?, phone = ?
      WHERE id = ?
    `).run(
      customer_id, 
      customer_name, 
      address, 
      bill_to || '', 
      ship_to || '', 
      contact_person, 
      phone, 
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment Terms
app.get('/api/payment-terms', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM payment_terms ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-terms', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO payment_terms (name, description) VALUES (?, ?)');
    const info = await stmt.run(name, description || '');
    res.status(201).json({ id: info.lastInsertRowid, name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payment-terms/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM payment_terms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery Terms
app.get('/api/delivery-terms', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM delivery_terms ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-terms', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO delivery_terms (name, description) VALUES (?, ?)');
    const info = await stmt.run(name, description || '');
    res.status(201).json({ id: info.lastInsertRowid, name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/delivery-terms/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM delivery_terms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parts Catalog
app.get('/api/parts', async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM part_price_history WHERE part_id = p.id) as price_history_count,
        COALESCE((
          SELECT currency FROM part_price_history 
          WHERE part_id = p.id AND effective_date <= date('now') 
          ORDER BY effective_date DESC, id DESC LIMIT 1
        ), 'USD') as active_currency
      FROM parts p 
      ORDER BY p.part_name ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parts', async (req, res) => {
  try {
    const { part_name, part_no, length, width, height, unit, qty_per_box, box_per_pallet, price, currency = 'USD' } = req.body;
    if (!part_name) return res.status(400).json({ error: 'Part name is required' });
    const stmt = await db.prepare(`
      INSERT INTO parts (part_name, part_no, length, width, height, unit, qty_per_box, box_per_pallet, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = await stmt.run(
      part_name,
      part_no || '',
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit || 'mm',
      Number(qty_per_box) || 0,
      Number(box_per_pallet) || 0,
      Number(price) || 0
    );
    const newPartId = info.lastInsertRowid;
    // Auto record initial price history
    if (Number(price) > 0) {
      db.prepare(`
        INSERT INTO part_price_history (part_id, price, currency, effective_date, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(newPartId, Number(price), currency, new Date().toISOString().slice(0, 10), 'Harga Awal');
    }
    res.status(201).json({ id: newPartId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/parts/:id', async (req, res) => {
  try {
    const { part_name, part_no, length, width, height, unit, qty_per_box, box_per_pallet, price } = req.body;
    await db.prepare(`
      UPDATE parts
      SET part_name = ?, part_no = ?, length = ?, width = ?, height = ?, unit = ?, qty_per_box = ?, box_per_pallet = ?, price = ?
      WHERE id = ?
    `).run(
      part_name || '',
      part_no || '',
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit || 'mm',
      Number(qty_per_box) || 0,
      Number(box_per_pallet) || 0,
      Number(price) || 0,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/parts/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM parts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PART PRICE HISTORY ROUTES ================= //

// Helper to re-sync part's current active price to parts.price
async function syncPartActivePrice(partId) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const activeRec = await db.prepare(`
      SELECT price, currency FROM part_price_history
      WHERE part_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC, id DESC
      LIMIT 1
    `).get(partId, today);

    if (activeRec) {
      await db.prepare('UPDATE parts SET price = ? WHERE id = ?').run(activeRec.price, partId);
    }
  } catch (e) {
    console.error('Error syncing part price:', e);
  }
}

// Get price history for a part
app.get('/api/parts/:id/prices', async (req, res) => {
  try {
    const partId = req.params.id;
    const part = await db.prepare('SELECT id, part_name, part_no, price FROM parts WHERE id = ?').get(partId);
    if (!part) return res.status(404).json({ error: 'Part tidak ditemukan' });

    const today = new Date().toISOString().slice(0, 10);
    const rows = await db.prepare(`
      SELECT * FROM part_price_history 
      WHERE part_id = ? 
      ORDER BY effective_date DESC, id DESC
    `).all(partId);

    // Identify which record is currently active and compute effective date range
    let foundActive = false;
    const enriched = rows.map((r, i) => {
      let status = 'PAST';
      if (r.effective_date > today) {
        status = 'FUTURE';
      } else if (!foundActive) {
        status = 'ACTIVE';
        foundActive = true;
      }

      // Calculate end date from the next chronologically newer entry (at i - 1)
      let rangeEnd = 'Seterusnya';
      let endDateStr = null;
      if (i > 0) {
        const nextDate = new Date(rows[i - 1].effective_date);
        nextDate.setDate(nextDate.getDate() - 1);
        endDateStr = nextDate.toISOString().slice(0, 10);
        rangeEnd = endDateStr;
      } else if (status === 'ACTIVE') {
        rangeEnd = 'Sekarang (Berjalan)';
      }

      return {
        ...r,
        status,
        range_start: r.effective_date,
        range_end: rangeEnd,
        end_date: endDateStr
      };
    });

    res.json({ part, prices: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new price entry
app.post('/api/parts/:id/prices', async (req, res) => {
  try {
    const partId = req.params.id;
    const { price, currency = 'USD', effective_date, notes = '' } = req.body;
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Harga harus berupa angka valid' });
    }
    if (!effective_date) {
      return res.status(400).json({ error: 'Tanggal mulai berlaku harus diisi' });
    }

    const stmt = await db.prepare(`
      INSERT INTO part_price_history (part_id, price, currency, effective_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = await stmt.run(partId, Number(price), currency, effective_date, notes);
    syncPartActivePrice(partId);

    const newRecord = await db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update price entry
app.put('/api/parts/prices/:priceId', async (req, res) => {
  try {
    const { priceId } = req.params;
    const { price, currency = 'USD', effective_date, notes = '' } = req.body;
    const existing = await db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(priceId);
    if (!existing) return res.status(404).json({ error: 'Data riwayat tidak ditemukan' });

    await db.prepare(`
      UPDATE part_price_history
      SET price = ?, currency = ?, effective_date = ?, notes = ?
      WHERE id = ?
    `).run(Number(price), currency, effective_date, notes, priceId);

    syncPartActivePrice(existing.part_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete price entry
app.delete('/api/parts/prices/:priceId', async (req, res) => {
  try {
    const { priceId } = req.params;
    const existing = await db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(priceId);
    if (!existing) return res.status(404).json({ error: 'Data riwayat tidak ditemukan' });

    await db.prepare('DELETE FROM part_price_history WHERE id = ?').run(priceId);
    syncPartActivePrice(existing.part_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get effective price at a specific date
app.get('/api/parts/:id/price-at-date', async (req, res) => {
  try {
    const partId = req.params.id;
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

    // Look for effective price <= targetDate
    let row = await db.prepare(`
      SELECT price, currency, effective_date, notes
      FROM part_price_history
      WHERE part_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC, id DESC
      LIMIT 1
    `).get(partId, targetDate);

    // Fallback if targetDate is earlier than all history records
    if (!row) {
      row = await db.prepare(`
        SELECT price, currency, effective_date, notes
        FROM part_price_history
        WHERE part_id = ?
        ORDER BY effective_date ASC, id ASC
        LIMIT 1
      `).get(partId);
    }

    if (!row) {
      const part = await db.prepare('SELECT price FROM parts WHERE id = ?').get(partId);
      row = { price: part?.price || 0, currency: 'USD', effective_date: targetDate, notes: 'Default master' };
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= INVOICE TRANSACTIONS ================= //

app.get('/api/invoices', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const rawParam = req.params.id;
    let row = null;

    // 1. Cari by ID numerik
    if (!isNaN(rawParam)) {
      row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(rawParam);
    }

    // 2. Cari by invoice_number
    if (!row) {
      row = await db.prepare('SELECT * FROM invoices WHERE invoice_number = ? LIMIT 1').get(rawParam);
    }

    // 3. Fallback via data_logger
    if (!row) {
      const dl = await db.prepare(`
        SELECT * FROM data_logger 
        WHERE doc_type = 'INVOICE' AND (id = ? OR ref_id = ? OR doc_number = ?)
        LIMIT 1
      `).get(rawParam, rawParam, rawParam);

      if (dl) {
        if (dl.doc_number) {
          row = await db.prepare('SELECT * FROM invoices WHERE invoice_number = ? LIMIT 1').get(dl.doc_number);
        }
        if (!row && dl.ref_id && !isNaN(dl.ref_id)) {
          row = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(dl.ref_id);
        }
      }
    }

    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function updateInvoiceHelper(targetId, data) {
  const {
    invoice_number,
    invoice_date,
    customer_name,
    customer_id,
    bill_to,
    ship_to,
    payment_term,
    terms_of_delivery,
    customer_po_no,
    part_name,
    no_of_pallet,
    no_of_box,
    qty_per_box,
    total_qty,
    unit_price,
    total_amount,
    vat_rate,
    vat_amount,
    grand_total,
    currency,
    hts_code,
    notes,
    items
  } = data;

  const oldInv = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(targetId);
  if (!oldInv) {
    throw new Error('Invoice not found');
  }

  let parsedItems = null;
  if (Array.isArray(items) && items.length > 0) {
    parsedItems = items;
  } else if (typeof items === 'string' && items.trim().startsWith('[')) {
    try {
      parsedItems = JSON.parse(items);
    } catch (e) {
      parsedItems = null;
    }
  }

  let finalPartName = part_name || '';
  let finalPoNo = customer_po_no || '';
  let numPallets = Number(no_of_pallet) || 0;
  let numBoxes = Number(no_of_box) || 0;
  let numQtyPerBox = Number(qty_per_box) || 0;
  let computedTotalQty = Number(total_qty) || 0;
  let numUnitPrice = Number(unit_price) || 0;
  let computedTotalAmount = Number(total_amount) || 0;
  const numVatRate = vat_rate !== undefined ? Number(vat_rate) : 0;

  if (parsedItems && parsedItems.length > 0) {
    numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || 0), 0);
    numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || 0), 0);
    computedTotalQty = parsedItems.reduce((acc, it) => {
      const itemBoxes = Number(it.no_of_box) || 0;
      const itemPerBox = Number(it.qty_per_box) || 0;
      return acc + (Number(it.total_qty) || (itemBoxes * itemPerBox));
    }, 0);
    computedTotalAmount = parsedItems.reduce((acc, it) => acc + (Number(it.total_amount) || 0), 0);
    
    finalPartName = parsedItems.length === 1
      ? (parsedItems[0].part_name || '')
      : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
    
    const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no).filter(Boolean))];
    if (distinctPo.length > 0) {
      finalPoNo = distinctPo.join(', ');
    }
    numUnitPrice = parsedItems[0]?.unit_price ? Number(parsedItems[0].unit_price) : numUnitPrice;
    numQtyPerBox = parsedItems[0]?.qty_per_box ? Number(parsedItems[0].qty_per_box) : numQtyPerBox;
  } else {
    computedTotalQty = computedTotalQty || (numBoxes * numQtyPerBox);
    computedTotalAmount = computedTotalAmount || (computedTotalQty * numUnitPrice);
  }

  const computedVatAmount = Number(vat_amount) || (numVatRate > 0 ? (computedTotalAmount * (numVatRate / 100)) : 0);
  const computedGrandTotal = Number(grand_total) || (computedTotalAmount + computedVatAmount);
  const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

  await db.prepare(`
    UPDATE invoices
    SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_id = ?,
        bill_to = ?, ship_to = ?, payment_term = ?, terms_of_delivery = ?, customer_po_no = ?, part_name = ?,
        no_of_pallet = ?, no_of_box = ?, qty_per_box = ?, total_qty = ?, unit_price = ?,
        total_amount = ?, vat_rate = ?, vat_amount = ?, grand_total = ?, currency = ?,
        hts_code = ?, notes = ?, items = ?
    WHERE id = ?
  `).run(
    invoice_number || oldInv.invoice_number,
    invoice_date || oldInv.invoice_date,
    customer_name || oldInv.customer_name,
    customer_id || oldInv.customer_id,
    bill_to !== undefined ? bill_to : oldInv.bill_to,
    ship_to !== undefined ? ship_to : oldInv.ship_to,
    payment_term !== undefined ? payment_term : oldInv.payment_term,
    terms_of_delivery !== undefined ? terms_of_delivery : oldInv.terms_of_delivery,
    finalPoNo,
    finalPartName,
    numPallets,
    numBoxes,
    numQtyPerBox,
    computedTotalQty,
    numUnitPrice,
    computedTotalAmount,
    numVatRate,
    computedVatAmount,
    computedGrandTotal,
    currency || oldInv.currency || 'USD',
    hts_code || oldInv.hts_code || '',
    notes !== undefined ? notes : oldInv.notes,
    itemsJson,
    targetId
  );

  // Sync update to data_logger
  const existingLog = await db.prepare("SELECT id FROM data_logger WHERE doc_type = 'INVOICE' AND (ref_id = ? OR doc_number = ?)").get(targetId, oldInv.invoice_number);
  if (existingLog) {
    await db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, payment_term = ?, notes = ?, items = ?,
          grand_total = ?, unit_price = ?, currency = ?, ref_id = ?
      WHERE id = ?
    `).run(
      invoice_number || oldInv.invoice_number,
      invoice_date || oldInv.invoice_date,
      customer_name || oldInv.customer_name,
      customer_id || oldInv.customer_id,
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      terms_of_delivery || '',
      payment_term || '',
      notes || '',
      itemsJson,
      computedGrandTotal,
      numUnitPrice,
      currency || 'USD',
      targetId,
      existingLog.id
    );
  } else {
    await db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, items, ref_id,
        grand_total, unit_price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'INVOICE',
      invoice_number || oldInv.invoice_number,
      invoice_date || oldInv.invoice_date,
      customer_name || oldInv.customer_name,
      customer_id || oldInv.customer_id,
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      terms_of_delivery || '',
      payment_term || '',
      null,
      '',
      notes || '',
      itemsJson,
      targetId,
      computedGrandTotal,
      numUnitPrice,
      currency || 'USD'
    );
  }

  // If invoice_number changed, update references in children so they don't become orphans
  if (oldInv.invoice_number && invoice_number && oldInv.invoice_number !== invoice_number) {
    const oldRefStr = `Ref Inv: ${oldInv.invoice_number}`;
    const newRefStr = `Ref Inv: ${invoice_number}`;
    await db.prepare("UPDATE data_logger SET terms_of_delivery = REPLACE(terms_of_delivery, ?, ?) WHERE terms_of_delivery LIKE ?").run(oldRefStr, newRefStr, `%${oldRefStr}%`);
    await db.prepare("UPDATE data_logger SET doc_number = ? WHERE doc_number = ? AND doc_type != 'INVOICE'").run(invoice_number, oldInv.invoice_number);
    await db.prepare("UPDATE packing_lists SET invoice_number = ? WHERE invoice_number = ?").run(invoice_number, oldInv.invoice_number);
  }

  return await db.prepare('SELECT * FROM invoices WHERE id = ?').get(targetId);
}

app.post('/api/invoices', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      customer_name,
      customer_id,
      bill_to,
      ship_to,
      payment_term,
      terms_of_delivery,
      customer_po_no,
      part_name,
      no_of_pallet,
      no_of_box,
      qty_per_box,
      total_qty,
      unit_price,
      total_amount,
      vat_rate,
      vat_amount,
      grand_total,
      currency,
      hts_code,
      image_url,
      notes,
      items
    } = req.body;

    // Check if updating existing invoice by ID or if invoice_number already exists
    let existingId = req.body.id;
    if (!existingId && invoice_number && req.body.force_new !== true) {
      const existing = await db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoice_number);
      if (existing) {
        existingId = existing.id;
      }
    }

    if (existingId) {
      const updated = await updateInvoiceHelper(existingId, req.body);
      return res.status(200).json(updated);
    }

    // Multi-item handling for new invoice
    let parsedItems = null;
    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items;
    } else if (typeof items === 'string' && items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = null;
      }
    }

    let finalPartName = part_name || '';
    let finalPoNo = customer_po_no || '';
    let numPallets = Number(no_of_pallet) || 0;
    let numBoxes = Number(no_of_box) || 0;
    let numQtyPerBox = Number(qty_per_box) || 0;
    let computedTotalQty = Number(total_qty) || 0;
    let numUnitPrice = Number(unit_price) || 0;
    let computedTotalAmount = Number(total_amount) || 0;
    const numVatRate = vat_rate !== undefined ? Number(vat_rate) : 0;

    if (parsedItems && parsedItems.length > 0) {
      // Calculate sums across items
      numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || 0), 0);
      numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || 0), 0);
      computedTotalQty = parsedItems.reduce((acc, it) => {
        const itemBoxes = Number(it.no_of_box) || 0;
        const itemPerBox = Number(it.qty_per_box) || 0;
        return acc + (Number(it.total_qty) || (itemBoxes * itemPerBox));
      }, 0);
      computedTotalAmount = parsedItems.reduce((acc, it) => acc + (Number(it.total_amount) || 0), 0);
      
      finalPartName = parsedItems.length === 1
        ? (parsedItems[0].part_name || '')
        : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
      
      const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no).filter(Boolean))];
      if (distinctPo.length > 0) {
        finalPoNo = distinctPo.join(', ');
      }
      
      numUnitPrice = parsedItems[0]?.unit_price ? Number(parsedItems[0].unit_price) : numUnitPrice;
      numQtyPerBox = parsedItems[0]?.qty_per_box ? Number(parsedItems[0].qty_per_box) : numQtyPerBox;
    } else {
      computedTotalQty = computedTotalQty || (numBoxes * numQtyPerBox);
      computedTotalAmount = computedTotalAmount || (computedTotalQty * numUnitPrice);
    }

    const computedVatAmount = Number(vat_amount) || (numVatRate > 0 ? (computedTotalAmount * (numVatRate / 100)) : 0);
    const computedGrandTotal = Number(grand_total) || (computedTotalAmount + computedVatAmount);
    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    const stmt = await db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, customer_name, customer_id, bill_to, ship_to,
        payment_term, terms_of_delivery, customer_po_no, part_name, no_of_pallet, no_of_box,
        qty_per_box, total_qty, unit_price, total_amount, vat_rate, vat_amount, grand_total, currency,
        hts_code, image_url, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = await stmt.run(
      invoice_number || '',
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_id || '',
      bill_to || '',
      ship_to || '',
      payment_term || '',
      terms_of_delivery || '',
      finalPoNo,
      finalPartName,
      numPallets,
      numBoxes,
      numQtyPerBox,
      computedTotalQty,
      numUnitPrice,
      computedTotalAmount,
      numVatRate,
      computedVatAmount,
      computedGrandTotal,
      currency || 'USD',
      hts_code || '',
      image_url || '',
      notes || '',
      itemsJson
    );

    const refId = info.lastInsertRowid;

    // Log to data_logger with all detailed fields
    const loggerStmt = db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, items, ref_id,
        grand_total, unit_price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await loggerStmt.run(
      'INVOICE',
      invoice_number || `INV-${refId}`,
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_id || '',
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      terms_of_delivery || '',
      payment_term || '',
      null,
      image_url || '',
      notes || '',
      itemsJson,
      refId,
      computedGrandTotal,
      numUnitPrice,
      currency || 'USD'
    );

    const created = await db.prepare('SELECT * FROM invoices WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Invoice create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const updated = await updateInvoiceHelper(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Invoice update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= PACKING LIST TRANSACTIONS ================= //

app.get('/api/packing-lists', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM packing_lists ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/packing-lists/:id', async (req, res) => {
  try {
    const rawParam = req.params.id;
    let row = null;

    // 1. Cari langsung by id tabel packing_lists
    if (!isNaN(rawParam)) {
      row = await db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(rawParam);
    }

    // 2. Cari by invoice_number
    if (!row) {
      row = await db.prepare('SELECT * FROM packing_lists WHERE invoice_number = ? LIMIT 1').get(rawParam);
    }

    // 3. Jika param adalah ID invoice di tabel invoices (ref_id)
    if (!row && !isNaN(rawParam)) {
      const inv = await db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(rawParam);
      if (inv && inv.invoice_number) {
        row = await db.prepare('SELECT * FROM packing_lists WHERE invoice_number = ? LIMIT 1').get(inv.invoice_number);
      }
    }

    // 4. Cari via data_logger
    if (!row) {
      const dl = await db.prepare(`
        SELECT * FROM data_logger 
        WHERE doc_type = 'PACKING_LIST' AND (id = ? OR ref_id = ? OR doc_number = ?)
        LIMIT 1
      `).get(rawParam, rawParam, rawParam);

      if (dl) {
        row = await db.prepare('SELECT * FROM packing_lists WHERE invoice_number = ? LIMIT 1').get(dl.doc_number);
        if (!row) {
          row = {
            id: dl.id,
            invoice_number: dl.doc_number,
            invoice_date: dl.doc_date,
            customer_name: dl.customer_name,
            customer_po_no: dl.po_no,
            part_name: dl.part_name,
            terms_of_delivery: dl.terms_of_delivery?.replace(/^Ref Inv:\s*/i, '') || '',
            box_qty: dl.box_qty,
            pallet_qty: dl.pallet_qty,
            items: dl.items,
            created_at: dl.created_at
          };
        }
      }
    }

    if (!row) return res.status(404).json({ error: 'Packing list not found' });

    // Auto-enrich data dari Invoice terkait & Master Part
    try {
      let linkedInvoice = null;
      if (row.invoice_number) {
        linkedInvoice = await db.prepare('SELECT * FROM invoices WHERE invoice_number = ? LIMIT 1').get(row.invoice_number);
      }

      if (linkedInvoice) {
        if (!row.items && linkedInvoice.items) {
          row.items = linkedInvoice.items;
        }
        if (!row.customer_po_no && linkedInvoice.customer_po_no) {
          row.customer_po_no = linkedInvoice.customer_po_no;
        }
        if (!row.ship_to && linkedInvoice.ship_to) {
          row.ship_to = linkedInvoice.ship_to;
        }
        if (!row.terms_of_delivery && linkedInvoice.terms_of_delivery) {
          row.terms_of_delivery = linkedInvoice.terms_of_delivery;
        }
        if (!row.qty_per_box && linkedInvoice.qty_per_box) {
          row.qty_per_box = linkedInvoice.qty_per_box;
        }
        if (!row.total_qty && linkedInvoice.total_qty) {
          row.total_qty = linkedInvoice.total_qty;
        }
      }

      let rawPartName = row.part_name || linkedInvoice?.part_name || '';
      let extractedName = rawPartName;
      let extractedNo = row.part_no || '';
      const matchP = rawPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (matchP) {
        extractedName = matchP[1].trim();
        if (!extractedNo) extractedNo = matchP[2].trim();
      }

      let partInfo = null;
      if (extractedNo) {
        partInfo = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(extractedNo);
      }
      if (!partInfo && extractedName) {
        partInfo = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${extractedName}%`);
      }

      if (partInfo) {
        if (!extractedNo) extractedNo = partInfo.part_no;
        if (!row.qty_per_box) row.qty_per_box = partInfo.qty_per_box;
        if (!row.length) row.length = partInfo.length;
        if (!row.width) row.width = partInfo.width;
        if (!row.height) row.height = partInfo.height;
        if (!row.unit_note) row.unit_note = partInfo.unit;
      }

      row.part_name = extractedName;
      row.part_no = extractedNo;

      const bQty = Number(row.box_qty) || 0;
      let qpb = Number(row.qty_per_box) || 0;
      let totQ = Number(row.total_qty) || 0;

      if (!totQ && bQty > 0 && qpb > 0) {
        totQ = bQty * qpb;
      }
      if (!qpb && bQty > 0 && totQ > 0) {
        qpb = Math.round(totQ / bQty);
      }

      row.box_qty = bQty;
      row.qty_per_box = qpb;
      row.total_qty = totQ;

      // Net weight & gross weight estimation if not present
      if (!row.net_weight && totQ > 0) {
        row.net_weight = (totQ * 0.55).toFixed(2);
      }
      if (!row.gross_weight && row.net_weight) {
        row.gross_weight = (Number(row.net_weight) * 1.34).toFixed(2);
      }

      // Auto-enrich multi-items array if present
      if (row.items) {
        let parsedMulti = null;
        try {
          parsedMulti = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        } catch (e) {
          parsedMulti = null;
        }
        if (Array.isArray(parsedMulti) && parsedMulti.length > 0) {
          for (const it of parsedMulti) {
            let itPartName = it.part_name || '';
            let itPartNo = it.part_no || '';
            const m = itPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            if (m) {
              itPartName = m[1].trim();
              if (!itPartNo) itPartNo = m[2].trim();
            }
            if (!it.qty_per_box || !it.total_qty || !it.length || !it.width || !it.height) {
              let pMatch = null;
              if (itPartNo) {
                pMatch = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(itPartNo);
              }
              if (!pMatch && itPartName) {
                pMatch = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${itPartName}%`);
              }
              if (pMatch) {
                if (!it.part_no) it.part_no = pMatch.part_no;
                if (!it.qty_per_box) it.qty_per_box = pMatch.qty_per_box;
                if (!it.length) it.length = pMatch.length;
                if (!it.width) it.width = pMatch.width;
                if (!it.height) it.height = pMatch.height;
                if (!it.unit_note) it.unit_note = pMatch.unit || 'mm';
              }
            }
            const b = Number(it.box_qty) || Number(it.no_of_box) || 0;
            let q = Number(it.qty_per_box) || 0;
            let t = Number(it.total_qty) || 0;
            if (!t && b > 0 && q > 0) t = b * q;
            if (!q && b > 0 && t > 0) q = Math.round(t / b);
            it.qty_per_box = q;
            it.total_qty = t;

            if (!it.net_weight && t > 0) {
              it.net_weight = Number((t * 0.55).toFixed(2));
            }
            if (!it.gross_weight && it.net_weight) {
              it.gross_weight = Number((Number(it.net_weight) * 1.34).toFixed(2));
            }
          }
          row.items = JSON.stringify(parsedMulti);
        }
      }
    } catch (e) {
      console.error('PL enrichment error:', e);
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/packing-lists', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      customer_name,
      customer_po_no,
      part_name,
      terms_of_delivery,
      box_qty,
      pallet_qty,
      length,
      width,
      height,
      unit_note,
      image_url,
      notes,
      items
    } = req.body;

    let parsedItems = null;
    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items;
    } else if (typeof items === 'string' && items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = null;
      }
    }

    let finalPartName = part_name || '';
    let finalPoNo = customer_po_no || '';
    let numBoxes = Number(box_qty) || 0;
    let numPallets = Number(pallet_qty) || 0;

    if (parsedItems && parsedItems.length > 0) {
      numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || Number(it.box_qty) || 0), 0) || numBoxes;
      numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || Number(it.pallet_qty) || 0), 0) || numPallets;
      if (!part_name) {
        finalPartName = parsedItems.length === 1
          ? (parsedItems[0].part_name || '')
          : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
      }
      if (!customer_po_no) {
        const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no || i.po_no).filter(Boolean))];
        if (distinctPo.length > 0) finalPoNo = distinctPo.join(', ');
      }

      // Enrich items with catalog specs, total_qty & weights if missing
      for (const it of parsedItems) {
        let itPartName = it.part_name || '';
        let itPartNo = it.part_no || '';
        const m = itPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        if (m) {
          itPartName = m[1].trim();
          if (!itPartNo) itPartNo = m[2].trim();
        }
        if (!it.qty_per_box || !it.total_qty || !it.length || !it.width || !it.height) {
          let pMatch = null;
          if (itPartNo) {
            pMatch = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(itPartNo);
          }
          if (!pMatch && itPartName) {
            pMatch = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${itPartName}%`);
          }
          if (pMatch) {
            if (!it.part_no) it.part_no = pMatch.part_no;
            if (!it.qty_per_box) it.qty_per_box = pMatch.qty_per_box;
            if (!it.length) it.length = pMatch.length;
            if (!it.width) it.width = pMatch.width;
            if (!it.height) it.height = pMatch.height;
            if (!it.unit_note) it.unit_note = pMatch.unit || 'mm';
          }
        }
        const b = Number(it.box_qty) || Number(it.no_of_box) || 0;
        let q = Number(it.qty_per_box) || 0;
        let t = Number(it.total_qty) || 0;
        if (!t && b > 0 && q > 0) t = b * q;
        if (!q && b > 0 && t > 0) q = Math.round(t / b);
        it.qty_per_box = q;
        it.total_qty = t;

        if (!it.net_weight && t > 0) {
          it.net_weight = Number((t * 0.55).toFixed(2));
        }
        if (!it.gross_weight && it.net_weight) {
          it.gross_weight = Number((Number(it.net_weight) * 1.34).toFixed(2));
        }
      }
    }

    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    const stmt = await db.prepare(`
      INSERT INTO packing_lists (
        invoice_number, invoice_date, customer_name, customer_po_no, part_name,
        terms_of_delivery, box_qty, pallet_qty, length, width, height,
        unit_note, image_url, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = await stmt.run(
      invoice_number || '',
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      finalPoNo,
      finalPartName,
      terms_of_delivery || '',
      numBoxes,
      numPallets,
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit_note || 'mm',
      image_url || '',
      notes || '',
      itemsJson
    );

    const refId = info.lastInsertRowid;

    // Log to data_logger with all detailed fields
    const dimStr = (Number(length) > 0 || Number(width) > 0 || Number(height) > 0)
      ? `${length} x ${width} x ${height} ${unit_note || 'mm'}`
      : null;

    const loggerStmt = db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, items, ref_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await loggerStmt.run(
      'PACKING_LIST',
      invoice_number || `PL-${refId}`,
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      null,
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      terms_of_delivery || '',
      null,
      dimStr,
      image_url || '',
      notes || '',
      itemsJson,
      refId
    );

    const created = await db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Packing list create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/packing-lists/:id', async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      customer_name,
      customer_po_no,
      part_name,
      terms_of_delivery,
      box_qty,
      pallet_qty,
      length,
      width,
      height,
      unit_note,
      notes,
      items
    } = req.body;

    let parsedItems = null;
    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items;
    } else if (typeof items === 'string' && items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = null;
      }
    }

    let finalPartName = part_name || '';
    let finalPoNo = customer_po_no || '';
    let numBoxes = Number(box_qty) || 0;
    let numPallets = Number(pallet_qty) || 0;

    if (parsedItems && parsedItems.length > 0) {
      numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || Number(it.box_qty) || 0), 0) || numBoxes;
      numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || Number(it.pallet_qty) || 0), 0) || numPallets;
      if (!part_name) {
        finalPartName = parsedItems.length === 1
          ? (parsedItems[0].part_name || '')
          : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
      }
      if (!customer_po_no) {
        const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no || i.po_no).filter(Boolean))];
        if (distinctPo.length > 0) finalPoNo = distinctPo.join(', ');
      }
    }

    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    await db.prepare(`
      UPDATE packing_lists
      SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_po_no = ?,
          part_name = ?, terms_of_delivery = ?, box_qty = ?, pallet_qty = ?,
          length = ?, width = ?, height = ?, unit_note = ?, notes = ?, items = ?
      WHERE id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      finalPoNo,
      finalPartName,
      terms_of_delivery || '',
      numBoxes,
      numPallets,
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit_note || 'mm',
      notes || '',
      itemsJson,
      req.params.id
    );

    const dimStr = (Number(length) > 0 || Number(width) > 0 || Number(height) > 0)
      ? `${length} x ${width} x ${height} ${unit_note || 'mm'}`
      : null;

    // Sync update to data_logger
    await db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, dimensions = ?, notes = ?, items = ?
      WHERE doc_type = 'PACKING_LIST' AND ref_id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      terms_of_delivery || '',
      dimStr,
      notes || '',
      itemsJson,
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Packing list update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELIVERY ORDER TRANSACTIONS ================= //

app.get('/api/delivery-orders', async (req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM delivery_orders ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/delivery-orders/:id', async (req, res) => {
  try {
    const rawParam = req.params.id;
    let row = null;

    // 1. Cari langsung by id tabel delivery_orders jika numeric
    if (!isNaN(rawParam)) {
      row = await db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(rawParam);
    }

    // 2. Cari by do_number langsung
    if (!row) {
      row = await db.prepare('SELECT * FROM delivery_orders WHERE do_number = ?').get(rawParam);
    }

    // 3. Cari by invoice_number
    if (!row) {
      row = await db.prepare('SELECT * FROM delivery_orders WHERE invoice_number = ? LIMIT 1').get(rawParam);
    }

    // 4. Jika param adalah ID invoice di tabel invoices (ref_id dari data_logger)
    if (!row && !isNaN(rawParam)) {
      const inv = await db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(rawParam);
      if (inv && inv.invoice_number) {
        row = await db.prepare('SELECT * FROM delivery_orders WHERE invoice_number = ? LIMIT 1').get(inv.invoice_number);
      }
    }

    // 5. Cari via data_logger jika dipanggil menggunakan id data_logger atau ref_id
    if (!row) {
      const dl = await db.prepare(`
        SELECT * FROM data_logger 
        WHERE doc_type = 'DELIVERY_ORDER' AND (id = ? OR ref_id = ? OR doc_number = ?)
        LIMIT 1
      `).get(rawParam, rawParam, rawParam);

      if (dl) {
        row = await db.prepare('SELECT * FROM delivery_orders WHERE do_number = ?').get(dl.doc_number);
        if (!row && dl.terms_of_delivery) {
          const invNum = dl.terms_of_delivery.replace(/^Ref Inv:\s*/i, '').trim();
          if (invNum) {
            row = await db.prepare('SELECT * FROM delivery_orders WHERE invoice_number = ? LIMIT 1').get(invNum);
          }
        }

        // Fallback rekonstruksi dari data_logger jika tidak ada di tabel delivery_orders
        if (!row) {
          row = {
            id: dl.id,
            do_number: dl.doc_number,
            do_date: dl.doc_date,
            invoice_number: dl.terms_of_delivery?.replace(/^Ref Inv:\s*/i, '') || '',
            customer_name: dl.customer_name,
            customer_id: dl.customer_id,
            customer_po_no: dl.po_no,
            part_name: dl.part_name,
            pallet_qty: dl.pallet_qty,
            box_qty: dl.box_qty,
            notes: dl.notes,
            items: dl.items,
            created_at: dl.created_at
          };
        }
      }
    }

    if (!row) return res.status(404).json({ error: 'Delivery order not found' });

    // Auto-enrich data dari Invoice terkait & Master Part
    try {
      let linkedInvoice = null;
      if (row.invoice_number) {
        linkedInvoice = await db.prepare('SELECT * FROM invoices WHERE invoice_number = ? LIMIT 1').get(row.invoice_number);
      }

      if (linkedInvoice) {
        if (!row.items && linkedInvoice.items) {
          row.items = linkedInvoice.items;
        }
        if (!row.customer_po_no && linkedInvoice.customer_po_no) {
          row.customer_po_no = linkedInvoice.customer_po_no;
        }
        if (!row.bill_to && linkedInvoice.bill_to) {
          row.bill_to = linkedInvoice.bill_to;
        }
        if (!row.ship_to && linkedInvoice.ship_to) {
          row.ship_to = linkedInvoice.ship_to;
        }
        if (!row.qty_per_box && linkedInvoice.qty_per_box) {
          row.qty_per_box = linkedInvoice.qty_per_box;
        }
        if (!row.total_qty && linkedInvoice.total_qty) {
          row.total_qty = linkedInvoice.total_qty;
        }
      }

      // Ekstrak nama part dan part_no jika format: "Part Name (PART-NO)"
      let rawPartName = row.part_name || linkedInvoice?.part_name || '';
      let extractedName = rawPartName;
      let extractedNo = row.part_no || '';
      const matchP = rawPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (matchP) {
        extractedName = matchP[1].trim();
        if (!extractedNo) extractedNo = matchP[2].trim();
      }

      // Cari di catalog part
      let partInfo = null;
      if (extractedNo) {
        partInfo = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(extractedNo);
      }
      if (!partInfo && extractedName) {
        partInfo = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${extractedName}%`);
      }

      if (partInfo) {
        if (!extractedNo) extractedNo = partInfo.part_no;
        if (!row.qty_per_box) row.qty_per_box = partInfo.qty_per_box;
      }

      row.part_name = extractedName;
      row.part_no = extractedNo;

      // Hitung qty_per_box dan total_qty jika salah satunya kosong
      const bQty = Number(row.box_qty) || 0;
      let qpb = Number(row.qty_per_box) || 0;
      let totQ = Number(row.total_qty) || 0;

      if (!totQ && bQty > 0 && qpb > 0) {
        totQ = bQty * qpb;
      }
      if (!qpb && bQty > 0 && totQ > 0) {
        qpb = Math.round(totQ / bQty);
      }

      row.box_qty = bQty;
      row.qty_per_box = qpb;
      row.total_qty = totQ;

      // Auto-enrich multi-items array if present
      if (row.items) {
        let parsedMulti = null;
        try {
          parsedMulti = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
        } catch (e) {
          parsedMulti = null;
        }
        if (Array.isArray(parsedMulti) && parsedMulti.length > 0) {
          for (const it of parsedMulti) {
            let itPartName = it.part_name || '';
            let itPartNo = it.part_no || '';
            const m = itPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            if (m) {
              itPartName = m[1].trim();
              if (!itPartNo) itPartNo = m[2].trim();
            }
            if (!it.qty_per_box || !it.total_qty) {
              let pMatch = null;
              if (itPartNo) {
                pMatch = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(itPartNo);
              }
              if (!pMatch && itPartName) {
                pMatch = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${itPartName}%`);
              }
              if (pMatch) {
                if (!it.part_no) it.part_no = pMatch.part_no;
                if (!it.qty_per_box) it.qty_per_box = pMatch.qty_per_box;
              }
            }
            const b = Number(it.box_qty) || Number(it.no_of_box) || 0;
            let q = Number(it.qty_per_box) || Number(it.qty_per_ctn) || 0;
            let t = Number(it.total_qty) || 0;
            if (!t && b > 0 && q > 0) t = b * q;
            if (!q && b > 0 && t > 0) q = Math.round(t / b);
            it.qty_per_box = q;
            it.total_qty = t;
          }
          row.items = JSON.stringify(parsedMulti);
        }
      }

    } catch (e) {
      console.error('DO enrichment error:', e);
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-orders', async (req, res) => {
  try {
    const {
      do_number,
      do_date,
      invoice_number,
      customer_name,
      customer_id,
      customer_po_no,
      part_name,
      pallet_qty,
      box_qty,
      notes,
      items
    } = req.body;

    let parsedItems = null;
    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items;
    } else if (typeof items === 'string' && items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = null;
      }
    }

    let finalPartName = part_name || '';
    let finalPoNo = customer_po_no || '';
    let numBoxes = Number(box_qty) || 0;
    let numPallets = Number(pallet_qty) || 0;

    if (parsedItems && parsedItems.length > 0) {
      numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || Number(it.box_qty) || 0), 0) || numBoxes;
      numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || Number(it.pallet_qty) || 0), 0) || numPallets;
      if (!part_name) {
        finalPartName = parsedItems.length === 1
          ? (parsedItems[0].part_name || '')
          : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
      }
      if (!customer_po_no) {
        const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no || i.po_no).filter(Boolean))];
        if (distinctPo.length > 0) finalPoNo = distinctPo.join(', ');
      }
      // Enrich items with qty_per_box from parts catalog if missing
      for (const it of parsedItems) {
        let itPartName = it.part_name || '';
        let itPartNo = it.part_no || '';
        const m = itPartName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        if (m) {
          itPartName = m[1].trim();
          if (!itPartNo) itPartNo = m[2].trim();
        }
        if (!it.qty_per_box || !it.total_qty) {
          let pMatch = null;
          if (itPartNo) {
            pMatch = await db.prepare('SELECT * FROM parts WHERE part_no = ? LIMIT 1').get(itPartNo);
          }
          if (!pMatch && itPartName) {
            pMatch = await db.prepare('SELECT * FROM parts WHERE part_name LIKE ? LIMIT 1').get(`%${itPartName}%`);
          }
          if (pMatch) {
            if (!it.part_no) it.part_no = pMatch.part_no;
            if (!it.qty_per_box) it.qty_per_box = pMatch.qty_per_box;
          }
        }
        const b = Number(it.box_qty) || Number(it.no_of_box) || 0;
        let q = Number(it.qty_per_box) || Number(it.qty_per_ctn) || 0;
        let t = Number(it.total_qty) || 0;
        if (!t && b > 0 && q > 0) t = b * q;
        if (!q && b > 0 && t > 0) q = Math.round(t / b);
        it.qty_per_box = q;
        it.total_qty = t;
      }
    }

    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;
    const finalDoNumber = (do_number?.trim() || invoice_number?.trim() || '').trim();

    const stmt = await db.prepare(`
      INSERT INTO delivery_orders (
        do_number, do_date, invoice_number, customer_name, customer_id,
        customer_po_no, part_name, pallet_qty, box_qty, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = await stmt.run(
      finalDoNumber || (invoice_number?.trim() || ''),
      do_date || new Date().toISOString().slice(0, 10),
      invoice_number || '',
      customer_name || '',
      customer_id || '',
      finalPoNo,
      finalPartName,
      numPallets,
      numBoxes,
      notes || '',
      itemsJson
    );

    const refId = info.lastInsertRowid;

    // Log to data_logger
    const loggerStmt = db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, items, ref_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await loggerStmt.run(
      'DELIVERY_ORDER',
      finalDoNumber || (invoice_number?.trim() || `DO-${refId}`),
      do_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_id || '',
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      invoice_number ? `Ref Inv: ${invoice_number}` : '',
      null,
      null,
      null,
      notes || '',
      itemsJson,
      refId
    );

    const created = await db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Delivery order create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/delivery-orders/:id', async (req, res) => {
  try {
    const {
      do_number,
      do_date,
      invoice_number,
      customer_name,
      customer_id,
      customer_po_no,
      part_name,
      pallet_qty,
      box_qty,
      notes,
      items
    } = req.body;

    let parsedItems = null;
    if (Array.isArray(items) && items.length > 0) {
      parsedItems = items;
    } else if (typeof items === 'string' && items.trim().startsWith('[')) {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = null;
      }
    }

    let finalPartName = part_name || '';
    let finalPoNo = customer_po_no || '';
    let numBoxes = Number(box_qty) || 0;
    let numPallets = Number(pallet_qty) || 0;

    if (parsedItems && parsedItems.length > 0) {
      numBoxes = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_box) || Number(it.box_qty) || 0), 0) || numBoxes;
      numPallets = parsedItems.reduce((acc, it) => acc + (Number(it.no_of_pallet) || Number(it.pallet_qty) || 0), 0) || numPallets;
      if (!part_name) {
        finalPartName = parsedItems.length === 1
          ? (parsedItems[0].part_name || '')
          : `${parsedItems.length} Items: ${parsedItems.map(i => i.part_name).filter(Boolean).slice(0, 3).join(', ')}${parsedItems.length > 3 ? '...' : ''}`;
      }
      if (!customer_po_no) {
        const distinctPo = [...new Set(parsedItems.map(i => i.customer_po_no || i.po_no).filter(Boolean))];
        if (distinctPo.length > 0) finalPoNo = distinctPo.join(', ');
      }
    }

    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;
    const finalDoNumber = (do_number?.trim() || invoice_number?.trim() || '').trim();

    await db.prepare(`
      UPDATE delivery_orders
      SET do_number = ?, do_date = ?, invoice_number = ?, customer_name = ?,
          customer_id = ?, customer_po_no = ?, part_name = ?, pallet_qty = ?,
          box_qty = ?, notes = ?, items = ?
      WHERE id = ?
    `).run(
      finalDoNumber || (invoice_number?.trim() || ''),
      do_date || '',
      invoice_number || '',
      customer_name || '',
      customer_id || '',
      finalPoNo,
      finalPartName,
      numPallets,
      numBoxes,
      notes || '',
      itemsJson,
      req.params.id
    );

    // Sync to data_logger
    await db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, notes = ?, items = ?
      WHERE doc_type = 'DELIVERY_ORDER' AND ref_id = ?
    `).run(
      finalDoNumber || (invoice_number?.trim() || ''),
      do_date || '',
      customer_name || '',
      customer_id || '',
      finalPoNo,
      finalPartName,
      numBoxes,
      numPallets,
      invoice_number ? `Ref Inv: ${invoice_number}` : '',
      notes || '',
      itemsJson,
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Delivery order update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DATA LOGGER ROUTES ================= //

app.get('/api/data-logger', async (req, res) => {
  try {
    const { 
      doc_type, 
      customer_name, 
      terms_of_delivery, 
      start_date, 
      end_date, 
      search,
      sort_by,
      sort_order,
      page,
      limit
    } = req.query;

    let baseQuery = ' FROM data_logger WHERE (is_deleted IS NULL OR is_deleted = 0)';
    const params = [];

    if (doc_type && doc_type !== 'ALL') {
      baseQuery += ' AND doc_type = ?';
      params.push(doc_type);
    }

    if (customer_name && customer_name !== 'ALL') {
      baseQuery += ' AND customer_name = ?';
      params.push(customer_name);
    }

    if (terms_of_delivery && terms_of_delivery !== 'ALL') {
      baseQuery += ' AND terms_of_delivery = ?';
      params.push(terms_of_delivery);
    }

    if (start_date) {
      baseQuery += ' AND doc_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      baseQuery += ' AND doc_date <= ?';
      params.push(end_date);
    }

    if (search) {
      baseQuery += ' AND (doc_number LIKE ? OR customer_name LIKE ? OR customer_id LIKE ? OR po_no LIKE ? OR part_name LIKE ? OR notes LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    // Get total matching rows
    const countRow = await db.prepare(`SELECT COUNT(*) AS total ${baseQuery}`).get(...params);
    const total = countRow ? countRow.total : 0;

    // Sorting
    const allowedSortCols = ['id', 'doc_date', 'doc_number', 'customer_name', 'box_qty', 'pallet_qty', 'created_at'];
    const col = allowedSortCols.includes(sort_by) ? sort_by : 'id';
    const order = (sort_order && sort_order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    let dataQuery = `SELECT * ${baseQuery} ORDER BY ${col} ${order}`;
    const queryParams = [...params];

    const isPaginationRequested = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = limit === 'all' ? total : Math.max(1, parseInt(limit) || 50);

    if (limit !== 'all') {
      dataQuery += ' LIMIT ? OFFSET ?';
      queryParams.push(pageSize, (pageNum - 1) * pageSize);
    }

    const rows = await db.prepare(dataQuery).all(...queryParams);

    if (isPaginationRequested) {
      res.json({
        data: rows,
        pagination: {
          page: pageNum,
          limit: limit === 'all' ? 'all' : pageSize,
          total,
          totalPages: limit === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize))
        }
      });
    } else {
      res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/data-logger/:id', async (req, res) => {
  try {
    const {
      doc_number,
      doc_date,
      customer_name,
      customer_id,
      po_no,
      part_name,
      box_qty,
      pallet_qty,
      terms_of_delivery,
      payment_term,
      dimensions,
      notes
    } = req.body;

    const log = await db.prepare('SELECT * FROM data_logger WHERE id = ?').get(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Data log not found' });
    }

    await db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, payment_term = ?, dimensions = ?, notes = ?
      WHERE id = ?
    `).run(
      doc_number || '',
      doc_date || '',
      customer_name || '',
      customer_id || '',
      po_no || '',
      part_name || '',
      Number(box_qty) || 0,
      Number(pallet_qty) || 0,
      terms_of_delivery || '',
      payment_term || '',
      dimensions || null,
      notes || '',
      req.params.id
    );

    // Also sync to referenced invoice or packing list if ref_id exists
    if (log.ref_id) {
      if (log.doc_type === 'INVOICE') {
        await db.prepare(`
          UPDATE invoices
          SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_id = ?,
              customer_po_no = ?, part_name = ?, no_of_box = ?, no_of_pallet = ?,
              terms_of_delivery = ?, payment_term = ?, notes = ?
          WHERE id = ?
        `).run(
          doc_number || '',
          doc_date || '',
          customer_name || '',
          customer_id || '',
          po_no || '',
          part_name || '',
          Number(box_qty) || 0,
          Number(pallet_qty) || 0,
          terms_of_delivery || '',
          payment_term || '',
          notes || '',
          log.ref_id
        );
      } else if (log.doc_type === 'PACKING_LIST') {
        await db.prepare(`
          UPDATE packing_lists
          SET invoice_number = ?, invoice_date = ?, customer_name = ?,
              customer_po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
              terms_of_delivery = ?, notes = ?
          WHERE id = ?
        `).run(
          doc_number || '',
          doc_date || '',
          customer_name || '',
          po_no || '',
          part_name || '',
          Number(box_qty) || 0,
          Number(pallet_qty) || 0,
          terms_of_delivery || '',
          notes || '',
          log.ref_id
        );
      } else if (log.doc_type === 'DELIVERY_ORDER') {
        await db.prepare(`
          UPDATE delivery_orders
          SET do_number = ?, do_date = ?, customer_name = ?, customer_id = ?,
              customer_po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
              notes = ?
          WHERE id = ?
        `).run(
          doc_number || '',
          doc_date || '',
          customer_name || '',
          customer_id || '',
          po_no || '',
          part_name || '',
          Number(box_qty) || 0,
          Number(pallet_qty) || 0,
          notes || '',
          log.ref_id
        );
      }
    }

    const updated = await db.prepare('SELECT * FROM data_logger WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Data logger update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/data-logger/:id', async (req, res) => {
  try {
    // Soft delete to protect audit trail and prevent permanent data loss
    await db.prepare('UPDATE data_logger SET is_deleted = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Data log berhasil diarsipkan / dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built client frontend if available
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Listen on 0.0.0.0 for LAN access
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIP();
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Accessible on LAN at http://${localIp}:${PORT}`);
});

