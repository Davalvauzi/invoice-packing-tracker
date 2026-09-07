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

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'drawing-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
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
app.get('/api/network-info', (req, res) => {
  res.json({
    localIp: getLocalIP(),
    apiPort: PORT,
    clientPort: 3000
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('drawing'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ================= WEBSITE / TEMPLATE SETTINGS ================= //

app.get('/api/settings', (req, res) => {
  try {
    let row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!row) {
      db.prepare(`
        INSERT INTO settings (id, company_name) VALUES (1, 'PT. PATCO ELEKTRONIK TEKNOLOGI')
      `).run();
      row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
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
      show_letterhead
    } = req.body;

    db.prepare(`
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
      show_letterhead !== undefined ? (show_letterhead ? 1 : 0) : 1
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logo upload endpoint for settings
app.post('/api/settings/upload-logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// ================= DUMMY / SAMPLE DATA MANAGEMENT ================= //

app.get('/api/dummy-data/stats', (req, res) => {
  try {
    const totalCust = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
    const totalParts = db.prepare('SELECT COUNT(*) as c FROM parts').get().c;
    const totalInv = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
    const totalPL = db.prepare('SELECT COUNT(*) as c FROM packing_lists').get().c;
    const totalDO = db.prepare('SELECT COUNT(*) as c FROM delivery_orders').get().c;
    const totalLog = db.prepare('SELECT COUNT(*) as c FROM data_logger').get().c;

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
app.get('/api/dummy-data/master-templates', (req, res) => {
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
app.post('/api/dummy-data/seed-master', (req, res) => {
  try {
    const result = seedMasterTemplate(db, req.body || {});
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
app.post('/api/dummy-data/generate', (req, res) => {
  try {
    const {
      count = 10,
      dateRangeMonths = 6,
      includePL = true,
      includeDO = true,
      currencies = ['USD', 'IDR', 'JPY']
    } = req.body || {};

    const stats = generateTransactionsOnly(db, {
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

app.post('/api/dummy-data/clear', (req, res) => {
  try {
    const { mode = 'transactions' } = req.body;

    if (mode === 'transactions' || mode === 'dummy_only') {
      // 1. Hapus Hanya Transaksi (Invoices, PL, DO, Logs) - Master Data 100% AMAN
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM packing_lists').run();
      db.prepare('DELETE FROM delivery_orders').run();
      db.prepare('DELETE FROM data_logger').run();

      return res.json({
        success: true,
        message: 'Seluruh riwayat transaksi (Invoices, Packing Lists, Delivery Orders, dan Logs) berhasil dibersihkan! Master Customer & Part tetap aman tersimpan.'
      });
    }

    if (mode === 'master_only') {
      // 2. Hapus Hanya Master Data (Customers, Parts, Price History, Terms)
      db.prepare('DELETE FROM part_price_history').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM parts').run();
      db.prepare('DELETE FROM payment_terms').run();
      db.prepare('DELETE FROM delivery_terms').run();

      return res.json({
        success: true,
        message: 'Seluruh Master Data (Customer, Katalog Part, Riwayat Harga, dan Termin) berhasil dibersihkan!'
      });
    }

    if (mode === 'all') {
      // 3. Reset Total Database (Kosongkan Seluruh Tabel)
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM packing_lists').run();
      db.prepare('DELETE FROM delivery_orders').run();
      db.prepare('DELETE FROM data_logger').run();
      db.prepare('DELETE FROM part_price_history').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM parts').run();
      db.prepare('DELETE FROM payment_terms').run();
      db.prepare('DELETE FROM delivery_terms').run();

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
app.get('/api/customers', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM customers ORDER BY customer_name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { customer_id, customer_name, address, bill_to, ship_to, contact_person, phone } = req.body;
    if (!customer_name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const stmt = db.prepare(`
      INSERT INTO customers (customer_id, customer_name, address, bill_to, ship_to, contact_person, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      customer_id || null, 
      customer_name, 
      address || '', 
      bill_to || address || '', 
      ship_to || address || '', 
      contact_person || '', 
      phone || ''
    );
    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { customer_id, customer_name, address, bill_to, ship_to, contact_person, phone } = req.body;
    db.prepare(`
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

app.delete('/api/customers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payment Terms
app.get('/api/payment-terms', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM payment_terms ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payment-terms', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO payment_terms (name, description) VALUES (?, ?)');
    const info = stmt.run(name, description || '');
    res.status(201).json({ id: info.lastInsertRowid, name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/payment-terms/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM payment_terms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delivery Terms
app.get('/api/delivery-terms', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM delivery_terms ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-terms', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const stmt = db.prepare('INSERT INTO delivery_terms (name, description) VALUES (?, ?)');
    const info = stmt.run(name, description || '');
    res.status(201).json({ id: info.lastInsertRowid, name, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/delivery-terms/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM delivery_terms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parts Catalog
app.get('/api/parts', (req, res) => {
  try {
    const rows = db.prepare(`
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

app.post('/api/parts', (req, res) => {
  try {
    const { part_name, part_no, length, width, height, unit, qty_per_box, price, currency = 'USD' } = req.body;
    if (!part_name) return res.status(400).json({ error: 'Part name is required' });
    const stmt = db.prepare(`
      INSERT INTO parts (part_name, part_no, length, width, height, unit, qty_per_box, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      part_name,
      part_no || '',
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit || 'mm',
      Number(qty_per_box) || 0,
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

app.put('/api/parts/:id', (req, res) => {
  try {
    const { part_name, part_no, length, width, height, unit, qty_per_box, price } = req.body;
    db.prepare(`
      UPDATE parts
      SET part_name = ?, part_no = ?, length = ?, width = ?, height = ?, unit = ?, qty_per_box = ?, price = ?
      WHERE id = ?
    `).run(
      part_name || '',
      part_no || '',
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit || 'mm',
      Number(qty_per_box) || 0,
      Number(price) || 0,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/parts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM parts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PART PRICE HISTORY ROUTES ================= //

// Helper to re-sync part's current active price to parts.price
function syncPartActivePrice(partId) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const activeRec = db.prepare(`
      SELECT price, currency FROM part_price_history
      WHERE part_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC, id DESC
      LIMIT 1
    `).get(partId, today);

    if (activeRec) {
      db.prepare('UPDATE parts SET price = ? WHERE id = ?').run(activeRec.price, partId);
    }
  } catch (e) {
    console.error('Error syncing part price:', e);
  }
}

// Get price history for a part
app.get('/api/parts/:id/prices', (req, res) => {
  try {
    const partId = req.params.id;
    const part = db.prepare('SELECT id, part_name, part_no, price FROM parts WHERE id = ?').get(partId);
    if (!part) return res.status(404).json({ error: 'Part tidak ditemukan' });

    const today = new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`
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
app.post('/api/parts/:id/prices', (req, res) => {
  try {
    const partId = req.params.id;
    const { price, currency = 'USD', effective_date, notes = '' } = req.body;
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Harga harus berupa angka valid' });
    }
    if (!effective_date) {
      return res.status(400).json({ error: 'Tanggal mulai berlaku harus diisi' });
    }

    const stmt = db.prepare(`
      INSERT INTO part_price_history (part_id, price, currency, effective_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(partId, Number(price), currency, effective_date, notes);
    syncPartActivePrice(partId);

    const newRecord = db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update price entry
app.put('/api/parts/prices/:priceId', (req, res) => {
  try {
    const { priceId } = req.params;
    const { price, currency = 'USD', effective_date, notes = '' } = req.body;
    const existing = db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(priceId);
    if (!existing) return res.status(404).json({ error: 'Data riwayat tidak ditemukan' });

    db.prepare(`
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
app.delete('/api/parts/prices/:priceId', (req, res) => {
  try {
    const { priceId } = req.params;
    const existing = db.prepare('SELECT * FROM part_price_history WHERE id = ?').get(priceId);
    if (!existing) return res.status(404).json({ error: 'Data riwayat tidak ditemukan' });

    db.prepare('DELETE FROM part_price_history WHERE id = ?').run(priceId);
    syncPartActivePrice(existing.part_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get effective price at a specific date
app.get('/api/parts/:id/price-at-date', (req, res) => {
  try {
    const partId = req.params.id;
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

    // Look for effective price <= targetDate
    let row = db.prepare(`
      SELECT price, currency, effective_date, notes
      FROM part_price_history
      WHERE part_id = ? AND effective_date <= ?
      ORDER BY effective_date DESC, id DESC
      LIMIT 1
    `).get(partId, targetDate);

    // Fallback if targetDate is earlier than all history records
    if (!row) {
      row = db.prepare(`
        SELECT price, currency, effective_date, notes
        FROM part_price_history
        WHERE part_id = ?
        ORDER BY effective_date ASC, id ASC
        LIMIT 1
      `).get(partId);
    }

    if (!row) {
      const part = db.prepare('SELECT price FROM parts WHERE id = ?').get(partId);
      row = { price: part?.price || 0, currency: 'USD', effective_date: targetDate, notes: 'Default master' };
    }

    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= INVOICE TRANSACTIONS ================= //

app.get('/api/invoices', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', (req, res) => {
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

    // Multi-item handling
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
    const numVatRate = vat_rate !== undefined ? Number(vat_rate) : 11;

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

    const computedVatAmount = Number(vat_amount) || (computedTotalAmount * (numVatRate / 100));
    const computedGrandTotal = Number(grand_total) || (computedTotalAmount + computedVatAmount);
    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    const stmt = db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, customer_name, customer_id, bill_to, ship_to,
        payment_term, terms_of_delivery, customer_po_no, part_name, no_of_pallet, no_of_box,
        qty_per_box, total_qty, unit_price, total_amount, vat_rate, vat_amount, grand_total, currency,
        hts_code, image_url, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
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
    loggerStmt.run(
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

    const created = db.prepare('SELECT * FROM invoices WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Invoice create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', (req, res) => {
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
    let numPallets = Number(no_of_pallet) || 0;
    let numBoxes = Number(no_of_box) || 0;
    let numQtyPerBox = Number(qty_per_box) || 0;
    let computedTotalQty = Number(total_qty) || 0;
    let numUnitPrice = Number(unit_price) || 0;
    let computedTotalAmount = Number(total_amount) || 0;
    const numVatRate = vat_rate !== undefined ? Number(vat_rate) : 11;

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
    } else {
      computedTotalQty = computedTotalQty || (numBoxes * numQtyPerBox);
      computedTotalAmount = computedTotalAmount || (computedTotalQty * numUnitPrice);
    }

    const computedVatAmount = Number(vat_amount) || (computedTotalAmount * (numVatRate / 100));
    const computedGrandTotal = Number(grand_total) || (computedTotalAmount + computedVatAmount);
    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    db.prepare(`
      UPDATE invoices
      SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_id = ?,
          bill_to = ?, ship_to = ?, payment_term = ?, terms_of_delivery = ?, customer_po_no = ?, part_name = ?,
          no_of_pallet = ?, no_of_box = ?, qty_per_box = ?, total_qty = ?, unit_price = ?,
          total_amount = ?, vat_rate = ?, vat_amount = ?, grand_total = ?, currency = ?,
          hts_code = ?, notes = ?, items = ?
      WHERE id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
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
      notes || '',
      itemsJson,
      req.params.id
    );

    // Sync update to data_logger
    db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, payment_term = ?, notes = ?, items = ?,
          grand_total = ?, unit_price = ?, currency = ?
      WHERE doc_type = 'INVOICE' AND ref_id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      customer_id || '',
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
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Invoice update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= PACKING LIST TRANSACTIONS ================= //

app.get('/api/packing-lists', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM packing_lists ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/packing-lists/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Packing list not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/packing-lists', (req, res) => {
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
    }

    const itemsJson = parsedItems ? JSON.stringify(parsedItems) : null;

    const stmt = db.prepare(`
      INSERT INTO packing_lists (
        invoice_number, invoice_date, customer_name, customer_po_no, part_name,
        terms_of_delivery, box_qty, pallet_qty, length, width, height,
        unit_note, image_url, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
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
    loggerStmt.run(
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

    const created = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Packing list create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/packing-lists/:id', (req, res) => {
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

    db.prepare(`
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
    db.prepare(`
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

    const updated = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Packing list update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELIVERY ORDER TRANSACTIONS ================= //

app.get('/api/delivery-orders', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM delivery_orders ORDER BY id DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/delivery-orders/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Delivery order not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delivery-orders', (req, res) => {
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

    const stmt = db.prepare(`
      INSERT INTO delivery_orders (
        do_number, do_date, invoice_number, customer_name, customer_id,
        customer_po_no, part_name, pallet_qty, box_qty, notes, items
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      do_number || '',
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
    loggerStmt.run(
      'DELIVERY_ORDER',
      do_number || `DO-${refId}`,
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

    const created = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(refId);
    res.status(201).json(created);
  } catch (err) {
    console.error('Delivery order create error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/delivery-orders/:id', (req, res) => {
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

    db.prepare(`
      UPDATE delivery_orders
      SET do_number = ?, do_date = ?, invoice_number = ?, customer_name = ?,
          customer_id = ?, customer_po_no = ?, part_name = ?, pallet_qty = ?,
          box_qty = ?, notes = ?, items = ?
      WHERE id = ?
    `).run(
      do_number || '',
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
    db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, notes = ?, items = ?
      WHERE doc_type = 'DELIVERY_ORDER' AND ref_id = ?
    `).run(
      do_number || '',
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

    const updated = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Delivery order update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DATA LOGGER ROUTES ================= //

app.get('/api/data-logger', (req, res) => {
  try {
    const { 
      doc_type, 
      customer_name, 
      terms_of_delivery, 
      start_date, 
      end_date, 
      search,
      sort_by,
      sort_order
    } = req.query;

    let query = 'SELECT * FROM data_logger WHERE 1=1';
    const params = [];

    if (doc_type && doc_type !== 'ALL') {
      query += ' AND doc_type = ?';
      params.push(doc_type);
    }

    if (customer_name && customer_name !== 'ALL') {
      query += ' AND customer_name = ?';
      params.push(customer_name);
    }

    if (terms_of_delivery && terms_of_delivery !== 'ALL') {
      query += ' AND terms_of_delivery = ?';
      params.push(terms_of_delivery);
    }

    if (start_date) {
      query += ' AND doc_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND doc_date <= ?';
      params.push(end_date);
    }

    if (search) {
      query += ' AND (doc_number LIKE ? OR customer_name LIKE ? OR customer_id LIKE ? OR po_no LIKE ? OR part_name LIKE ? OR notes LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term);
    }

    // Sorting
    const allowedSortCols = ['id', 'doc_date', 'doc_number', 'customer_name', 'box_qty', 'pallet_qty', 'created_at'];
    const col = allowedSortCols.includes(sort_by) ? sort_by : 'id';
    const order = (sort_order && sort_order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    query += ` ORDER BY ${col} ${order}`;

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/data-logger/:id', (req, res) => {
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

    const log = db.prepare('SELECT * FROM data_logger WHERE id = ?').get(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Data log not found' });
    }

    db.prepare(`
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
        db.prepare(`
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
        db.prepare(`
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
        db.prepare(`
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

    const updated = db.prepare('SELECT * FROM data_logger WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Data logger update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/data-logger/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM data_logger WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built client frontend if available
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
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

