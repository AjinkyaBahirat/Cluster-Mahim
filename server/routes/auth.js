const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'school_cluster_secret_key_2024';

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, password, role, rememberMe } = req.body;

    if (!phone || !password || !role) {
      return res.status(400).json({ error: 'Phone number, password, and role are required.' });
    }

    if (!['cluster', 'hm'].includes(role)) {
      return res.status(400).json({ error: "Role must be 'cluster' or 'hm'." });
    }

    let user = null;
    let schoolInfo = null;

    if (role === 'cluster') {
      user = await db.get('SELECT * FROM clusters WHERE phone = ?', [phone]);
    } else {
      // HM login — join with schools to get school info
      user = await db.get(`
        SELECT h.*, s.name AS school_name, s.id AS sid
        FROM headmasters h
        JOIN schools s ON h.school_id = s.id
        WHERE h.phone = ?
      `, [phone]);

      if (user) {
        schoolInfo = {
          school_id: user.school_id,
          school_name: user.school_name
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid phone number or password.' });
    }

    // Build JWT payload
    const tokenPayload = {
      id: user.id,
      role,
      name: user.name,
      phone: user.phone
    };

    if (role === 'hm') {
      tokenPayload.school_id = user.school_id;
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });

    // Build response user object
    const responseUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role
    };

    if (role === 'hm' && schoolInfo) {
      responseUser.school_id = schoolInfo.school_id;
      responseUser.school_name = schoolInfo.school_name;
    }

    res.json({ token, user: responseUser });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { id, role } = req.user;
    let user = null;

    if (role === 'cluster') {
      user = await db.get('SELECT id, name, phone, district, block, created_at FROM clusters WHERE id = ?', [id]);
    } else if (role === 'hm') {
      user = await db.get(`
        SELECT h.id, h.name, h.phone, h.school_id, h.created_at,
               s.name AS school_name
        FROM headmasters h
        JOIN schools s ON h.school_id = s.id
        WHERE h.id = ?
      `, [id]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: { ...user, role } });
  } catch (err) {
    console.error('Fetch user error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

module.exports = router;
