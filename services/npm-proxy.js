const path = require('path');

const NPM_DB_PATH = process.env.NPM_DB_PATH || '/data/npm.sqlite';
let Database;
let urlMap = new Map();
let lastRefresh = 0;
const REFRESH_INTERVAL = 60000; // 60 seconds

// Lazy-load better-sqlite3 (might not be available in dev)
function getDb() {
  if (!Database) {
    try {
      Database = require('better-sqlite3');
    } catch {
      console.warn('better-sqlite3 not available, NPM URL resolution disabled');
      return null;
    }
  }
  try {
    return new Database(NPM_DB_PATH, { readonly: true, fileMustExist: true });
  } catch (err) {
    console.warn(`Cannot open NPM database at ${NPM_DB_PATH}: ${err.message}`);
    return null;
  }
}

// Refresh the URL lookup map from NPM database
function refreshMap() {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_INTERVAL) return;
  lastRefresh = now;

  const db = getDb();
  if (!db) return;

  try {
    const rows = db.prepare(
      `SELECT domain_names, forward_host, forward_port, forward_scheme
       FROM proxy_host
       WHERE is_deleted = 0 AND enabled = 1`
    ).all();

    const newMap = new Map();
    for (const row of rows) {
      try {
        const domains = JSON.parse(row.domain_names);
        if (domains.length > 0) {
          const key = `${row.forward_host}:${row.forward_port}`;
          const scheme = row.forward_scheme === 'https' ? 'https' : 'https'; // NPM always serves via HTTPS
          newMap.set(key, `${scheme}://${domains[0]}`);
        }
      } catch { /* skip malformed entries */ }
    }
    urlMap = newMap;
    console.log(`NPM proxy map refreshed: ${urlMap.size} entries`);
  } finally {
    db.close();
  }
}

// Resolve a direct URL to its NPM proxy URL
// Returns { url: primary URL, fallbackUrl: direct URL or null }
function resolveUrl(directUrl) {
  refreshMap();

  if (!directUrl) return { url: '', fallbackUrl: '' };

  try {
    const parsed = new URL(directUrl);
    const key = `${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
    const proxyUrl = urlMap.get(key);

    if (proxyUrl) {
      return { url: proxyUrl, fallbackUrl: directUrl };
    }
  } catch { /* invalid URL, return as-is */ }

  return { url: directUrl, fallbackUrl: '' };
}

module.exports = { resolveUrl, refreshMap };
