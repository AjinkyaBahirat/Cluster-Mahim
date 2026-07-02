const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/forms - List forms
// Cluster: all forms created by this cluster admin
// HM: active forms from their cluster
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'cluster') {
      const forms = await db.all('SELECT * FROM dynamic_forms WHERE cluster_id = ? ORDER BY created_at DESC', [req.user.id]);
      res.json(forms);
    } else {
      // Find school cluster_id
      const school = await db.get('SELECT cluster_id FROM schools WHERE id = ?', [req.user.school_id]);
      if (!school) {
        return res.status(404).json({ error: 'School not found.' });
      }
      
      const forms = await db.all('SELECT * FROM dynamic_forms WHERE cluster_id = ? AND is_active = 1 ORDER BY created_at DESC', [school.cluster_id]);
      
      // For each form, check if HM has responded
      const formsWithStatus = [];
      for (const form of forms) {
        const responseCount = await db.get('SELECT COUNT(*) AS count FROM form_responses WHERE form_id = ? AND school_id = ?', [form.id, req.user.school_id]);
        formsWithStatus.push({
          ...form,
          has_responded: parseInt(responseCount.count, 10) > 0
        });
      }
      
      res.json(formsWithStatus);
    }
  } catch (err) {
    console.error('List forms error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve forms.' });
  }
});

// POST /api/forms - Create form with questions (Cluster only)
router.post('/', requireRole('cluster'), async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Form title is required.' });
    }

    let formId;
    await db.query('BEGIN');
    try {
      const formResult = await db.run(`
        INSERT INTO dynamic_forms (title, description, cluster_id)
        VALUES (?, ?, ?)
        RETURNING id
      `, [title, description || null, req.user.id]);
      
      formId = formResult.lastInsertRowid;

      if (questions && Array.isArray(questions)) {
        for (let idx = 0; idx < questions.length; idx++) {
          const q = questions[idx];
          const optsJson = q.options ? JSON.stringify(q.options) : null;
          await db.query(`
            INSERT INTO form_questions (form_id, question_text, question_text_mr, question_type, options, is_required, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            formId,
            q.question_text,
            q.question_text_mr || null,
            q.question_type || 'text',
            optsJson,
            q.is_required ? 1 : 0,
            idx
          ]);
        }
      }
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

    const createdForm = await db.get('SELECT * FROM dynamic_forms WHERE id = ?', [formId]);
    res.status(201).json(createdForm);
  } catch (err) {
    console.error('Create form error:', err.message);
    res.status(500).json({ error: 'Failed to create form.' });
  }
});

// GET /api/forms/:id - Get form and details
router.get('/:id', async (req, res) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const form = await db.get('SELECT * FROM dynamic_forms WHERE id = ?', [formId]);

    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    // Verify access
    if (req.user.role === 'cluster' && form.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const questions = await db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC', [formId]);
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
      is_required: q.is_required === 1
    }));

    if (req.user.role === 'hm') {
      // Get HM's responses
      const responses = await db.all('SELECT * FROM form_responses WHERE form_id = ? AND school_id = ?', [formId, req.user.school_id]);
      
      res.json({
        ...form,
        questions: parsedQuestions,
        responses: responses
      });
    } else {
      // Cluster view: return questions + overall response list
      const responses = await db.all(`
        SELECT r.*, s.name AS school_name
        FROM form_responses r
        JOIN schools s ON r.school_id = s.id
        WHERE r.form_id = ?
      `, [formId]);

      res.json({
        ...form,
        questions: parsedQuestions,
        responses: responses
      });
    }
  } catch (err) {
    console.error('Get form details error:', err.message);
    res.status(500).json({ error: 'Failed to fetch form details.' });
  }
});

// PUT /api/forms/:id - Update form status (Cluster only)
router.put('/:id', requireRole('cluster'), async (req, res) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const form = await db.get('SELECT * FROM dynamic_forms WHERE id = ?', [formId]);

    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    if (form.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { title, description, is_active } = req.body;

    await db.query(`
      UPDATE dynamic_forms
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      title || null,
      description || null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      formId
    ]);

    const updated = await db.get('SELECT * FROM dynamic_forms WHERE id = ?', [formId]);
    res.json(updated);
  } catch (err) {
    console.error('Update form error:', err.message);
    res.status(500).json({ error: 'Failed to update form.' });
  }
});

// DELETE /api/forms/:id - Delete form and cascade (Cluster only)
router.delete('/:id', requireRole('cluster'), async (req, res) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const form = await db.get('SELECT * FROM dynamic_forms WHERE id = ?', [formId]);

    if (!form) {
      return res.status(404).json({ error: 'Form not found.' });
    }

    if (form.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM form_responses WHERE form_id = ?', [formId]);
      await db.query('DELETE FROM form_questions WHERE form_id = ?', [formId]);
      await db.query('DELETE FROM dynamic_forms WHERE id = ?', [formId]);
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

    res.json({ message: 'Form deleted successfully.' });
  } catch (err) {
    console.error('Delete form error:', err.message);
    res.status(500).json({ error: 'Failed to delete form.' });
  }
});

// POST /api/forms/:id/respond - Submit/Update responses (HM only)
router.post('/:id/respond', requireRole('hm'), async (req, res) => {
  try {
    const formId = parseInt(req.params.id, 10);
    const { responses } = req.body; // Array of { question_id, response_value }

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array is required.' });
    }

    await db.query('BEGIN');
    try {
      for (const resItem of responses) {
        await db.query(`
          INSERT INTO form_responses (form_id, question_id, school_id, response_value)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(form_id, question_id, school_id) DO UPDATE SET
            response_value = EXCLUDED.response_value,
            submitted_at = CURRENT_TIMESTAMP
        `, [
          formId,
          resItem.question_id,
          req.user.school_id,
          resItem.response_value !== undefined && resItem.response_value !== null ? String(resItem.response_value) : null
        ]);
      }
      await db.query('COMMIT');
    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

    res.json({ message: 'Responses saved successfully.' });
  } catch (err) {
    console.error('Submit form response error:', err.message);
    res.status(500).json({ error: 'Failed to save responses.' });
  }
});

module.exports = router;
