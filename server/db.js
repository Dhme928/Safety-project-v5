// server/db.js
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set. Database operations will fail until it is configured.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initDatabase() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS observations (
      id SERIAL PRIMARY KEY,
      reporter_name TEXT,
      reporter_id TEXT,
      area TEXT,
      risk_level TEXT,
      direct_cause TEXT,
      description TEXT,
      corrective_action TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS permits (
      id SERIAL PRIMARY KEY,
      permit_type TEXT,
      area TEXT,
      receiver_name TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS heavy_equipment_logs (
      id SERIAL PRIMARY KEY,
      equipment_name TEXT,
      area TEXT,
      status TEXT,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS evidence_files (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await pool.query(ddl);
  console.log('[db] Database schema ensured');
}
