const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');
const rows = db.prepare(`
  SELECT at.id, at.amount, at.reference_type, at.reference_id, s.invoice_no, at.description 
  FROM account_transactions at 
  LEFT JOIN sales s ON at.reference_id = s.id 
  WHERE at.reference_type = 'sale';
`).all();
console.log(JSON.stringify(rows, null, 2));
