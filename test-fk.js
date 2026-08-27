const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

try {
  // Let's manually try to insert a fake transaction
  const stmt = db.prepare(`
    INSERT INTO account_transactions (account_id, type, amount, reference_type, reference_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(2, 'credit', 100, 'payment', 1, 'Test', 1);
  console.log("Insert successful!");
} catch (e) {
  console.log("Insert failed:", e.message);
}
