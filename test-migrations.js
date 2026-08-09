const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const appDataPath = path.join(os.homedir(), '.config', 'khan-trader');
const sqlite = new Database(path.join(appDataPath, 'khan-trader.sqlite'));

const migrationsDir = path.join(__dirname, 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
const appliedSet = new Set(sqlite.prepare('SELECT filename FROM _migrations').all().map(r => r.filename));

for (const file of files) {
  if (appliedSet.has(file)) continue;
  console.log('Running:', file);
  try {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    })();
    console.log('Success:', file);
  } catch (err) {
    console.log('Failed:', file, err.message);
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
        console.log('Assuming already applied. Marking it.');
        sqlite.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    } else {
        break;
    }
  }
}
