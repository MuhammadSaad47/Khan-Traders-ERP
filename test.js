const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'khan-trader.sqlite');
  try {
    const db = new Database(dbPath);
    console.log('Purchases:', db.prepare('SELECT id, supplier_id, invoice_no FROM purchases ORDER BY id DESC LIMIT 5').all());
  } catch(e) {
    console.error(e);
  }
  app.quit();
});
