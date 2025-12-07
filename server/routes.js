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

router.post('/upload', authenticateToken, upload.array('photos', 5), (req, res) => {
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

router.get('/stats', optionalAuth, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const obsToday = db.prepare("SELECT COUNT(*) as count FROM observations WHERE date = ?").get(today);
    const obsOpen = db.prepare("SELECT COUNT(*) as count FROM observations WHERE status = 'Open'").get();
    const obsClosed = db.prepare("SELECT COUNT(*) as count FROM observations WHERE status = 'Closed'").get();
    const obsTotal = db.prepare("SELECT COUNT(*) as count FROM observations").get();
    
    const permitsToday = db.prepare("SELECT COUNT(*) as count FROM permits WHERE date = ?").get(today);
    const permitsTotal = db.prepare("SELECT COUNT(*) as count FROM permits").get();
    const uniqueAreas = db.prepare("SELECT COUNT(DISTINCT area) as count FROM permits").get();
    
    const tbtToday = db.prepare("SELECT COUNT(*) as count FROM toolbox_talks WHERE date = ?").get(today);
    const tbtTotal = db.prepare("SELECT COUNT(*) as count FROM toolbox_talks").get();
    
    const eqTotal = db.prepare("SELECT COUNT(*) as count FROM equipment").get();
    const tpsExpiring = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE tps_expiry <= date('now', '+30 days')").get();
    const insExpiring = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE ins_expiry <= date('now', '+30 days')").get();
    
    res.json({
      observations: { today: obsToday.count, open: obsOpen.count, closed: obsClosed.count, total: obsTotal.count },
      permits: { today: permitsToday.count, total: permitsTotal.count, areas: uniqueAreas.count },
      toolboxTalks: { today: tbtToday.count, total: tbtTotal.count },
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

router.get('/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT name FROM areas ORDER BY name").all();
    res.json(areas.map(a => a.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/areas', authenticateToken, (req, res) => {
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

router.get('/challenges', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const challenges = db.prepare("SELECT * FROM challenges WHERE is_active = 1 AND (challenge_date = ? OR challenge_date IS NULL) ORDER BY created_at DESC").all(today);
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/challenges/my-completions', authenticateToken, (req, res) => {
  try {
    const completions = db.prepare('SELECT challenge_id FROM challenge_completions WHERE user_id = ?').all(req.user.id);
    res.json(completions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, description, points, badge_reward, challenge_date } = req.body;
    
    const result = db.prepare(`
      INSERT INTO challenges (title, description, points, badge_reward, challenge_date, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(title, description, points || 10, badge_reward || null, challenge_date);
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(result.lastInsertRowid);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/challenges/:id/complete', authenticateToken, (req, res) => {
  try {
    const { evidence_url } = req.body;
    const challengeId = req.params.id;
    
    const existing = db.prepare('SELECT * FROM challenge_completions WHERE user_id = ? AND challenge_id = ?').get(req.user.id, challengeId);
    if (existing) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }
    
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    db.prepare('INSERT INTO challenge_completions (user_id, challenge_id, evidence_url) VALUES (?, ?, ?)').run(req.user.id, challengeId, evidence_url);
    
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
    
    res.json({ success: true, points_earned: challenge.points, badge_earned });
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
        SELECT u.id, u.employee_id, u.name, u.points, u.level, COALESCE(SUM(ph.points), 0) as monthly_points
        FROM users u
        LEFT JOIN points_history ph ON u.id = ph.user_id AND ph.created_at >= ?
        WHERE u.approved = 1
        GROUP BY u.id
        ORDER BY monthly_points DESC, u.points DESC
        LIMIT 50
      `).all(startOfMonth);
    } else {
      users = db.prepare('SELECT id, employee_id, name, points, level FROM users WHERE approved = 1 ORDER BY points DESC LIMIT 50').all();
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

router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, role, points, level, approved, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/pending', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, role, points, level, created_at FROM users WHERE approved = 0 ORDER BY created_at DESC').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT id, employee_id, name, role, points, level, approved FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ? AND approved = 0').run(req.params.id);
    res.json({ success: true });
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
      if (date.includes('/')) {
        const parts = date.split('/');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else {
            date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
      }
      
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

module.exports = router;
