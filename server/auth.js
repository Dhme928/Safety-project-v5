const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./database');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set. Using auto-generated secret for dev. Set JWT_SECRET in production!');
}
const SECRET = JWT_SECRET || require('crypto').randomBytes(32).toString('hex');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch (err) {}
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.post('/register', (req, res) => {
  try {
    const { employee_id, name, password } = req.body;
    
    if (!employee_id || !name || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const existing = db.prepare('SELECT * FROM users WHERE employee_id = ?').get(employee_id);
    if (existing) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.prepare(`
      INSERT INTO users (employee_id, name, password, role, approved, points)
      VALUES (?, ?, ?, 'user', 0, 0)
    `).run(employee_id, name, hashedPassword);
    
    res.json({ 
      success: true, 
      message: 'Registration submitted. Please wait for admin approval.',
      pending: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { employee_id, password } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE employee_id = ?').get(employee_id);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (!user.approved && user.role !== 'admin') {
      return res.status(403).json({ error: 'Account pending approval. Please wait for admin to approve your registration.' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, employee_id, name, role, approved, points, level, streak, profile_pic, language FROM users WHERE id = ?')
      .get(req.user.id);
    
    const badges = db.prepare(`
      SELECT b.* FROM badges b
      INNER JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY b.points_required DESC
    `).all(req.user.id);
    
    res.json({ ...user, badges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', authenticateToken, (req, res) => {
  try {
    const { profile_pic, language } = req.body;
    
    if (profile_pic !== undefined) {
      db.prepare('UPDATE users SET profile_pic = ? WHERE id = ?').run(profile_pic, req.user.id);
    }
    if (language !== undefined) {
      db.prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.user.id);
    }
    
    const user = db.prepare('SELECT id, employee_id, name, role, approved, points, level, streak, profile_pic, language FROM users WHERE id = ?')
      .get(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pending-users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, employee_id, name, created_at FROM users WHERE approved = 0 AND role = ?').all('user');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/approve-user/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(req.params.id);
    const user = db.prepare('SELECT id, employee_id, name, approved FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/reject-user/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ? AND approved = 0').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.requireAdmin = requireAdmin;
