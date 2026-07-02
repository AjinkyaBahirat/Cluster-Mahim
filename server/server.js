const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'school_cluster_secret_key_2024';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database (creates tables + seed data on first run)
require('./db/database');

// Static uploads folder configuration
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const schooldataRoutes = require('./routes/schooldata');
const formRoutes = require('./routes/forms');
const announcementRoutes = require('./routes/announcements');
const excelRoutes = require('./routes/excel');
const exportRoutes = require('./routes/export');

app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schooldata', schooldataRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   School Cluster Management System - API     ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   Server running on port ${PORT}               ║`);
  console.log(`║   Environment: ${process.env.NODE_ENV || 'development'}                 ║`);
  console.log('║   API Base: /api                             ║');
  console.log('╚══════════════════════════════════════════════╝');
});

module.exports = app;
