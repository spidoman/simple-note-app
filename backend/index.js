const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const noteRoutes = require('./routes/note');
const authRoutes = require('./routes/auth');
const { pool } = require('./db');  // Already includes ensureTables internally if you use updated db.js

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Routes
app.use('/api', authRoutes);       // handles /api/login, /api/register
app.use('/api/notes', noteRoutes); // handles /api/notes/*

// Optional: Simple root endpoint
app.get('/', (req, res) => {
  res.send('Notes API is running 🚀');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
