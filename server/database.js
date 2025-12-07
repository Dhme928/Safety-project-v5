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
    approved INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    level TEXT DEFAULT 'Bronze',
    streak INTEGER DEFAULT 0,
    profile_pic TEXT,
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
    badge_reward TEXT,
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

// Migration: Add approved and profile_pic columns if they don't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN profile_pic TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add new observation columns for enhanced form
try {
  db.exec(`ALTER TABLE observations ADD COLUMN activity_type TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE observations ADD COLUMN observation_class TEXT DEFAULT 'Negative'`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE observations ADD COLUMN injury_type TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE observations ADD COLUMN injury_body_part TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add badge_reward column to challenges if it doesn't exist
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN badge_reward TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add badges column to users if it doesn't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN badges TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add corrective action tracking columns to observations
try {
  db.exec(`ALTER TABLE observations ADD COLUMN corrective_action_status TEXT DEFAULT 'Not Started'`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE observations ADD COLUMN corrective_action_due_date TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE observations ADD COLUMN corrective_action_assigned_to TEXT`);
} catch (e) { /* Column already exists */ }

// Create areas table for dropdown with add-new functionality
db.exec(`
  CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed default areas if empty
const areaCount = db.prepare('SELECT COUNT(*) as count FROM areas').get();
if (areaCount.count === 0) {
  const defaultAreas = [
    'Hydro-test Area', 'Fabrication Yard', 'Pipe Yard', 'Welding Shop',
    'Storage Area', 'Office Area', 'Workshop', 'Loading Area',
    'Parking Area', 'Main Gate', 'Camp Area', 'Warehouse'
  ];
  const insertArea = db.prepare('INSERT OR IGNORE INTO areas (name) VALUES (?)');
  defaultAreas.forEach(area => insertArea.run(area));
}

const adminExists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('ADMIN001');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (employee_id, name, password, role, points, level, approved)
    VALUES (?, ?, ?, 'admin', 100, 'Gold', 1)
  `).run('ADMIN001', 'System Admin', hashedPassword);
  console.log('Default admin created: ADMIN001 / admin123');
} else {
  // Ensure admin is always approved
  db.prepare('UPDATE users SET approved = 1 WHERE employee_id = ?').run('ADMIN001');
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
