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
    position TEXT DEFAULT 'Safety Officer',
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

  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    observation_id INTEGER NOT NULL,
    verified_by INTEGER NOT NULL,
    remarks TEXT NOT NULL,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('APPROVED', 'REJECTED')),
    FOREIGN KEY (observation_id) REFERENCES observations(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS status_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    changed_by INTEGER,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (changed_by) REFERENCES users(id)
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

// Create dropdown settings tables for customizable form options
db.exec(`
  CREATE TABLE IF NOT EXISTS activity_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS observation_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS direct_causes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS root_causes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS permit_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS permit_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS yard_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tbt_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tbt_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create quiz_questions table
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    category TEXT,
    explanation TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create quiz_results table
db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    quiz_date TEXT,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 10,
    answers TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Migration: Add challenge_type column to challenges
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN challenge_type TEXT DEFAULT 'daily'`);
} catch (e) { /* Column already exists */ }

// Migration: Add comments column to challenge_completions
try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN comments TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add photo_required column to challenges
try {
  db.exec(`ALTER TABLE challenges ADD COLUMN photo_required INTEGER DEFAULT 1`);
} catch (e) { /* Column already exists */ }

// Migration: Add period tracking columns to challenge_completions
try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN period_start TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN period_end TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN evidence_urls TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN status TEXT DEFAULT 'submitted'`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE challenge_completions ADD COLUMN awarded_points INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }

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

// Seed Aramco safety quiz questions if empty
const seedQuizQuestions = [
  // CSM Requirements (5 questions)
  { question: 'What does CSM stand for in Aramco contractor requirements?', option_a: 'Contractor Safety Manual', option_b: 'Company Safety Management', option_c: 'Construction Safety Measures', option_d: 'Corporate Safety Methods', correct_answer: 'A', category: 'CSM Requirements', explanation: 'CSM stands for Contractor Safety Manual, which outlines all safety requirements for contractors working on Aramco projects.' },
  { question: 'How often must contractors submit safety performance reports to Aramco?', option_a: 'Daily', option_b: 'Weekly', option_c: 'Monthly', option_d: 'Quarterly', correct_answer: 'C', category: 'CSM Requirements', explanation: 'Contractors are required to submit monthly safety performance reports as per CSM requirements.' },
  { question: 'What is the minimum safety orientation duration for new workers on Aramco projects?', option_a: '1 hour', option_b: '4 hours', option_c: '8 hours', option_d: '16 hours', correct_answer: 'C', category: 'CSM Requirements', explanation: 'New workers must complete at least 8 hours of safety orientation before starting work on Aramco projects.' },
  { question: 'Which document must be displayed at every Aramco work site?', option_a: 'Company profile', option_b: 'Emergency response plan', option_c: 'Employee list', option_d: 'Project schedule', correct_answer: 'B', category: 'CSM Requirements', explanation: 'Emergency response plans must be prominently displayed at all work sites for quick reference during emergencies.' },
  { question: 'What is the maximum time allowed to report a safety incident to Aramco?', option_a: '1 hour', option_b: '4 hours', option_c: '24 hours', option_d: '48 hours', correct_answer: 'C', category: 'CSM Requirements', explanation: 'All safety incidents must be reported within 24 hours as per Aramco CSM requirements.' },
  
  // PPE Standards (8 questions)
  { question: 'What type of safety boots are required on Aramco construction sites?', option_a: 'Rubber boots', option_b: 'Steel-toe boots', option_c: 'Leather boots', option_d: 'Canvas boots', correct_answer: 'B', category: 'PPE Standards', explanation: 'Steel-toe safety boots are mandatory on all Aramco construction sites to protect feet from falling objects and punctures.' },
  { question: 'When must safety glasses be worn on an Aramco project site?', option_a: 'Only during welding', option_b: 'Only in designated areas', option_c: 'At all times on site', option_d: 'Only during grinding', correct_answer: 'C', category: 'PPE Standards', explanation: 'Safety glasses must be worn at all times while on Aramco project sites to protect eyes from debris and hazards.' },
  { question: 'What is the minimum standard for hard hats on Aramco sites?', option_a: 'ANSI Z89.1', option_b: 'EN 397', option_c: 'Both A and B are acceptable', option_d: 'No specific standard required', correct_answer: 'C', category: 'PPE Standards', explanation: 'Hard hats must comply with ANSI Z89.1 or EN 397 standards for use on Aramco sites.' },
  { question: 'How often must fall protection harnesses be inspected?', option_a: 'Before each use', option_b: 'Weekly', option_c: 'Monthly', option_d: 'Annually', correct_answer: 'A', category: 'PPE Standards', explanation: 'Fall protection harnesses must be inspected before each use to ensure they are in safe working condition.' },
  { question: 'What color hard hat indicates a visitor on Aramco sites?', option_a: 'White', option_b: 'Yellow', option_c: 'Green', option_d: 'Blue', correct_answer: 'C', category: 'PPE Standards', explanation: 'Green hard hats are typically used to identify visitors on Aramco sites for easy recognition.' },
  { question: 'When working with chemicals, what minimum PPE is required?', option_a: 'Gloves only', option_b: 'Goggles only', option_c: 'Chemical-resistant gloves, goggles, and apron', option_d: 'Face shield only', correct_answer: 'C', category: 'PPE Standards', explanation: 'Chemical handling requires chemical-resistant gloves, goggles, and an apron as minimum protection.' },
  { question: 'What type of gloves should be used for handling hot materials?', option_a: 'Leather gloves', option_b: 'Cotton gloves', option_c: 'Heat-resistant gloves', option_d: 'Rubber gloves', correct_answer: 'C', category: 'PPE Standards', explanation: 'Heat-resistant gloves are specifically designed to protect hands from burns when handling hot materials.' },
  { question: 'When is hearing protection required on Aramco sites?', option_a: 'When noise exceeds 75 dB', option_b: 'When noise exceeds 85 dB', option_c: 'When noise exceeds 95 dB', option_d: 'Only in designated areas', correct_answer: 'B', category: 'PPE Standards', explanation: 'Hearing protection is mandatory when noise levels exceed 85 dB to prevent hearing damage.' },
  
  // Work Permits (8 questions)
  { question: 'What permit is required before performing welding or cutting operations?', option_a: 'Cold Work Permit', option_b: 'Hot Work Permit', option_c: 'General Work Permit', option_d: 'Excavation Permit', correct_answer: 'B', category: 'Work Permits', explanation: 'A Hot Work Permit is required for any work involving welding, cutting, or open flame operations.' },
  { question: 'How long is a Hot Work Permit typically valid?', option_a: 'Until job completion', option_b: '8 hours or one shift', option_c: '24 hours', option_d: '7 days', correct_answer: 'B', category: 'Work Permits', explanation: 'Hot Work Permits are typically valid for 8 hours or one shift and must be renewed for extended work.' },
  { question: 'What must be done before entering a confined space?', option_a: 'Get verbal approval', option_b: 'Complete atmospheric testing and obtain entry permit', option_c: 'Wear a hard hat', option_d: 'Inform a coworker', correct_answer: 'B', category: 'Work Permits', explanation: 'Confined space entry requires atmospheric testing and a valid entry permit to ensure safe conditions.' },
  { question: 'Who can authorize a work permit on Aramco sites?', option_a: 'Any supervisor', option_b: 'Only the project manager', option_c: 'Aramco-designated permit authority', option_d: 'Any safety officer', correct_answer: 'C', category: 'Work Permits', explanation: 'Only Aramco-designated permit authorities are authorized to issue work permits on Aramco sites.' },
  { question: 'What permit is required for working at heights above 1.8 meters?', option_a: 'Hot Work Permit', option_b: 'Working at Height Permit', option_c: 'General Work Permit', option_d: 'Excavation Permit', correct_answer: 'B', category: 'Work Permits', explanation: 'A Working at Height Permit is required for any work performed at heights above 1.8 meters.' },
  { question: 'Before excavation work, which utility must be located?', option_a: 'Only electrical cables', option_b: 'Only water pipes', option_c: 'All underground utilities', option_d: 'Only gas lines', correct_answer: 'C', category: 'Work Permits', explanation: 'All underground utilities must be located and marked before any excavation work begins.' },
  { question: 'What is required after completing hot work?', option_a: 'Close the permit immediately', option_b: 'Fire watch for minimum 30 minutes', option_c: 'Clean the area only', option_d: 'Notify the supervisor verbally', correct_answer: 'B', category: 'Work Permits', explanation: 'A fire watch must be maintained for at least 30 minutes after hot work completion to detect any delayed fires.' },
  { question: 'What must be verified before renewing a work permit?', option_a: 'Weather conditions only', option_b: 'Scope of work and hazard controls remain valid', option_c: 'Number of workers only', option_d: 'Time of day only', correct_answer: 'B', category: 'Work Permits', explanation: 'Before renewing a permit, the scope of work and all hazard controls must be verified as still valid and appropriate.' },
  
  // Heat Stress (6 questions)
  { question: 'At what WBGT temperature does Aramco require mandatory rest breaks?', option_a: '25°C', option_b: '28°C', option_c: '30°C', option_d: '32°C', correct_answer: 'C', category: 'Heat Stress', explanation: 'When WBGT reaches 30°C, mandatory rest breaks are required to prevent heat-related illness.' },
  { question: 'What is the work-rest ratio when WBGT exceeds 32°C?', option_a: '60 minutes work, 15 minutes rest', option_b: '45 minutes work, 15 minutes rest', option_c: '30 minutes work, 30 minutes rest', option_d: 'Work should be suspended', correct_answer: 'D', category: 'Heat Stress', explanation: 'When WBGT exceeds 32°C, outdoor work should be suspended due to extreme heat stress risk.' },
  { question: 'What is an early symptom of heat exhaustion?', option_a: 'Chest pain', option_b: 'Heavy sweating and weakness', option_c: 'Coughing', option_d: 'Blurred vision', correct_answer: 'B', category: 'Heat Stress', explanation: 'Heavy sweating accompanied by weakness are early signs of heat exhaustion requiring immediate rest and hydration.' },
  { question: 'How much water should workers drink per hour in hot conditions?', option_a: '1 cup (250ml)', option_b: '2-4 cups (500ml-1L)', option_c: '1 gallon (4L)', option_d: 'Only when thirsty', correct_answer: 'B', category: 'Heat Stress', explanation: 'Workers should drink 500ml to 1 liter of water per hour in hot conditions to stay hydrated.' },
  { question: 'What is the first aid treatment for heat stroke?', option_a: 'Give hot drinks', option_b: 'Cool the body rapidly and seek emergency help', option_c: 'Continue working in shade', option_d: 'Give salt tablets', correct_answer: 'B', category: 'Heat Stress', explanation: 'Heat stroke is a medical emergency requiring rapid body cooling and immediate emergency medical assistance.' },
  { question: 'Which type of clothing helps prevent heat stress?', option_a: 'Dark, tight-fitting clothing', option_b: 'Light-colored, loose-fitting clothing', option_c: 'Synthetic materials', option_d: 'Thick cotton clothing', correct_answer: 'B', category: 'Heat Stress', explanation: 'Light-colored, loose-fitting clothing allows air circulation and reflects heat, helping prevent heat stress.' },
  
  // Confined Space (6 questions)
  { question: 'What is the minimum oxygen level safe for confined space entry?', option_a: '15%', option_b: '17%', option_c: '19.5%', option_d: '21%', correct_answer: 'C', category: 'Confined Space', explanation: 'The minimum safe oxygen level for confined space entry is 19.5%. Below this level is considered oxygen deficient.' },
  { question: 'What gas detector reading indicates explosive atmosphere?', option_a: 'LEL above 10%', option_b: 'LEL above 25%', option_c: 'Oxygen above 23.5%', option_d: 'Both A and C', correct_answer: 'D', category: 'Confined Space', explanation: 'LEL above 10% indicates potential explosive atmosphere, and oxygen above 23.5% is oxygen enriched, both hazardous.' },
  { question: 'How often must atmospheric monitoring be performed during confined space work?', option_a: 'Once before entry', option_b: 'Continuously', option_c: 'Every 4 hours', option_d: 'Once per shift', correct_answer: 'B', category: 'Confined Space', explanation: 'Continuous atmospheric monitoring is required during confined space work to detect any changes in conditions.' },
  { question: 'What is the role of a hole watch/attendant?', option_a: 'To work inside the space', option_b: 'To monitor entrants and maintain communication', option_c: 'To issue permits', option_d: 'To perform rescue operations', correct_answer: 'B', category: 'Confined Space', explanation: 'The hole watch/attendant monitors entrants, maintains communication, and summons rescue if needed.' },
  { question: 'Before entry, how long should a confined space be ventilated?', option_a: '5 minutes', option_b: '15 minutes', option_c: 'Until atmospheric tests show safe levels', option_d: '1 hour', correct_answer: 'C', category: 'Confined Space', explanation: 'Ventilation should continue until atmospheric testing confirms safe oxygen, LEL, and toxic gas levels.' },
  { question: 'What type of rescue plan is required for confined space entry?', option_a: 'Verbal plan only', option_b: 'Written rescue plan with trained personnel', option_c: 'Call emergency services only', option_d: 'No plan required if work is quick', correct_answer: 'B', category: 'Confined Space', explanation: 'A written rescue plan with trained rescue personnel must be in place before any confined space entry.' },
  
  // Working at Height (6 questions)
  { question: 'At what height is fall protection required?', option_a: '1.0 meters', option_b: '1.8 meters', option_c: '2.5 meters', option_d: '3.0 meters', correct_answer: 'B', category: 'Working at Height', explanation: 'Fall protection is required when working at heights of 1.8 meters (6 feet) or more.' },
  { question: 'What is the maximum free fall distance for a full body harness?', option_a: '1 meter', option_b: '1.8 meters', option_c: '2.5 meters', option_d: '3 meters', correct_answer: 'B', category: 'Working at Height', explanation: 'The maximum free fall distance should not exceed 1.8 meters to limit fall arrest forces on the body.' },
  { question: 'How should a ladder be positioned against a wall?', option_a: '1:4 ratio (1 out for every 4 up)', option_b: '1:2 ratio (1 out for every 2 up)', option_c: '1:1 ratio (1 out for every 1 up)', option_d: 'Vertical against the wall', correct_answer: 'A', category: 'Working at Height', explanation: 'Ladders should be positioned at a 1:4 ratio (75-degree angle) for stability and safe climbing.' },
  { question: 'What is required when working near unprotected edges?', option_a: 'Warning signs only', option_b: 'Guardrails or personal fall arrest system', option_c: 'Verbal warnings only', option_d: 'Orange cones', correct_answer: 'B', category: 'Working at Height', explanation: 'Guardrails or personal fall arrest systems are required when working near unprotected edges.' },
  { question: 'How many points of contact should you maintain when climbing a ladder?', option_a: '1 point', option_b: '2 points', option_c: '3 points', option_d: '4 points', correct_answer: 'C', category: 'Working at Height', explanation: 'Always maintain 3 points of contact (two hands and one foot, or two feet and one hand) when climbing ladders.' },
  { question: 'What must be checked before using scaffolding?', option_a: 'Color of the scaffold', option_b: 'Green tag and daily inspection', option_c: 'Number of planks only', option_d: 'Weather only', correct_answer: 'B', category: 'Working at Height', explanation: 'Scaffolding must have a valid green tag indicating it passed inspection and daily checks before use.' },
  
  // Hot Work Safety (5 questions)
  { question: 'What distance must combustible materials be kept from hot work?', option_a: '5 meters', option_b: '11 meters (35 feet)', option_c: '3 meters', option_d: '20 meters', correct_answer: 'B', category: 'Hot Work Safety', explanation: 'Combustible materials must be kept at least 11 meters (35 feet) from hot work operations.' },
  { question: 'What type of fire extinguisher should be readily available during welding?', option_a: 'Water extinguisher', option_b: 'CO2 or dry chemical extinguisher', option_c: 'Foam extinguisher', option_d: 'Any type available', correct_answer: 'B', category: 'Hot Work Safety', explanation: 'CO2 or dry chemical extinguishers are appropriate for hot work as they can handle multiple fire classes.' },
  { question: 'What is the minimum fire watch duration after hot work is complete?', option_a: '15 minutes', option_b: '30 minutes', option_c: '1 hour', option_d: '2 hours', correct_answer: 'B', category: 'Hot Work Safety', explanation: 'Fire watch must continue for at least 30 minutes after hot work completion to detect any latent fires.' },
  { question: 'What protective equipment is required for arc welding?', option_a: 'Safety glasses only', option_b: 'Welding helmet with proper shade lens', option_c: 'Face shield only', option_d: 'Sunglasses', correct_answer: 'B', category: 'Hot Work Safety', explanation: 'Arc welding requires a welding helmet with proper shade lens (typically shade 10-14) to protect eyes from UV radiation.' },
  { question: 'What causes arc flash burns?', option_a: 'Direct contact with electrode', option_b: 'Ultraviolet radiation from the welding arc', option_c: 'Spatter only', option_d: 'Electrical shock', correct_answer: 'B', category: 'Hot Work Safety', explanation: 'Arc flash burns are caused by intense ultraviolet radiation from the welding arc affecting exposed skin.' },
  
  // Excavation Safety (4 questions)
  { question: 'At what depth does an excavation require shoring or sloping?', option_a: '0.5 meters', option_b: '1.2 meters (4 feet)', option_c: '2.0 meters', option_d: '3.0 meters', correct_answer: 'B', category: 'Excavation Safety', explanation: 'Excavations deeper than 1.2 meters (4 feet) require protective systems like shoring, sloping, or benching.' },
  { question: 'How close to an excavation can heavy equipment operate?', option_a: 'Right at the edge', option_b: 'At least 1 meter from the edge', option_c: 'Based on competent person evaluation', option_d: 'Only 0.5 meters from edge', correct_answer: 'C', category: 'Excavation Safety', explanation: 'Heavy equipment operating distance depends on soil conditions and must be evaluated by a competent person.' },
  { question: 'How often must excavations be inspected?', option_a: 'Once at the start', option_b: 'Daily and after weather events', option_c: 'Weekly', option_d: 'Monthly', correct_answer: 'B', category: 'Excavation Safety', explanation: 'Excavations must be inspected daily and after any weather event that could affect stability.' },
  { question: 'What is the maximum distance to an exit ladder in an excavation?', option_a: '5 meters', option_b: '10 meters', option_c: '7.5 meters (25 feet)', option_d: '15 meters', correct_answer: 'C', category: 'Excavation Safety', explanation: 'Workers should not have to travel more than 7.5 meters (25 feet) laterally to reach an exit ladder.' },
  
  // Lifting Operations (5 questions)
  { question: 'What must be checked before any lifting operation?', option_a: 'Weather only', option_b: 'Lift plan, equipment inspection, and load weight', option_c: 'Operator name only', option_d: 'Time of day only', correct_answer: 'B', category: 'Lifting Operations', explanation: 'Before lifting, verify the lift plan, inspect all equipment, and confirm the exact load weight.' },
  { question: 'What is the hand signal for STOP in crane operations?', option_a: 'Arm extended horizontally, palm down, moving arm back and forth', option_b: 'Arm extended with fist closed', option_c: 'Both arms pointing down', option_d: 'Arm extended, palm facing crane', correct_answer: 'A', category: 'Lifting Operations', explanation: 'The STOP signal is arm extended horizontally with palm down, moving the arm back and forth.' },
  { question: 'What is the safe working load of a piece of lifting equipment?', option_a: 'Maximum load it can lift', option_b: 'Load shown on the certification/tag', option_c: 'Double the actual load', option_d: 'Whatever the operator decides', correct_answer: 'B', category: 'Lifting Operations', explanation: 'The safe working load is shown on the equipment certification/tag and must never be exceeded.' },
  { question: 'When should rigging equipment be inspected?', option_a: 'Once a year', option_b: 'Before each use', option_c: 'When it looks damaged', option_d: 'Only during audits', correct_answer: 'B', category: 'Lifting Operations', explanation: 'Rigging equipment must be inspected before each use to ensure it is in safe working condition.' },
  { question: 'What determines a critical lift?', option_a: 'Lift over 10 tons', option_b: 'Lift exceeding 75% of crane capacity or over critical areas', option_c: 'Any lift with personnel', option_d: 'Lifts during night shifts', correct_answer: 'B', category: 'Lifting Operations', explanation: 'Critical lifts are those exceeding 75% of crane capacity or performed over critical equipment/areas.' },
  
  // Fire Safety (4 questions)
  { question: 'What type of fire extinguisher is used for electrical fires?', option_a: 'Water', option_b: 'Foam', option_c: 'CO2 or dry chemical', option_d: 'Wet chemical', correct_answer: 'C', category: 'Fire Safety', explanation: 'CO2 or dry chemical extinguishers are safe for electrical fires as they do not conduct electricity.' },
  { question: 'What is the PASS technique for fire extinguishers?', option_a: 'Push, Aim, Spray, Sweep', option_b: 'Pull, Aim, Squeeze, Sweep', option_c: 'Point, Activate, Spray, Stop', option_d: 'Pull, Activate, Spray, Sweep', correct_answer: 'B', category: 'Fire Safety', explanation: 'PASS stands for Pull the pin, Aim at the base, Squeeze the handle, and Sweep side to side.' },
  { question: 'When should you attempt to fight a fire?', option_a: 'Any time you see fire', option_b: 'Only if trained and fire is small/contained', option_c: 'Only if ordered by supervisor', option_d: 'Never, always evacuate', correct_answer: 'B', category: 'Fire Safety', explanation: 'Only attempt to fight a fire if you are trained, the fire is small, contained, and you have an escape route.' },
  { question: 'What is the main purpose of a muster point?', option_a: 'Equipment storage', option_b: 'Safe assembly location for accountability', option_c: 'Work meeting location', option_d: 'Vehicle parking', correct_answer: 'B', category: 'Fire Safety', explanation: 'Muster points are designated safe assembly areas where personnel gather for headcount during emergencies.' },
  
  // Emergency Procedures (4 questions)
  { question: 'What is the first step when discovering an emergency?', option_a: 'Start fixing the problem', option_b: 'Assess the situation and ensure personal safety', option_c: 'Call family members', option_d: 'Take photos', correct_answer: 'B', category: 'Emergency Procedures', explanation: 'Always first assess the situation and ensure your own safety before taking any action.' },
  { question: 'What information should be provided when reporting an emergency?', option_a: 'Name only', option_b: 'Location, nature of emergency, number of casualties, your name', option_c: 'Time only', option_d: 'Weather conditions only', correct_answer: 'B', category: 'Emergency Procedures', explanation: 'Provide location, nature of emergency, casualties, and your name for effective emergency response.' },
  { question: 'When should an evacuation alarm be ignored?', option_a: 'During lunch breaks', option_b: 'Never - always evacuate when alarm sounds', option_c: 'If you are busy', option_d: 'If it is a weekly test', correct_answer: 'B', category: 'Emergency Procedures', explanation: 'Never ignore evacuation alarms. Always evacuate immediately when an alarm sounds unless officially notified of a planned drill.' },
  { question: 'What should you do if you discover a chemical spill?', option_a: 'Clean it up immediately', option_b: 'Evacuate area, report, and follow spill response procedures', option_c: 'Continue working', option_d: 'Ignore small spills', correct_answer: 'B', category: 'Emergency Procedures', explanation: 'Evacuate the area, report the spill, and follow established spill response procedures. Only trained personnel should handle spills.' },
  
  // General Safety (5 questions)
  { question: 'What is the purpose of a toolbox talk?', option_a: 'To distribute tools', option_b: 'To discuss daily safety topics and hazards', option_c: 'To collect time sheets', option_d: 'To assign work only', correct_answer: 'B', category: 'General Safety', explanation: 'Toolbox talks are brief safety meetings to discuss daily hazards, safety topics, and reinforce safe practices.' },
  { question: 'What is good housekeeping on a construction site?', option_a: 'Painting the office', option_b: 'Keeping work areas clean, organized, and free of hazards', option_c: 'Washing vehicles', option_d: 'Decorating the site', correct_answer: 'B', category: 'General Safety', explanation: 'Good housekeeping means keeping work areas clean, organized, and free of tripping hazards and debris.' },
  { question: 'What should you do if you witness an unsafe act?', option_a: 'Ignore it', option_b: 'Stop the work and report/correct the hazard', option_c: 'Wait until end of shift', option_d: 'Post it on social media', correct_answer: 'B', category: 'General Safety', explanation: 'Unsafe acts should be stopped immediately and reported or corrected to prevent injuries.' },
  { question: 'What is the purpose of a Job Safety Analysis (JSA)?', option_a: 'To plan the schedule', option_b: 'To identify hazards and controls for each task step', option_c: 'To assign workers', option_d: 'To calculate costs', correct_answer: 'B', category: 'General Safety', explanation: 'JSA systematically identifies potential hazards for each task step and determines appropriate controls.' },
  { question: 'Who is responsible for safety on the worksite?', option_a: 'Only the safety officer', option_b: 'Only supervisors', option_c: 'Everyone on site', option_d: 'Only management', correct_answer: 'C', category: 'General Safety', explanation: 'Safety is everyone\'s responsibility. All workers must follow safety rules and look out for each other.' }
];

// Load Aramco-approved quiz questions
const aramcoQuizQuestions = require('./aramco-quiz-questions');

// Replace quiz questions with Aramco-approved questions (check if already migrated by looking at question count)
const questionCount = db.prepare('SELECT COUNT(*) as count FROM quiz_questions').get();
const aramcoMarker = db.prepare("SELECT id FROM quiz_questions WHERE question LIKE '%preliminary written report%' LIMIT 1").get();

if (questionCount.count === 0 || !aramcoMarker) {
  // Clear old questions and insert new Aramco-approved questions
  db.prepare('DELETE FROM quiz_questions').run();
  const insertQ = db.prepare('INSERT INTO quiz_questions (question, option_a, option_b, option_c, option_d, correct_answer, category, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
  aramcoQuizQuestions.forEach(q => insertQ.run(q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.category));
  console.log(`Loaded ${aramcoQuizQuestions.length} Aramco-approved quiz questions`);
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

db.exec(`
  CREATE TABLE IF NOT EXISTS import_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT,
    imported_count INTEGER,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create daily_reports table for daily manpower and equipment tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    area TEXT NOT NULL,
    location TEXT,
    total_manpower INTEGER DEFAULT 0,
    manpower_cat INTEGER DEFAULT 0,
    manpower_rental INTEGER DEFAULT 0,
    created_by_id INTEGER,
    created_by_name TEXT,
    updated_by_id INTEGER,
    updated_by_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, area)
  )
`);

// Create daily_report_equipment table for equipment details
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_report_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_report_id INTEGER NOT NULL,
    equipment_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id) ON DELETE CASCADE
  )
`);

// Migration: Add assigned_area column to users if it doesn't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN assigned_area TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add user profile fields (phone, email, bio)
try {
  db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Add position column for job role
try {
  db.exec(`ALTER TABLE users ADD COLUMN position TEXT DEFAULT 'Safety Officer'`);
} catch (e) { /* Column already exists */ }

// Create equipment_registry table for admin-managed equipment list
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_registry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'BOTH',
    sort_order INTEGER DEFAULT 999,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create daily_report_areas table for admin-managed areas
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_report_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 999,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed default equipment if empty
const equipmentCount = db.prepare('SELECT COUNT(*) as count FROM equipment_registry').get();
if (equipmentCount.count === 0) {
  const defaultEquipment = [
    'Rock Breaker', 'Loader', 'Fork lift', 'Skid Loader', 'Backhoe', 'Dump Truck',
    'Water Tanker', 'Wheel Loader', 'Over Head Crane', 'Bulldozer', 'Roller compactor',
    'Side boom', 'Generator', 'Welding machine', 'Air Compressor', 'HDD Machine',
    'Welding truck', 'Painting truck', 'Tractor', 'Bending Machine', 'Water Pump',
    'Filling Pump', 'Boom truck', 'Plate Compactor', 'Portable Generator', 'JCB',
    'Grader', 'Ambulance', 'Dozer', 'Drill Machine', 'Trailer', 'Crane'
  ];
  const insertEquip = db.prepare('INSERT OR IGNORE INTO equipment_registry (name, category, sort_order) VALUES (?, ?, ?)');
  defaultEquipment.forEach((name, i) => insertEquip.run(name, 'BOTH', i));
}

// Seed daily report areas if not in areas table
const dailyReportAreas = [
  'Haradh - Gas Fabrication',
  'X-ray Banker Yard',
  'Hydro-test Area',
  'Fabrication Yard',
  'Pipe Yard',
  'Welding Shop'
];

// Seed daily_report_areas if empty
const areasCount = db.prepare('SELECT COUNT(*) as count FROM daily_report_areas').get();
if (areasCount.count === 0) {
  const insertDrArea = db.prepare('INSERT OR IGNORE INTO daily_report_areas (name, sort_order) VALUES (?, ?)');
  dailyReportAreas.forEach((name, i) => insertDrArea.run(name, i));
}

// Also add to general areas
const insertAreaStmt = db.prepare('INSERT OR IGNORE INTO areas (name) VALUES (?)');
dailyReportAreas.forEach(area => insertAreaStmt.run(area));

async function importHistoricalObservations() {
  const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRtCQ5ilRskhc0FICzuF1MxcmteDXFZBISW6GL8CzjmBggG8U6h1qVUrKI4aqoIEeEPt3yUcMYFnlTB/pub?output=csv';
  
  const alreadyImported = db.prepare('SELECT id FROM import_history WHERE source_url = ?').get(SHEET_URL);
  if (alreadyImported) {
    console.log('Historical observations already imported.');
    return;
  }

  try {
    console.log('Fetching historical observations from Google Sheet...');
    const response = await fetch(SHEET_URL);
    if (!response.ok) {
      console.error('Failed to fetch CSV:', response.statusText);
      return;
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      console.log('No data rows in CSV');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    console.log('CSV Headers:', headers);
    
    let importedCount = 0;
    const insertStmt = db.prepare(`
      INSERT INTO observations (date, time, area, location, observation_type, observation_class, activity_type, description, direct_cause, root_cause, immediate_action, corrective_action, risk_level, status, reported_by, reported_by_id, evidence_urls, close_evidence_urls)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      
      if (!row.date && !row.description) continue;
      
      let evidenceUrls = '[]';
      if (row.evidence_urls) {
        const urls = row.evidence_urls.split(',').map(u => u.trim()).filter(u => u);
        evidenceUrls = JSON.stringify(urls);
      }
      
      let closeEvidenceUrls = '[]';
      if (row.close_evidence_urls) {
        const urls = row.close_evidence_urls.split(',').map(u => u.trim()).filter(u => u);
        closeEvidenceUrls = JSON.stringify(urls);
      }

      try {
        insertStmt.run(
          row.date || '',
          row.time || '',
          row.area || '',
          row.location || '',
          row.observation_type || '',
          row.observation_class || 'Negative',
          row.activity_type || '',
          row.description || '',
          row.direct_cause || '',
          row.root_cause || '',
          row.immediate_action || '',
          row.corrective_action || '',
          row.risk_level || 'Medium',
          row.status || 'Closed',
          row.reported_by || 'Historical Import',
          row.reported_by_id || '',
          evidenceUrls,
          closeEvidenceUrls
        );
        importedCount++;
      } catch (err) {
        console.error('Error importing row:', err.message);
      }
    }

    db.prepare('INSERT INTO import_history (source_url, imported_count) VALUES (?, ?)').run(SHEET_URL, importedCount);
    console.log(`Successfully imported ${importedCount} historical observations.`);
  } catch (err) {
    console.error('Import error:', err.message);
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

importHistoricalObservations();

function syncAreasFromObservations() {
  try {
    const uniqueAreas = db.prepare(`
      SELECT DISTINCT area FROM observations 
      WHERE area IS NOT NULL AND area != ''
    `).all();
    
    const insertArea = db.prepare('INSERT OR IGNORE INTO areas (name) VALUES (?)');
    let addedCount = 0;
    
    for (const row of uniqueAreas) {
      const result = insertArea.run(row.area);
      if (result.changes > 0) addedCount++;
    }
    
    if (addedCount > 0) {
      console.log(`Added ${addedCount} new areas from observations.`);
    }
  } catch (err) {
    console.error('Error syncing areas:', err.message);
  }
}

setTimeout(syncAreasFromObservations, 2000);

// Seed default challenges if empty
const challengeCount = db.prepare('SELECT COUNT(*) as count FROM challenges').get();
if (challengeCount.count === 0) {
  const defaultChallenges = [
    { title: 'Daily Safety Photo', description: 'Upload a photo showing safety practices in your work area', points: 15, challenge_type: 'daily', photo_required: 1 },
    { title: 'Weekly Safety Inspection', description: 'Complete a weekly safety inspection and upload photo evidence', points: 30, challenge_type: 'weekly', photo_required: 1 },
    { title: 'Monthly Safety Report', description: 'Submit your monthly safety observation summary with photo evidence', points: 50, challenge_type: 'monthly', photo_required: 1 }
  ];
  const insertChallenge = db.prepare('INSERT INTO challenges (title, description, points, challenge_type, photo_required, is_active) VALUES (?, ?, ?, ?, ?, 1)');
  defaultChallenges.forEach(c => insertChallenge.run(c.title, c.description, c.points, c.challenge_type, c.photo_required));
  console.log('Seeded default challenges');
}

// Training Matrix Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS training_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS training_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    validity_years INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS role_trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    training_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES training_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES training_items(id) ON DELETE CASCADE,
    UNIQUE(role_id, training_id)
  )
`);

// Seed Training Matrix Data
const trainingRoleCount = db.prepare('SELECT COUNT(*) as count FROM training_roles').get();
if (trainingRoleCount.count === 0) {
  const defaultTrainingItems = [
    { name: 'Site Specific Safety Orientation / COC', validity: 2 },
    { name: 'Environmental Orientation', validity: 2 },
    { name: 'Defensive & Off-Road Driving / JMP', validity: 2 },
    { name: 'Emergency Response Procedure', validity: 2 },
    { name: 'Fire Prevention & Protection', validity: 2 },
    { name: 'Hand & Power Tools / Electrical Safety', validity: 2 },
    { name: 'Personal Protective Equipment (PPE)', validity: 2 },
    { name: 'Heat Stress Awareness', validity: 1 },
    { name: 'Hazardous Chemicals / RPE', validity: 1 },
    { name: 'Heavy Equipment Safety', validity: 2 },
    { name: 'Work Permit System', validity: 2 },
    { name: 'Authorized Gas Tester', validity: 2 },
    { name: 'Confined Space Entry / Rescue', validity: 2 },
    { name: 'Hazard Recognition', validity: 2 },
    { name: 'Safe Rigging & Lifting', validity: 2 },
    { name: 'LOTO - Isolation', validity: 2 },
    { name: 'Excavation Safety', validity: 2 },
    { name: 'Work at Height & Ladders Safety', validity: 2 },
    { name: 'HIP / CSSP', validity: 2 },
    { name: 'Hydrogen Sulfide (H2S)', validity: 2 },
    { name: 'Incident Reporting & Investigation', validity: 2 },
    { name: 'Housekeeping', validity: 2 },
    { name: 'Job Safety Analysis & Pre Job Briefing', validity: 2 },
    { name: 'Materials / Manual Handling', validity: 2 },
    { name: 'Line of Fire', validity: 2 },
    { name: 'SA Safety Handbook / CSM 24 HRS / CSAR', validity: 2 },
    { name: 'Compressed Gas Cylinders', validity: 2 },
    { name: 'First Aid (FA) & Basic Life Support (BLS)', validity: 2 },
    { name: 'Human Machine Interface', validity: 2 },
    { name: 'Hydrotest Safety', validity: 2 },
    { name: 'Abrasive Blasting Safety', validity: 2 },
    { name: 'PWAS Awareness', validity: 2 },
    { name: 'Flag Man Responsibilities', validity: 2 },
    { name: 'Fire Watch Responsibilities', validity: 2 }
  ];

  const insertTrainingItem = db.prepare('INSERT OR IGNORE INTO training_items (name, validity_years) VALUES (?, ?)');
  defaultTrainingItems.forEach(t => insertTrainingItem.run(t.name, t.validity));

  const roleTrainingData = {
    'Project Manager': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'SA Safety Handbook / CSM 24 HRS / CSAR', 'Compressed Gas Cylinders', 'First Aid (FA) & Basic Life Support (BLS)', 'Human Machine Interface'],
    'Construction Manager': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'SA Safety Handbook / CSM 24 HRS / CSAR', 'Compressed Gas Cylinders', 'First Aid (FA) & Basic Life Support (BLS)', 'Human Machine Interface'],
    'Project Engineers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'SA Safety Handbook / CSM 24 HRS / CSAR', 'Compressed Gas Cylinders', 'First Aid (FA) & Basic Life Support (BLS)', 'Human Machine Interface'],
    'Site Engineers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'SA Safety Handbook / CSM 24 HRS / CSAR', 'Compressed Gas Cylinders', 'First Aid (FA) & Basic Life Support (BLS)', 'Human Machine Interface', 'Hydrotest Safety'],
    'Surveyors': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Human Machine Interface'],
    'Supervisors': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Human Machine Interface', 'Hydrotest Safety', 'Abrasive Blasting Safety'],
    'Foremen': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Human Machine Interface', 'Hydrotest Safety', 'Abrasive Blasting Safety'],
    'Chargehands': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Human Machine Interface', 'Hydrotest Safety', 'Abrasive Blasting Safety'],
    'Welders': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Compressed Gas Cylinders', 'First Aid (FA) & Basic Life Support (BLS)'],
    'Masons': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing'],
    'Electricians': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'LOTO - Isolation', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling'],
    'Equipment Operators': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire', 'Compressed Gas Cylinders'],
    'Crane Operators': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Hydrogen Sulfide (H2S)', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire'],
    'Riggers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Safe Rigging & Lifting', 'LOTO - Isolation', 'Excavation Safety', 'Work at Height & Ladders Safety', 'HIP / CSSP', 'Incident Reporting & Investigation', 'Job Safety Analysis & Pre Job Briefing'],
    'Heavy Duty Drivers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Incident Reporting & Investigation', 'Job Safety Analysis & Pre Job Briefing'],
    'Light Duty Drivers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Defensive & Off-Road Driving / JMP', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Incident Reporting & Investigation', 'Job Safety Analysis & Pre Job Briefing'],
    'Store Personnel': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire'],
    'Pipe Fitters': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Job Safety Analysis & Pre Job Briefing'],
    'Sand Blasters': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Confined Space Entry / Rescue', 'Abrasive Blasting Safety', 'Job Safety Analysis & Pre Job Briefing'],
    'HSSE & WP Coordinator': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Heavy Equipment Safety', 'Work Permit System', 'Authorized Gas Tester', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Incident Reporting & Investigation', 'Job Safety Analysis & Pre Job Briefing', 'First Aid (FA) & Basic Life Support (BLS)', 'Human Machine Interface', 'Abrasive Blasting Safety'],
    'Safety Officers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Hand & Power Tools / Electrical Safety', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Hazardous Chemicals / RPE', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Line of Fire', 'PWAS Awareness', 'Flag Man Responsibilities', 'Fire Watch Responsibilities'],
    'Work Permit Receiver': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Personal Protective Equipment (PPE)', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'PWAS Awareness', 'Flag Man Responsibilities', 'Fire Watch Responsibilities'],
    'Office Workers': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Personal Protective Equipment (PPE)', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire'],
    'Kitchen Staff': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Personal Protective Equipment (PPE)', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire'],
    'Camp Staff': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Personal Protective Equipment (PPE)', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing', 'Materials / Manual Handling', 'Line of Fire'],
    'QA/QC Personnel': ['Site Specific Safety Orientation / COC', 'Environmental Orientation', 'Emergency Response Procedure', 'Fire Prevention & Protection', 'Personal Protective Equipment (PPE)', 'Heat Stress Awareness', 'Heavy Equipment Safety', 'Work Permit System', 'Confined Space Entry / Rescue', 'Hazard Recognition', 'Work at Height & Ladders Safety', 'Incident Reporting & Investigation', 'Housekeeping', 'Job Safety Analysis & Pre Job Briefing']
  };

  const insertRole = db.prepare('INSERT OR IGNORE INTO training_roles (name) VALUES (?)');
  const insertRoleTraining = db.prepare('INSERT OR IGNORE INTO role_trainings (role_id, training_id) VALUES (?, ?)');
  const getTrainingId = db.prepare('SELECT id FROM training_items WHERE name = ?');
  const getRoleId = db.prepare('SELECT id FROM training_roles WHERE name = ?');

  for (const [roleName, trainings] of Object.entries(roleTrainingData)) {
    insertRole.run(roleName);
    const role = getRoleId.get(roleName);
    if (role) {
      for (const trainingName of trainings) {
        const training = getTrainingId.get(trainingName);
        if (training) {
          insertRoleTraining.run(role.id, training.id);
        }
      }
    }
  }
  console.log('Seeded training matrix data');
}

// Create Safety Calendar tables
db.exec(`
  CREATE TABLE IF NOT EXISTS safety_calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_by_id INTEGER,
    assigned_to TEXT,
    attachments TEXT,
    status TEXT DEFAULT 'Pending',
    approved_by TEXT,
    approved_at DATETIME,
    reminder_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS calendar_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'reminder',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES safety_calendar_events(id)
  );

  CREATE TABLE IF NOT EXISTS calendar_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'fa-calendar',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calendar_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default calendar categories if empty
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM calendar_categories').get();
if (categoryCount.count === 0) {
  const defaultCategories = [
    { name: 'Safety Meeting', color: '#22c55e', icon: 'fa-users' },
    { name: 'Training', color: '#3b82f6', icon: 'fa-graduation-cap' },
    { name: 'Inspection', color: '#f59e0b', icon: 'fa-search' },
    { name: 'Audit', color: '#8b5cf6', icon: 'fa-clipboard-check' },
    { name: 'Drill', color: '#ef4444', icon: 'fa-fire-extinguisher' },
    { name: 'Toolbox Talk', color: '#06b6d4', icon: 'fa-tools' },
    { name: 'Other', color: '#6b7280', icon: 'fa-calendar' }
  ];
  const insertCategory = db.prepare('INSERT INTO calendar_categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)');
  defaultCategories.forEach((cat, idx) => {
    insertCategory.run(cat.name, cat.color, cat.icon, idx);
  });
  console.log('Seeded default calendar categories');
}

// Seed default calendar settings if empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM calendar_settings').get();
if (settingsCount.count === 0) {
  const defaultSettings = [
    { key: 'default_view', value: 'month' },
    { key: 'require_approval', value: 'true' },
    { key: 'reminder_days', value: '1' },
    { key: 'auto_approve_admin', value: 'true' },
    { key: 'notify_on_create', value: 'true' },
    { key: 'notify_on_approve', value: 'true' }
  ];
  const insertSetting = db.prepare('INSERT INTO calendar_settings (setting_key, setting_value) VALUES (?, ?)');
  defaultSettings.forEach(s => {
    insertSetting.run(s.key, s.value);
  });
  console.log('Seeded default calendar settings');
}

console.log('Safety Calendar tables initialized');

// ============================================
// EXCAVATION SAFETY MODULE TABLES
// Based on Saudi Aramco CSM - Excavation & Shoring Requirements
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS excavations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    depth REAL NOT NULL,
    length REAL,
    width REAL,
    soil_type TEXT NOT NULL CHECK(soil_type IN ('A', 'B', 'C', 'Rock')),
    utilities_marked INTEGER DEFAULT 0,
    gpr_performed INTEGER DEFAULT 0,
    water_present INTEGER DEFAULT 0,
    worker_entry_required INTEGER DEFAULT 0,
    nearby_structures INTEGER DEFAULT 0,
    distance_to_structures REAL,
    vibration_traffic_nearby INTEGER DEFAULT 0,
    distance_to_utilities REAL,
    protective_system TEXT,
    engineering_required INTEGER DEFAULT 0,
    engineering_plan_uploaded INTEGER DEFAULT 0,
    csd_review_required INTEGER DEFAULT 0,
    compliance_status TEXT DEFAULT 'Pending' CHECK(compliance_status IN ('Compliant', 'Needs Action', 'Stop Work', 'Pending')),
    compliance_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Closed', 'Suspended')),
    notes TEXT,
    created_by_id INTEGER,
    created_by_name TEXT,
    approved_by_id INTEGER,
    approved_by_name TEXT,
    approved_at DATETIME,
    closed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id),
    FOREIGN KEY (approved_by_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS excavation_inspections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    excavation_id INTEGER NOT NULL,
    inspection_date TEXT NOT NULL,
    inspector_id INTEGER NOT NULL,
    inspector_name TEXT NOT NULL,
    soil_condition TEXT CHECK(soil_condition IN ('Stable', 'Unstable', 'Deteriorating')),
    shoring_condition TEXT CHECK(shoring_condition IN ('Good', 'Fair', 'Poor', 'N/A')),
    water_accumulation INTEGER DEFAULT 0,
    water_action_taken TEXT,
    barricade_condition TEXT CHECK(barricade_condition IN ('Good', 'Fair', 'Poor', 'Missing')),
    ladder_spacing_ok INTEGER DEFAULT 1,
    ladder_spacing_distance REAL,
    ladder_extension_ok INTEGER DEFAULT 1,
    ladder_extension_height REAL,
    spoil_pile_distance_ok INTEGER DEFAULT 1,
    spoil_pile_distance REAL,
    crane_distance_ok INTEGER DEFAULT 1,
    scaffold_distance_ok INTEGER DEFAULT 1,
    gas_test_performed INTEGER DEFAULT 0,
    oxygen_level REAL,
    lel_level REAL,
    h2s_level REAL,
    co_level REAL,
    atmospheric_safe INTEGER DEFAULT 1,
    overall_status TEXT DEFAULT 'Pass' CHECK(overall_status IN ('Pass', 'Fail', 'Stop Work')),
    critical_failures TEXT,
    notes TEXT,
    evidence_urls TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (excavation_id) REFERENCES excavations(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS excavation_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    excavation_id INTEGER NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('plan', 'photo', 'permit', 'inspection', 'engineering', 'gpr_report', 'other')),
    file_url TEXT NOT NULL,
    file_name TEXT,
    uploaded_by_id INTEGER,
    uploaded_by_name TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (excavation_id) REFERENCES excavations(id),
    FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS excavation_permits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    excavation_id INTEGER NOT NULL,
    permit_type TEXT NOT NULL,
    permit_number TEXT,
    is_required INTEGER DEFAULT 1,
    is_obtained INTEGER DEFAULT 0,
    obtained_date TEXT,
    expiry_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (excavation_id) REFERENCES excavations(id)
  );
`);

console.log('Excavation Safety Module tables initialized');

// Task Requests / Messaging System
db.exec(`
  CREATE TABLE IF NOT EXISTS task_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    recipient_id INTEGER NOT NULL,
    recipient_name TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    response_text TEXT,
    response_attachment TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS news_read_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    news_id INTEGER NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (news_id) REFERENCES news(id),
    UNIQUE(user_id, news_id)
  );
`);

console.log('Task Requests / Messaging tables initialized');

module.exports = { db, updateUserLevel, awardPoints };
