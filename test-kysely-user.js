const Database = require('better-sqlite3');
const { Kysely, SqliteDialect } = require('kysely');
const bcrypt = require('bcryptjs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
const sqlite = new Database(dbPath);

const db = new Kysely({
  dialect: new SqliteDialect({
    database: sqlite
  })
});

async function testKyselyUserCreation() {
  console.log('=== Testing Kysely User Creation ===\n');

  const testData = {
    username: 'kysely_test_user',
    fullName: 'Kysely Test',
    role: 'manager',
    password: 'test123'
  };

  try {
    // Check if user exists
    const existing = await db.selectFrom('users')
      .where('username', '=', testData.username)
      .executeTakeFirst();
    
    if (existing) {
      console.log('User already exists, deleting first...');
      await db.deleteFrom('users')
        .where('username', '=', testData.username)
        .execute();
    }

    // Hash password
    const hash = await bcrypt.hash(testData.password, 12);
    console.log('Password hashed successfully');

    // Try the Kysely insert
    console.log('\nAttempting Kysely INSERT...');
    
    const result = await db.insertInto('users').values({
      username: testData.username,
      password_hash: hash,
      full_name: testData.fullName,
      role: testData.role
    }).returningAll().executeTakeFirstOrThrow();

    console.log('\n✅ SUCCESS with Kysely!');
    console.log('Created user:', {
      id: result.id,
      username: result.username,
      full_name: result.full_name,
      role: result.role
    });

  } catch (error) {
    console.error('\n❌ ERROR with Kysely:');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
    sqlite.close();
  }
}

testKyselyUserCreation();
