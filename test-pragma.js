const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
console.log(db.prepare("PRAGMA foreign_key_list(account_transactions)").all());
