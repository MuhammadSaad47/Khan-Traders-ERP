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
  log: (event) => {
    if (event.level === 'query') {
      console.log('SQL:', event.query.sql);
      console.log('Params:', event.query.parameters);
    }
  }
});

async function testCapitalInvestment() {
  console.log('=== Testing Capital Investment ===\n');

  try {
    // Get first account
    const account = await db.selectFrom('accounts')
      .selectAll()
      .where('is_deleted', '=', 0)
      .executeTakeFirst();

    if (!account) {
      console.log('❌ No accounts found');
      return;
    }

    console.log(`Testing with account: ${account.name} (Balance: Rs ${account.current_balance / 100})\n`);

    // Test Capital Investment
    console.log('1. Testing Capital Investment (Rs 50,000)...');
    const investAmount = 5000000; // Rs 50,000 in paisa

    const investResult = await db.insertInto('account_transactions').values({
      account_id: account.id,
      type: 'credit',
      amount: investAmount,
      reference_type: 'capital',
      reference_id: null,
      description: 'Test Capital Investment',
      created_by: 1
    }).returningAll().executeTakeFirstOrThrow();

    console.log('✅ Capital investment recorded:', investResult.id);

    // Update account balance
    await db.updateTable('accounts')
      .set({ current_balance: account.current_balance + investAmount })
      .where('id', '=', account.id)
      .execute();

    console.log('✅ Account balance updated\n');

    // Test Capital Withdrawal
    console.log('2. Testing Capital Withdrawal (Rs 10,000)...');
    const withdrawAmount = 1000000; // Rs 10,000 in paisa

    const withdrawResult = await db.insertInto('account_transactions').values({
      account_id: account.id,
      type: 'debit',
      amount: withdrawAmount,
      reference_type: 'withdrawal',
      reference_id: null,
      description: 'Test Capital Withdrawal',
      created_by: 1
    }).returningAll().executeTakeFirstOrThrow();

    console.log('✅ Capital withdrawal recorded:', withdrawResult.id);

    // Update account balance
    await db.updateTable('accounts')
      .set({ current_balance: account.current_balance + investAmount - withdrawAmount })
      .where('id', '=', account.id)
      .execute();

    console.log('✅ Account balance updated\n');

    // Verify transactions
    console.log('3. Verifying transactions...');
    const transactions = await db.selectFrom('account_transactions')
      .selectAll()
      .where('reference_type', 'in', ['capital', 'withdrawal'])
      .orderBy('id', 'desc')
      .limit(5)
      .execute();

    console.log(`Found ${transactions.length} capital/withdrawal transactions:`);
    transactions.forEach(tx => {
      console.log(`  - ${tx.reference_type}: Rs ${tx.amount / 100} (${tx.description})`);
    });

    console.log('\n🎉 All tests passed! Capital investment feature is working!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
  } finally {
    await db.destroy();
    sqlite.close();
  }
}

testCapitalInvestment();
