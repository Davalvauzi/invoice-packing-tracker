const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_TYPE = (process.env.DB_TYPE || 'postgres').toLowerCase();

let dbInstance = null;

if (DB_TYPE === 'postgres') {
  const { Pool } = require('pg');

  const pool = new Pool({
    host: process.env.PG_HOST || '127.0.0.1',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: process.env.PG_DATABASE || 'invoice_track',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  function toPgSql(sql) {
    let cleaned = sql
      .replace(/date\('now'\)/gi, 'CURRENT_DATE')
      .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

    let paramIndex = 1;
    cleaned = cleaned.replace(/\?/g, () => `$${paramIndex++}`);
    return cleaned;
  }

  function flattenParams(args) {
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0];
    }
    return args;
  }

  dbInstance = {
    isPostgres: true,
    pool,

    async query(sql, params = []) {
      const pgSql = toPgSql(sql);
      const flat = flattenParams(params);
      return await pool.query(pgSql, flat);
    },

    prepare(sql) {
      return {
        async all(...args) {
          const flat = flattenParams(args);
          const pgSql = toPgSql(sql);
          const res = await pool.query(pgSql, flat);
          return res.rows;
        },

        async get(...args) {
          const flat = flattenParams(args);
          const pgSql = toPgSql(sql);
          const res = await pool.query(pgSql, flat);
          return res.rows[0];
        },

        async run(...args) {
          const flat = flattenParams(args);
          let pgSql = toPgSql(sql);

          const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
          const hasReturning = /RETURNING/i.test(pgSql);

          if (isInsert && !hasReturning) {
            pgSql = `${pgSql.trim().replace(/;$/, '')} RETURNING id`;
          }

          const res = await pool.query(pgSql, flat);
          const lastId = res.rows && res.rows[0] ? res.rows[0].id : null;
          return {
            lastInsertRowid: lastId,
            changes: res.rowCount
          };
        }
      };
    },

    async exec(sql) {
      return await pool.query(toPgSql(sql));
    }
  };

  console.log(`📡 Database Connected: PostgreSQL (database: ${process.env.PG_DATABASE || 'invoice_track'})`);

  // Auto-ensure incremental schema columns & performance indexes
  pool.query('ALTER TABLE parts ADD COLUMN IF NOT EXISTS box_per_pallet INTEGER DEFAULT 0')
    .catch(() => { /* table might not exist yet */ });
  pool.query('CREATE INDEX IF NOT EXISTS idx_do_inv_number ON delivery_orders(invoice_number)')
    .catch(() => {});
  pool.query('CREATE INDEX IF NOT EXISTS idx_parts_part_no ON parts(part_no)')
    .catch(() => {});
  pool.query('CREATE INDEX IF NOT EXISTS idx_parts_customer ON parts(customer_id)')
    .catch(() => {});
  pool.query('CREATE INDEX IF NOT EXISTS idx_price_history_part ON part_price_history(part_id)')
    .catch(() => {});

} else {
  // SQLite fallback
  const { DatabaseSync } = require('node:sqlite');
  const sqliteDb = new DatabaseSync(path.join(__dirname, 'data.sqlite'));

  try {
    const cols = sqliteDb.prepare("PRAGMA table_info(parts)").all();
    if (cols && cols.length > 0 && !cols.some(c => c.name === 'box_per_pallet')) {
      sqliteDb.exec("ALTER TABLE parts ADD COLUMN box_per_pallet INTEGER DEFAULT 0");
      console.log('✅ Added box_per_pallet column to parts table (SQLite)');
    }
  } catch (e) {
    // ignore if table doesn't exist yet
  }

  dbInstance = {
    isPostgres: false,
    sqliteDb,

    prepare(sql) {
      const stmt = sqliteDb.prepare(sql);
      return {
        async all(...args) {
          const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          return stmt.all(...flat);
        },
        async get(...args) {
          const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          return stmt.get(...flat);
        },
        async run(...args) {
          const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          return stmt.run(...flat);
        }
      };
    },

    async exec(sql) {
      return sqliteDb.exec(sql);
    }
  };

  console.log('📡 Database Connected: SQLite (data.sqlite)');
}

module.exports = dbInstance;
