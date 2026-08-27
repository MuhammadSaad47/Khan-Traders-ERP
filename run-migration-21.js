const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
console.log('Database:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Check current migrations
console.log('\n=== Current Migrations ===');
const currentMigrations = db.prepare("SELECT filename FROM _migrations ORDER BY filename").all();
currentMigrations.forEach(m => console.log('✅', m.filename));

// Check if migration 0021 already applied
const migration21 = currentMigrations.find(m => m.filename === '0021_add_capital_withdrawal_reference_types.sql');

if (migration21) {
  console.log('\n✅ Migration 0021 already applied!');
} else {
  console.log('\n📝 Applying migration 0021...');
  
  const migrationPath = path.join(__dirname, 'migrations', '0021_add_capital_withdrawal_reference_types.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    // Run in transaction
    db.transaction(() => {
      // Execute the migration SQL
      db.exec(sql);
      
      // Record migration
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run('0021_add_capital_withdrawal_reference_types.sql');
    })();
    
    console.log('✅ Migration 0021 applied successfully!');
    
    // Verify the constraint
    console.log('\n=== Verifying new constraint ===');
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='account_transactions'").get();
    console.log(tableInfo.sql);
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
  }
}

db.close();
console.log('\n✅ Done!');
