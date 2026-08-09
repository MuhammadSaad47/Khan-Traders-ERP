const Database = require('better-sqlite3');
const os = require('os');
const path = require('path');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
const db = new Database(dbPath);

try {
  const rows = db.prepare("PRAGMA table_info(items)").all();
  console.log(rows);
} catch(e) {
  console.error("SQL Error:", e);
}
