const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ── GET /api/students/summary ──────────────────────────────────────────────────
// Aggregated student data across all schools in the cluster (cluster only).
// NOTE: This route MUST be defined before GET /:id to avoid route conflicts.
router.get('/summary', requireRole('cluster'), async (req, res) => {
  try {
    // Total aggregates
    const totals = await db.get(`
      SELECT
        COALESCE(SUM(sr.total_boys + sr.total_girls), 0) AS total_students,
        COALESCE(SUM(sr.total_boys), 0) AS total_boys,
        COALESCE(SUM(sr.total_girls), 0) AS total_girls
      FROM student_records sr
      JOIN schools s ON sr.school_id = s.id
      WHERE s.cluster_id = ?
    `, [req.user.id]);

    // Per-standard aggregation
    const perStandard = await db.all(`
      SELECT
        sr.standard,
        COALESCE(SUM(sr.total_boys), 0) AS total_boys,
        COALESCE(SUM(sr.total_girls), 0) AS total_girls
      FROM student_records sr
      JOIN schools s ON sr.school_id = s.id
      WHERE s.cluster_id = ?
      GROUP BY sr.standard
      ORDER BY sr.standard ASC
    `, [req.user.id]);

    // Per-school aggregation
    const perSchool = await db.all(`
      SELECT
        s.id AS school_id,
        s.name AS school_name,
        COALESCE(SUM(sr.total_boys + sr.total_girls), 0) AS total_students
      FROM schools s
      LEFT JOIN student_records sr ON sr.school_id = s.id
      WHERE s.cluster_id = ?
      GROUP BY s.id, s.name
      ORDER BY s.name ASC
    `, [req.user.id]);

    res.json({
      total_students: totals ? parseInt(totals.total_students, 10) : 0,
      total_boys: totals ? parseInt(totals.total_boys, 10) : 0,
      total_girls: totals ? parseInt(totals.total_girls, 10) : 0,
      per_standard: perStandard,
      per_school: perSchool
    });
  } catch (err) {
    console.error('Student summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch student summary.' });
  }
});

// ── GET /api/students ──────────────────────────────────────────────────────────
// HM: returns student records for their school.
// Cluster: returns student records for a specified school (via ?school_id).
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'hm') {
      const records = await db.all('SELECT * FROM student_records WHERE school_id = ? ORDER BY standard ASC', [req.user.school_id]);
      return res.json(records);
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

      const records = await db.all('SELECT * FROM student_records WHERE school_id = ? ORDER BY standard ASC', [schoolId]);
      return res.json(records);
    }

    res.status(403).json({ error: 'Access denied.' });
  } catch (err) {
    console.error('List student records error:', err.message);
    res.status(500).json({ error: 'Failed to fetch student records.' });
  }
});

// ── POST /api/students ─────────────────────────────────────────────────────────
// Bulk upsert student records (HM only).
// Body: { records: [{ standard, total_boys, total_girls }], academic_year? }
router.post('/', requireRole('hm'), async (req, res) => {
  try {
    const { records, academic_year } = req.body;
    const year = academic_year || '2025-26';

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required and must not be empty.' });
    }

    // Bulk upsert using Postgres Transaction
    await db.query('BEGIN');
    try {
      for (const record of records) {
        if (record.standard < 1 || record.standard > 12) {
          throw new Error(`Invalid standard: ${record.standard}. Must be between 1 and 12.`);
        }
        await db.query(`
          INSERT INTO student_records (school_id, standard, total_boys, total_girls, academic_year, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(school_id, standard, academic_year)
          DO UPDATE SET
            total_boys = EXCLUDED.total_boys,
            total_girls = EXCLUDED.total_girls,
            updated_at = CURRENT_TIMESTAMP
        `, [
          req.user.school_id,
          record.standard,
          record.total_boys || 0,
          record.total_girls || 0,
          year
        ]);
      }
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

    // Return all records for this school
    const allRecords = await db.all('SELECT * FROM student_records WHERE school_id = ? ORDER BY standard ASC', [req.user.school_id]);
    res.status(201).json(allRecords);
  } catch (err) {
    console.error('Upsert student records error:', err.message);
    if (err.message.includes('Invalid standard')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to save student records.' });
  }
});

// ── PUT /api/students/:id ──────────────────────────────────────────────────────
// Update a single student record. Verify record belongs to user's school.
router.put('/:id', async (req, res) => {
  try {
    const recordId = parseInt(req.params.id, 10);
    const record = await db.get('SELECT * FROM student_records WHERE id = ?', [recordId]);

    if (!record) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // Verify record belongs to user's school
    if (req.user.role === 'hm' && record.school_id !== req.user.school_id) {
      return res.status(403).json({ error: 'Access denied. Record does not belong to your school.' });
    }
    if (req.user.role === 'cluster') {
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [record.school_id, req.user.id]);
      if (!school) {
        return res.status(403).json({ error: 'Access denied. Record does not belong to your cluster.' });
      }
    }

    const { total_boys, total_girls } = req.body;

    await db.query(`
      UPDATE student_records
      SET total_boys = COALESCE(?, total_boys),
          total_girls = COALESCE(?, total_girls),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      total_boys !== undefined ? total_boys : null,
      total_girls !== undefined ? total_girls : null,
      recordId
    ]);

    const updatedRecord = await db.get('SELECT * FROM student_records WHERE id = ?', [recordId]);
    res.json(updatedRecord);
  } catch (err) {
    console.error('Update student record error:', err.message);
    res.status(500).json({ error: 'Failed to update student record.' });
  }
});

module.exports = router;
