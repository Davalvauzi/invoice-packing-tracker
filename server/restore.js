const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const host = process.env.PG_HOST || '127.0.0.1';
const port = process.env.PG_PORT || '5432';
const user = process.env.PG_USER || 'postgres';
const password = process.env.PG_PASSWORD || 'password';
const database = process.env.PG_DATABASE || 'invoice_track';
const dumpFile = path.join(__dirname, 'database_dump.sql');

console.log(`📥 Me-restore PostgreSQL database '${database}' dari ${dumpFile}...`);
try {
  execSync(`psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${dumpFile}"`, {
    env: { ...process.env, PGPASSWORD: password },
    stdio: 'inherit'
  });
  console.log('✅ Database PostgreSQL berhasil di-restore!');
} catch (err) {
  console.error('❌ Gagal me-restore database via psql:', err.message);
  console.log('💡 Alternatif: jalankan skrip migrasi langsung dari SQLite: node server/migrate.js');
}
