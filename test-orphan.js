const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

const orphanedPayments = db.prepare(`
  SELECT id, account_id FROM payments 
  WHERE account_id IS NOT NULL 
  AND account_id NOT IN (SELECT id FROM accounts)
`).all();

console.log("Orphaned Payments:", orphanedPayments);

const orphanedTx = db.prepare(`
  SELECT id, account_id, created_by FROM account_transactions 
  WHERE (account_id NOT IN (SELECT id FROM accounts))
     OR (created_by NOT IN (SELECT id FROM users))
`).all();

console.log("Orphaned Account Transactions:", orphanedTx);

