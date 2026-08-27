const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

// First, check the users table schema
console.log('\n=== Users Table Schema ===');
const schema = db.prepare("PRAGMA table_info(users)").all();
console.log(schema);

// Check if there are any existing users
console.log('\n=== Existing Users ===');
const users = db.prepare("SELECT id, username, full_name, role FROM users WHERE is_deleted = 0").all();
console.log(users);

// Now test creating a user
console.log('\n=== Testing User Creation ===');

const testUser = {
  username: 'testuser123',
  full_name: 'Test User',
  role: 'cashier',
  password: 'test123'
};

try {
  // Hash password
  const hash = bcrypt.hashSync(testUser.password, 12);
  console.log('Password hashed successfully');

  // Try the insert
  console.log('\nAttempting INSERT with values:');
  console.log({
    username: testUser.username,
    password_hash: hash.substring(0, 20) + '...',
    full_name: testUser.full_name,
    role: testUser.role
  });

  const stmt = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    testUser.username,
    hash,
    testUser.full_name,
    testUser.role
  );

  console.log('\n✅ SUCCESS! User created with ID:', result.lastInsertRowid);

  // Verify the user was created
  const created = db.prepare("SELECT id, username, full_name, role FROM users WHERE id = ?").get(result.lastInsertRowid);
  console.log('Created user:', created);

} catch (error) {
  console.error('\n❌ ERROR during user creation:');
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('Full error:', error);
}

db.close();
