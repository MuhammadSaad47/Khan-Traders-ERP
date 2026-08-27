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
  }),
  log: (event) => {
    if (event.level === 'query') {
      console.log('SQL:', event.query.sql);
    }
  }
});

async function testFixedQuery() {
  console.log('=== Testing FIXED Kysely Query ===\n');

  const testData = {
    username: 'fixed_test_user',
    fullName: 'Fixed Test User',
    role: 'cashier',
    password: 'test123'
  };

  try {
    // Delete if exists
    await db.deleteFrom('users').where('username', '=', testData.username).execute();

    // FIXED: Add selectAll()
    console.log('Checking if user exists (WITH selectAll)...');
    const existing = await db.selectFrom('users')
      .selectAll()
      .where('username', '=', testData.username)
      .executeTakeFirst();
    console.log('✅ SELECT works! Result:', existing ? 'found' : 'not found\n');

    // Now try full create
    console.log('Creating user...');
    const hash = await bcrypt.hash(testData.password, 12);
    
    const result = await db.insertInto('users').values({
      username: testData.username,
      password_hash: hash,
      full_name: testData.fullName,
      role: testData.role
    }).returningAll().executeTakeFirstOrThrow();

    console.log('\n🎉 SUCCESS! User created:');
    console.log({
      id: result.id,
      username: result.username,
      full_name: result.full_name,
      role: result.role
    });

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error(error.message);
  } finally {
    await db.destroy();
    sqlite.close();
  }
}

testFixedQuery();
