import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

const dbPath = '/home/saad-afridi/.config/khan-trader/khan-trader.sqlite';
const dialect = new SqliteDialect({
  database: async () => new Database(dbPath)
});
const db = new Kysely<any>({ dialect });

async function test() {
  try {
    const customerId = 1;
    const fromDate = '2026-07-01';
    const toDate = '2026-08-30';

    console.log("Fetching customer...");
    const customer = await db.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirst()
    
    console.log("Fetching futureSales...");
    const futureSales = await db.selectFrom('sales')
      .select([(db.fn.sum('net_total') as any).as('total'), (db.fn.sum('paid_amount') as any).as('paid')])
      .where('customer_id', '=', customerId).where('is_deleted', '=', 0).where('date', '>=', fromDate)
      .executeTakeFirst()
    
    console.log("Fetching futurePayments...");
    const futurePayments = await db.selectFrom('payments')
      .select([(db.fn.sum('amount') as any).as('total')])
      .where('party_id', '=', customerId).where('party_type', '=', 'customer').where('is_deleted', '=', 0).where('date', '>=', fromDate)
      .executeTakeFirst()
    
    console.log("Fetching futureReturns...");
    const futureReturns = await db.selectFrom('sale_returns')
      .select([(db.fn.sum('credit_amount') as any).as('total')])
      .where('customer_id', '=', customerId).where('date', '>=', fromDate)
      .executeTakeFirst()
      
    console.log("Fetching sales...");
    const sales = await db.selectFrom('sales')
      .select(['id', 'invoice_no as reference', 'date', 'net_total as amount', 'paid_amount as paid', 'status'])
      .where('customer_id', '=', customerId).where('is_deleted', '=', 0)
      .where('date', '>=', fromDate).where('date', '<=', toDate + 'T23:59:59.999Z').execute()

    console.log("Fetching payments...");
    const payments = await db.selectFrom('payments')
      .select(['id', 'method as reference', 'date', 'amount', 'note'])
      .where('party_id', '=', customerId).where('party_type', '=', 'customer').where('is_deleted', '=', 0)
      .where('date', '>=', fromDate).where('date', '<=', toDate + 'T23:59:59.999Z').execute()

    console.log("Fetching returns...");
    const returns = await db.selectFrom('sale_returns')
      .select(['id', 'return_no as reference', 'date', 'total_amount', 'refund_amount', 'credit_amount'])
      .where('customer_id', '=', customerId)
      .where('date', '>=', fromDate).where('date', '<=', toDate + 'T23:59:59.999Z').execute()

    console.log("DONE!");
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}
test();
