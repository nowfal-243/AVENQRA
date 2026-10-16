/**
 * Supabase clients — single source of truth for Supabase access.
 *
 * - `supabaseAdmin`  : uses SUPABASE_SECRET_KEY (service_role). NEVER expose
 *                       to the frontend. Used for Storage uploads, and any
 *                       admin-level PostgREST access (bypasses RLS).
 * - `supabaseAnon`   : uses SUPABASE_PUBLISHABLE_KEY (anon). Safe for
 *                       low-privilege reads; RLS still applies.
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_SECRET_KEY   (server-only)
 *   SUPABASE_PUBLISHABLE_KEY (anon)
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function warnOnce(msg) {
  if (!global.__supabaseWarned) {
    global.__supabaseWarned = true;
    console.warn(msg);
  }
}

let supabaseAdmin = null;
let supabaseAnon = null;

if (SUPABASE_URL && SECRET_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} else {
  warnOnce('⚠️  SUPABASE_URL / SUPABASE_SECRET_KEY not set — Supabase admin features (Storage) disabled.');
}

if (SUPABASE_URL && (PUBLISHABLE_KEY || SECRET_KEY)) {
  supabaseAnon = createClient(SUPABASE_URL, PUBLISHABLE_KEY || SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SECRET_KEY);
}

module.exports = { supabaseAdmin, supabaseAnon, isSupabaseConfigured, SUPABASE_URL };
