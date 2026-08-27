const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

const at = db.prepare(`SELECT * FROM account_transactions WHERE id IN (12,15,16,17)`).all();
console.log("Transactions to delete:", JSON.stringify(at, null, 2));

const accs = db.prepare(`SELECT * FROM accounts`).all();
console.log("Accounts before:", JSON.stringify(accs, null, 2));
