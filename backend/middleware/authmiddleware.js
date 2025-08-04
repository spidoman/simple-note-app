const jwt = require('jsonwebtoken');
const { getUserById } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';  // Use same secret everywhere

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: 'Token missing' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
