import pkg from 'pg';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database connections will fail until it is configured.');
}

const pool = new Pool({
  connectionString
});

export async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS evidence_files (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        ref_code TEXT NOT NULL,
        file_path TEXT NOT NULL,
        original_name TEXT,
        mime_type TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Database initialized (evidence_files table ready).');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

export function getDb() {
  return pool;
}
