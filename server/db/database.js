const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Support local development fallback
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mahim';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// A helper function to translate SQLite "?" placeholders into Postgres "$1, $2, ..."
function translateSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  pool,
  async query(text, params) {
    return pool.query(translateSql(text), params);
  },
  async get(text, params) {
    const res = await pool.query(translateSql(text), params);
    return res.rows[0];
  },
  async all(text, params) {
    const res = await pool.query(translateSql(text), params);
    return res.rows;
  },
  async run(text, params) {
    const res = await pool.query(translateSql(text), params);
    const lastRow = res.rows[0];
    return {
      lastInsertRowid: lastRow ? lastRow.id : null,
      rowCount: res.rowCount
    };
  }
};

// Initialize DB schema
const initDb = async () => {
  try {
    // 1. Clusters
    await db.query(`
      CREATE TABLE IF NOT EXISTS clusters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        district TEXT,
        block TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Schools
    await db.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        udise_code TEXT UNIQUE,
        address TEXT,
        village_town TEXT,
        pin_code TEXT,
        school_type TEXT DEFAULT 'ZP' CHECK(school_type IN ('ZP', 'Private Aided', 'Private Un-Aided', 'Self Finance')),
        cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Headmasters
    await db.query(`
      CREATE TABLE IF NOT EXISTS headmasters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        school_id INTEGER UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Teachers
    await db.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        category TEXT,
        dob TEXT,
        doj TEXT,
        doj_this_school TEXT,
        tet TEXT,
        ctet_year TEXT,
        designation TEXT DEFAULT 'Assistant Teacher',
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Standard-wise Student Records
    await db.query(`
      CREATE TABLE IF NOT EXISTS student_records (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        standard INTEGER NOT NULL CHECK(standard >= 1 AND standard <= 12),
        total_boys INTEGER DEFAULT 0,
        total_girls INTEGER DEFAULT 0,
        academic_year TEXT DEFAULT '2025-26',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, standard, academic_year)
      )
    `);

    // 6. School Data (Aggregated Enrollment, Uniform, Books)
    await db.query(`
      CREATE TABLE IF NOT EXISTS school_data (
        id SERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        total_students INTEGER DEFAULT 0,
        male_students INTEGER DEFAULT 0,
        female_students INTEGER DEFAULT 0,
        uniform_distributed INTEGER DEFAULT 0,
        books_distributed INTEGER DEFAULT 0,
        cctv_available TEXT DEFAULT 'no',
        toilets_available TEXT DEFAULT 'no',
        holding_account_number TEXT,
        academic_year TEXT DEFAULT '2025-26',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, academic_year)
      )
    `);

    // 7. Dynamic Forms
    await db.query(`
      CREATE TABLE IF NOT EXISTS dynamic_forms (
        id SERIAL PRIMARY KEY,
        cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Form Questions
    await db.query(`
      CREATE TABLE IF NOT EXISTS form_questions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES dynamic_forms(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_text_mr TEXT,
        question_type TEXT NOT NULL CHECK(question_type IN ('text', 'number', 'yes_no', 'select', 'date')),
        options TEXT,
        is_required INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0
      )
    `);

    // 9. Form Responses
    await db.query(`
      CREATE TABLE IF NOT EXISTS form_responses (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL REFERENCES dynamic_forms(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES form_questions(id) ON DELETE CASCADE,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        response_value TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(form_id, question_id, school_id)
      )
    `);

    // 10. Announcements
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        title_mr TEXT,
        description TEXT,
        description_mr TEXT,
        file_path TEXT,
        file_name TEXT,
        file_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. Excel Sheets
    await db.query(`
      CREATE TABLE IF NOT EXISTS excel_sheets (
        id SERIAL PRIMARY KEY,
        cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        title_mr TEXT,
        file_path TEXT NOT NULL,
        file_name TEXT,
        sheet_data TEXT,
        visible_to_schools INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Default Cluster Admin
    const countRes = await db.get('SELECT COUNT(*) AS count FROM clusters');
    if (parseInt(countRes.count, 10) === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await db.query(`
        INSERT INTO clusters (name, phone, password, district, block)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Cluster Admin', '9999999999', hashedPassword, 'Sample District', 'Sample Block']);
      console.log('✓ Default cluster admin created with Phone: 9999999999 and Password: admin123');
    }
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
};

initDb();

module.exports = db;
