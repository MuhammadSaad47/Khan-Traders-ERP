const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
try {
  const db = new Database(dbPath, { fileMustExist: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const table of tables) {
    console.log(`\nTable: ${table.name}`);
    const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.table(schema);
  }
} catch (err) {
  console.error('Error:', err.message);
}
