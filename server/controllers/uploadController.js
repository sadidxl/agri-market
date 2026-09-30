const { ok, fail } = require('../utils/helpers');

// POST /api/upload/image — expects multipart/form-data with field "image"
// (the multer middleware runs before this and populates req.file)
const uploadImage = (req, res) => {
  if (!req.file) {
    return fail(res, 'No image file was uploaded.', 400);
  }
  const url = `/uploads/${req.file.filename}`;
  return ok(res, { url, filename: req.file.filename, size: req.file.size }, {
    message: 'Image uploaded successfully.',
  });
};

module.exports = { uploadImage };
