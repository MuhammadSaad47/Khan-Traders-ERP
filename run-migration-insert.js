const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
try {
  db.prepare("INSERT INTO _migrations (filename) VALUES ('0023_remove_credit_limit.sql')").run();
  console.log('Migration recorded');
} catch (e) {
  console.log(e.message);
}
db.close();
