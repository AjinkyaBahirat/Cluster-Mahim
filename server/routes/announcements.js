const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { uploadFile, downloadFile, deleteFile } = require('../utils/storage');

const router = express.Router();
router.use(authMiddleware);

// Set up Multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/announcements - Retrieve list of announcements
router.get('/', async (req, res) => {
  try {
    let clusterId = null;

    if (req.user.role === 'cluster') {
      clusterId = req.user.id;
    } else {
      // Get cluster ID for school
      const school = await db.get('SELECT cluster_id FROM schools WHERE id = ?', [req.user.school_id]);
      if (!school) {
        return res.status(404).json({ error: 'School not found.' });
      }
      clusterId = school.cluster_id;
    }

    const announcements = await db.all('SELECT * FROM announcements WHERE cluster_id = ? ORDER BY created_at DESC', [clusterId]);
    res.json(announcements);
  } catch (err) {
    console.error('List announcements error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve announcements.' });
  }
});

// POST /api/announcements - Add announcement (Cluster only)
router.post('/', requireRole('cluster'), upload.single('file'), async (req, res) => {
  try {
    const { title, title_mr, description, description_mr } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }

    let filePath = null;
    let fileName = null;
    let fileType = null;

    if (req.file) {
      const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
      // Upload to Supabase and get publicUrl
      filePath = await uploadFile(uniqueFileName, req.file.buffer, req.file.mimetype);
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    const result = await db.run(`
      INSERT INTO announcements (cluster_id, title, title_mr, description, description_mr, file_path, file_name, file_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [
      req.user.id,
      title,
      title_mr || null,
      description || null,
      description_mr || null,
      filePath,
      fileName,
      fileType
    ]);

    const announcement = await db.get('SELECT * FROM announcements WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(announcement);
  } catch (err) {
    console.error('Create announcement error:', err.message);
    res.status(500).json({ error: 'Failed to post announcement.' });
  }
});

// DELETE /api/announcements/:id - Delete announcement (Cluster only)
router.delete('/:id', requireRole('cluster'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ann = await db.get('SELECT * FROM announcements WHERE id = ?', [id]);

    if (!ann) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    if (ann.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Delete associated Supabase Storage file if it exists
    if (ann.file_path) {
      const uniqueName = ann.file_path.split('/').pop();
      try {
        await deleteFile(uniqueName);
      } catch (storageErr) {
        console.warn('Failed to delete file from Supabase storage:', storageErr.message);
      }
    }

    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted successfully.' });
  } catch (err) {
    console.error('Delete announcement error:', err.message);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

// GET /api/announcements/:id/download - Download PDF/CSV attachment
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ann = await db.get('SELECT * FROM announcements WHERE id = ?', [id]);

    if (!ann || !ann.file_path) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const uniqueName = ann.file_path.split('/').pop();
    const data = await downloadFile(uniqueName);

    res.setHeader('Content-Type', ann.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${ann.file_name}"`);
    
    // Convert Blob/ArrayBuffer to Buffer and send
    res.send(Buffer.from(await data.arrayBuffer()));
  } catch (err) {
    console.error('Download file error:', err.message);
    res.status(500).json({ error: 'Failed to download file.' });
  }
});

module.exports = router;
