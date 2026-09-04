const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const db = require('./db');

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
    const { customer_id, customer_name, address, contact_person, phone } = req.body;
    if (!customer_name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const stmt = db.prepare(`
      INSERT INTO customers (customer_id, customer_name, address, contact_person, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(customer_id || null, customer_name, address || '', contact_person || '', phone || '');
    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { customer_id, customer_name, address, contact_person, phone } = req.body;
    db.prepare(`
      UPDATE customers
      SET customer_id = ?, customer_name = ?, address = ?, contact_person = ?, phone = ?
      WHERE id = ?
    `).run(customer_id, customer_name, address, contact_person, phone, req.params.id);
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
    const rows = db.prepare('SELECT * FROM parts ORDER BY part_name ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parts', (req, res) => {
  try {
    const { part_name, part_no, length, width, height, unit } = req.body;
    if (!part_name) return res.status(400).json({ error: 'Part name is required' });
    const stmt = db.prepare(`
      INSERT INTO parts (part_name, part_no, length, width, height, unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      part_name,
      part_no || '',
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit || 'mm'
    );
    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
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
      payment_term,
      terms_of_delivery,
      customer_po_no,
      part_name,
      no_of_pallet,
      no_of_box,
      image_url,
      notes
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, customer_name, customer_id, payment_term,
        terms_of_delivery, customer_po_no, part_name, no_of_pallet, no_of_box,
        image_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      invoice_number || '',
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_id || '',
      payment_term || '',
      terms_of_delivery || '',
      customer_po_no || '',
      part_name || '',
      Number(no_of_pallet) || 0,
      Number(no_of_box) || 0,
      image_url || '',
      notes || ''
    );

    const refId = info.lastInsertRowid;

    // Log to data_logger with all detailed fields
    const loggerStmt = db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, ref_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    loggerStmt.run(
      'INVOICE',
      invoice_number || `INV-${refId}`,
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_id || '',
      customer_po_no || '',
      part_name || '',
      Number(no_of_box) || 0,
      Number(no_of_pallet) || 0,
      terms_of_delivery || '',
      payment_term || '',
      null,
      image_url || '',
      notes || '',
      refId
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
      payment_term,
      terms_of_delivery,
      customer_po_no,
      part_name,
      no_of_pallet,
      no_of_box,
      notes
    } = req.body;

    db.prepare(`
      UPDATE invoices
      SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_id = ?,
          payment_term = ?, terms_of_delivery = ?, customer_po_no = ?, part_name = ?,
          no_of_pallet = ?, no_of_box = ?, notes = ?
      WHERE id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      customer_id || '',
      payment_term || '',
      terms_of_delivery || '',
      customer_po_no || '',
      part_name || '',
      Number(no_of_pallet) || 0,
      Number(no_of_box) || 0,
      notes || '',
      req.params.id
    );

    // Sync update to data_logger
    db.prepare(`
      UPDATE data_logger
      SET doc_number = ?, doc_date = ?, customer_name = ?, customer_id = ?,
          po_no = ?, part_name = ?, box_qty = ?, pallet_qty = ?,
          terms_of_delivery = ?, payment_term = ?, notes = ?
      WHERE doc_type = 'INVOICE' AND ref_id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      customer_id || '',
      customer_po_no || '',
      part_name || '',
      Number(no_of_box) || 0,
      Number(no_of_pallet) || 0,
      terms_of_delivery || '',
      payment_term || '',
      notes || '',
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
      notes
    } = req.body;

    const stmt = db.prepare(`
      INSERT INTO packing_lists (
        invoice_number, invoice_date, customer_name, customer_po_no, part_name,
        terms_of_delivery, box_qty, pallet_qty, length, width, height,
        unit_note, image_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      invoice_number || '',
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      customer_po_no || '',
      part_name || '',
      terms_of_delivery || '',
      Number(box_qty) || 0,
      Number(pallet_qty) || 0,
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit_note || 'mm',
      image_url || '',
      notes || ''
    );

    const refId = info.lastInsertRowid;

    // Log to data_logger with all detailed fields
    const dimStr = (Number(length) > 0 || Number(width) > 0 || Number(height) > 0)
      ? `${length} x ${width} x ${height} ${unit_note || 'mm'}`
      : null;

    const loggerStmt = db.prepare(`
      INSERT INTO data_logger (
        doc_type, doc_number, doc_date, customer_name, customer_id, po_no,
        part_name, box_qty, pallet_qty, terms_of_delivery, payment_term, dimensions, image_url, notes, ref_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    loggerStmt.run(
      'PACKING_LIST',
      invoice_number || `PL-${refId}`,
      invoice_date || new Date().toISOString().slice(0, 10),
      customer_name || '',
      null,
      customer_po_no || '',
      part_name || '',
      Number(box_qty) || 0,
      Number(pallet_qty) || 0,
      terms_of_delivery || '',
      null,
      dimStr,
      image_url || '',
      notes || '',
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
      notes
    } = req.body;

    db.prepare(`
      UPDATE packing_lists
      SET invoice_number = ?, invoice_date = ?, customer_name = ?, customer_po_no = ?,
          part_name = ?, terms_of_delivery = ?, box_qty = ?, pallet_qty = ?,
          length = ?, width = ?, height = ?, unit_note = ?, notes = ?
      WHERE id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      customer_po_no || '',
      part_name || '',
      terms_of_delivery || '',
      Number(box_qty) || 0,
      Number(pallet_qty) || 0,
      Number(length) || 0,
      Number(width) || 0,
      Number(height) || 0,
      unit_note || 'mm',
      notes || '',
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
          terms_of_delivery = ?, dimensions = ?, notes = ?
      WHERE doc_type = 'PACKING_LIST' AND ref_id = ?
    `).run(
      invoice_number || '',
      invoice_date || '',
      customer_name || '',
      customer_po_no || '',
      part_name || '',
      Number(box_qty) || 0,
      Number(pallet_qty) || 0,
      terms_of_delivery || '',
      dimStr,
      notes || '',
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Packing list update error:', err);
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

