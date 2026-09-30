const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadImage } = require('../controllers/uploadController');

// Wrap multer so its errors (bad file type, too large) come back as our
// standard JSON error shape instead of an unhandled exception.
const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message, message: err.message });
    }
    next();
  });
};

router.post('/image', authenticate, handleUpload, uploadImage);

module.exports = router;
