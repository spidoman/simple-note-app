// backend/helpers/helper.js
const mysql = require('mysql2/promise');

// Create a MySQL pool - change config as per your setup
const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_mysql_user',
  password: 'your_mysql_password',
  database: 'your_database_name',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create a note
async function createNote({ userId, title, body, color, image }) {
  const sql = `
    INSERT INTO notes (userId, title, body, color, image, createdAt)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;
  const [result] = await pool.execute(sql, [userId, title, body, color, image]);
  // Return the inserted note
  return getNoteById(result.insertId);
}

// Get all notes by userId
async function getNotesByUserId(userId) {
  const sql = `SELECT * FROM notes WHERE userId = ? ORDER BY createdAt DESC`;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

// Get single note by id
async function getNoteById(id) {
  const sql = `SELECT * FROM notes WHERE id = ?`;
  const [rows] = await pool.execute(sql, [id]);
  return rows[0]; // Return first or undefined if none
}

// Update note by id
async function updateNoteById(id, { title, body, color, image }) {
  const sql = `
    UPDATE notes
    SET title = ?, body = ?, color = ?, image = ?
    WHERE id = ?
  `;
  await pool.execute(sql, [title, body, color, image, id]);
  return getNoteById(id);
}

// Delete note by id
async function deleteNoteById(id) {
  const sql = `DELETE FROM notes WHERE id = ?`;
  await pool.execute(sql, [id]);
}

module.exports = {
  createNote,
  getNotesByUserId,
  getNoteById,
  updateNoteById,
  deleteNoteById,
};
