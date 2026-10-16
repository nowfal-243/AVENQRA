const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StorageService = require('../services/storage.service');
const { isSupabaseConfigured } = require('../config/supabase');

// Local disk fallback (used only when Supabase Storage is not configured).
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function diskStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `media-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and MP4 files are allowed.'), false);
};

const useMemory = isSupabaseConfigured();

// Memory storage when Supabase is configured (uploaded straight to bucket);
// disk storage otherwise (legacy local /uploads behaviour).
const upload = multer({
  storage: useMemory ? multer.memoryStorage() : diskStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// After multer runs, push memory buffers up to Supabase Storage so
// downstream code can just use `req.file.publicUrl`.
upload.pushToSupabase = async (req, res, next) => {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files && Array.isArray(req.files)) files.push(...req.files);
    for (const f of files) {
      if (f && f.buffer && !f.publicUrl) {
        const url = await StorageService.uploadBuffer(f.buffer, f.originalname, f.mimetype);
        if (url) f.publicUrl = url;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = upload;
