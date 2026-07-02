const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { uploadFile, downloadFile, deleteFile } = require('../utils/storage');

const router = express.Router();
router.use(authMiddleware);

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only Excel files (.xls, .xlsx) are allowed.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// GET /api/excel - List excel sheets uploaded by cluster
router.get('/', async (req, res) => {
  try {
    let clusterId = null;
    let sheets;

    if (req.user.role === 'cluster') {
      clusterId = req.user.id;
      sheets = await db.all('SELECT id, cluster_id, title, title_mr, file_name, visible_to_schools, created_at FROM excel_sheets WHERE cluster_id = ? ORDER BY created_at DESC', [clusterId]);
    } else {
      const school = await db.get('SELECT cluster_id FROM schools WHERE id = ?', [req.user.school_id]);
      if (!school) {
        return res.status(404).json({ error: 'School not found.' });
      }
      clusterId = school.cluster_id;
      // HM only sees visible sheets
      sheets = await db.all('SELECT id, cluster_id, title, title_mr, file_name, visible_to_schools, created_at FROM excel_sheets WHERE cluster_id = ? AND visible_to_schools = 1 ORDER BY created_at DESC', [clusterId]);
    }

    res.json(sheets);
  } catch (err) {
    console.error('List excel sheets error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve Excel sheets.' });
  }
});

// POST /api/excel - Upload Excel and parse (Cluster only)
router.post('/', requireRole('cluster'), upload.single('file'), async (req, res) => {
  try {
    const { title, title_mr } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required.' });
    }

    // Parse Excel file from buffer directly
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // read first sheet
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON array of arrays or objects
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

    // Upload file to Supabase Storage
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
    const filePath = await uploadFile(uniqueFileName, req.file.buffer, req.file.mimetype);

    // Store in DB
    const sheetDataJson = JSON.stringify(data);
    const result = await db.run(`
      INSERT INTO excel_sheets (cluster_id, title, title_mr, file_path, file_name, sheet_data)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `, [req.user.id, title, title_mr || null, filePath, req.file.originalname, sheetDataJson]);

    const created = await db.get('SELECT id, cluster_id, title, title_mr, file_name, created_at FROM excel_sheets WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Upload Excel error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process Excel file.' });
  }
});

// GET /api/excel/:id - Get parsed data for rendering
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sheet = await db.get('SELECT * FROM excel_sheets WHERE id = ?', [id]);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found.' });
    }

    // Verify access
    if (req.user.role === 'cluster' && sheet.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({
      id: sheet.id,
      title: sheet.title,
      title_mr: sheet.title_mr,
      file_name: sheet.file_name,
      sheet_data: JSON.parse(sheet.sheet_data)
    });
  } catch (err) {
    console.error('Fetch Excel data error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve Excel data.' });
  }
});

// DELETE /api/excel/:id - Delete Excel sheet (Cluster only)
router.delete('/:id', requireRole('cluster'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sheet = await db.get('SELECT * FROM excel_sheets WHERE id = ?', [id]);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found.' });
    }

    if (sheet.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Delete associated Supabase Storage file if it exists
    if (sheet.file_path) {
      const uniqueName = sheet.file_path.split('/').pop();
      try {
        await deleteFile(uniqueName);
      } catch (storageErr) {
        console.warn('Failed to delete file from Supabase storage:', storageErr.message);
      }
    }

    await db.query('DELETE FROM excel_sheets WHERE id = ?', [id]);
    res.json({ message: 'Excel sheet deleted successfully.' });
  } catch (err) {
    console.error('Delete Excel error:', err.message);
    res.status(500).json({ error: 'Failed to delete Excel sheet.' });
  }
});

// GET /api/excel/:id/download - Download original excel file
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sheet = await db.get('SELECT * FROM excel_sheets WHERE id = ?', [id]);

    if (!sheet) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const uniqueName = sheet.file_path.split('/').pop();
    const data = await downloadFile(uniqueName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sheet.file_name}"`);
    
    // Convert Blob/ArrayBuffer to Buffer and send
    res.send(Buffer.from(await data.arrayBuffer()));
  } catch (err) {
    console.error('Download Excel file error:', err.message);
    res.status(500).json({ error: 'Failed to download Excel file.' });
  }
});

// PATCH /api/excel/:id/visibility - Toggle visibility to schools (Cluster only)
router.patch('/:id/visibility', requireRole('cluster'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sheet = await db.get('SELECT * FROM excel_sheets WHERE id = ?', [id]);

    if (!sheet) {
      return res.status(404).json({ error: 'Sheet not found.' });
    }

    if (sheet.cluster_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const newVisibility = sheet.visible_to_schools ? 0 : 1;
    await db.query('UPDATE excel_sheets SET visible_to_schools = ? WHERE id = ?', [newVisibility, id]);

    res.json({ id, visible_to_schools: newVisibility });
  } catch (err) {
    console.error('Toggle Excel visibility error:', err.message);
    res.status(500).json({ error: 'Failed to toggle visibility.' });
  }
});

module.exports = router;
