const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); // <-- Destructured pool here
const authMiddleware = require('../middleware/authmiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Multer config for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP files are allowed'));
    }
    cb(null, true);
  },
});

// Helper function to get user by ID without password
async function getUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, email, profileImage, createdAt FROM users WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

// Register
router.post('/register', upload.single('profileImage'), async (req, res) => {
  const { name, email, password } = req.body;
  const profileImage = req.file ? req.file.filename : null;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.execute(
      'INSERT INTO users (name, email, password, profileImage) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, profileImage]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    console.log('Login attempt for email:', email);

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      console.log('No user found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    if (!user.password) {
      console.log('User password missing for email:', email);
      return res.status(500).json({ message: 'User password not set' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
    console.log('User logged in:', email);
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current authenticated user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('/me error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
