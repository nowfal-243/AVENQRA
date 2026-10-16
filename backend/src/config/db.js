/**
 * Prisma client — points at Supabase Postgres (see DATABASE_URL in .env).
 *
 * DATABASE_URL should be the Supabase pooled connection (port 6543)
 * for runtime; DIRECT_URL is the direct connection (port 5432) used
 * by `prisma migrate`.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

function withTimeout(promise, ms = 2000, label = 'DB query') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms (DB unreachable?)`)), ms);
  });
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(timer)), timeout]);
}

function parseHostPort(url) {
  const m = (url || '').match(/@([^:/()?]+)(?::(\d+))?/);
  return { host: (m && m[1]) || 'localhost', port: (m && parseInt(m[2], 10)) || 5432 };
}

function isDbReachable(timeoutMs = 1500) {
  const net = require('net');
  return new Promise((resolve) => {
    try {
      const src = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
      const hp = parseHostPort(src);
      const sock = new net.Socket();
      let done = false;
      const finish = (ok) => { if (!done) { done = true; try { sock.destroy(); } catch (e) {} resolve(ok); } };
      sock.setTimeout(timeoutMs);
      sock.on('connect', () => finish(true));
      sock.on('timeout', () => finish(false));
      sock.on('error', () => finish(false));
      sock.connect(hp.port, hp.host);
    } catch (e) { resolve(false); }
  });
}

module.exports = prisma;
module.exports.prisma = prisma;
module.exports.withTimeout = withTimeout;
module.exports.isDbReachable = isDbReachable;
