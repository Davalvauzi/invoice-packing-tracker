# Invoice & Packing List Tracker (LAN Web Application)

Aplikasi web modern untuk manajemen dan pelacakan **Invoice** dan **Packing List**, dilengkapi fitur auto-generate berkas cetak PDF berstandar korporat A4, **Data Logger** transaksi, serta manajemen **Master Data** (Customer, Ketentuan Pembayaran, Ketentuan Pengiriman, dan Katalog Part).

Sistem ini dirancang untuk mendigitalkan alur kerja dari file Excel VBA (*VBA - INVOICE AND PACKING LIST.xlsm*).

---

## 🚀 Fitur Utama

1. **Main Menu / Dashboard:**
   - Akses cepat ke form Invoice, form Packing List, Data Logger, dan Master Data.
   - Ringkasan statistik dokumen yang telah diterbitkan hari ini.
   - Indikator alamat IP Jaringan Lokal (LAN) dengan tombol 1-klik untuk menyalin tautan.

2. **Invoice Form:**
   - Field identik dengan form Excel VBA: No. Invoice, Tanggal, Customer Name (auto-fill Customer ID), Payment Term, Terms of Delivery, Customer PO, Part Name/No, Pallet Qty, Box Qty.
   - Fitur upload Technical Drawing / Sketsa Part.
   - **Tombol Submit:** Otomatis menyimpan transaksi ke database, mencatat ke Data Logger, dan membuka dokumen cetak resmi PDF di tab baru browser.

3. **Packing List Form:**
   - Field spesifikasi pengemasan: Ref Invoice, Tanggal, Customer, Customer PO, Dimensi Part (Panjang x Lebar x Tinggi + Satuan), Box Qty, Pallet Qty, Drawing/Foto Kemasan.
   - Fitur **"Tarik Data Otomatis"** dari Invoice yang sudah dibuat untuk efisiensi penginputan.
   - **Tombol Submit:** Otomatis menyimpan, mencatat ke Data Logger, dan membuka dokumen cetak resmi PDF di tab baru.

4. **Standar Dokumen Cetak PDF A4:**
   - Tata letak resmi korporat: Kop surat perusahaan, tabel perincian barang/kemasan, lampiran gambar teknis, dan kolom tanda tangan/stempel (*Prepared By, Checked By, Approved By*).
   - Tombol **"Cetak / Simpan PDF (A4)"** langsung memicu dialog cetak browser (dapat langsung dicetak ke printer fisik atau disimpan sebagai file PDF).

5. **Data Logger (Audit Trail):**
   - Merekam seluruh histori transaksi dokumen yang pernah disubmit (mirip sheet *DATA LOGGER* di Excel).
   - Filter berdasarkan tipe dokumen (*Invoice* / *Packing List*).
   - Fitur pencarian cepat (Nomor dokumen, nama customer, nomor PO).
   - Tombol cetak ulang dokumen PDF kapan saja.
   - Fitur **Ekspor ke format CSV / Excel**.

6. **Master Data & Template:**
   - Halaman khusus untuk mengelola data berulang agar staf tidak perlu mengetik berulang kali:
     - **Customer Information:** Nama PT, Customer ID, Alamat, PIC & Kontak.
     - **Payment Terms:** COD, Net 14, Net 30, Net 60, T/T in advance, dll.
     - **Terms of Delivery:** FOB, CIF, EXW, DAP, DDP, dll.
     - **Part Catalog:** Nama Part, Part Number, Dimensi default (L x W x H).

---

## 💻 Cara Menjalankan Aplikasi

### Opsi 1: Klik Ganda file Batch (Paling Mudah)
Cukup klik ganda berkas `start-app.bat`. Server akan otomatis berjalan dan membuka browser Anda di `http://localhost:3001`.

### Opsi 2: Menggunakan Terminal / Command Prompt
```bash
# Masuk ke direktori proyek
cd C:\Users\ReX\.gemini\antigravity\scratch\web\invoice-packing-tracker

# Jalankan server
npm start
```

---

## 🌐 Cara Akses Bersama Melalui LAN (Komputer / HP Lain)

Aplikasi ini mendengarkan pada host `0.0.0.0`, sehingga perangkat lain yang terhubung dalam satu jaringan Wi-Fi atau kabel LAN kantor dapat langsung membukanya tanpa perlu instalasi tambahan:

1. Buka aplikasi di komputer utama.
2. Lihat badge **LAN IP** di pojok kanan atas Navbar (misal: `192.168.1.15:3001`).
3. Buka browser di laptop, PC lain, atau smartphone rekan kerja Anda, lalu ketik alamat IP tersebut:
   ```
   http://192.168.1.15:3001
   ```
4. Semua data yang diinput oleh rekan kerja Anda akan langsung tersimpan terpusat di komputer utama dan tercatat pada Data Logger secara real-time!

---

## 📂 Struktur Direktori

```
invoice-packing-tracker/
├── package.json              # Konfigurasi npm root
├── start-app.bat             # Launcher 1-klik Windows
├── README.md                 # Dokumentasi sistem
├── server/
│   ├── index.js              # Server Express REST API & static file hosting
│   ├── db.js                 # SQLite database schema & seeder
│   ├── data.sqlite           # File database SQLite lokal
│   └── uploads/              # Folder penyimpanan berkas gambar drawing
└── client/
    ├── src/
    │   ├── components/Navbar.jsx
    │   ├── pages/Dashboard.jsx
    │   ├── pages/InvoiceForm.jsx
    │   ├── pages/PackingListForm.jsx
    │   ├── pages/DataLogger.jsx
    │   ├── pages/MasterData.jsx
    │   ├── pages/PrintInvoice.jsx
    │   └── pages/PrintPackingList.jsx
    └── dist/                 # Hasil build produksi siap pakai
```
