const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '../data/safety.db'));

function initializeDatabase() {
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
      last_activity DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      risk_level TEXT DEFAULT 'low',
      status TEXT DEFAULT 'open',
      cause TEXT,
      corrective_action TEXT,
      evidence_urls TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS permits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      permit_type TEXT NOT NULL,
      area TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      valid_from DATE,
      valid_to DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      equipment_type TEXT NOT NULL,
      equipment_id TEXT UNIQUE,
      location TEXT,
      status TEXT DEFAULT 'operational',
      last_inspection DATE,
      next_inspection DATE,
      notes TEXT,
      pwas_required TEXT DEFAULT 'no',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS points_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      points INTEGER,
      action TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const adminExists = db.prepare('SELECT * FROM users WHERE employee_id = ?').get('ADMIN001');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (employee_id, name, password, role, points)
      VALUES (?, ?, ?, ?, ?)
    `).run('ADMIN001', 'Administrator', hashedPassword, 'admin', 100);
    console.log('Admin user created: ADMIN001 / admin123');
  }

  require('fs').mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  require('fs').mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
}

function calculateLevel(points) {
  if (points >= 500) return 'Platinum';
  if (points >= 200) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'Bronze';
}

function addPoints(userId, points, action, description) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return null;
  
  const newPoints = user.points + points;
  const newLevel = calculateLevel(newPoints);
  
  db.prepare('UPDATE users SET points = ?, level = ?, last_activity = DATE("now") WHERE id = ?')
    .run(newPoints, newLevel, userId);
  
  db.prepare('INSERT INTO points_history (user_id, points, action, description) VALUES (?, ?, ?, ?)')
    .run(userId, points, action, description);
  
  return { points: newPoints, level: newLevel };
}

module.exports = { db, initializeDatabase, addPoints, calculateLevel };
