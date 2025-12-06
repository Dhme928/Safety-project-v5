const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, addPoints } = require('./database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter
});

router.post('/upload', authenticateToken, upload.array('photos', 5), (req, res) => {
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

router.get('/observations', authenticateToken, (req, res) => {
  try {
    const observations = db.prepare(`
      SELECT o.*, u.name as observer_name 
      FROM observations o 
      LEFT JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `).all();
    res.json(observations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/observations', authenticateToken, (req, res) => {
  try {
    const { area, description, risk_level, cause, corrective_action, evidence_urls } = req.body;
    const result = db.prepare(`
      INSERT INTO observations (user_id, area, description, risk_level, cause, corrective_action, evidence_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, area, description, risk_level || 'low', cause, corrective_action, JSON.stringify(evidence_urls || []));
    
    addPoints(req.user.id, 10, 'observation', 'Added new observation');
    
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(result.lastInsertRowid);
    res.json(observation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/observations/:id', authenticateToken, (req, res) => {
  try {
    const { area, description, risk_level, status, cause, corrective_action, evidence_urls } = req.body;
    const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id);
    
    if (!obs) return res.status(404).json({ error: 'Not found' });
    if (obs.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare(`
      UPDATE observations SET area=?, description=?, risk_level=?, status=?, cause=?, corrective_action=?, evidence_urls=?
      WHERE id=?
    `).run(area, description, risk_level, status, cause, corrective_action, JSON.stringify(evidence_urls || []), req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/observations/:id', authenticateToken, (req, res) => {
  try {
    const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id);
    if (!obs) return res.status(404).json({ error: 'Not found' });
    if (obs.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    db.prepare('DELETE FROM observations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits', authenticateToken, (req, res) => {
  try {
    const permits = db.prepare(`
      SELECT p.*, u.name as issuer_name 
      FROM permits p 
      LEFT JOIN users u ON p.user_id = u.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/permits', authenticateToken, (req, res) => {
  try {
    const { permit_type, area, description, valid_from, valid_to } = req.body;
    const result = db.prepare(`
      INSERT INTO permits (user_id, permit_type, area, description, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, permit_type, area, description, valid_from, valid_to);
    
    addPoints(req.user.id, 8, 'permit', 'Added new permit');
    
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(result.lastInsertRowid);
    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/permits/:id', authenticateToken, (req, res) => {
  try {
    const { permit_type, area, description, status, valid_from, valid_to } = req.body;
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(req.params.id);
    
    if (!permit) return res.status(404).json({ error: 'Not found' });
    if (permit.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare(`
      UPDATE permits SET permit_type=?, area=?, description=?, status=?, valid_from=?, valid_to=?
      WHERE id=?
    `).run(permit_type, area, description, status, valid_from, valid_to, req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/permits/:id', authenticateToken, (req, res) => {
  try {
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(req.params.id);
    if (!permit) return res.status(404).json({ error: 'Not found' });
    if (permit.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    db.prepare('DELETE FROM permits WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment', authenticateToken, (req, res) => {
  try {
    const equipment = db.prepare(`
      SELECT e.*, u.name as added_by 
      FROM equipment e 
      LEFT JOIN users u ON e.user_id = u.id 
      ORDER BY e.created_at DESC
    `).all();
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/equipment', authenticateToken, (req, res) => {
  try {
    const { equipment_type, equipment_id, location, status, last_inspection, next_inspection, notes, pwas_required } = req.body;
    const result = db.prepare(`
      INSERT INTO equipment (user_id, equipment_type, equipment_id, location, status, last_inspection, next_inspection, notes, pwas_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, equipment_type, equipment_id, location, status || 'operational', last_inspection, next_inspection, notes, pwas_required || 'no');
    
    addPoints(req.user.id, 5, 'equipment', 'Added equipment');
    
    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(result.lastInsertRowid);
    res.json(eq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/equipment/:id', authenticateToken, (req, res) => {
  try {
    const { equipment_type, equipment_id, location, status, last_inspection, next_inspection, notes, pwas_required } = req.body;
    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    
    if (!eq) return res.status(404).json({ error: 'Not found' });
    if (eq.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare(`
      UPDATE equipment SET equipment_type=?, equipment_id=?, location=?, status=?, last_inspection=?, next_inspection=?, notes=?, pwas_required=?
      WHERE id=?
    `).run(equipment_type, equipment_id, location, status, last_inspection, next_inspection, notes, pwas_required, req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/equipment/:id', authenticateToken, (req, res) => {
  try {
    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    if (!eq) return res.status(404).json({ error: 'Not found' });
    if (eq.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authenticateToken, (req, res) => {
  try {
    const observations = db.prepare('SELECT COUNT(*) as count FROM observations').get().count;
    const permits = db.prepare('SELECT COUNT(*) as count FROM permits').get().count;
    const equipment = db.prepare('SELECT COUNT(*) as count FROM equipment').get().count;
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    res.json({ observations, permits, equipment, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, employee_id, points, level, streak 
      FROM users 
      ORDER BY points DESC 
      LIMIT 10
    `).all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, role, points, level, streak, created_at FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id/points', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { points, action } = req.body;
    const result = addPoints(parseInt(req.params.id), points, action || 'admin_adjustment', 'Admin points adjustment');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
