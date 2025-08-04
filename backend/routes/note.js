const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const authMiddleware = require('../middleware/authmiddleware');
const {
  createNote,
  getNotesByUserId,
  getNoteById,
  updateNoteById,
  deleteNoteById,
} = require('../db'); // Make sure these are exported from your db.js

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/notes';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique filename
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP are allowed'));
    }
    cb(null, true);
  },
});

// Create note
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, body, color } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const image = req.file ? req.file.filename : null;
    const note = await createNote({
      userId: req.user.id,
      title,
      body: body || '',
      color: color || '#ffffff',
      image,
    });

    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err.message);
    res.status(500).json({ message: 'Server error during note creation' });
  }
});

// Get all notes (exclude archived, show pinned first)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notes = await getNotesByUserId(req.user.id);
    res.json(notes);
  } catch (err) {
    console.error('Get notes error:', err.message);
    res.status(500).json({ message: 'Server error during fetching notes' });
  }
});

// Get single note by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note || note.userId !== req.user.id) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    console.error('Get note error:', err.message);
    res.status(500).json({ message: 'Server error during fetching note' });
  }
});

// Update note
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note || note.userId !== req.user.id) return res.status(404).json({ message: 'Note not found' });

    const { title, body, color } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    let image = note.image;
    if (req.file) {
      if (image) {
        const oldPath = path.join(__dirname, '../uploads/notes', image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      image = req.file.filename;
    }

    const updatedNote = await updateNoteById(req.params.id, {
      title,
      body: body || '',
      color: color || '#ffffff',
      image,
    });

    res.json(updatedNote);
  } catch (err) {
    console.error('Update note error:', err.message);
    res.status(500).json({ message: 'Server error during note update' });
  }
});

// Delete note
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note || note.userId !== req.user.id) return res.status(404).json({ message: 'Note not found' });

    if (note.image) {
      const imgPath = path.join(__dirname, '../uploads/notes', note.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await deleteNoteById(req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err.message);
    res.status(500).json({ message: 'Server error during note deletion' });
  }
});

// Toggle pin/unpin note
router.put('/:id/pin', authMiddleware, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note || note.userId !== req.user.id)
      return res.status(404).json({ message: 'Note not found' });

    const updatedNote = await updateNoteById(req.params.id, { pinned: !note.pinned });
    res.json(updatedNote);
  } catch (err) {
    console.error('Toggle pin error:', err.message);
    res.status(500).json({ message: 'Server error during pin toggle' });
  }
});

// Toggle archive/unarchive note
router.put('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const note = await getNoteById(req.params.id);
    if (!note || note.userId !== req.user.id)
      return res.status(404).json({ message: 'Note not found' });

    const updatedNote = await updateNoteById(req.params.id, { archived: !note.archived });
    res.json(updatedNote);
  } catch (err) {
    console.error('Toggle archive error:', err.message);
    res.status(500).json({ message: 'Server error during archive toggle' });
  }
});

module.exports = router;
