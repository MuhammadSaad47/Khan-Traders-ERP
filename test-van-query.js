const Database = require('better-sqlite3');
const db = new Database('/home/saad-afridi/.config/khan-trader/khan-trader.sqlite');

try {
  const id = 1;

  const assignment = db.prepare(`
    SELECT van_assignments.id, van_assignments.date, users.full_name as salesman_name 
    FROM van_assignments 
    INNER JOIN users ON users.id = van_assignments.van_salesman_id 
    WHERE van_assignments.id = ?
  `).get(id);

  console.log("Assignment:", assignment);

  const items = db.prepare(`
    SELECT items.name, van_assignment_items.qty_loaded, van_assignment_items.qty_returned 
    FROM van_assignment_items
    INNER JOIN items ON items.id = van_assignment_items.item_id
    WHERE van_assignment_items.van_assignment_id = ?
  `).all(id);

  console.log("Items count:", items.length);

  const expenses = db.prepare(`
    SELECT expenses.amount, expense_categories.name 
    FROM expenses
    INNER JOIN expense_categories ON expense_categories.id = expenses.category_id
    WHERE expenses.van_assignment_id = ? AND expenses.is_deleted = 0
  `).all(id);

  console.log("Expenses count:", expenses.length);

} catch (err) {
  console.error("Query Error:", err);
}
