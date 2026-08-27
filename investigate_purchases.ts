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
  console.log('\n=== RECENT PURCHASES (last 5) ===');
  const purchases = db.prepare(`
    SELECT p.id, p.invoice_no, p.date, s.name as supplier_name, p.net_total, p.status
    FROM purchases p
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE p.is_deleted = 0
    ORDER BY p.created_at DESC
    LIMIT 5
  `).all();
  console.log(JSON.stringify(purchases, null, 2));
  
  console.log('\n=== PURCHASE ITEMS (for recent purchases) ===');
  const purchaseIds = purchases.map((p: any) => p.id);
  const purchaseItems = db.prepare(`
    SELECT pi.purchase_id, pi.item_id, pi.qty, pi.unit_cost, 
           i.name, i.size, i.packaging, i.cost_price, i.current_stock, i.supplier_id,
           s.name as supplier_name
    FROM purchase_items pi
    INNER JOIN items i ON i.id = pi.item_id
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE pi.purchase_id IN (${purchaseIds.join(',')})
    ORDER BY pi.purchase_id DESC
  `).all();
  console.log(JSON.stringify(purchaseItems, null, 2));
  
  console.log('\n=== ALL ZOR ITEMS (current state) ===');
  const zorItems = db.prepare(`
    SELECT id, name, size, packaging, supplier_id, cost_price, selling_price, current_stock,
           (SELECT name FROM suppliers WHERE id = items.supplier_id) as supplier_name
    FROM items 
    WHERE name LIKE '%zor%' AND is_deleted = 0
    ORDER BY id
  `).all();
  console.log(JSON.stringify(zorItems, null, 2));
  
  // Calculate weighted average manually
  console.log('\n=== MANUAL WEIGHTED COST CALCULATION ===');
  let totalValue = 0;
  let totalStock = 0;
  
  for (const item of zorItems as any[]) {
    console.log(`Item ${item.id} (${item.supplier_name}): ${item.current_stock} ctns @ Rs ${item.cost_price / 100} = Rs ${(item.current_stock * item.cost_price) / 100}`);
    totalValue += item.current_stock * item.cost_price;
    totalStock += item.current_stock;
  }
  
  if (totalStock > 0) {
    const weightedAvg = Math.round(totalValue / totalStock);
    console.log(`\nTotal Stock: ${totalStock} ctns`);
    console.log(`Total Value: Rs ${totalValue / 100}`);
    console.log(`Weighted Average Cost: Rs ${weightedAvg / 100} (${weightedAvg})`);
  } else {
    console.log('\nNo stock available - using simple average');
    const costs = (zorItems as any[]).map((i: any) => i.cost_price);
    const simpleAvg = Math.round(costs.reduce((sum, c) => sum + c, 0) / costs.length);
    console.log(`Simple Average Cost: Rs ${simpleAvg / 100} (${simpleAvg})`);
  }
  
} catch (e) {
  console.error("Error running query", e);
}
