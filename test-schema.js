const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
const res = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='account_transactions'").get();
console.log(res.sql);
