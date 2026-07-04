const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/schooldata
// HM: Get own school data
// Cluster: Get specific school data via ?school_id
router.get('/', async (req, res) => {
  try {
    let schoolId = null;

    if (req.user.role === 'hm') {
      schoolId = req.user.school_id;
    } else if (req.user.role === 'cluster') {
      schoolId = req.query.school_id ? parseInt(req.query.school_id, 10) : null;
      if (!schoolId) {
        return res.status(400).json({ error: 'school_id parameter is required for cluster.' });
      }
      
      // Verify ownership
      const school = await db.get('SELECT id FROM schools WHERE id = ? AND cluster_id = ?', [schoolId, req.user.id]);
      if (!school) {
        return res.status(404).json({ error: 'School not found or access denied.' });
      }
    }

    const data = await db.get('SELECT * FROM school_data WHERE school_id = ?', [schoolId]);
    res.json(data || {
      school_id: schoolId,
      total_students: 0,
      male_students: 0,
      female_students: 0,
      uniform_distributed: 0,
      books_distributed: 0,
      cctv_available: 'no',
      toilets_available: 'no',
      holding_account_number: '',
      academic_year: '2025-26'
    });
  } catch (err) {
    console.error('Fetch school data error:', err.message);
    res.status(500).json({ error: 'Failed to fetch school metrics.' });
  }
});

// POST /api/schooldata
// HM or Cluster: Update/Upsert school data
router.post('/', async (req, res) => {
  try {
    const { school_id, total_students, male_students, female_students, uniform_distributed, books_distributed, cctv_available, toilets_available, holding_account_number, academic_year = '2025-26' } = req.body;
    
    let schoolId = null;
    if (req.user.role === 'hm') {
      schoolId = req.user.school_id;
    } else if (req.user.role === 'cluster') {
      schoolId = school_id ? parseInt(school_id, 10) : null;
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

    // Check if record exists
    const record = await db.get('SELECT id FROM school_data WHERE school_id = ? AND academic_year = ?', [schoolId, academic_year]);

    if (record) {
      await db.query(`
        UPDATE school_data
        SET total_students = ?,
            male_students = ?,
            female_students = ?,
            uniform_distributed = ?,
            books_distributed = ?,
            cctv_available = ?,
            toilets_available = ?,
            holding_account_number = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [total_students || 0, male_students || 0, female_students || 0, uniform_distributed || 0, books_distributed || 0, cctv_available || 'no', toilets_available || 'no', holding_account_number || null, record.id]);
    } else {
      await db.query(`
        INSERT INTO school_data (school_id, total_students, male_students, female_students, uniform_distributed, books_distributed, cctv_available, toilets_available, holding_account_number, academic_year)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [schoolId, total_students || 0, male_students || 0, female_students || 0, uniform_distributed || 0, books_distributed || 0, cctv_available || 'no', toilets_available || 'no', holding_account_number || null, academic_year]);
    }

    const updated = await db.get('SELECT * FROM school_data WHERE school_id = ? AND academic_year = ?', [schoolId, academic_year]);
    res.json(updated);
  } catch (err) {
    console.error('Save school data error:', err.message);
    res.status(500).json({ error: 'Failed to save school metrics.' });
  }
});

// GET /api/schooldata/summary
// Cluster only: return cluster aggregate totals
router.get('/summary', requireRole('cluster'), async (req, res) => {
  try {
    const aggregate = await db.get(`
      SELECT 
        COALESCE(SUM(total_students), 0) AS total_students,
        COALESCE(SUM(male_students), 0) AS total_boys,
        COALESCE(SUM(female_students), 0) AS total_girls,
        COALESCE(SUM(uniform_distributed), 0) AS total_uniforms,
        COALESCE(SUM(books_distributed), 0) AS total_books
      FROM school_data sd
      JOIN schools s ON sd.school_id = s.id
      WHERE s.cluster_id = ?
    `, [req.user.id]);

    const perSchool = await db.all(`
      SELECT 
        s.id AS school_id,
        s.name AS school_name,
        COALESCE(sd.total_students, 0) AS total_students,
        COALESCE(sd.male_students, 0) AS boys,
        COALESCE(sd.female_students, 0) AS girls,
        COALESCE(sd.uniform_distributed, 0) AS uniforms,
        COALESCE(sd.books_distributed, 0) AS books
      FROM schools s
      LEFT JOIN school_data sd ON s.id = sd.school_id
      WHERE s.cluster_id = ?
      ORDER BY s.name ASC
    `, [req.user.id]);

    res.json({
      summary: aggregate,
      per_school: perSchool
    });
  } catch (err) {
    console.error('Cluster summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch cluster summary metrics.' });
  }
});

module.exports = router;
