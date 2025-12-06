// server/upload.js
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

export const uploadEvidence = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { category, refId } = req.body;
      if (!category || !refId || !req.file) {
        return res.status(400).json({ error: 'category, refId and file are required' });
      }

      const relPath = req.file.filename;

      const result = await query(
        `INSERT INTO evidence_files
         (category, ref_id, file_path, original_name, mime_type)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, file_path, original_name, mime_type, uploaded_at`,
        [category, Number(refId), relPath, req.file.originalname, req.file.mimetype]
      );

      const row = result.rows[0];
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.status(201).json({
        id: row.id,
        url: `${baseUrl}/uploads/${row.file_path}`,
        originalName: row.original_name,
        mimeType: row.mime_type,
        uploadedAt: row.uploaded_at
      });
    } catch (err) {
      console.error('[upload] Error handling upload', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
];

export async function listEvidence(req, res) {
  const { category, refId } = req.query;
  if (!category || !refId) {
    return res.status(400).json({ error: 'category and refId are required' });
  }

  try {
    const result = await query(
      `SELECT id, file_path, original_name, mime_type, uploaded_at
       FROM evidence_files
       WHERE category = $1 AND ref_id = $2
       ORDER BY uploaded_at DESC`,
      [category, Number(refId)]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const files = result.rows.map(row => ({
      id: row.id,
      url: `${baseUrl}/uploads/${row.file_path}`,
      originalName: row.original_name,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at
    }));

    res.json(files);
  } catch (err) {
    console.error('[upload] Error listing evidence', err);
    res.status(500).json({ error: 'Could not load evidence' });
  }
}
