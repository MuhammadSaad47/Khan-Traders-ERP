const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
try {
  db.prepare('ALTER TABLE customers DROP COLUMN credit_limit').run();
  console.log('Migration applied successfully');
} catch (e) {
  console.log(e.message);
}
db.close();
