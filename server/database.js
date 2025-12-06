const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../data/safety.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Bronze',
    streak INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    time TEXT,
    area TEXT,
    location TEXT,
    observation_type TEXT,
    description TEXT,
    direct_cause TEXT,
    root_cause TEXT,
    immediate_action TEXT,
    corrective_action TEXT,
    risk_level TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    reported_by TEXT,
    reported_by_id TEXT,
    closed_by TEXT,
    closed_date TEXT,
    closed_notes TEXT,
    evidence_urls TEXT,
    close_evidence_urls TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS permits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    area TEXT,
    permit_type TEXT,
    permit_number TEXT,
    project TEXT,
    receiver TEXT,
    issuer TEXT,
    description TEXT,
    status TEXT DEFAULT 'Active',
    created_by TEXT,
    closed_by TEXT,
    closed_date TEXT,
    closed_notes TEXT,
    evidence_urls TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_number TEXT,
    equipment_type TEXT,
    owner TEXT,
    yard_area TEXT,
    status TEXT DEFAULT 'In Service',
    pwas_required TEXT,
    tps_date TEXT,
    tps_expiry TEXT,
    ins_date TEXT,
    ins_expiry TEXT,
    operator_name TEXT,
    operator_license TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS toolbox_talks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    topic TEXT,
    presenter TEXT,
    area TEXT,
    attendance INTEGER DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'Completed',
    is_tbt_of_day INTEGER DEFAULT 0,
    evidence_urls TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'normal',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 10,
    challenge_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS challenge_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    challenge_id INTEGER,
    evidence_url TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
  );

  CREATE TABLE IF NOT EXISTS points_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    points INTEGER,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const adminExists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('ADMIN001');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (employee_id, name, password, role, points, level)
    VALUES (?, ?, ?, 'admin', 100, 'Gold')
  `).run('ADMIN001', 'System Admin', hashedPassword);
  console.log('Default admin created: ADMIN001 / admin123');
}

function updateUserLevel(userId) {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!user) return;
  
  let level = 'Bronze';
  if (user.points >= 500) level = 'Platinum';
  else if (user.points >= 200) level = 'Gold';
  else if (user.points >= 50) level = 'Silver';
  
  db.prepare('UPDATE users SET level = ? WHERE id = ?').run(level, userId);
}

function awardPoints(userId, points, reason) {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);
  db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(userId, points, reason);
  updateUserLevel(userId);
}

module.exports = { db, updateUserLevel, awardPoints };
