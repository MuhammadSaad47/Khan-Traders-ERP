const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

console.log("Deleting transaction IDs: 12, 15, 16, 17");
db.prepare(`DELETE FROM account_transactions WHERE id IN (12, 15, 16, 17)`).run();

console.log("Deleted unwanted double transactions successfully.");
