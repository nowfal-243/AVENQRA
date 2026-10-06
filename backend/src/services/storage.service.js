const path = require('path');

class StorageService {
  /**
   * Generates accessible URL for uploaded file (Local static server or Cloudinary)
   */
  static getFileUrl(file) {
    if (!file) return null;
    
    // If Cloudinary URL exists, return it
    if (file.path && file.path.startsWith('http')) {
      return file.path;
    }

    // Default: Local static route
    const filename = path.basename(file.path || file.filename);
    const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${host}/uploads/${filename}`;
  }
}

module.exports = StorageService;
