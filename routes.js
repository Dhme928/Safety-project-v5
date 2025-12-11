const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, awardPoints } = require('./database');
const { authenticateToken, optionalAuth, requireAdmin } = require('./auth');

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
    cb(new Error('Only image files allowed'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter });

const CALENDAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const CALENDAR_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];

const calendarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/calendar')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const calendarFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (CALENDAR_ALLOWED_TYPES.includes(file.mimetype) && CALENDAR_ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and documents (PDF, DOC, DOCX) allowed'), false);
  }
};

const calendarUpload = multer({ storage: calendarStorage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: calendarFileFilter });

router.post('/upload', authenticateToken, upload.array('photos', 5), (req, res) => {
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

router.get('/stats', optionalAuth, (req, res) => {
  try {
    const period = req.query.period || 'today';
    const now = new Date();
    
    let startDate, endDate;
    const todayISO = now.toISOString().split('T')[0];
    
    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayISO;
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = todayISO;
    } else {
      startDate = todayISO;
      endDate = todayISO;
    }
    
    const formatMMDDYYYY = (isoDate) => {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    };
    const startMMDDYYYY = formatMMDDYYYY(startDate);
    const endMMDDYYYY = formatMMDDYYYY(endDate);
    
    const obsPeriod = db.prepare(`
      SELECT COUNT(*) as count FROM observations 
      WHERE (date >= ? AND date <= ?) OR (date >= ? AND date <= ?)
    `).get(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    const obsOpen = db.prepare("SELECT COUNT(*) as count FROM observations WHERE status = 'Open'").get();
    const obsClosed = db.prepare("SELECT COUNT(*) as count FROM observations WHERE status = 'Closed'").get();
    const obsTotal = db.prepare("SELECT COUNT(*) as count FROM observations").get();
    
    const permitsPeriod = db.prepare(`
      SELECT COUNT(*) as count FROM permits 
      WHERE (date >= ? AND date <= ?) OR (date >= ? AND date <= ?)
    `).get(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    const permitsTotal = db.prepare("SELECT COUNT(*) as count FROM permits").get();
    const uniqueAreas = db.prepare("SELECT COUNT(DISTINCT area) as count FROM permits").get();
    
    const tbtPeriod = db.prepare(`
      SELECT COUNT(*) as count FROM toolbox_talks 
      WHERE (date >= ? AND date <= ?) OR (date >= ? AND date <= ?)
    `).get(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    const tbtTotal = db.prepare("SELECT COUNT(*) as count FROM toolbox_talks").get();
    
    const eqTotal = db.prepare("SELECT COUNT(*) as count FROM equipment").get();
    const tpsExpiring = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE tps_expiry <= date('now', '+30 days')").get();
    const insExpiring = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE ins_expiry <= date('now', '+30 days')").get();
    
    res.json({
      period,
      observations: { period: obsPeriod.count, open: obsOpen.count, closed: obsClosed.count, total: obsTotal.count },
      permits: { period: permitsPeriod.count, total: permitsTotal.count, areas: uniqueAreas.count },
      toolboxTalks: { period: tbtPeriod.count, total: tbtTotal.count },
      equipment: { total: eqTotal.count, tpsExpiring: tpsExpiring.count, insExpiring: insExpiring.count }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT DISTINCT area FROM observations WHERE area IS NOT NULL AND area <> ''").all();
    res.json(areas.map(a => a.area));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations/stats', (req, res) => {
  try {
    const { range, area } = req.query;
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    let startDate, endDate;
    let rangeLabel = 'All Time';
    
    if (range === 'today') {
      startDate = todayISO;
      endDate = todayISO;
      rangeLabel = 'Today';
    } else if (range === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Week';
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Month';
    }
    
    const formatMMDDYYYY = (isoDate) => {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    };
    
    let whereClause = '1=1';
    const params = [];
    
    if (startDate && endDate) {
      const startMMDDYYYY = formatMMDDYYYY(startDate);
      const endMMDDYYYY = formatMMDDYYYY(endDate);
      whereClause += ` AND ((date >= ? AND date <= ?) OR (date >= ? AND date <= ?))`;
      params.push(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    }
    
    if (area) {
      whereClause += ` AND area = ?`;
      params.push(area);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM observations WHERE ${whereClause}`).get(...params);
    const open = db.prepare(`SELECT COUNT(*) as count FROM observations WHERE ${whereClause} AND status = 'Open'`).get(...params);
    const closed = db.prepare(`SELECT COUNT(*) as count FROM observations WHERE ${whereClause} AND status = 'Closed'`).get(...params);
    
    res.json({
      rangeLabel,
      total: total.count,
      open: open.count,
      closed: closed.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations/by-area', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT area, COUNT(*) as count 
      FROM observations 
      WHERE area IS NOT NULL AND area <> '' 
      GROUP BY area 
      ORDER BY count DESC 
      LIMIT 5
    `).all();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits/stats', (req, res) => {
  try {
    const { range, area, type } = req.query;
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    let startDate, endDate;
    let rangeLabel = 'All Time';
    
    if (range === 'today') {
      startDate = todayISO;
      endDate = todayISO;
      rangeLabel = 'Today';
    } else if (range === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Week';
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Month';
    }
    
    const formatMMDDYYYY = (isoDate) => {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    };
    
    let whereClause = '1=1';
    const params = [];
    
    if (startDate && endDate) {
      const startMMDDYYYY = formatMMDDYYYY(startDate);
      const endMMDDYYYY = formatMMDDYYYY(endDate);
      whereClause += ` AND ((date >= ? AND date <= ?) OR (date >= ? AND date <= ?))`;
      params.push(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    }
    
    if (area) {
      whereClause += ` AND area = ?`;
      params.push(area);
    }
    
    if (type) {
      whereClause += ` AND permit_type = ?`;
      params.push(type);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM permits WHERE ${whereClause}`).get(...params);
    const areas = db.prepare(`SELECT COUNT(DISTINCT area) as count FROM permits WHERE ${whereClause}`).get(...params);
    
    res.json({
      rangeLabel,
      total: total.count,
      areas: areas.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/toolbox-talks/stats', (req, res) => {
  try {
    const { range } = req.query;
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    let startDate, endDate;
    let rangeLabel = 'All Time';
    
    if (range === 'today') {
      startDate = todayISO;
      endDate = todayISO;
      rangeLabel = 'Today';
    } else if (range === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Week';
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = todayISO;
      rangeLabel = 'This Month';
    }
    
    const formatMMDDYYYY = (isoDate) => {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    };
    
    let whereClause = '1=1';
    const params = [];
    
    if (startDate && endDate) {
      const startMMDDYYYY = formatMMDDYYYY(startDate);
      const endMMDDYYYY = formatMMDDYYYY(endDate);
      whereClause += ` AND ((date >= ? AND date <= ?) OR (date >= ? AND date <= ?))`;
      params.push(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM toolbox_talks WHERE ${whereClause}`).get(...params);
    const avgAttendance = db.prepare(`SELECT ROUND(AVG(attendance), 0) as avg FROM toolbox_talks WHERE ${whereClause} AND attendance > 0`).get(...params);
    
    res.json({
      rangeLabel,
      total: total.count,
      avgAttendance: avgAttendance.avg || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT name FROM areas ORDER BY name").all();
    res.json(areas.map(a => a.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/areas', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Area name is required' });
    }
    const result = db.prepare('INSERT OR IGNORE INTO areas (name) VALUES (?)').run(name.trim());
    if (result.changes === 0) {
      return res.status(400).json({ error: 'Area already exists' });
    }
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/areas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM areas WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Area not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/areas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = db.prepare('UPDATE areas SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Area not found' });
    }
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/areas/all', (req, res) => {
  try {
    const areas = db.prepare("SELECT id, name FROM areas ORDER BY name").all();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations/area-counts', (req, res) => {
  try {
    const { range } = req.query;
    let dateFilter = '';
    
    if (range === 'today') {
      dateFilter = " AND date = date('now')";
    } else if (range === 'week') {
      dateFilter = " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      dateFilter = " AND date >= date('now', '-30 days')";
    }
    
    const allAreas = db.prepare("SELECT name FROM areas ORDER BY name").all();
    
    const areaCounts = allAreas.map(a => {
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM observations 
        WHERE area = ? ${dateFilter}
      `).get(a.name);
      
      return {
        area: a.name,
        count: countResult.count
      };
    });
    
    res.json(areaCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment/area-counts', (req, res) => {
  try {
    const allAreas = db.prepare("SELECT name FROM yard_areas ORDER BY name").all();
    
    const areaCounts = allAreas.map(a => {
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM equipment 
        WHERE yard_area = ?
      `).get(a.name);
      
      return {
        area: a.name,
        count: countResult.count
      };
    });
    
    res.json(areaCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/toolbox-talks/area-counts', (req, res) => {
  try {
    const { range } = req.query;
    let dateFilter = '';
    
    if (range === 'today') {
      dateFilter = " AND date = date('now')";
    } else if (range === 'week') {
      dateFilter = " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      dateFilter = " AND date >= date('now', '-30 days')";
    }
    
    const allAreas = db.prepare("SELECT name FROM tbt_areas ORDER BY name").all();
    
    const areaCounts = allAreas.map(a => {
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM toolbox_talks 
        WHERE area = ? ${dateFilter}
      `).get(a.name);
      
      return {
        area: a.name,
        count: countResult.count
      };
    });
    
    res.json(areaCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const settingsTables = {
  'activity_types': 'activity_types',
  'observation_types': 'observation_types',
  'direct_causes': 'direct_causes',
  'root_causes': 'root_causes',
  'permit_types': 'permit_types',
  'permit_areas': 'permit_areas',
  'equipment_types': 'equipment_types',
  'yard_areas': 'yard_areas',
  'tbt_topics': 'tbt_topics',
  'tbt_areas': 'tbt_areas'
};

router.get('/settings/:type', (req, res) => {
  try {
    const table = settingsTables[req.params.type];
    if (!table) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    const items = db.prepare(`SELECT id, name FROM ${table} ORDER BY name`).all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/:type', authenticateToken, requireAdmin, (req, res) => {
  try {
    const table = settingsTables[req.params.type];
    if (!table) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = db.prepare(`INSERT OR IGNORE INTO ${table} (name) VALUES (?)`).run(name.trim());
    if (result.changes === 0) {
      return res.status(400).json({ error: 'Item already exists' });
    }
    const item = db.prepare(`SELECT id, name FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/settings/:type/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const table = settingsTables[req.params.type];
    if (!table) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/:type/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const table = settingsTables[req.params.type];
    if (!table) {
      return res.status(400).json({ error: 'Invalid settings type' });
    }
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const result = db.prepare(`UPDATE ${table} SET name = ? WHERE id = ?`).run(name.trim(), req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations', optionalAuth, (req, res) => {
  try {
    const { range, area, status, search } = req.query;
    let sql = 'SELECT * FROM observations WHERE 1=1';
    const params = [];
    
    if (range === 'today') {
      sql += " AND date = date('now')";
    } else if (range === 'week') {
      sql += " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      sql += " AND date >= date('now', '-30 days')";
    }
    
    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (location LIKE ? OR description LIKE ? OR reported_by LIKE ? OR area LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY date DESC, time DESC';
    const observations = db.prepare(sql).all(...params);
    res.json(observations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/observations', authenticateToken, (req, res) => {
  try {
    const { date, time, area, location, observation_type, description, direct_cause, root_cause, immediate_action, corrective_action, risk_level, evidence_urls, activity_type, observation_class, injury_type, injury_body_part } = req.body;
    
    const user = db.prepare('SELECT name, employee_id FROM users WHERE id = ?').get(req.user.id);
    
    const result = db.prepare(`
      INSERT INTO observations (date, time, area, location, observation_type, description, direct_cause, root_cause, immediate_action, corrective_action, risk_level, status, reported_by, reported_by_id, evidence_urls, activity_type, observation_class, injury_type, injury_body_part)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?, ?, ?, ?)
    `).run(date || new Date().toISOString().split('T')[0], time || new Date().toTimeString().split(' ')[0], area, location, observation_type, description, direct_cause, root_cause, immediate_action, corrective_action, risk_level || 'Medium', user.name, user.employee_id, JSON.stringify(evidence_urls || []), activity_type, observation_class || 'Negative', injury_type, injury_body_part);
    
    awardPoints(req.user.id, 10, 'Added observation');
    
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(result.lastInsertRowid);
    res.json(observation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/observations/:id/close', authenticateToken, (req, res) => {
  try {
    const { closed_notes, close_evidence_urls } = req.body;
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    db.prepare(`
      UPDATE observations SET status = 'Closed', closed_by = ?, closed_date = date('now'), closed_notes = ?, close_evidence_urls = ?, corrective_action_status = 'Completed'
      WHERE id = ?
    `).run(user.name, closed_notes, JSON.stringify(close_evidence_urls || []), req.params.id);
    
    awardPoints(req.user.id, 5, 'Closed observation');
    
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id);
    res.json(observation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/observations/:id/corrective-action', authenticateToken, (req, res) => {
  try {
    const { corrective_action_status, corrective_action_due_date, corrective_action_assigned_to } = req.body;
    
    db.prepare(`
      UPDATE observations SET corrective_action_status = ?, corrective_action_due_date = ?, corrective_action_assigned_to = ?
      WHERE id = ?
    `).run(corrective_action_status || 'Not Started', corrective_action_due_date, corrective_action_assigned_to, req.params.id);
    
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id);
    res.json(observation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/observations/:id', optionalAuth, (req, res) => {
  try {
    const observation = db.prepare('SELECT * FROM observations WHERE id = ?').get(req.params.id);
    if (!observation) {
      return res.status(404).json({ error: 'Observation not found' });
    }
    res.json(observation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/observations/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM observations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT DISTINCT area FROM permits WHERE area IS NOT NULL AND area <> ''").all();
    res.json(areas.map(a => a.area));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits/area-counts', (req, res) => {
  try {
    const { range } = req.query;
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    
    let startDate, endDate;
    
    if (range === 'today') {
      startDate = todayISO;
      endDate = todayISO;
    } else if (range === 'week') {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = todayISO;
    } else if (range === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = todayISO;
    }
    
    const formatMMDDYYYY = (isoDate) => {
      const [y, m, d] = isoDate.split('-');
      return `${m}/${d}/${y}`;
    };
    
    const allAreas = db.prepare("SELECT name FROM permit_areas ORDER BY name").all();
    
    const areaCounts = allAreas.map(a => {
      let whereClause = 'area = ?';
      const params = [a.name];
      
      if (startDate && endDate) {
        const startMMDDYYYY = formatMMDDYYYY(startDate);
        const endMMDDYYYY = formatMMDDYYYY(endDate);
        whereClause += ` AND ((date >= ? AND date <= ?) OR (date >= ? AND date <= ?))`;
        params.push(startDate, endDate, startMMDDYYYY, endMMDDYYYY);
      }
      
      const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM permits 
        WHERE ${whereClause}
      `).get(...params);
      
      return {
        area: a.name,
        count: countResult.count
      };
    });
    
    res.json(areaCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits/types', (req, res) => {
  try {
    const types = db.prepare("SELECT DISTINCT permit_type FROM permits WHERE permit_type IS NOT NULL AND permit_type <> ''").all();
    res.json(types.map(t => t.permit_type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits', optionalAuth, (req, res) => {
  try {
    const { range, area, type, search } = req.query;
    let sql = 'SELECT * FROM permits WHERE 1=1';
    const params = [];
    
    if (range === 'today') {
      sql += " AND date = date('now')";
    } else if (range === 'week') {
      sql += " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      sql += " AND date >= date('now', '-30 days')";
    }
    
    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (type) {
      sql += ' AND permit_type = ?';
      params.push(type);
    }
    if (search) {
      sql += ' AND (area LIKE ? OR permit_type LIKE ? OR receiver LIKE ? OR project LIKE ? OR permit_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY date DESC';
    const permits = db.prepare(sql).all(...params);
    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/permits', authenticateToken, (req, res) => {
  try {
    const { date, area, permit_type, permit_number, project, receiver, issuer, description, evidence_urls } = req.body;
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    const result = db.prepare(`
      INSERT INTO permits (date, area, permit_type, permit_number, project, receiver, issuer, description, status, created_by, evidence_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
    `).run(date || new Date().toISOString().split('T')[0], area, permit_type, permit_number, project, receiver, issuer, description, user.name, JSON.stringify(evidence_urls || []));
    
    awardPoints(req.user.id, 8, 'Added permit');
    
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(result.lastInsertRowid);
    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/permits/:id/close', authenticateToken, (req, res) => {
  try {
    const { closed_notes, close_evidence_urls } = req.body;
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    db.prepare(`
      UPDATE permits SET status = 'Closed', closed_by = ?, closed_date = date('now'), closed_notes = ?
      WHERE id = ?
    `).run(user.name, closed_notes, req.params.id);
    
    awardPoints(req.user.id, 4, 'Closed permit');
    
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(req.params.id);
    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permits/:id', optionalAuth, (req, res) => {
  try {
    const permit = db.prepare('SELECT * FROM permits WHERE id = ?').get(req.params.id);
    if (!permit) {
      return res.status(404).json({ error: 'Permit not found' });
    }
    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/permits/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM permits WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT DISTINCT yard_area FROM equipment WHERE yard_area IS NOT NULL AND yard_area <> ''").all();
    res.json(areas.map(a => a.yard_area));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment', optionalAuth, (req, res) => {
  try {
    const { area, status, search } = req.query;
    let sql = 'SELECT * FROM equipment WHERE 1=1';
    const params = [];
    
    if (area) {
      sql += ' AND yard_area = ?';
      params.push(area);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (asset_number LIKE ? OR equipment_type LIKE ? OR owner LIKE ? OR yard_area LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY created_at DESC';
    const equipment = db.prepare(sql).all(...params);
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/equipment', authenticateToken, (req, res) => {
  try {
    const { asset_number, equipment_type, owner, yard_area, status, pwas_required, tps_date, tps_expiry, ins_date, ins_expiry, operator_name, operator_license, notes } = req.body;
    
    const result = db.prepare(`
      INSERT INTO equipment (asset_number, equipment_type, owner, yard_area, status, pwas_required, tps_date, tps_expiry, ins_date, ins_expiry, operator_name, operator_license, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(asset_number, equipment_type, owner, yard_area, status || 'In Service', pwas_required, tps_date, tps_expiry, ins_date, ins_expiry, operator_name, operator_license, notes);
    
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(result.lastInsertRowid);
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/equipment/:id', optionalAuth, (req, res) => {
  try {
    const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/equipment/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/toolbox-talks', optionalAuth, (req, res) => {
  try {
    const { range, area, search } = req.query;
    let sql = 'SELECT * FROM toolbox_talks WHERE 1=1';
    const params = [];
    
    if (range === 'today') {
      sql += " AND date = date('now')";
    } else if (range === 'week') {
      sql += " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      sql += " AND date >= date('now', '-30 days')";
    }
    
    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (search) {
      sql += ' AND (topic LIKE ? OR presenter LIKE ? OR area LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY date DESC';
    const talks = db.prepare(sql).all(...params);
    res.json(talks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/toolbox-talks', authenticateToken, (req, res) => {
  try {
    const { date, topic, presenter, area, attendance, description, evidence_urls } = req.body;
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    const result = db.prepare(`
      INSERT INTO toolbox_talks (date, topic, presenter, area, attendance, description, status, created_by, evidence_urls)
      VALUES (?, ?, ?, ?, ?, ?, 'Completed', ?, ?)
    `).run(date || new Date().toISOString().split('T')[0], topic, presenter, area, attendance || 0, description, user.name, JSON.stringify(evidence_urls || []));
    
    awardPoints(req.user.id, 12, 'Added toolbox talk');
    
    const talk = db.prepare('SELECT * FROM toolbox_talks WHERE id = ?').get(result.lastInsertRowid);
    res.json(talk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/toolbox-talks/of-the-day', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let tbt = db.prepare("SELECT * FROM toolbox_talks WHERE is_tbt_of_day = 1 AND date = ?").get(today);
    if (!tbt) {
      tbt = db.prepare("SELECT * FROM toolbox_talks ORDER BY date DESC LIMIT 1").get();
    }
    res.json(tbt || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/toolbox-talks/:id/set-tbt-of-day', authenticateToken, requireAdmin, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepare("UPDATE toolbox_talks SET is_tbt_of_day = 0 WHERE date = ?").run(today);
    db.prepare("UPDATE toolbox_talks SET is_tbt_of_day = 1, date = ? WHERE id = ?").run(today, req.params.id);
    const tbt = db.prepare('SELECT * FROM toolbox_talks WHERE id = ?').get(req.params.id);
    res.json(tbt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/toolbox-talks/:id', optionalAuth, (req, res) => {
  try {
    const talk = db.prepare('SELECT * FROM toolbox_talks WHERE id = ?').get(req.params.id);
    if (!talk) {
      return res.status(404).json({ error: 'Toolbox talk not found' });
    }
    res.json(talk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/toolbox-talks/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM toolbox_talks WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Toolbox talk not found' });
    }
    res.json({ message: 'Toolbox talk deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/news', (req, res) => {
  try {
    const news = db.prepare("SELECT * FROM news WHERE expires_at IS NULL OR expires_at > datetime('now') ORDER BY created_at DESC").all();
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/news', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, content, priority, expires_at } = req.body;
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    const result = db.prepare(`
      INSERT INTO news (title, content, priority, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(title, content, priority || 'normal', user.name, expires_at);
    
    const newsItem = db.prepare('SELECT * FROM news WHERE id = ?').get(result.lastInsertRowid);
    res.json(newsItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/news/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getChallengePeriod(challengeType) {
  const now = new Date();
  let periodStart, periodEnd;
  
  if (challengeType === 'daily') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (challengeType === 'weekly') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 7);
  } else if (challengeType === 'monthly') {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  return {
    start: periodStart.toISOString().split('T')[0],
    end: periodEnd.toISOString().split('T')[0]
  };
}

router.get('/challenges', (req, res) => {
  try {
    const { type } = req.query;
    const today = new Date().toISOString().split('T')[0];
    let sql = "SELECT * FROM challenges WHERE is_active = 1";
    const params = [];
    
    if (type) {
      sql += " AND challenge_type = ?";
      params.push(type);
    }
    
    sql += " ORDER BY created_at DESC";
    const challenges = db.prepare(sql).all(...params);
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/challenges/my-completions', authenticateToken, (req, res) => {
  try {
    const challenges = db.prepare('SELECT * FROM challenges WHERE is_active = 1').all();
    const completionStatus = {};
    
    for (const challenge of challenges) {
      const period = getChallengePeriod(challenge.challenge_type);
      const existing = db.prepare(`
        SELECT * FROM challenge_completions 
        WHERE user_id = ? AND challenge_id = ? AND period_start = ?
      `).get(req.user.id, challenge.id, period.start);
      
      completionStatus[challenge.id] = {
        challenge_id: challenge.id,
        completed: !!existing,
        period_start: period.start,
        period_end: period.end,
        challenge_type: challenge.challenge_type,
        submitted_at: existing ? existing.completed_at : null
      };
    }
    
    res.json(completionStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, points, badge_reward, challenge_date, challenge_type } = req.body;
    
    const result = db.prepare(`
      INSERT INTO challenges (title, description, points, badge_reward, challenge_date, challenge_type, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(title, description, points || 10, badge_reward || null, challenge_date, challenge_type || 'daily');
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/challenges/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, points, badge_reward, challenge_date, challenge_type, is_active } = req.body;
    
    db.prepare(`
      UPDATE challenges SET title = ?, description = ?, points = ?, badge_reward = ?, challenge_date = ?, challenge_type = ?, is_active = ?
      WHERE id = ?
    `).run(title, description, points || 10, badge_reward || null, challenge_date, challenge_type || 'daily', is_active !== undefined ? is_active : 1, req.params.id);
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/challenges/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM challenges WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/challenges/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM challenges';
    const params = [];
    if (type) {
      query += ' WHERE challenge_type = ?';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC';
    const challenges = db.prepare(query).all(...params);
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges/:id/submit', authenticateToken, (req, res) => {
  try {
    const { evidence_urls, comments } = req.body;
    const challengeId = req.params.id;
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    const period = getChallengePeriod(challenge.challenge_type);
    
    const existing = db.prepare(`
      SELECT * FROM challenge_completions 
      WHERE user_id = ? AND challenge_id = ? AND period_start = ?
    `).get(req.user.id, challengeId, period.start);
    
    if (existing) {
      const periodName = challenge.challenge_type === 'daily' ? 'today' : 
                         challenge.challenge_type === 'weekly' ? 'this week' : 'this month';
      return res.status(400).json({ error: `You have already submitted this challenge ${periodName}` });
    }
    
    if (challenge.photo_required && (!evidence_urls || evidence_urls.length === 0)) {
      return res.status(400).json({ error: 'Photo evidence is required for this challenge' });
    }
    
    db.prepare(`
      INSERT INTO challenge_completions (user_id, challenge_id, evidence_urls, comments, period_start, period_end, status, awarded_points) 
      VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(req.user.id, challengeId, JSON.stringify(evidence_urls || []), comments || null, period.start, period.end, challenge.points);
    
    awardPoints(req.user.id, challenge.points, `Completed challenge: ${challenge.title}`);
    
    let badge_earned = null;
    if (challenge.badge_reward) {
      const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(req.user.id);
      let badges = [];
      try { badges = JSON.parse(user.badges || '[]'); } catch (e) { badges = []; }
      
      if (!badges.includes(challenge.badge_reward)) {
        badges.push(challenge.badge_reward);
        db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(badges), req.user.id);
        badge_earned = challenge.badge_reward;
      }
    }
    
    res.json({ success: true, points_earned: challenge.points, badge_earned, period });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges/:id/complete', authenticateToken, (req, res) => {
  try {
    const { evidence_url, comments } = req.body;
    const challengeId = req.params.id;
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    const period = getChallengePeriod(challenge.challenge_type);
    
    const existing = db.prepare(`
      SELECT * FROM challenge_completions 
      WHERE user_id = ? AND challenge_id = ? AND period_start = ?
    `).get(req.user.id, challengeId, period.start);
    
    if (existing) {
      const periodName = challenge.challenge_type === 'daily' ? 'today' : 
                         challenge.challenge_type === 'weekly' ? 'this week' : 'this month';
      return res.status(400).json({ error: `You have already completed this challenge ${periodName}` });
    }
    
    if (!evidence_url) {
      return res.status(400).json({ error: 'Evidence photo is required' });
    }
    
    db.prepare(`
      INSERT INTO challenge_completions (user_id, challenge_id, evidence_url, evidence_urls, comments, period_start, period_end, status, awarded_points) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `).run(req.user.id, challengeId, evidence_url, JSON.stringify([evidence_url]), comments || null, period.start, period.end, challenge.points);
    
    awardPoints(req.user.id, challenge.points, `Completed challenge: ${challenge.title}`);
    
    let badge_earned = null;
    if (challenge.badge_reward) {
      const user = db.prepare('SELECT badges FROM users WHERE id = ?').get(req.user.id);
      let badges = [];
      try { badges = JSON.parse(user.badges || '[]'); } catch (e) { badges = []; }
      
      if (!badges.includes(challenge.badge_reward)) {
        badges.push(challenge.badge_reward);
        db.prepare('UPDATE users SET badges = ? WHERE id = ?').run(JSON.stringify(badges), req.user.id);
        badge_earned = challenge.badge_reward;
      }
    }
    
    res.json({ success: true, points_earned: challenge.points, badge_earned, period });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quiz/questions', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingResult = db.prepare('SELECT * FROM quiz_results WHERE user_id = ? AND quiz_date = ?').get(req.user.id, today);
    if (existingResult) {
      return res.json({ already_completed: true, result: existingResult });
    }
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const questions = db.prepare('SELECT id, question, option_a, option_b, option_c, option_d, category FROM quiz_questions WHERE is_active = 1').all();
    if (questions.length === 0) {
      return res.json({ questions: [], message: 'No quiz questions available' });
    }
    const shuffled = questions.sort((a, b) => {
      const hashA = (a.id * dayOfYear) % 1000;
      const hashB = (b.id * dayOfYear) % 1000;
      return hashA - hashB;
    });
    const dailyQuestions = shuffled.slice(0, 10);
    res.json({ questions: dailyQuestions, already_completed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quiz/submit', authenticateToken, (req, res) => {
  try {
    const { answers } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    const existingResult = db.prepare('SELECT * FROM quiz_results WHERE user_id = ? AND quiz_date = ?').get(req.user.id, today);
    if (existingResult) {
      return res.status(400).json({ error: 'Quiz already completed today' });
    }
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers are required' });
    }
    
    let score = 0;
    const results = [];
    
    for (const ans of answers) {
      const question = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(ans.question_id);
      if (question) {
        const isCorrect = question.correct_answer === ans.answer;
        if (isCorrect) score++;
        results.push({
          question_id: ans.question_id,
          user_answer: ans.answer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
          explanation: question.explanation
        });
      }
    }
    
    db.prepare('INSERT INTO quiz_results (user_id, quiz_date, score, total_questions, answers) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, today, score, answers.length, JSON.stringify(results)
    );
    
    if (score > 0) {
      awardPoints(req.user.id, score, `Quiz: ${score}/${answers.length} correct answers`);
    }
    
    res.json({ success: true, score, total: answers.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quiz/history', authenticateToken, (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM quiz_results WHERE user_id = ? ORDER BY quiz_date DESC LIMIT 30').all(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/quiz/questions/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const questions = db.prepare('SELECT * FROM quiz_questions ORDER BY created_at DESC').all();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quiz/questions', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_answer, category, explanation } = req.body;
    
    if (!question || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return res.status(400).json({ error: 'All question fields are required' });
    }
    
    const result = db.prepare(`
      INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, correct_answer, category, explanation, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(question, option_a, option_b, option_c, option_d, correct_answer, category || 'General', explanation);
    
    const newQuestion = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(result.lastInsertRowid);
    res.json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/quiz/questions/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { question, option_a, option_b, option_c, option_d, correct_answer, category, explanation, is_active } = req.body;
    
    db.prepare(`
      UPDATE quiz_questions SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, category = ?, explanation = ?, is_active = ?
      WHERE id = ?
    `).run(question, option_a, option_b, option_c, option_d, correct_answer, category, explanation, is_active !== undefined ? is_active : 1, req.params.id);
    
    const updatedQuestion = db.prepare('SELECT * FROM quiz_questions WHERE id = ?').get(req.params.id);
    res.json(updatedQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/quiz/questions/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM quiz_questions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quiz/questions/drill', authenticateToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json([]);
    }
    const placeholders = ids.map(() => '?').join(',');
    const questions = db.prepare(`SELECT id, question, option_a, option_b, option_c, option_d, correct_answer, category FROM quiz_questions WHERE id IN (${placeholders})`).all(...ids);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', (req, res) => {
  try {
    const { period } = req.query;
    let users;
    
    if (period === 'month') {
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
      
      users = db.prepare(`
        SELECT u.id, u.employee_id, u.name, u.points, u.level, u.profile_pic, COALESCE(SUM(ph.points), 0) as monthly_points
        FROM users u
        LEFT JOIN points_history ph ON u.id = ph.user_id AND ph.created_at >= ?
        WHERE u.approved = 1
        GROUP BY u.id
        ORDER BY monthly_points DESC, u.points DESC
        LIMIT 50
      `).all(startOfMonth);
    } else {
      users = db.prepare('SELECT id, employee_id, name, points, level, profile_pic FROM users WHERE approved = 1 ORDER BY points DESC LIMIT 50').all();
    }
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/employee-of-month', (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    
    const topUser = db.prepare(`
      SELECT u.id, u.employee_id, u.name, u.points, u.level, COALESCE(SUM(ph.points), 0) as monthly_points
      FROM users u
      LEFT JOIN points_history ph ON u.id = ph.user_id AND ph.created_at >= ?
      WHERE u.approved = 1
      GROUP BY u.id
      ORDER BY monthly_points DESC, u.points DESC
      LIMIT 1
    `).get(startOfMonth);
    
    res.json(topUser || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Registry Routes - for viewing all records
router.get('/admin/registry/observations', authenticateToken, requireAdmin, (req, res) => {
  try {
    const observations = db.prepare('SELECT * FROM observations ORDER BY created_at DESC').all();
    res.json(observations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/registry/permits', authenticateToken, requireAdmin, (req, res) => {
  try {
    const permits = db.prepare('SELECT * FROM permits ORDER BY created_at DESC').all();
    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/registry/equipment', authenticateToken, requireAdmin, (req, res) => {
  try {
    const equipment = db.prepare('SELECT * FROM equipment ORDER BY created_at DESC').all();
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/registry/toolbox-talks', authenticateToken, requireAdmin, (req, res) => {
  try {
    const talks = db.prepare('SELECT * FROM toolbox_talks ORDER BY created_at DESC').all();
    res.json(talks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, role, position, points, level, approved, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users/pending', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, role, points, level, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT id, employee_id, name, role, points, level, approved FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ? AND approved = 0').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    if (userId == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ success: true, message: `User ${user.name} has been deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/points', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { points, reason } = req.body;
    awardPoints(req.params.id, points, reason || 'Admin adjustment');
    const user = db.prepare('SELECT id, employee_id, name, points, level FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    const user = db.prepare('SELECT id, employee_id, name, role, points, level FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/position', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { position } = req.body;
    const validPositions = ['Safety Officer', 'Work Permit Receiver', 'Work Permit Issuer', 'Safety Supervisor', 'Safety Coordinator', 'Safety Manager'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({ error: 'Invalid position' });
    }
    db.prepare('UPDATE users SET position = ? WHERE id = ?').run(position, req.params.id);
    const user = db.prepare('SELECT id, employee_id, name, role, position, points, level FROM users WHERE id = ?').get(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/profile-picture', authenticateToken, (req, res) => {
  try {
    const { profile_picture } = req.body;
    if (!profile_picture) {
      return res.status(400).json({ error: 'Profile picture is required' });
    }
    if (!profile_picture.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format. Must be a base64 image.' });
    }
    const base64Data = profile_picture.split(',')[1] || '';
    const padding = (base64Data.match(/=+$/) || [''])[0].length;
    const actualBytes = (base64Data.length * 3) / 4 - padding;
    const maxSizeBytes = 2 * 1024 * 1024;
    if (actualBytes > maxSizeBytes) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 2MB.' });
    }
    db.prepare('UPDATE users SET profile_pic = ? WHERE id = ?').run(profile_picture, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import-observations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const https = require('https');
    const { parse } = require('csv-parse/sync');
    const { clearFirst } = req.body || {};
    
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pub?output=csv';
    
    const fetchCSV = () => new Promise((resolve, reject) => {
      const fetch = (url) => {
        https.get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            fetch(response.headers.location);
            return;
          }
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        }).on('error', reject);
      };
      fetch(csvUrl);
    });
    
    const csvData = await fetchCSV();
    const records = parse(csvData, { columns: true, skip_empty_lines: true, relax_column_count: true });
    
    if (clearFirst) {
      db.prepare('DELETE FROM observations').run();
      console.log('Cleared all existing observations before reimport');
    }
    
    let imported = 0;
    let skipped = 0;
    const errors = [];
    
    const insertStmt = db.prepare(`
      INSERT INTO observations (date, time, area, location, observation_type, description, direct_cause, root_cause, immediate_action, corrective_action, risk_level, status, reported_by, reported_by_id, activity_type, observation_class, injury_type, injury_body_part, evidence_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const checkByCodeStmt = db.prepare('SELECT id FROM observations WHERE reported_by_id = ? AND reported_by_id LIKE "CODE-%"');
    const checkByDescStmt = db.prepare('SELECT id FROM observations WHERE description = ? AND date = ?');
    
    for (const row of records) {
      const code = row['Code'] || '';
      let date = row['Date'] || '';
      
      const description = (row['Description'] || '').trim();
      if (!description) {
        skipped++;
        continue;
      }
      
      if (code) {
        const existingByCode = checkByCodeStmt.get(`CODE-${code}`);
        if (existingByCode) {
          skipped++;
          continue;
        }
      }
      const existingByDesc = checkByDescStmt.get(description, date);
      if (existingByDesc) {
        skipped++;
        continue;
      }
      
      const observationType = row['Observation Types'] || 'Observation';
      const activityType = row['Activity Type'] || '';
      const observationClass = (row['Observation Class'] || '').includes('Positive') ? 'Positive' : 'Negative';
      const area = (row['Area '] || row['Area'] || '').trim();
      const directCause = row['Direct Cause'] || '';
      const rootCause = row['Root Cause'] || '';
      const riskLevel = row['RA Level'] || 'Medium';
      const status = (row['Report Status'] || 'Open').includes('Closed') ? 'Closed' : 'Open';
      const reportedByName = row['Name'] || '';
      const reportedById = code ? `CODE-${code}` : (row['ID'] || '');
      const injuryStatus = row['Injury/No Injury'] || '';
      const injuryBodyPart = row['Type of Injury'] || '';
      const location = row['Equipment / Tool'] || '';
      const comments = row['Comments'] || '';
      const giNumber = row['GI Number #'] || '';
      
      const immediateAction = (comments && comments !== 'N/A') ? comments : '';
      const correctiveAction = (giNumber && giNumber !== 'N/A') ? `Ref: ${giNumber}` : '';
      
      try {
        insertStmt.run(
          date,
          '',
          area,
          location !== 'N/A' ? location : '',
          observationType,
          description,
          directCause !== 'N/A' ? directCause : '',
          rootCause !== 'N/A' ? rootCause : '',
          immediateAction,
          correctiveAction,
          riskLevel,
          status,
          (reportedByName && reportedByName !== 'N/A') ? reportedByName : 'Historical Import',
          reportedById,
          activityType,
          observationClass,
          (injuryStatus && injuryStatus !== 'N/A') ? injuryStatus : '',
          (injuryBodyPart && injuryBodyPart !== 'N/A') ? injuryBodyPart : '',
          '[]'
        );
        imported++;
        
        if (area) {
          db.prepare('INSERT OR IGNORE INTO areas (name) VALUES (?)').run(area);
        }
      } catch (e) {
        console.error('Import row error:', e.message, 'Row:', code);
        errors.push({ code, error: e.message });
        skipped++;
      }
    }
    
    res.json({ success: true, imported, skipped, total: records.length, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

const requireSafetyOfficer = (req, res, next) => {
  const allowedRoles = ['admin', 'safety_officer', 'hse'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Safety Officer or HSE role required.' });
  }
  next();
};

router.get('/verifications/pending', authenticateToken, requireSafetyOfficer, (req, res) => {
  try {
    const pending = db.prepare(`
      SELECT o.*, u.name as reported_by_name, u.employee_id as reporter_employee_id
      FROM observations o
      LEFT JOIN users u ON o.reported_by_id = u.employee_id
      WHERE o.corrective_action_status = 'Completed' 
        AND o.status != 'Closed'
      ORDER BY o.created_at DESC
    `).all();
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verifications/pending/count', authenticateToken, requireSafetyOfficer, (req, res) => {
  try {
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM observations 
      WHERE corrective_action_status = 'Completed' AND status != 'Closed'
    `).get();
    res.json({ count: count.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verifications/:id/approve', authenticateToken, requireSafetyOfficer, (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Remarks are required for approval' });
    }
    
    const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
    if (!obs) {
      return res.status(404).json({ error: 'Observation not found' });
    }
    
    if (obs.reported_by_id === req.user.employee_id) {
      return res.status(403).json({ error: 'You cannot verify your own observation' });
    }
    
    const previousStatus = obs.status;
    
    db.prepare(`
      INSERT INTO verifications (observation_id, verified_by, remarks, status)
      VALUES (?, ?, ?, 'APPROVED')
    `).run(id, req.user.id, remarks.trim());
    
    db.prepare(`
      UPDATE observations SET 
        status = 'Closed',
        closed_by = ?,
        closed_date = datetime('now'),
        closed_notes = ?
      WHERE id = ?
    `).run(req.user.name, remarks.trim(), id);
    
    db.prepare(`
      INSERT INTO status_log (entity_type, entity_id, previous_status, new_status, changed_by, remarks)
      VALUES ('observation', ?, ?, 'Closed', ?, ?)
    `).run(id, previousStatus, req.user.id, remarks.trim());
    
    if (obs.reported_by_id) {
      const reporter = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(obs.reported_by_id);
      if (reporter) {
        awardPoints(reporter.id, 5, 'Observation verified and closed');
      }
    }
    
    res.json({ success: true, message: 'Observation approved and closed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verifications/:id/reject', authenticateToken, requireSafetyOfficer, (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ error: 'Remarks are required for rejection' });
    }
    
    const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(id);
    if (!obs) {
      return res.status(404).json({ error: 'Observation not found' });
    }
    
    if (obs.reported_by_id === req.user.employee_id) {
      return res.status(403).json({ error: 'You cannot verify your own observation' });
    }
    
    const previousStatus = obs.status;
    
    db.prepare(`
      INSERT INTO verifications (observation_id, verified_by, remarks, status)
      VALUES (?, ?, ?, 'REJECTED')
    `).run(id, req.user.id, remarks.trim());
    
    db.prepare(`
      UPDATE observations SET 
        status = 'Open',
        corrective_action_status = 'In Progress'
      WHERE id = ?
    `).run(id);
    
    db.prepare(`
      INSERT INTO status_log (entity_type, entity_id, previous_status, new_status, changed_by, remarks)
      VALUES ('observation', ?, ?, 'Rejected - Returned for Correction', ?, ?)
    `).run(id, previousStatus, req.user.id, remarks.trim());
    
    res.json({ success: true, message: 'Observation rejected and returned for correction' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verifications/history/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT v.*, u.name as verifier_name
      FROM verifications v
      LEFT JOIN users u ON v.verified_by = u.id
      WHERE v.observation_id = ?
      ORDER BY v.verified_at DESC
    `).all(id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Training Matrix Routes
router.get('/training-roles', optionalAuth, (req, res) => {
  try {
    const roles = db.prepare('SELECT * FROM training_roles ORDER BY name').all();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/training-items', optionalAuth, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM training_items ORDER BY name').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/training-roles/:id/trainings', optionalAuth, (req, res) => {
  try {
    const trainings = db.prepare(`
      SELECT ti.id, ti.name, ti.validity_years
      FROM training_items ti
      JOIN role_trainings rt ON ti.id = rt.training_id
      WHERE rt.role_id = ?
      ORDER BY ti.name
    `).all(req.params.id);
    res.json(trainings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/training-roles', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    const result = db.prepare('INSERT INTO training_roles (name) VALUES (?)').run(name.trim());
    const role = db.prepare('SELECT * FROM training_roles WHERE id = ?').get(result.lastInsertRowid);
    res.json(role);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Role already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/training-roles/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    db.prepare('UPDATE training_roles SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    const role = db.prepare('SELECT * FROM training_roles WHERE id = ?').get(req.params.id);
    res.json(role);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Role already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/training-roles/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM role_trainings WHERE role_id = ?').run(req.params.id);
    db.prepare('DELETE FROM training_roles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/training-items', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, validity_years } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Training name is required' });
    }
    const validity = parseInt(validity_years) || 2;
    const result = db.prepare('INSERT INTO training_items (name, validity_years) VALUES (?, ?)').run(name.trim(), validity);
    const item = db.prepare('SELECT * FROM training_items WHERE id = ?').get(result.lastInsertRowid);
    res.json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Training already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/training-items/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, validity_years } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Training name is required' });
    }
    const validity = parseInt(validity_years) || 2;
    db.prepare('UPDATE training_items SET name = ?, validity_years = ? WHERE id = ?').run(name.trim(), validity, req.params.id);
    const item = db.prepare('SELECT * FROM training_items WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Training already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/training-items/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM role_trainings WHERE training_id = ?').run(req.params.id);
    db.prepare('DELETE FROM training_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/role-trainings/:roleId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const assignments = db.prepare(`
      SELECT ti.id, ti.name, ti.validity_years,
             CASE WHEN rt.id IS NOT NULL THEN 1 ELSE 0 END as assigned
      FROM training_items ti
      LEFT JOIN role_trainings rt ON ti.id = rt.training_id AND rt.role_id = ?
      ORDER BY ti.name
    `).all(req.params.roleId);
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/role-trainings/:roleId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { training_ids } = req.body;
    const roleId = req.params.roleId;
    
    db.prepare('DELETE FROM role_trainings WHERE role_id = ?').run(roleId);
    
    if (training_ids && training_ids.length > 0) {
      const insert = db.prepare('INSERT INTO role_trainings (role_id, training_id) VALUES (?, ?)');
      for (const trainingId of training_ids) {
        insert.run(roleId, trainingId);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calendar/upload', authenticateToken, calendarUpload.array('files', 5), (req, res) => {
  const urls = req.files.map(f => `/uploads/calendar/${f.filename}`);
  res.json({ urls });
});

router.get('/calendar/events', optionalAuth, (req, res) => {
  try {
    const { type, status, month, year, search } = req.query;
    let sql = 'SELECT * FROM safety_calendar_events WHERE 1=1';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      sql += ' AND date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (year) {
      sql += ' AND date LIKE ?';
      params.push(`${year}%`);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR notes LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY date ASC';
    const events = db.prepare(sql).all(...params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/calendar/events/:id', optionalAuth, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calendar/events', authenticateToken, (req, res) => {
  try {
    const { date, type, title, notes, assigned_to, attachments } = req.body;
    
    if (!date || !type || !title) {
      return res.status(400).json({ error: 'Date, type, and title are required' });
    }
    
    const user = db.prepare('SELECT name, employee_id FROM users WHERE id = ?').get(req.user.id);
    
    const result = db.prepare(`
      INSERT INTO safety_calendar_events (date, type, title, notes, created_by, created_by_id, assigned_to, attachments, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(date, type, title, notes || '', user.name, req.user.id, assigned_to || '', JSON.stringify(attachments || []));
    
    awardPoints(req.user.id, 5, 'Created calendar event');
    
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(result.lastInsertRowid);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/events/:id', authenticateToken, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const user = db.prepare('SELECT employee_id, role FROM users WHERE id = ?').get(req.user.id);
    if (event.created_by_id !== user.employee_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }
    
    const { date, type, title, notes, assigned_to, attachments, status } = req.body;
    
    db.prepare(`
      UPDATE safety_calendar_events 
      SET date = ?, type = ?, title = ?, notes = ?, assigned_to = ?, attachments = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      date || event.date,
      type || event.type,
      title || event.title,
      notes !== undefined ? notes : event.notes,
      assigned_to !== undefined ? assigned_to : event.assigned_to,
      JSON.stringify(attachments || JSON.parse(event.attachments || '[]')),
      status || event.status,
      req.params.id
    );
    
    const updated = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/calendar/events/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    db.prepare('DELETE FROM calendar_notifications WHERE event_id = ?').run(req.params.id);
    db.prepare('DELETE FROM safety_calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/events/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    db.prepare(`
      UPDATE safety_calendar_events 
      SET status = 'Approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.name, req.params.id);
    
    if (event.created_by_id) {
      const creator = db.prepare('SELECT id FROM users WHERE employee_id = ?').get(event.created_by_id);
      if (creator) {
        db.prepare(`
          INSERT INTO calendar_notifications (user_id, event_id, message, type)
          VALUES (?, ?, ?, 'approval')
        `).run(creator.id, req.params.id, `Your event "${event.title}" has been approved`);
      }
    }
    
    const updated = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/events/:id/complete', authenticateToken, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const user = db.prepare('SELECT employee_id, role FROM users WHERE id = ?').get(req.user.id);
    if (event.created_by_id !== user.employee_id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.prepare(`
      UPDATE safety_calendar_events 
      SET status = 'Completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);
    
    const updated = db.prepare('SELECT * FROM safety_calendar_events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/calendar/notifications', authenticateToken, (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT cn.*, sce.title as event_title, sce.date as event_date
      FROM calendar_notifications cn
      LEFT JOIN safety_calendar_events sce ON cn.event_id = sce.id
      WHERE cn.user_id = ?
      ORDER BY cn.created_at DESC
      LIMIT 20
    `).all(req.user.id);
    
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM calendar_notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    
    res.json({ notifications, unreadCount: unreadCount.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE calendar_notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/notifications/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE calendar_notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar Admin Settings - Categories
router.get('/calendar/categories', optionalAuth, (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    let sql = 'SELECT * FROM calendar_categories';
    if (activeOnly) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY sort_order ASC, name ASC';
    const categories = db.prepare(sql).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/calendar/categories', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM calendar_categories').get();
    const sortOrder = (maxOrder.max || 0) + 1;
    
    const result = db.prepare(`
      INSERT INTO calendar_categories (name, color, icon, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(name, color || '#3b82f6', icon || 'fa-calendar', sortOrder);
    
    const category = db.prepare('SELECT * FROM calendar_categories WHERE id = ?').get(result.lastInsertRowid);
    res.json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, color, icon, is_active, sort_order } = req.body;
    
    const category = db.prepare('SELECT * FROM calendar_categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    db.prepare(`
      UPDATE calendar_categories 
      SET name = ?, color = ?, icon = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `).run(
      name || category.name,
      color || category.color,
      icon || category.icon,
      is_active !== undefined ? is_active : category.is_active,
      sort_order !== undefined ? sort_order : category.sort_order,
      req.params.id
    );
    
    const updated = db.prepare('SELECT * FROM calendar_categories WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/calendar/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM calendar_categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category is in use
    const inUse = db.prepare('SELECT COUNT(*) as count FROM safety_calendar_events WHERE type = ?').get(category.name);
    if (inUse.count > 0) {
      return res.status(400).json({ error: `Cannot delete: ${inUse.count} events use this category. Deactivate instead.` });
    }
    
    db.prepare('DELETE FROM calendar_categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calendar Admin Settings - General Settings
router.get('/calendar/settings', optionalAuth, (req, res) => {
  try {
    const settings = db.prepare('SELECT setting_key, setting_value FROM calendar_settings').all();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/calendar/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const settings = req.body;
    
    const upsert = db.prepare(`
      INSERT INTO calendar_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value), String(value));
    }
    
    const allSettings = db.prepare('SELECT setting_key, setting_value FROM calendar_settings').all();
    const settingsObj = {};
    allSettings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });
    
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EXCAVATION SAFETY MODULE API ROUTES
// Based on Saudi Aramco CSM - Excavation & Shoring Requirements
// ============================================

// CSM Logic Functions
function calculateExcavationCompliance(data) {
  const warnings = [];
  const errors = [];
  let complianceScore = 100;
  let complianceStatus = 'Compliant';
  let engineeringRequired = false;
  let csdReviewRequired = false;
  let protectiveSystemRequired = false;
  let recommendedProtection = null;

  // Check utilities marked (CSM requirement)
  if (!data.utilities_marked) {
    errors.push('STOP WORK: Utilities must be marked before excavation');
    complianceStatus = 'Stop Work';
    complianceScore -= 50;
  }

  // Check GPR for underground hazards
  if (!data.gpr_performed && data.depth >= 1.2) {
    warnings.push('GPR (Ground Penetrating Radar) recommended for excavations ≥1.2m');
    complianceScore -= 10;
  }

  // Protective system requirements based on depth and worker entry
  if (data.depth >= 1.2 && data.worker_entry_required) {
    protectiveSystemRequired = true;
    
    // Determine slope ratio based on soil type (CSM requirements)
    const slopeRatios = {
      'Rock': '0H:1V (Vertical)',
      'A': '0.75H:1V',
      'B': '1H:1V',
      'C': '1.5H:1V'
    };

    if (!data.protective_system) {
      errors.push('Protective system required for excavation ≥1.2m with worker entry');
      complianceScore -= 25;
      complianceStatus = complianceStatus === 'Stop Work' ? 'Stop Work' : 'Needs Action';
    }

    recommendedProtection = `Sloping (${slopeRatios[data.soil_type]}), Shoring, or Trench Box`;
  }

  // Engineering design requirements
  if (data.depth >= 2.4 && (data.soil_type === 'B' || data.soil_type === 'C')) {
    engineeringRequired = true;
    if (!data.engineering_plan_uploaded) {
      warnings.push('Engineering design required for depth ≥2.4m in soil type B/C');
      complianceScore -= 15;
      complianceStatus = complianceStatus === 'Stop Work' ? 'Stop Work' : 'Needs Action';
    }
  }

  // CSD review for deep excavations
  if (data.depth >= 6) {
    engineeringRequired = true;
    csdReviewRequired = true;
    warnings.push('Engineering design + CSD review required for excavations ≥6m deep');
    if (!data.engineering_plan_uploaded) {
      complianceScore -= 20;
      complianceStatus = complianceStatus === 'Stop Work' ? 'Stop Work' : 'Needs Action';
    }
  }

  // Nearby structures check (45° plane rule)
  if (data.nearby_structures && data.distance_to_structures) {
    const minDistance = data.depth; // 45° angle means distance = depth
    if (data.distance_to_structures < minDistance) {
      warnings.push(`Excavation under 45° plane of foundation - engineered support required. Min distance: ${minDistance}m`);
      engineeringRequired = true;
      complianceScore -= 15;
    }
  }

  // Utilities clearance (3m rule for mechanical excavation)
  if (data.distance_to_utilities && data.distance_to_utilities < 3) {
    errors.push('STOP WORK: No mechanical excavation within 3m of utilities. Hand dig required.');
    complianceStatus = 'Stop Work';
    complianceScore -= 30;
  }

  // Water present
  if (data.water_present) {
    warnings.push('Water present - ensure proper dewatering and shoring stability');
    complianceScore -= 5;
  }

  // Vibration/traffic nearby
  if (data.vibration_traffic_nearby) {
    warnings.push('Vibration/traffic nearby - monitor excavation stability closely');
    complianceScore -= 5;
  }

  complianceScore = Math.max(0, complianceScore);
  if (complianceStatus === 'Compliant' && complianceScore < 100) {
    complianceStatus = 'Needs Action';
  }
  if (complianceScore >= 90) {
    complianceStatus = 'Compliant';
  }

  return {
    warnings,
    errors,
    complianceScore,
    complianceStatus,
    engineeringRequired,
    csdReviewRequired,
    protectiveSystemRequired,
    recommendedProtection
  };
}

function getRequiredPermits(data) {
  const permits = [];

  // Excavation Work Permit - always required
  permits.push({
    type: 'Excavation Work Permit',
    required: true,
    reason: 'Required for all excavation activities'
  });

  // Confined Space Entry Permit
  if (data.depth >= 1.2 && data.worker_entry_required) {
    permits.push({
      type: 'Confined Space Entry Permit',
      required: true,
      reason: 'Required for worker entry in excavations ≥1.2m deep'
    });
  }

  // Hot Work Permit - if cutting/welding planned
  if (data.hot_work_planned) {
    permits.push({
      type: 'Hot Work Permit',
      required: true,
      reason: 'Required for any cutting, welding, or open flame work'
    });
  }

  // Cold Work Permit
  if (data.cold_work_planned) {
    permits.push({
      type: 'Cold Work Permit',
      required: true,
      reason: 'Required for non-sparking mechanical work near hazardous areas'
    });
  }

  return permits;
}

function getProtectiveSystemRecommendation(data) {
  const slopeRatios = {
    'Rock': { ratio: '0H:1V', angle: 90, description: 'Vertical cut permitted' },
    'A': { ratio: '0.75H:1V', angle: 53, description: 'Stable cohesive soil' },
    'B': { ratio: '1H:1V', angle: 45, description: 'Medium stability soil' },
    'C': { ratio: '1.5H:1V', angle: 34, description: 'Unstable/granular soil' }
  };

  const soilInfo = slopeRatios[data.soil_type] || slopeRatios['C'];
  const recommendations = [];

  if (data.depth < 1.2) {
    recommendations.push({
      system: 'No protection required',
      applicable: true,
      notes: 'Excavation less than 1.2m deep without worker entry'
    });
  } else {
    // Sloping
    const slopeWidth = data.depth * (data.soil_type === 'C' ? 1.5 : data.soil_type === 'B' ? 1 : 0.75);
    recommendations.push({
      system: 'Sloping',
      applicable: !data.space_limited,
      slope: soilInfo.ratio,
      angle: soilInfo.angle,
      requiredWidth: slopeWidth.toFixed(1) + 'm on each side',
      notes: soilInfo.description
    });

    // Shoring
    recommendations.push({
      system: 'Shoring',
      applicable: true,
      notes: 'Timber or hydraulic shores. Engineering design required for depth >2.4m in B/C soil'
    });

    // Trench Box
    recommendations.push({
      system: 'Trench Box/Shield',
      applicable: true,
      notes: 'Pre-manufactured protection system. Must extend above edge by 0.3m minimum'
    });

    // Benching (not for Type C soil)
    if (data.soil_type !== 'C') {
      recommendations.push({
        system: 'Benching',
        applicable: true,
        notes: 'Step-cut excavation. Not permitted in Type C soil'
      });
    }
  }

  let engineeringRequirement = 'Not required';
  if (data.depth >= 6) {
    engineeringRequirement = 'Engineering design + CSD review required';
  } else if (data.depth >= 2.4 && (data.soil_type === 'B' || data.soil_type === 'C')) {
    engineeringRequirement = 'Engineering design required';
  }

  return {
    soilType: data.soil_type,
    soilInfo,
    depth: data.depth,
    workerEntry: data.worker_entry_required,
    waterPresent: data.water_present,
    vibrationNearby: data.vibration_traffic_nearby,
    recommendations,
    engineeringRequirement
  };
}

// Get all excavations with stats
router.get('/excavations', optionalAuth, (req, res) => {
  try {
    const { status, compliance } = req.query;
    let query = 'SELECT * FROM excavations';
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (compliance) {
      conditions.push('compliance_status = ?');
      params.push(compliance);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const excavations = db.prepare(query).all(...params);
    res.json(excavations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get excavation stats for dashboard
router.get('/excavations/stats', optionalAuth, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM excavations').get();
    const open = db.prepare("SELECT COUNT(*) as count FROM excavations WHERE status = 'Open' OR status = 'In Progress'").get();
    const compliant = db.prepare("SELECT COUNT(*) as count FROM excavations WHERE compliance_status = 'Compliant'").get();
    const needsAction = db.prepare("SELECT COUNT(*) as count FROM excavations WHERE compliance_status = 'Needs Action'").get();
    const stopWork = db.prepare("SELECT COUNT(*) as count FROM excavations WHERE compliance_status = 'Stop Work'").get();
    const engineeringRequired = db.prepare("SELECT COUNT(*) as count FROM excavations WHERE engineering_required = 1 AND engineering_plan_uploaded = 0").get();
    const pendingInspections = db.prepare(`
      SELECT COUNT(*) as count FROM excavations e 
      WHERE (e.status = 'Open' OR e.status = 'In Progress')
      AND (
        NOT EXISTS (SELECT 1 FROM excavation_inspections i WHERE i.excavation_id = e.id AND i.inspection_date = date('now'))
        OR e.depth > 2.4
      )
    `).get();
    const avgComplianceScore = db.prepare("SELECT AVG(compliance_score) as avg FROM excavations WHERE compliance_score > 0").get();

    res.json({
      total: total.count,
      open: open.count,
      compliant: compliant.count,
      needsAction: needsAction.count,
      stopWork: stopWork.count,
      engineeringRequired: engineeringRequired.count,
      pendingInspections: pendingInspections.count,
      avgComplianceScore: Math.round(avgComplianceScore.avg || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single excavation with all related data
router.get('/excavations/:id', optionalAuth, (req, res) => {
  try {
    const excavation = db.prepare('SELECT * FROM excavations WHERE id = ?').get(req.params.id);
    if (!excavation) {
      return res.status(404).json({ error: 'Excavation not found' });
    }

    const inspections = db.prepare('SELECT * FROM excavation_inspections WHERE excavation_id = ? ORDER BY inspection_date DESC').all(req.params.id);
    const documents = db.prepare('SELECT * FROM excavation_documents WHERE excavation_id = ? ORDER BY created_at DESC').all(req.params.id);
    const permits = db.prepare('SELECT * FROM excavation_permits WHERE excavation_id = ?').all(req.params.id);

    res.json({
      ...excavation,
      inspections,
      documents,
      permits
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create excavation (Pre-Excavation Planning)
router.post('/excavations', authenticateToken, (req, res) => {
  try {
    const {
      location, depth, length, width, soil_type,
      utilities_marked, gpr_performed, water_present,
      worker_entry_required, nearby_structures, distance_to_structures,
      vibration_traffic_nearby, distance_to_utilities, protective_system,
      notes, hot_work_planned, cold_work_planned
    } = req.body;

    if (!location || !depth || !soil_type) {
      return res.status(400).json({ error: 'Location, depth, and soil type are required' });
    }

    // Calculate compliance
    const complianceData = {
      depth: parseFloat(depth),
      soil_type,
      utilities_marked: utilities_marked ? 1 : 0,
      gpr_performed: gpr_performed ? 1 : 0,
      water_present: water_present ? 1 : 0,
      worker_entry_required: worker_entry_required ? 1 : 0,
      nearby_structures: nearby_structures ? 1 : 0,
      distance_to_structures: distance_to_structures ? parseFloat(distance_to_structures) : null,
      vibration_traffic_nearby: vibration_traffic_nearby ? 1 : 0,
      distance_to_utilities: distance_to_utilities ? parseFloat(distance_to_utilities) : null,
      protective_system,
      engineering_plan_uploaded: 0
    };

    const compliance = calculateExcavationCompliance(complianceData);

    const result = db.prepare(`
      INSERT INTO excavations (
        location, depth, length, width, soil_type,
        utilities_marked, gpr_performed, water_present,
        worker_entry_required, nearby_structures, distance_to_structures,
        vibration_traffic_nearby, distance_to_utilities, protective_system,
        engineering_required, csd_review_required,
        compliance_status, compliance_score, notes,
        created_by_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      location, parseFloat(depth), length ? parseFloat(length) : null, width ? parseFloat(width) : null, soil_type,
      utilities_marked ? 1 : 0, gpr_performed ? 1 : 0, water_present ? 1 : 0,
      worker_entry_required ? 1 : 0, nearby_structures ? 1 : 0, distance_to_structures ? parseFloat(distance_to_structures) : null,
      vibration_traffic_nearby ? 1 : 0, distance_to_utilities ? parseFloat(distance_to_utilities) : null, protective_system || null,
      compliance.engineeringRequired ? 1 : 0, compliance.csdReviewRequired ? 1 : 0,
      compliance.complianceStatus, compliance.complianceScore, notes || null,
      req.user.id, req.user.name
    );

    const excavationId = result.lastInsertRowid;

    // Auto-create required permits
    const requiredPermits = getRequiredPermits({ ...complianceData, hot_work_planned, cold_work_planned });
    const insertPermit = db.prepare('INSERT INTO excavation_permits (excavation_id, permit_type, is_required) VALUES (?, ?, 1)');
    requiredPermits.forEach(p => {
      insertPermit.run(excavationId, p.type);
    });

    // Award points for creating excavation plan
    awardPoints(req.user.id, 5, 'Created excavation safety plan');

    const newExcavation = db.prepare('SELECT * FROM excavations WHERE id = ?').get(excavationId);

    res.json({
      excavation: newExcavation,
      compliance,
      requiredPermits,
      message: 'Excavation plan created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update excavation
router.put('/excavations/:id', authenticateToken, (req, res) => {
  try {
    const excavation = db.prepare('SELECT * FROM excavations WHERE id = ?').get(req.params.id);
    if (!excavation) {
      return res.status(404).json({ error: 'Excavation not found' });
    }

    const {
      location, depth, length, width, soil_type,
      utilities_marked, gpr_performed, water_present,
      worker_entry_required, nearby_structures, distance_to_structures,
      vibration_traffic_nearby, distance_to_utilities, protective_system,
      engineering_plan_uploaded, status, notes
    } = req.body;

    // Recalculate compliance
    const complianceData = {
      depth: parseFloat(depth || excavation.depth),
      soil_type: soil_type || excavation.soil_type,
      utilities_marked: utilities_marked !== undefined ? (utilities_marked ? 1 : 0) : excavation.utilities_marked,
      gpr_performed: gpr_performed !== undefined ? (gpr_performed ? 1 : 0) : excavation.gpr_performed,
      water_present: water_present !== undefined ? (water_present ? 1 : 0) : excavation.water_present,
      worker_entry_required: worker_entry_required !== undefined ? (worker_entry_required ? 1 : 0) : excavation.worker_entry_required,
      nearby_structures: nearby_structures !== undefined ? (nearby_structures ? 1 : 0) : excavation.nearby_structures,
      distance_to_structures: distance_to_structures !== undefined ? parseFloat(distance_to_structures) : excavation.distance_to_structures,
      vibration_traffic_nearby: vibration_traffic_nearby !== undefined ? (vibration_traffic_nearby ? 1 : 0) : excavation.vibration_traffic_nearby,
      distance_to_utilities: distance_to_utilities !== undefined ? parseFloat(distance_to_utilities) : excavation.distance_to_utilities,
      protective_system: protective_system !== undefined ? protective_system : excavation.protective_system,
      engineering_plan_uploaded: engineering_plan_uploaded !== undefined ? (engineering_plan_uploaded ? 1 : 0) : excavation.engineering_plan_uploaded
    };

    const compliance = calculateExcavationCompliance(complianceData);

    db.prepare(`
      UPDATE excavations SET
        location = COALESCE(?, location),
        depth = COALESCE(?, depth),
        length = COALESCE(?, length),
        width = COALESCE(?, width),
        soil_type = COALESCE(?, soil_type),
        utilities_marked = ?,
        gpr_performed = ?,
        water_present = ?,
        worker_entry_required = ?,
        nearby_structures = ?,
        distance_to_structures = ?,
        vibration_traffic_nearby = ?,
        distance_to_utilities = ?,
        protective_system = ?,
        engineering_plan_uploaded = ?,
        engineering_required = ?,
        csd_review_required = ?,
        compliance_status = ?,
        compliance_score = ?,
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        closed_at = CASE WHEN ? = 'Closed' THEN CURRENT_TIMESTAMP ELSE closed_at END
      WHERE id = ?
    `).run(
      location, depth ? parseFloat(depth) : null, length ? parseFloat(length) : null, width ? parseFloat(width) : null, soil_type,
      complianceData.utilities_marked, complianceData.gpr_performed, complianceData.water_present,
      complianceData.worker_entry_required, complianceData.nearby_structures, complianceData.distance_to_structures,
      complianceData.vibration_traffic_nearby, complianceData.distance_to_utilities, complianceData.protective_system,
      complianceData.engineering_plan_uploaded, compliance.engineeringRequired ? 1 : 0, compliance.csdReviewRequired ? 1 : 0,
      compliance.complianceStatus, compliance.complianceScore,
      status, notes, status,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM excavations WHERE id = ?').get(req.params.id);
    res.json({ excavation: updated, compliance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get protective system recommendations
router.post('/excavations/protective-system', optionalAuth, (req, res) => {
  try {
    const { soil_type, depth, water_present, worker_entry_required, vibration_traffic_nearby, space_limited } = req.body;
    
    const recommendations = getProtectiveSystemRecommendation({
      soil_type: soil_type || 'C',
      depth: parseFloat(depth) || 1.5,
      water_present: water_present ? 1 : 0,
      worker_entry_required: worker_entry_required ? 1 : 0,
      vibration_traffic_nearby: vibration_traffic_nearby ? 1 : 0,
      space_limited: space_limited ? 1 : 0
    });

    res.json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get permit requirements
router.post('/excavations/permits', optionalAuth, (req, res) => {
  try {
    const { depth, worker_entry_required, hot_work_planned, cold_work_planned } = req.body;
    
    const permits = getRequiredPermits({
      depth: parseFloat(depth) || 0,
      worker_entry_required: worker_entry_required ? 1 : 0,
      hot_work_planned: hot_work_planned ? 1 : 0,
      cold_work_planned: cold_work_planned ? 1 : 0
    });

    res.json(permits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check utilities clearance
router.post('/excavations/utilities-check', optionalAuth, (req, res) => {
  try {
    const { utilities_marked, gpr_performed, distance_to_utilities, distance_to_foundations, depth } = req.body;
    
    const warnings = [];
    const errors = [];
    let clearanceStatus = 'Clear';

    if (!utilities_marked) {
      errors.push('STOP WORK: Underground utilities must be marked before excavation');
      clearanceStatus = 'Not Clear';
    }

    if (!gpr_performed) {
      warnings.push('GPR (Ground Penetrating Radar) scan recommended to detect unmarked utilities');
    }

    const distToUtils = parseFloat(distance_to_utilities);
    if (distToUtils && distToUtils < 3) {
      errors.push(`STOP WORK: No mechanical excavation within 3m of utilities (current distance: ${distToUtils}m). Hand excavation required.`);
      clearanceStatus = 'Not Clear';
    } else if (distToUtils && distToUtils < 5) {
      warnings.push(`Utilities within 5m (${distToUtils}m). Use caution and consider hand excavation near utility lines.`);
    }

    const distToFound = parseFloat(distance_to_foundations);
    const excavDepth = parseFloat(depth) || 0;
    if (distToFound && excavDepth && distToFound < excavDepth) {
      warnings.push(`Excavation is under 45° plane of nearby foundation. Engineered support system required.`);
      clearanceStatus = clearanceStatus === 'Not Clear' ? 'Not Clear' : 'Needs Engineering';
    }

    res.json({
      clearanceStatus,
      warnings,
      errors,
      recommendations: [
        'Mark all utility locations before excavation',
        'Perform GPR scan for unknown utilities',
        'Maintain 3m minimum distance for mechanical excavation',
        'Use hand tools within 3m of utilities',
        'Contact utility owners for precise location if uncertain'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create daily inspection
router.post('/excavations/:id/inspections', authenticateToken, (req, res) => {
  try {
    const excavation = db.prepare('SELECT * FROM excavations WHERE id = ?').get(req.params.id);
    if (!excavation) {
      return res.status(404).json({ error: 'Excavation not found' });
    }

    const {
      inspection_date, soil_condition, shoring_condition,
      water_accumulation, water_action_taken, barricade_condition,
      ladder_spacing_ok, ladder_spacing_distance,
      ladder_extension_ok, ladder_extension_height,
      spoil_pile_distance_ok, spoil_pile_distance,
      crane_distance_ok, scaffold_distance_ok,
      gas_test_performed, oxygen_level, lel_level, h2s_level, co_level,
      notes
    } = req.body;

    // Determine critical failures and overall status
    const criticalFailures = [];
    let overallStatus = 'Pass';

    // CSM critical checks
    if (soil_condition === 'Unstable') {
      criticalFailures.push('Unstable soil condition');
      overallStatus = 'Stop Work';
    }
    if (shoring_condition === 'Poor') {
      criticalFailures.push('Poor shoring condition');
      overallStatus = 'Stop Work';
    }
    if (barricade_condition === 'Missing') {
      criticalFailures.push('Missing barricades');
      overallStatus = 'Stop Work';
    }
    if (!ladder_spacing_ok && excavation.worker_entry_required) {
      criticalFailures.push('Ladder spacing exceeds 7.5m');
      overallStatus = overallStatus === 'Stop Work' ? 'Stop Work' : 'Fail';
    }
    if (!ladder_extension_ok && excavation.worker_entry_required) {
      criticalFailures.push('Ladder extension less than 1m above surface');
      overallStatus = overallStatus === 'Stop Work' ? 'Stop Work' : 'Fail';
    }
    if (!spoil_pile_distance_ok) {
      criticalFailures.push('Spoil pile within 0.6m of edge');
      overallStatus = overallStatus === 'Stop Work' ? 'Stop Work' : 'Fail';
    }

    // Atmospheric checks
    let atmosphericSafe = 1;
    if (gas_test_performed) {
      const o2 = parseFloat(oxygen_level);
      const lel = parseFloat(lel_level);
      const h2s = parseFloat(h2s_level);
      const co = parseFloat(co_level);

      if (o2 < 19.5 || o2 > 23.5) {
        criticalFailures.push(`Oxygen level unsafe: ${o2}% (safe range: 19.5-23.5%)`);
        atmosphericSafe = 0;
        overallStatus = 'Stop Work';
      }
      if (lel > 10) {
        criticalFailures.push(`LEL too high: ${lel}% (max 10%)`);
        atmosphericSafe = 0;
        overallStatus = 'Stop Work';
      }
      if (h2s > 10) {
        criticalFailures.push(`H2S level unsafe: ${h2s} ppm (max 10 ppm)`);
        atmosphericSafe = 0;
        overallStatus = 'Stop Work';
      }
      if (co > 35) {
        criticalFailures.push(`CO level unsafe: ${co} ppm (max 35 ppm)`);
        atmosphericSafe = 0;
        overallStatus = 'Stop Work';
      }
    }

    const result = db.prepare(`
      INSERT INTO excavation_inspections (
        excavation_id, inspection_date, inspector_id, inspector_name,
        soil_condition, shoring_condition, water_accumulation, water_action_taken,
        barricade_condition, ladder_spacing_ok, ladder_spacing_distance,
        ladder_extension_ok, ladder_extension_height,
        spoil_pile_distance_ok, spoil_pile_distance,
        crane_distance_ok, scaffold_distance_ok,
        gas_test_performed, oxygen_level, lel_level, h2s_level, co_level,
        atmospheric_safe, overall_status, critical_failures, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id, inspection_date || new Date().toISOString().split('T')[0],
      req.user.id, req.user.name,
      soil_condition, shoring_condition, water_accumulation ? 1 : 0, water_action_taken,
      barricade_condition, ladder_spacing_ok ? 1 : 0, ladder_spacing_distance,
      ladder_extension_ok ? 1 : 0, ladder_extension_height,
      spoil_pile_distance_ok ? 1 : 0, spoil_pile_distance,
      crane_distance_ok ? 1 : 0, scaffold_distance_ok ? 1 : 0,
      gas_test_performed ? 1 : 0, oxygen_level, lel_level, h2s_level, co_level,
      atmosphericSafe, overallStatus, JSON.stringify(criticalFailures), notes
    );

    // Update excavation status if stop work
    if (overallStatus === 'Stop Work') {
      db.prepare("UPDATE excavations SET status = 'Suspended', compliance_status = 'Stop Work' WHERE id = ?").run(req.params.id);
    }

    // Award points for completing inspection
    awardPoints(req.user.id, 3, 'Completed excavation daily inspection');

    const inspection = db.prepare('SELECT * FROM excavation_inspections WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      inspection,
      overallStatus,
      criticalFailures,
      message: overallStatus === 'Stop Work' ? 'STOP WORK issued due to critical failures' : 'Inspection completed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get inspections for excavation
router.get('/excavations/:id/inspections', optionalAuth, (req, res) => {
  try {
    const inspections = db.prepare('SELECT * FROM excavation_inspections WHERE excavation_id = ? ORDER BY inspection_date DESC').all(req.params.id);
    res.json(inspections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload document for excavation
router.post('/excavations/:id/documents', authenticateToken, upload.array('files', 5), (req, res) => {
  try {
    const excavation = db.prepare('SELECT * FROM excavations WHERE id = ?').get(req.params.id);
    if (!excavation) {
      return res.status(404).json({ error: 'Excavation not found' });
    }

    const { document_type, notes } = req.body;
    const documents = [];

    const insertDoc = db.prepare(`
      INSERT INTO excavation_documents (excavation_id, document_type, file_url, file_name, uploaded_by_id, uploaded_by_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    req.files.forEach(file => {
      const result = insertDoc.run(
        req.params.id,
        document_type || 'other',
        `/uploads/${file.filename}`,
        file.originalname,
        req.user.id,
        req.user.name,
        notes
      );
      documents.push({
        id: result.lastInsertRowid,
        file_url: `/uploads/${file.filename}`,
        file_name: file.originalname
      });
    });

    // If engineering document uploaded, update flag
    if (document_type === 'engineering') {
      db.prepare('UPDATE excavations SET engineering_plan_uploaded = 1 WHERE id = ?').run(req.params.id);
    }

    res.json({ documents, message: 'Documents uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update permit status
router.put('/excavations/:excavationId/permits/:permitId', authenticateToken, (req, res) => {
  try {
    const { is_obtained, permit_number, obtained_date, expiry_date, notes } = req.body;

    db.prepare(`
      UPDATE excavation_permits SET
        is_obtained = COALESCE(?, is_obtained),
        permit_number = COALESCE(?, permit_number),
        obtained_date = COALESCE(?, obtained_date),
        expiry_date = COALESCE(?, expiry_date),
        notes = COALESCE(?, notes)
      WHERE id = ? AND excavation_id = ?
    `).run(
      is_obtained !== undefined ? (is_obtained ? 1 : 0) : null,
      permit_number, obtained_date, expiry_date, notes,
      req.params.permitId, req.params.excavationId
    );

    const permit = db.prepare('SELECT * FROM excavation_permits WHERE id = ?').get(req.params.permitId);
    res.json(permit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DAILY REPORTS API ==========

// Default equipment list for CAT and Rental (fallback)
const DEFAULT_EQUIPMENT = [
  'Rock Breaker', 'Loader', 'Fork lift', 'Skid Loader', 'Backhoe', 'Dump Truck',
  'Water Tanker', 'Wheel Loader', 'Over Head Crane', 'Bulldozer', 'Roller compactor',
  'Side boom', 'Generator', 'Welding machine', 'Air Compressor', 'HDD Machine',
  'Welding truck', 'Painting truck', 'Tractor', 'Bending Machine', 'Water Pump',
  'Filling Pump', 'Boom truck', 'Plate Compactor', 'Portable Generator', 'JCB',
  'Grader', 'Ambulance', 'Dozer', 'Drill Machine', 'Trailer', 'Crane'
];

// Helper to get equipment list from database or default
function getEquipmentList() {
  try {
    const items = db.prepare('SELECT * FROM equipment_registry ORDER BY sort_order, name').all();
    if (items && items.length > 0) {
      return items;
    }
  } catch (e) { /* fallback to default */ }
  return DEFAULT_EQUIPMENT.map((name, i) => ({ id: i, name, category: 'BOTH', sort_order: i }));
}

// Default areas fallback
const DEFAULT_AREAS = [
  'Haradh - Gas Fabrication',
  'X-ray Banker Yard',
  'Hydro-test Area',
  'Fabrication Yard',
  'Pipe Yard',
  'Welding Shop'
];

// Helper to get daily report areas from database
function getDailyReportAreas() {
  try {
    const items = db.prepare('SELECT * FROM daily_report_areas ORDER BY sort_order, name').all();
    if (items && items.length > 0) {
      return items.map(a => a.name);
    }
  } catch (e) { /* fallback */ }
  return DEFAULT_AREAS;
}

// Get equipment list for daily reports (MUST be before :id route)
router.get('/daily-reports/equipment-list', authenticateToken, (req, res) => {
  try {
    const items = getEquipmentList();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get daily report areas (MUST be before :id route)
router.get('/daily-reports/areas', authenticateToken, (req, res) => {
  try {
    const drAreas = getDailyReportAreas();
    // Also include general areas
    let generalAreas = [];
    try {
      generalAreas = db.prepare('SELECT name FROM areas ORDER BY name').all().map(a => a.name);
    } catch (e) { /* ignore */ }
    
    const combined = [...new Set([...drAreas, ...generalAreas])];
    // Return default areas if empty
    if (combined.length === 0) {
      res.json(DEFAULT_AREAS);
    } else {
      res.json(combined);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get daily report for a specific date and area (for auto-fill) - MUST be before :id route
router.get('/daily-reports/by-date-area', authenticateToken, (req, res) => {
  try {
    const { date, area } = req.query;
    if (!date || !area) {
      return res.status(400).json({ error: 'Date and area are required' });
    }
    
    const report = db.prepare('SELECT * FROM daily_reports WHERE date = ? AND area = ?').get(date, area);
    if (!report) {
      return res.json({ found: false, equipment_list: DEFAULT_EQUIPMENT });
    }
    
    const equipment = db.prepare('SELECT * FROM daily_report_equipment WHERE daily_report_id = ?').all(report.id);
    res.json({ found: true, report, equipment, equipment_list: DEFAULT_EQUIPMENT });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all daily reports with filtering
router.get('/daily-reports', authenticateToken, (req, res) => {
  try {
    const { date, area, range } = req.query;
    let sql = 'SELECT * FROM daily_reports WHERE 1=1';
    const params = [];
    
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (area) {
      sql += ' AND area = ?';
      params.push(area);
    }
    if (range === 'today') {
      sql += " AND date = date('now')";
    } else if (range === 'week') {
      sql += " AND date >= date('now', '-7 days')";
    } else if (range === 'month') {
      sql += " AND date >= date('now', '-30 days')";
    }
    
    sql += ' ORDER BY date DESC, area ASC';
    const reports = db.prepare(sql).all(...params);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single daily report with equipment
router.get('/daily-reports/:id', authenticateToken, (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM daily_reports WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const equipment = db.prepare('SELECT * FROM daily_report_equipment WHERE daily_report_id = ?').all(report.id);
    res.json({ report, equipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or update daily report
router.post('/daily-reports', authenticateToken, (req, res) => {
  try {
    const { date, area, location, total_manpower, manpower_cat, manpower_rental, equipment_cat, equipment_rental } = req.body;
    
    if (!date || !area) {
      return res.status(400).json({ error: 'Date and area are required' });
    }
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
    
    // Check if report already exists for this date and area
    const existing = db.prepare('SELECT * FROM daily_reports WHERE date = ? AND area = ?').get(date, area);
    
    let reportId;
    if (existing) {
      // Update existing report
      db.prepare(`
        UPDATE daily_reports SET 
          location = ?, total_manpower = ?, manpower_cat = ?, manpower_rental = ?,
          updated_by_id = ?, updated_by_name = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(location, total_manpower || 0, manpower_cat || 0, manpower_rental || 0, req.user.id, user.name, existing.id);
      reportId = existing.id;
      
      // Delete old equipment entries
      db.prepare('DELETE FROM daily_report_equipment WHERE daily_report_id = ?').run(reportId);
    } else {
      // Create new report
      const result = db.prepare(`
        INSERT INTO daily_reports (date, area, location, total_manpower, manpower_cat, manpower_rental, created_by_id, created_by_name, updated_by_id, updated_by_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(date, area, location, total_manpower || 0, manpower_cat || 0, manpower_rental || 0, req.user.id, user.name, req.user.id, user.name);
      reportId = result.lastInsertRowid;
    }
    
    // Insert equipment entries (CAT)
    const insertEquip = db.prepare('INSERT INTO daily_report_equipment (daily_report_id, equipment_name, category, quantity) VALUES (?, ?, ?, ?)');
    if (equipment_cat) {
      Object.entries(equipment_cat).forEach(([name, qty]) => {
        if (qty && parseInt(qty) > 0) {
          insertEquip.run(reportId, name, 'CAT', parseInt(qty));
        }
      });
    }
    
    // Insert equipment entries (Rental)
    if (equipment_rental) {
      Object.entries(equipment_rental).forEach(([name, qty]) => {
        if (qty && parseInt(qty) > 0) {
          insertEquip.run(reportId, name, 'RENTAL', parseInt(qty));
        }
      });
    }
    
    const report = db.prepare('SELECT * FROM daily_reports WHERE id = ?').get(reportId);
    const equipment = db.prepare('SELECT * FROM daily_report_equipment WHERE daily_report_id = ?').all(reportId);
    
    res.json({ success: true, report, equipment, isUpdate: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete daily report
router.delete('/daily-reports/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM daily_report_equipment WHERE daily_report_id = ?').run(req.params.id);
    const result = db.prepare('DELETE FROM daily_reports WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get area summary statistics (for profile dashboard)
router.get('/area-summary/:area', authenticateToken, (req, res) => {
  try {
    const area = decodeURIComponent(req.params.area);
    const today = new Date().toISOString().split('T')[0];
    
    // Get permits count for area
    const permits = db.prepare("SELECT COUNT(*) as count FROM permits WHERE area = ?").get(area);
    const activePermits = db.prepare("SELECT COUNT(*) as count FROM permits WHERE area = ? AND status = 'Active'").get(area);
    
    // Get open observations for area
    const openObs = db.prepare("SELECT COUNT(*) as count FROM observations WHERE area = ? AND status = 'Open'").get(area);
    const totalObs = db.prepare("SELECT COUNT(*) as count FROM observations WHERE area = ?").get(area);
    
    // Get equipment count for area (from equipment table)
    const equipment = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE yard_area = ?").get(area);
    
    // Get today's daily report for area
    const dailyReport = db.prepare("SELECT * FROM daily_reports WHERE date = ? AND area = ?").get(today, area);
    
    let manpower = { total: 0, cat: 0, rental: 0 };
    let dailyEquipment = { cat: 0, rental: 0, items: [] };
    
    if (dailyReport) {
      manpower = {
        total: dailyReport.total_manpower || 0,
        cat: dailyReport.manpower_cat || 0,
        rental: dailyReport.manpower_rental || 0
      };
      
      const equipItems = db.prepare("SELECT * FROM daily_report_equipment WHERE daily_report_id = ?").all(dailyReport.id);
      dailyEquipment.items = equipItems;
      equipItems.forEach(item => {
        if (item.category === 'CAT') dailyEquipment.cat += item.quantity;
        else if (item.category === 'RENTAL') dailyEquipment.rental += item.quantity;
      });
    }
    
    res.json({
      area,
      permits: { total: permits.count, active: activePermits.count },
      observations: { total: totalObs.count, open: openObs.count },
      equipment: { registered: equipment.count, daily: dailyEquipment },
      manpower,
      hasTodayReport: !!dailyReport,
      dailyReport
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user's assigned area
router.put('/users/assigned-area', authenticateToken, (req, res) => {
  try {
    const { assigned_area } = req.body;
    db.prepare('UPDATE users SET assigned_area = ? WHERE id = ?').run(assigned_area || null, req.user.id);
    const user = db.prepare('SELECT id, employee_id, name, role, points, level, assigned_area, profile_pic FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile with area
router.get('/users/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, employee_id, name, role, points, level, assigned_area, profile_pic, badges, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== EQUIPMENT REGISTRY ADMIN API ==========

// Get all equipment in registry
router.get('/admin/equipment-registry', authenticateToken, requireAdmin, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM equipment_registry ORDER BY sort_order, name').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new equipment to registry
router.post('/admin/equipment-registry', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, category, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const result = db.prepare('INSERT INTO equipment_registry (name, category, sort_order) VALUES (?, ?, ?)').run(name, category || 'BOTH', sort_order || 999);
    const item = db.prepare('SELECT * FROM equipment_registry WHERE id = ?').get(result.lastInsertRowid);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update equipment in registry
router.put('/admin/equipment-registry/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, category, sort_order } = req.body;
    db.prepare('UPDATE equipment_registry SET name = COALESCE(?, name), category = COALESCE(?, category), sort_order = COALESCE(?, sort_order) WHERE id = ?').run(name, category, sort_order, req.params.id);
    const item = db.prepare('SELECT * FROM equipment_registry WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete equipment from registry
router.delete('/admin/equipment-registry/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM equipment_registry WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DAILY REPORT AREAS ADMIN API ==========

// Get all daily report areas
router.get('/admin/daily-report-areas', authenticateToken, requireAdmin, (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM daily_report_areas ORDER BY sort_order, name').all();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new daily report area
router.post('/admin/daily-report-areas', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const result = db.prepare('INSERT INTO daily_report_areas (name, sort_order) VALUES (?, ?)').run(name, sort_order || 999);
    const item = db.prepare('SELECT * FROM daily_report_areas WHERE id = ?').get(result.lastInsertRowid);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update daily report area
router.put('/admin/daily-report-areas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    db.prepare('UPDATE daily_report_areas SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?').run(name, sort_order, req.params.id);
    const item = db.prepare('SELECT * FROM daily_report_areas WHERE id = ?').get(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete daily report area
router.delete('/admin/daily-report-areas/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM daily_report_areas WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all daily reports for admin registry view
router.get('/admin/daily-reports', authenticateToken, requireAdmin, (req, res) => {
  try {
    const reports = db.prepare('SELECT * FROM daily_reports ORDER BY date DESC, area ASC').all();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USER PROFILE ENDPOINTS ==========

// Get current user's profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, employee_id, name, role, points, level, streak, profile_pic, 
             phone, email, bio, assigned_area, badges, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user's profile (phone, email, bio, profile_pic only - NOT name/employee_id)
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { phone, email, bio, profile_pic } = req.body;
    
    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    db.prepare(`
      UPDATE users SET 
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        bio = COALESCE(?, bio),
        profile_pic = COALESCE(?, profile_pic)
      WHERE id = ?
    `).run(
      phone || null,
      email || null,
      bio || null,
      profile_pic || null,
      req.user.id
    );
    
    const updated = db.prepare(`
      SELECT id, employee_id, name, role, points, level, streak, profile_pic,
             phone, email, bio, assigned_area, badges, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin update user profile (can update name and employee_id)
router.put('/admin/users/:id/profile', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, employee_id, phone, email, bio, assigned_area, role } = req.body;
    
    // Check if employee_id already exists for different user
    if (employee_id) {
      const existing = db.prepare('SELECT id FROM users WHERE employee_id = ? AND id != ?').get(employee_id, req.params.id);
      if (existing) {
        return res.status(400).json({ error: 'Employee ID already in use' });
      }
    }
    
    db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name),
        employee_id = COALESCE(?, employee_id),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        bio = COALESCE(?, bio),
        assigned_area = COALESCE(?, assigned_area),
        role = COALESCE(?, role)
      WHERE id = ?
    `).run(name, employee_id, phone, email, bio, assigned_area, role, req.params.id);
    
    const updated = db.prepare(`
      SELECT id, employee_id, name, role, points, level, streak, profile_pic,
             phone, email, bio, assigned_area, badges, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USERS DIRECTORY ENDPOINTS ==========

// Search users (for Users Info tool)
router.get('/users', authenticateToken, (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let users;
    let total;
    
    if (query && query.trim().length >= 2) {
      const searchTerm = `%${query.trim()}%`;
      users = db.prepare(`
        SELECT id, employee_id, name, role, position, points, level, streak, profile_pic,
               phone, email, bio, assigned_area
        FROM users 
        WHERE approved = 1 AND (
          name LIKE ? OR employee_id LIKE ?
        )
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `).all(searchTerm, searchTerm, parseInt(limit), offset);
      
      total = db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE approved = 1 AND (name LIKE ? OR employee_id LIKE ?)
      `).get(searchTerm, searchTerm).count;
    } else {
      // Return all approved users if no search query
      users = db.prepare(`
        SELECT id, employee_id, name, role, position, points, level, streak, profile_pic,
               phone, email, bio, assigned_area
        FROM users 
        WHERE approved = 1
        ORDER BY name ASC
        LIMIT ? OFFSET ?
      `).all(parseInt(limit), offset);
      
      total = db.prepare('SELECT COUNT(*) as count FROM users WHERE approved = 1').get().count;
    }
    
    res.json({
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific user's public profile
router.get('/users/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, employee_id, name, role, position, points, level, streak, profile_pic,
             phone, email, bio, assigned_area, badges, created_at
      FROM users 
      WHERE id = ? AND approved = 1
    `).get(req.params.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TASK REQUESTS / INBOX ENDPOINTS ==========

const SUPERVISOR_POSITIONS = ['Safety Supervisor', 'Safety Coordinator', 'Safety Manager'];

// Check if user can send task requests (supervisor and above, or admin role)
function canSendTaskRequests(user) {
  return user && (user.role === 'admin' || SUPERVISOR_POSITIONS.includes(user.position));
}

// Get inbox (received task requests)
router.get('/inbox', authenticateToken, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT * FROM task_requests 
      WHERE recipient_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get sent task requests (for supervisors)
router.get('/inbox/sent', authenticateToken, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT * FROM task_requests 
      WHERE sender_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread counts (for notification badges)
router.get('/inbox/unread-count', authenticateToken, (req, res) => {
  try {
    const taskCount = db.prepare(`
      SELECT COUNT(*) as count FROM task_requests 
      WHERE recipient_id = ? AND is_read = 0
    `).get(req.user.id).count;
    
    // Count unread news
    const totalNews = db.prepare('SELECT COUNT(*) as count FROM news').get().count;
    const readNews = db.prepare(`
      SELECT COUNT(*) as count FROM news_read_status WHERE user_id = ?
    `).get(req.user.id).count;
    const newsCount = totalNews - readNews;
    
    // Fetch full user to check role and position
    const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const isAdmin = fullUser && fullUser.role === 'admin';
    const isSupervisor = fullUser && SUPERVISOR_POSITIONS.includes(fullUser.position);
    
    res.json({ 
      tasks: taskCount, 
      news: newsCount > 0 ? newsCount : 0,
      canSendTasks: isAdmin || isSupervisor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a task request (supervisors only)
router.post('/inbox/send', authenticateToken, (req, res) => {
  try {
    // Verify sender is admin or supervisor position
    const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const isAdmin = sender && sender.role === 'admin';
    const isSupervisor = sender && SUPERVISOR_POSITIONS.includes(sender.position);
    
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ error: 'Only admins, supervisors, coordinators, and managers can send task requests' });
    }
    
    const { recipient_id, message } = req.body;
    if (!recipient_id || !message) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }
    
    const recipient = db.prepare('SELECT id, name FROM users WHERE id = ? AND approved = 1').get(recipient_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    
    const result = db.prepare(`
      INSERT INTO task_requests (sender_id, sender_name, recipient_id, recipient_name, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, sender.name, recipient_id, recipient.name, message);
    
    const newRequest = db.prepare('SELECT * FROM task_requests WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark task request as read
router.put('/inbox/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE task_requests SET is_read = 1 WHERE id = ? AND recipient_id = ?
    `).run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Respond to a task request (with optional attachment)
router.put('/inbox/:id/respond', authenticateToken, upload.single('attachment'), (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM task_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Task request not found' });
    }
    if (request.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only respond to your own task requests' });
    }
    
    const { response_text } = req.body;
    const attachment = req.file ? `/uploads/${req.file.filename}` : null;
    
    if (!response_text && !attachment) {
      return res.status(400).json({ error: 'Response text or attachment is required' });
    }
    
    db.prepare(`
      UPDATE task_requests 
      SET status = 'completed', 
          response_text = ?, 
          response_attachment = ?,
          responded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(response_text || null, attachment, req.params.id);
    
    const updated = db.prepare('SELECT * FROM task_requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark news as read
router.post('/news/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO news_read_status (user_id, news_id) VALUES (?, ?)
    `).run(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get users list for sending tasks (supervisors only)
router.get('/inbox/recipients', authenticateToken, (req, res) => {
  try {
    const sender = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    
    // Allow admin role OR supervisor positions to access recipient list
    const isAdmin = sender && sender.role === 'admin';
    const isSupervisor = sender && SUPERVISOR_POSITIONS.includes(sender.position);
    
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ error: 'Only admins and supervisors can access recipient list' });
    }
    
    const users = db.prepare(`
      SELECT id, name, employee_id, position, assigned_area 
      FROM users 
      WHERE approved = 1 AND id != ?
      ORDER BY name ASC
    `).all(req.user.id);
    
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
