const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

const txs = db.prepare(`SELECT * FROM account_transactions WHERE reference_type = 'payment'`).all();
console.log("Account txs for payments:", txs);

const payments = db.prepare(`SELECT * FROM payments`).all();
console.log("Payments:", payments);

