const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userDataPath = path.join(require('os').homedir(), '.config', 'KhanTraders');
const dbPath = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : path.join(userDataPath, 'khan-trader.sqlite');

if (!fs.existsSync(userDataPath)) {
  console.log('UserData path not found, skipping fix.');
  process.exit(0);
}

const db = new sqlite3(dbPath);

const renames = [
  { old: '0011_sale_returns.sql', new: '0013_sale_returns.sql' },
  { old: '0010_sales_purchases_indexes.sql', new: '0012_sales_purchases_indexes.sql' },
  { old: '0009_payments_expense_soft_deletes.sql', new: '0011_payments_expense_soft_deletes.sql' },
  { old: '0008_critical_fixes.sql', new: '0010_critical_fixes.sql' },
  { old: '0007_sale_expenses.sql', new: '0009_sale_expenses.sql' },
  { old: '0006_enhance_items_pricing_and_units.sql', new: '0008_enhance_items_pricing_and_units.sql' },
  { old: '0005_item_specs.sql', new: '0007_item_specs.sql' },
  { old: '0004_van_expenses.sql', new: '0006_van_expenses.sql' },
  { old: '0004_item_supplier_link.sql', new: '0005_item_supplier_link.sql' },
  { old: '0003_seed_data.sql', new: '0004_seed_data.sql' }
];

let updated = 0;
for (const rename of renames) {
  const result = db.prepare('UPDATE _migrations SET filename = ? WHERE filename = ?').run(rename.new, rename.old);
  updated += result.changes;
}

console.log(`Updated ${updated} migration records in the database.`);
db.close();
