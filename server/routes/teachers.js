const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ── GET /api/teachers ──────────────────────────────────────────────────────────
// HM: returns teachers for their school.
// Cluster: returns teachers for a specified school (via ?school_id query param).
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'hm') {
      const teachers = await db.all('SELECT * FROM teachers WHERE school_id = ? ORDER BY name ASC', [req.user.school_id]);
      return res.json(teachers);
    }

    if (req.user.role === 'cluster') {
      const schoolId = req.query.school_id ? parseInt(req.query.school_id, 10) : null;

      if (!schoolId) {
        return res.status(400).json({ error: 'school_id query parameter is required for cluster users.' });
      }

      // Verify the school belongs to this cluster
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [schoolId, req.user.id]);
      if (!school) {
        return res.status(404).json({ error: 'School not found or does not belong to your cluster.' });
      }

      const teachers = await db.all('SELECT * FROM teachers WHERE school_id = ? ORDER BY name ASC', [schoolId]);
      return res.json(teachers);
    }

    res.status(403).json({ error: 'Access denied.' });
  } catch (err) {
    console.error('List teachers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch teachers.' });
  }
});

// ── POST /api/teachers ─────────────────────────────────────────────────────────
// Create a teacher (HM or Cluster).
router.post('/', async (req, res) => {
  try {
    const { name, phone, category, dob, doj, doj_this_school, tet, ctet_year, designation } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Teacher name is required.' });
    }

    let schoolId = null;
    if (req.user.role === 'hm') {
      schoolId = req.user.school_id;
    } else if (req.user.role === 'cluster') {
      schoolId = req.body.school_id ? parseInt(req.body.school_id, 10) : null;
      if (!schoolId) {
        return res.status(400).json({ error: 'school_id is required for cluster officer.' });
      }
      // Verify school ownership
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [schoolId, req.user.id]);
      if (!school) {
        return res.status(403).json({ error: 'Access denied. School does not belong to your cluster.' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await db.run(`
      INSERT INTO teachers (name, phone, category, dob, doj, doj_this_school, tet, ctet_year, designation, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      name,
      phone || null,
      category || null,
      dob || null,
      doj || null,
      doj_this_school || null,
      tet || null,
      ctet_year || null,
      designation || 'Assistant Teacher',
      schoolId
    ]);

    const teacher = await db.get('SELECT * FROM teachers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(teacher);
  } catch (err) {
    console.error('Create teacher error:', err.message);
    res.status(500).json({ error: 'Failed to create teacher.' });
  }
});

// ── PUT /api/teachers/:id ──────────────────────────────────────────────────────
// Update a teacher. Verify teacher belongs to user's school.
router.put('/:id', async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id, 10);
    const teacher = await db.get('SELECT * FROM teachers WHERE id = ?', [teacherId]);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    // Verify teacher belongs to user's school
    const userSchoolId = req.user.role === 'hm' ? req.user.school_id : null;
    if (req.user.role === 'hm' && teacher.school_id !== userSchoolId) {
      return res.status(403).json({ error: 'Access denied. Teacher does not belong to your school.' });
    }
    if (req.user.role === 'cluster') {
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [teacher.school_id, req.user.id]);
      if (!school) {
        return res.status(403).json({ error: 'Access denied. Teacher does not belong to your cluster.' });
      }
    }

    const { name, phone, category, dob, doj, doj_this_school, tet, ctet_year, designation } = req.body;

    await db.query(`
      UPDATE teachers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          category = COALESCE(?, category),
          dob = COALESCE(?, dob),
          doj = COALESCE(?, doj),
          doj_this_school = COALESCE(?, doj_this_school),
          tet = COALESCE(?, tet),
          ctet_year = COALESCE(?, ctet_year),
          designation = COALESCE(?, designation)
      WHERE id = ?
    `, [
      name || null,
      phone || null,
      category || null,
      dob || null,
      doj || null,
      doj_this_school || null,
      tet || null,
      ctet_year || null,
      designation || null,
      teacherId
    ]);

    const updatedTeacher = await db.get('SELECT * FROM teachers WHERE id = ?', [teacherId]);
    res.json(updatedTeacher);
  } catch (err) {
    console.error('Update teacher error:', err.message);
    res.status(500).json({ error: 'Failed to update teacher.' });
  }
});

// ── DELETE /api/teachers/:id ───────────────────────────────────────────────────
// Delete a teacher. Verify teacher belongs to user's school.
router.delete('/:id', async (req, res) => {
  try {
    const teacherId = parseInt(req.params.id, 10);
    const teacher = await db.get('SELECT * FROM teachers WHERE id = ?', [teacherId]);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    // Verify teacher belongs to user's school
    if (req.user.role === 'hm' && teacher.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied. Teacher does not belong to your school.' });
    }
    if (req.user.role === 'cluster') {
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [teacher.school_id, req.user.id]);
      if (!school) {
        return res.status(403).json({ error: 'Access denied. Teacher does not belong to your cluster.' });
      }
    }

    await db.query('DELETE FROM teachers WHERE id = ?', [teacherId]);
    res.json({ message: 'Teacher deleted successfully.' });
  } catch (err) {
    console.error('Delete teacher error:', err.message);
    res.status(500).json({ error: 'Failed to delete teacher.' });
  }
});

module.exports = router;
