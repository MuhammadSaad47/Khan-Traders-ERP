import Database from 'better-sqlite3';
import path from 'path';

const pathsToTry = [
  path.join(process.env.HOME || '', '.config', 'khan-trader', 'khan-trader.sqlite'),
  path.join(process.env.HOME || '', '.config', 'Khan Trader', 'khan-trader.sqlite')
];

let db = null;
for (const p of pathsToTry) {
  try {
    db = new Database(p, { fileMustExist: true });
    console.log(`Successfully opened DB at: ${p}`);
    break;
  } catch (e) {
    // ignore
  }
}

if (!db) {
  console.log("Could not find database.");
  process.exit(1);
}

try {
  const items = db.prepare("SELECT id, name, size, packaging, supplier_id, cost_price, selling_price, current_stock FROM items WHERE name LIKE '%zor%' AND is_deleted = 0").all();
  console.log("\n=== ZOR ITEMS ===");
  console.log(JSON.stringify(items, null, 2));
  
  const suppliers = db.prepare("SELECT id, name FROM suppliers WHERE is_deleted = 0").all();
  console.log("\n=== SUPPLIERS ===");
  console.log(JSON.stringify(suppliers, null, 2));
} catch (e) {
  console.error("Error running query", e);
}
