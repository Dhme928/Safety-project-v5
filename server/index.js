// server/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { initDatabase, query } from './db.js';
import { uploadEvidence, listEvidence } from './upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Observations
app.post('/api/observations', async (req, res) => {
  try {
    const {
      reporterName,
      reporterId,
      area,
      riskLevel,
      directCause,
      description,
      correctiveAction
    } = req.body;

    if (!reporterName || !area || !riskLevel || !description) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await query(
      `INSERT INTO observations
       (reporter_name, reporter_id, area, risk_level, direct_cause, description, corrective_action)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [reporterName, reporterId || null, area, riskLevel, directCause || null, description, correctiveAction || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[api] create observation error', err);
    res.status(500).json({ error: 'Failed to create observation' });
  }
});

app.get('/api/observations/db', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM observations
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[api] list observations error', err);
    res.status(500).json({ error: 'Failed to load observations' });
  }
});

// Permits
app.post('/api/permits', async (req, res) => {
  try {
    const {
      permitType,
      area,
      receiverName,
      description
    } = req.body;

    if (!permitType || !area || !receiverName || !description) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await query(
      `INSERT INTO permits
       (permit_type, area, receiver_name, description)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [permitType, area, receiverName, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[api] create permit error', err);
    res.status(500).json({ error: 'Failed to create permit' });
  }
});

app.get('/api/permits/db', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM permits
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[api] list permits error', err);
    res.status(500).json({ error: 'Failed to load permits' });
  }
});

// Heavy equipment logs
app.post('/api/heavy', async (req, res) => {
  try {
    const {
      equipmentName,
      area,
      status,
      description
    } = req.body;

    if (!equipmentName || !area || !status) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const result = await query(
      `INSERT INTO heavy_equipment_logs
       (equipment_name, area, status, description)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [equipmentName, area, status, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[api] create heavy log error', err);
    res.status(500).json({ error: 'Failed to create heavy equipment log' });
  }
});

app.get('/api/heavy/db', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM heavy_equipment_logs
       ORDER BY created_at DESC
       LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[api] list heavy logs error', err);
    res.status(500).json({ error: 'Failed to load heavy equipment logs' });
  }
});

// Evidence routes
app.post('/api/evidence/upload', uploadEvidence);
app.get('/api/evidence', listEvidence);

// Fallback to index.html for SPA-like behaviour
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] Listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[server] Failed to init database', err);
    process.exit(1);
  });
