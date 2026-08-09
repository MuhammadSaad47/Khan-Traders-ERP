const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const appDataPath = path.join(os.homedir(), '.config', 'khan-trader'); // Electron user data
const dbPath = path.join(appDataPath, 'khan-trader.sqlite'); // Correct filename!
console.log('Connecting to', dbPath);
const db = new Database(dbPath);

try {
  // Mark 0008 as applied
  db.prepare("INSERT OR IGNORE INTO _migrations (filename) VALUES ('0008_critical_fixes.sql')").run();
  console.log('0008 marked as applied');
} catch (e) {
  console.error('Failed to mark 0008', e);
}
