import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb } from './db.js';
import { upload } from './upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Static files
const publicDir = path.join(__dirname, '../public');
const uploadsDir = path.join(__dirname, '../uploads');

app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadsDir));

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Upload evidence file for a given record (observation, permit, etc.)
app.post('/api/evidence/upload', upload.single('file'), async (req, res) => {
  try {
    const { category, refCode } = req.body;

    if (!category || !refCode) {
      return res.status(400).json({ error: 'category and refCode are required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const pool = getDb();
    const filePath = `/uploads/${req.file.filename}`;

    const { rows } = await pool.query(
      `INSERT INTO evidence_files (category, ref_code, file_path, original_name, mime_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category, ref_code, file_path, original_name, mime_type, uploaded_at`,
      [category, refCode, filePath, req.file.originalname, req.file.mimetype]
    );

    res.json({ file: rows[0] });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence.' });
  }
});

// Get list of evidence for a given record
app.get('/api/evidence', async (req, res) => {
  try {
    const { category, refCode } = req.query;

    if (!category || !refCode) {
      return res.status(400).json({ error: 'category and refCode query params are required.' });
    }

    const pool = getDb();
    const { rows } = await pool.query(
      `SELECT id, category, ref_code, file_path, original_name, mime_type, uploaded_at
       FROM evidence_files
       WHERE category = $1 AND ref_code = $2
       ORDER BY uploaded_at DESC`,
      [category, refCode]
    );

    res.json({ files: rows });
  } catch (error) {
    console.error('Error fetching evidence list:', error);
    res.status(500).json({ error: 'Failed to fetch evidence list.' });
  }
});

// Fallback: serve index.html for all other routes (single-page-app style)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start the server after initializing the database
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
