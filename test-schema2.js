const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get().sql);
