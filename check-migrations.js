const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const appDataPath = path.join(os.homedir(), '.config', 'khan-trader');
const dbPath = path.join(appDataPath, 'khan-trader.sqlite');
const db = new Database(dbPath);

const applied = db.prepare("SELECT filename FROM _migrations").all().map(r => r.filename);
const folder = fs.readdirSync(path.join(__dirname, 'migrations')).filter(f => f.endsWith('.sql'));

console.log("Applied in DB:");
console.log(applied);

console.log("\nIn folder:");
console.log(folder);

console.log("\nPending:");
console.log(folder.filter(f => !applied.includes(f)));
