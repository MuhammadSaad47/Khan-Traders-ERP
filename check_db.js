const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
const db = new Database(dbPath);
const cols = db.pragma('table_info(expense_categories)');
console.log(cols.map(c => c.name));
