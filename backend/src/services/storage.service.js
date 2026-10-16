const path = require('path');
const { supabaseAdmin, isSupabaseConfigured, SUPABASE_URL } = require('../config/supabase');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'complaint-media';

class StorageService {
  static async uploadBuffer(buffer, originalName, mimetype) {
    if (!isSupabaseConfigured() || !supabaseAdmin) return null;
    try {
      const safe = String(originalName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `complaints/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`;
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(key, buffer, {
        contentType: mimetype || 'application/octet-stream',
        upsert: false,
      });
      if (error) {
        console.warn('[Storage] Supabase upload failed:', error.message);
        return null;
      }
      const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(key);
      return (data && data.publicUrl) || null;
    } catch (err) {
      console.warn('[Storage] Supabase upload error:', err.message);
      return null;
    }
  }

  static getFileUrl(file) {
    if (!file) return null;
    if (file.path && String(file.path).startsWith('http')) return file.path;
    if (file.publicUrl) return file.publicUrl;
    const filename = path.basename(file.path || file.filename || '');
    if (isSupabaseConfigured() && SUPABASE_URL) {
      return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    }
    const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${host}/uploads/${filename}`;
  }
}

module.exports = StorageService;
