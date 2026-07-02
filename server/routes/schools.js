const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ── GET /api/schools ───────────────────────────────────────────────────────────
// Returns all schools for the authenticated cluster, with computed counts.
router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'cluster') {
      return res.status(403).json({ error: 'Only cluster admins can list all schools.' });
    }

    const schools = await db.all(`
      SELECT
        s.*,
        COALESCE(t.teacher_count, 0) AS teacher_count,
        COALESCE(sd.total_students, 0) AS student_count,
        CASE WHEN h.id IS NOT NULL THEN 1 ELSE 0 END AS has_hm
      FROM schools s
      LEFT JOIN (
        SELECT school_id, COUNT(*) AS teacher_count
        FROM teachers
        GROUP BY school_id
      ) t ON t.school_id = s.id
      LEFT JOIN school_data sd ON sd.school_id = s.id
      LEFT JOIN headmasters h ON h.school_id = s.id
      WHERE s.cluster_id = ?
      ORDER BY s.name ASC
    `, [req.user.id]);

    // Convert has_hm from 0/1 to boolean
    const result = schools.map(s => ({
      ...s,
      has_hm: s.has_hm === 1 || s.has_hm === true
    }));

    res.json(result);
  } catch (err) {
    console.error('List schools error:', err.message);
    res.status(500).json({ error: 'Failed to fetch schools.' });
  }
});

// ── POST /api/schools ──────────────────────────────────────────────────────────
// Create a new school (cluster only).
router.post('/', requireRole('cluster'), async (req, res) => {
  try {
    const { name, udise_code, address, village_town, pin_code, school_type } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'School name is required.' });
    }

    // Append RETURNING id to INSERT query for PostgreSQL
    const result = await db.run(`
      INSERT INTO schools (name, udise_code, address, village_town, pin_code, school_type, cluster_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [name, udise_code || null, address || null, village_town || null, pin_code || null, school_type || 'ZP', req.user.id]);

    const school = await db.get('SELECT * FROM schools WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(school);
  } catch (err) {
    if (err.code === '23505' || err.message.includes('schools_udise_code_key')) {
      return res.status(409).json({ error: 'A school with this UDISE code already exists.' });
    }
    console.error('Create school error:', err.message);
    res.status(500).json({ error: 'Failed to create school.' });
  }
});

// ── GET /api/schools/:id ───────────────────────────────────────────────────────
// Get full school details including HM, teacher count, student records.
router.get('/:id', async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const school = await db.get('SELECT * FROM schools WHERE id = ?', [schoolId]);

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Verify access
    if (req.user.role === 'cluster' && school.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. This school does not belong to your cluster.' });
    }
    if (req.user.role === 'hm' && req.user.school_id !== schoolId) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this school.' });
    }

    // Get headmaster info
    const hm = await db.get('SELECT id, name, phone, created_at FROM headmasters WHERE school_id = ?', [schoolId]);

    // Get teacher count
    const teacherData = await db.get('SELECT COUNT(*) AS teacher_count FROM teachers WHERE school_id = ?', [schoolId]);

    // Get student count & general school metrics from school_data
    const schoolMetrics = await db.get('SELECT * FROM school_data WHERE school_id = ?', [schoolId]);

    // Get teacher list
    const teachers = await db.all('SELECT * FROM teachers WHERE school_id = ? ORDER BY name ASC', [schoolId]);

    res.json({
      ...school,
      headmaster: hm || null,
      teacher_count: teacherData ? parseInt(teacherData.teacher_count, 10) : 0,
      student_count: schoolMetrics ? schoolMetrics.total_students : 0,
      school_metrics: schoolMetrics || null,
      teachers: teachers
    });
  } catch (err) {
    console.error('Get school error:', err.message);
    res.status(500).json({ error: 'Failed to fetch school details.' });
  }
});

// ── PUT /api/schools/:id ───────────────────────────────────────────────────────
// Update school fields.
router.put('/:id', async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const school = await db.get('SELECT * FROM schools WHERE id = ?', [schoolId]);

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    // Verify ownership
    if (req.user.role === 'cluster' && school.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'hm' && req.user.school_id !== schoolId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { name, udise_code, address, village_town, pin_code, school_type } = req.body;

    await db.query(`
      UPDATE schools
      SET name = COALESCE(?, name),
          udise_code = COALESCE(?, udise_code),
          address = COALESCE(?, address),
          village_town = COALESCE(?, village_town),
          pin_code = COALESCE(?, pin_code),
          school_type = COALESCE(?, school_type)
      WHERE id = ?
    `, [
      name || null,
      udise_code || null,
      address || null,
      village_town || null,
      pin_code || null,
      school_type || null,
      schoolId
    ]);

    const updatedSchool = await db.get('SELECT * FROM schools WHERE id = ?', [schoolId]);
    res.json(updatedSchool);
  } catch (err) {
    if (err.code === '23505' || err.message.includes('schools_udise_code_key')) {
      return res.status(409).json({ error: 'A school with this UDISE code already exists.' });
    }
    console.error('Update school error:', err.message);
    res.status(500).json({ error: 'Failed to update school.' });
  }
});

// ── DELETE /api/schools/:id ────────────────────────────────────────────────────
// Delete school and cascade related records (cluster only).
router.delete('/:id', requireRole('cluster'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const school = await db.get('SELECT * FROM schools WHERE id = ?', [schoolId]);

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    if (school.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. This school does not belong to your cluster.' });
    }

    // Cascade delete related records using Postgres Transaction
    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM school_data WHERE school_id = ?', [schoolId]);
      await db.query('DELETE FROM student_records WHERE school_id = ?', [schoolId]);
      await db.query('DELETE FROM teachers WHERE school_id = ?', [schoolId]);
      await db.query('DELETE FROM headmasters WHERE school_id = ?', [schoolId]);
      await db.query('DELETE FROM form_responses WHERE school_id = ?', [schoolId]);
      await db.query('DELETE FROM schools WHERE id = ?', [schoolId]);
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

    res.json({ message: 'School and all related records deleted successfully.' });
  } catch (err) {
    console.error('Delete school error:', err.message);
    res.status(500).json({ error: 'Failed to delete school.' });
  }
});

// ── POST /api/schools/:id/create-hm ───────────────────────────────────────────
// Create a headmaster for a school (cluster only).
router.post('/:id/create-hm', requireRole('cluster'), async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id, 10);
    const school = await db.get('SELECT * FROM schools WHERE id = ?', [schoolId]);

    if (!school) {
      return res.status(404).json({ error: 'School not found.' });
    }

    if (school.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. This school does not belong to your cluster.' });
    }

    // Check if HM already assigned
    const existingHm = await db.get('SELECT id FROM headmasters WHERE school_id = ?', [schoolId]);
    if (existingHm) {
      return res.status(409).json({ error: 'A headmaster is already assigned to this school.' });
    }

    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone number, and password are required.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = await db.run(`
      INSERT INTO headmasters (name, phone, password, school_id)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `, [name, phone, hashedPassword, schoolId]);

    const hm = await db.get('SELECT id, name, phone, school_id, created_at FROM headmasters WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(hm);
  } catch (err) {
    if (err.code === '23505' || err.message.includes('headmasters_phone_key')) {
      return res.status(409).json({ error: 'A headmaster with this phone number already exists.' });
    }
    console.error('Create HM error:', err.message);
    res.status(500).json({ error: 'Failed to create headmaster.' });
  }
});

module.exports = router;
