/**
 * Prisma client — connects to persistent database (SQLite file:./dev.db or Supabase Postgres).
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

function withTimeout(promise, ms = 5000, label = 'DB query') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(timer)), timeout]);
}

function parseHostPort(url) {
  const m = (url || '').match(/@([^:/()?]+)(?::(\d+))?/);
  return { host: (m && m[1]) || 'localhost', port: (m && parseInt(m[2], 10)) || 5432 };
}

function isDbReachable(timeoutMs = 1500) {
  const src = process.env.DATABASE_URL || '';
  if (src.startsWith('file:')) {
    return Promise.resolve(true);
  }
  const net = require('net');
  return new Promise((resolve) => {
    try {
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
