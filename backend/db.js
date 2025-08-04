const mysql = require('mysql2/promise');

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'YourPassword',  // your password
  database: 'note',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Ensure tables exist and columns
async function ensureTables() {
  try {
    // Create users table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        profileImage VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notes table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        image VARCHAR(255),
        color VARCHAR(20) DEFAULT '#ffffff',
        pinned BOOLEAN DEFAULT FALSE,
        archived BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Add missing columns if needed
    const [pinnedCols] = await pool.execute(`SHOW COLUMNS FROM notes LIKE 'pinned'`);
    if (pinnedCols.length === 0) {
      await pool.execute(`ALTER TABLE notes ADD COLUMN pinned BOOLEAN DEFAULT FALSE`);
      console.log('Added missing pinned column to notes table.');
    }

    const [archivedCols] = await pool.execute(`SHOW COLUMNS FROM notes LIKE 'archived'`);
    if (archivedCols.length === 0) {
      await pool.execute(`ALTER TABLE notes ADD COLUMN archived BOOLEAN DEFAULT FALSE`);
      console.log('Added missing archived column to notes table.');
    }

    const [updatedCols] = await pool.execute(`SHOW COLUMNS FROM notes LIKE 'updatedAt'`);
    if (updatedCols.length === 0) {
      await pool.execute(`
        ALTER TABLE notes
        ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
      console.log('Added missing updatedAt column to notes table.');
    } else {
      console.log('updatedAt column exists in notes table.');
    }

    console.log('Tables ensured.');
  } catch (err) {
    console.error('Error ensuring tables:', err);
  }
}

// Call the table check on start
ensureTables();

// Create a new note
async function createNote({ userId, title, body, color, image, pinned = false, archived = false }) {
  const [result] = await pool.execute(
    `INSERT INTO notes (userId, title, content, color, image, pinned, archived) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, body, color, image, pinned, archived]
  );
  return getNoteById(result.insertId);
}

// Get notes by user ID, ordered pinned first then by date
async function getNotesByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM notes WHERE userId = ? ORDER BY pinned DESC, createdAt DESC`,
    [userId]
  );
  return rows;
}

// Get a note by ID
async function getNoteById(noteId) {
  const [rows] = await pool.execute(
    `SELECT * FROM notes WHERE id = ?`,
    [noteId]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Update note by ID.
 * Supports partial updates: only fields provided in the data object will be updated.
 * @param {number} noteId
 * @param {object} data - Fields to update: title, body, color, image, pinned, archived
 */
async function updateNoteById(noteId, data = {}) {
  const fields = [];
  const params = [];

  if ('title' in data) {
    fields.push('title = ?');
    params.push(data.title);
  }
  if ('body' in data) {
    fields.push('content = ?');
    params.push(data.body);
  }
  if ('color' in data) {
    fields.push('color = ?');
    params.push(data.color);
  }
  if ('image' in data) {
    fields.push('image = ?');
    params.push(data.image);
  }
  if ('pinned' in data) {
    fields.push('pinned = ?');
    params.push(data.pinned);
  }
  if ('archived' in data) {
    fields.push('archived = ?');
    params.push(data.archived);
  }

  // Always update updatedAt timestamp
  fields.push('updatedAt = CURRENT_TIMESTAMP');

  if (fields.length === 0) {
    // Nothing to update
    return getNoteById(noteId);
  }

  const sql = `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`;
  params.push(noteId);

  await pool.execute(sql, params);
  return getNoteById(noteId);
}

// Delete note by ID
async function deleteNoteById(noteId) {
  await pool.execute('DELETE FROM notes WHERE id = ?', [noteId]);
}

// Get user by ID
async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, profileImage, createdAt FROM users WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  pool,
  ensureTables,
  getUserById,
  createNote,
  getNotesByUserId,
  getNoteById,
  updateNoteById,
  deleteNoteById,
};
