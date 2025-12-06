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
    language TEXT DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    time TEXT,
    area TEXT,
    location TEXT,
    activity_type TEXT,
    observation_class TEXT DEFAULT 'Negative',
    observation_type TEXT,
    has_injury INTEGER DEFAULT 0,
    injury_type TEXT,
    description TEXT,
    direct_cause TEXT,
    root_cause TEXT,
    immediate_action TEXT,
    corrective_action TEXT,
    responsible_person TEXT,
    due_date TEXT,
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
    title_ar TEXT,
    title_ur TEXT,
    description TEXT,
    description_ar TEXT,
    description_ur TEXT,
    points INTEGER DEFAULT 10,
    badge_icon TEXT,
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

  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_ar TEXT,
    name_ur TEXT,
    description TEXT,
    description_ar TEXT,
    description_ur TEXT,
    icon TEXT,
    points_required INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    badge_id INTEGER,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (badge_id) REFERENCES badges(id)
  );
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 0`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN profile_pic TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN activity_type TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN observation_class TEXT DEFAULT 'Negative'`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN has_injury INTEGER DEFAULT 0`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN injury_type TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN title_ar TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN title_ur TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN description_ar TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN description_ur TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN badge_icon TEXT`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE observations ADD COLUMN responsible_person TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN responsible_person_id TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN due_date TEXT`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE observations ADD COLUMN close_evidence_urls TEXT`);
} catch (e) {}

const adminExists = db.prepare('SELECT id FROM users WHERE employee_id = ?').get('ADMIN001');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (employee_id, name, password, role, approved, points, level)
    VALUES (?, ?, ?, 'admin', 1, 100, 'Gold')
  `).run('ADMIN001', 'System Admin', hashedPassword);
  console.log('Default admin created: ADMIN001 / admin123');
} else {
  db.prepare('UPDATE users SET approved = 1 WHERE employee_id = ?').run('ADMIN001');
}

const badgesExist = db.prepare('SELECT COUNT(*) as count FROM badges').get();
if (badgesExist.count === 0) {
  const badges = [
    { name: 'Safety Starter', name_ar: 'بداية السلامة', name_ur: 'سیفٹی اسٹارٹر', desc: 'Earned 50+ points', desc_ar: 'حصل على 50+ نقطة', desc_ur: '50+ پوائنٹس حاصل کیے', icon: 'fa-shield-alt', points: 50 },
    { name: 'Safety Bronze', name_ar: 'برونز السلامة', name_ur: 'سیفٹی برانز', desc: 'Earned 100+ points', desc_ar: 'حصل على 100+ نقطة', desc_ur: '100+ پوائنٹس حاصل کیے', icon: 'fa-medal', points: 100 },
    { name: 'Safety Silver', name_ar: 'فضة السلامة', name_ur: 'سیفٹی سلور', desc: 'Earned 150+ points', desc_ar: 'حصل على 150+ نقطة', desc_ur: '150+ پوائنٹس حاصل کیے', icon: 'fa-award', points: 150 },
    { name: 'Safety Gold', name_ar: 'ذهب السلامة', name_ur: 'سیفٹی گولڈ', desc: 'Earned 200+ points', desc_ar: 'حصل على 200+ نقطة', desc_ur: '200+ پوائنٹس حاصل کیے', icon: 'fa-trophy', points: 200 },
    { name: 'Safety Hero', name_ar: 'بطل السلامة', name_ur: 'سیفٹی ہیرو', desc: 'Earned 300+ points', desc_ar: 'حصل على 300+ نقطة', desc_ur: '300+ پوائنٹس حاصل کیے', icon: 'fa-crown', points: 300 },
    { name: 'Safety Legend', name_ar: 'أسطورة السلامة', name_ur: 'سیفٹی لیجنڈ', desc: 'Earned 500+ points', desc_ar: 'حصل على 500+ نقطة', desc_ur: '500+ پوائنٹس حاصل کیے', icon: 'fa-star', points: 500 }
  ];
  
  const insertBadge = db.prepare('INSERT INTO badges (name, name_ar, name_ur, description, description_ar, description_ur, icon, points_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  badges.forEach(b => insertBadge.run(b.name, b.name_ar, b.name_ur, b.desc, b.desc_ar, b.desc_ur, b.icon, b.points));
}

const challengesExist = db.prepare('SELECT COUNT(*) as count FROM challenges').get();
if (challengesExist.count === 0) {
  const challenges = [
    { title: 'Report a Safety Observation', title_ar: 'أبلغ عن ملاحظة سلامة', title_ur: 'سیفٹی مشاہدہ رپورٹ کریں', desc: 'Submit at least one safety observation today', desc_ar: 'قدم ملاحظة سلامة واحدة على الأقل اليوم', desc_ur: 'آج کم از کم ایک سیفٹی مشاہدہ جمع کروائیں', points: 15 },
    { title: 'Attend Toolbox Talk', title_ar: 'حضور اجتماع السلامة', title_ur: 'ٹول باکس ٹاک میں شرکت', desc: 'Participate in today\'s TBT session', desc_ar: 'شارك في جلسة TBT اليوم', desc_ur: 'آج کے TBT سیشن میں حصہ لیں', points: 12 },
    { title: 'PPE Check Champion', title_ar: 'بطل فحص معدات الحماية', title_ur: 'PPE چیک چیمپئن', desc: 'Complete a full PPE inspection', desc_ar: 'أكمل فحص معدات الحماية الشخصية', desc_ur: 'مکمل PPE معائنہ مکمل کریں', points: 10 },
    { title: 'Hazard Hunter', title_ar: 'صائد المخاطر', title_ur: 'خطرے کا شکاری', desc: 'Identify and report 3 hazards', desc_ar: 'حدد وأبلغ عن 3 مخاطر', desc_ur: '3 خطرات کی شناخت اور رپورٹ کریں', points: 20 },
    { title: 'Safety First Friday', title_ar: 'جمعة السلامة أولاً', title_ur: 'سیفٹی فرسٹ فرائیڈے', desc: 'Complete all safety tasks on Friday', desc_ar: 'أكمل جميع مهام السلامة يوم الجمعة', desc_ur: 'جمعہ کو تمام سیفٹی کام مکمل کریں', points: 25 }
  ];
  
  const insertChallenge = db.prepare('INSERT INTO challenges (title, title_ar, title_ur, description, description_ar, description_ur, points, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
  challenges.forEach(c => insertChallenge.run(c.title, c.title_ar, c.title_ur, c.desc, c.desc_ar, c.desc_ur, c.points));
}

function updateUserLevel(userId) {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId);
  if (!user) return;
  
  let level = 'Bronze';
  if (user.points >= 500) level = 'Platinum';
  else if (user.points >= 200) level = 'Gold';
  else if (user.points >= 50) level = 'Silver';
  
  db.prepare('UPDATE users SET level = ? WHERE id = ?').run(level, userId);
  
  const earnedBadges = db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId);
  const earnedIds = earnedBadges.map(b => b.badge_id);
  const availableBadges = db.prepare('SELECT * FROM badges WHERE points_required <= ?').all(user.points);
  
  availableBadges.forEach(badge => {
    if (!earnedIds.includes(badge.id)) {
      db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
    }
  });
}

function awardPoints(userId, points, reason) {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, userId);
  db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(userId, points, reason);
  updateUserLevel(userId);
}

module.exports = { db, updateUserLevel, awardPoints };
