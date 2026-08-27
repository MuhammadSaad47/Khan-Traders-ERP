const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath, { fileMustExist: true });

console.log('Connected to database at:', dbPath);

// Define all tables to clear data from
const tablesToEmpty = [
  'purchases',
  'purchase_items',
  'sales',
  'sale_items',
  'sale_returns',
  'sale_return_items',
  'payments',
  'payment_allocations',
  'stock_adjustments',
  'stock_movements',
  'expenses',
  'ctn_transactions',
  'van_assignments',
  'van_assignment_items',
  'account_transactions',
  'audit_log',
  'backup_log'
];

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  console.log('\n--- Emptying Transactional Tables ---');
  for (const table of tablesToEmpty) {
    console.log(`Clearing ${table}...`);
    db.exec(`DELETE FROM ${table}`);
    
    // Reset the auto-increment sequence for this table if it exists
    db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
  }

  console.log('\n--- Resetting Balances and Stock ---');
  
  // 1. Reset Inventory Items Stock
  const itemRes = db.prepare(`UPDATE items SET current_stock = 0`).run();
  console.log(`Items reset: ${itemRes.changes} records`);

  // 2. Reset Customers Balance
  const customerRes = db.prepare(`UPDATE customers SET balance = 0, ctn_balance = 0`).run();
  console.log(`Customers reset: ${customerRes.changes} records`);

  // 3. Reset Suppliers Balance
  const supplierRes = db.prepare(`UPDATE suppliers SET balance = 0`).run();
  console.log(`Suppliers reset: ${supplierRes.changes} records`);

  // 4. Reset Accounts Balance
  const accountRes = db.prepare(`UPDATE accounts SET current_balance = 0, opening_balance = 0`).run();
  console.log(`Accounts reset: ${accountRes.changes} records`);

  // Commit transaction
  db.exec('COMMIT');
  console.log('\nDatabase reset successfully completed!');

} catch (err) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('\nError occurred, transaction rolled back:', err.message);
} finally {
  db.close();
}
