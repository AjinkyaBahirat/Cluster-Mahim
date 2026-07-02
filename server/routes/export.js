const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/export/schools - Export all school data for cluster
router.get('/schools', requireRole('cluster'), async (req, res) => {
  try {
    const clusterId = req.user.id;

    const schools = await db.all(`
      SELECT 
        s.id, s.name, s.udise_code, s.school_type, s.village_town, s.pin_code,
        h.name AS hm_name, h.phone AS hm_phone,
        sd.total_students, sd.male_students, sd.female_students,
        sd.uniform_distributed, sd.books_distributed,
        sd.cctv_available, sd.toilets_available, sd.holding_account_number,
        (SELECT COUNT(*) FROM teachers t WHERE t.school_id = s.id) AS teacher_count
      FROM schools s
      LEFT JOIN headmasters h ON h.school_id = s.id
      LEFT JOIN school_data sd ON sd.school_id = s.id
      WHERE s.cluster_id = ?
      ORDER BY s.name ASC
    `, [clusterId]);

    res.json({ schools });
  } catch (err) {
    console.error('Export schools error:', err.message);
    res.status(500).json({ error: 'Failed to export school data.' });
  }
});

module.exports = router;
