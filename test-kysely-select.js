const Database = require('better-sqlite3');
const { Kysely, SqliteDialect } = require('kysely');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.config', 'khan-trader', 'khan-trader.sqlite');
const sqlite = new Database(dbPath);

const db = new Kysely({
  dialect: new SqliteDialect({
    database: sqlite
  }),
  // Enable query logging
  log: (event) => {
    if (event.level === 'query') {
      console.log('\n📝 SQL Query:');
      console.log(event.query.sql);
      console.log('Parameters:', event.query.parameters);
    }
  }
});

async function testQueries() {
  console.log('=== Testing Kysely Queries ===\n');

  try {
    // Test 1: Simple select all
    console.log('Test 1: Select all users');
    const allUsers = await db.selectFrom('users')
      .selectAll()
      .execute();
    console.log('✅ Success - Found', allUsers.length, 'users\n');

    // Test 2: Select with where clause
    console.log('Test 2: Select specific username');
    const specificUser = await db.selectFrom('users')
      .selectAll()
      .where('username', '=', 'Saady')
      .executeTakeFirst();
    console.log('✅ Success - Found:', specificUser ? specificUser.username : 'none\n');

    // Test 3: The exact query from auth service
    console.log('Test 3: Exact query from createUser function');
    const existing = await db.selectFrom('users')
      .where('username', '=', 'testuser')
      .executeTakeFirst();
    console.log('✅ Success - Result:', existing ? 'found' : 'not found\n');

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
  } finally {
    await db.destroy();
    sqlite.close();
  }
}

testQueries();
