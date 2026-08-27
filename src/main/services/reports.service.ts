import { db } from '../db/connection'
import { sql } from 'kysely'

export async function getComprehensiveReport(startDate: string, endDate: string) {
  // Use SQLite date() function to extract date portion from ISO timestamps for proper comparison
  const start = startDate
  const end = endDate

  // 1. PROFIT & LOSS
  const salesRow = await db.selectFrom('sales')
    .select([
      db.fn.sum<number>('net_total').as('total_revenue'),
      db.fn.sum<number>('paid_amount').as('total_paid'),
      db.fn.count<number>('id').as('sales_count')
    ])
    .where('is_deleted', '=', 0)
    .where(sql`date(date)`, '>=', start)
    .where(sql`date(date)`, '<=', end)
    .executeTakeFirst()

  const revenue = Number(salesRow?.total_revenue || 0)
  const totalPaid = Number(salesRow?.total_paid || 0)
  const salesCount = Number(salesRow?.sales_count || 0)

  // Cost of Goods Sold (COGS)
  const cogsRow = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .innerJoin('items', 'items.id', 'sale_items.item_id')
    .select([
      sql<number>`SUM(sale_items.qty * sale_items.cost_price_snapshot)`.as('cogs'),
      sql<number>`SUM(sale_items.qty)`.as('total_items_sold')
    ])
    .where('sales.is_deleted', '=', 0)
    .where(sql`date(sales.date)`, '>=', start)
    .where(sql`date(sales.date)`, '<=', end)
    .executeTakeFirst()

  const cogs = Number(cogsRow?.cogs || 0)
  const totalItemsSold = Number(cogsRow?.total_items_sold || 0)

  // Categorized Expenses
  const expensesRow = await db.selectFrom('expenses')
    .select(db.fn.sum<number>('amount').as('total_expenses'))
    .where('is_deleted', '=', 0)
    .where(sql`date(date)`, '>=', start)
    .where(sql`date(date)`, '<=', end)
    .where('sale_id', 'is', null)
    .where('van_assignment_id', 'is', null)
    .executeTakeFirst()

  const totalExpenses = Number(expensesRow?.total_expenses || 0)

  const expenseBreakdown = await db.selectFrom('expenses as e')
    .innerJoin('expense_categories as ec', 'ec.id', 'e.category_id')
    .select([
      'ec.name as category_name',
      sql<number>`SUM(e.amount)`.as('total_amount')
    ])
    .where('e.is_deleted', '=', 0)
    .where(sql`date(e.date)`, '>=', start)
    .where(sql`date(e.date)`, '<=', end)
    .where('e.sale_id', 'is', null)
    .where('e.van_assignment_id', 'is', null)
    .groupBy('ec.id')
    .execute()

  // Inventory Adjustments (Financial impact)
  const adjustmentsRow = await db.selectFrom('stock_adjustments')
    .select([
      sql<number>`SUM(CASE WHEN change_qty < 0 AND reason IN ('damage', 'expiry', 'theft') THEN total_value ELSE 0 END)`.as('shrinkage_value'),
      sql<number>`SUM(CASE WHEN change_qty > 0 AND reason = 'recount' THEN total_value ELSE 0 END)`.as('gain_value')
    ])
    .where(sql`date(created_at)`, '>=', start)
    .where(sql`date(created_at)`, '<=', end)
    .executeTakeFirst()

  const shrinkageValue = Number(adjustmentsRow?.shrinkage_value || 0)
  const gainValue = Number(adjustmentsRow?.gain_value || 0)

  let finalTotalExpenses = totalExpenses + shrinkageValue
  let finalExpenseBreakdown = expenseBreakdown.map(e => ({
    category_name: e.category_name,
    total_amount: Number(e.total_amount)
  }))
  
  if (shrinkageValue > 0) {
    finalExpenseBreakdown.push({ category_name: 'Inventory Shrinkage', total_amount: shrinkageValue })
  }
  
  finalExpenseBreakdown.sort((a, b) => b.total_amount - a.total_amount)

  const grossProfit = revenue - cogs + gainValue
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const netProfit = grossProfit - finalTotalExpenses
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  // 2. SALES CHANNEL ANALYTICS
  const channelBreakdown = await db.selectFrom('sales')
    .select([
      'sale_type',
      db.fn.count<number>('id').as('count'),
      db.fn.sum<number>('net_total').as('total_amount')
    ])
    .where('is_deleted', '=', 0)
    .where(sql`date(date)`, '>=', start)
    .where(sql`date(date)`, '<=', end)
    .groupBy('sale_type')
    .execute()

  // Top Selling Items
  const topSellingItems = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .innerJoin('items', 'items.id', 'sale_items.item_id')
    .select([
      'items.id',
      'items.name as item_name',
      'items.variant',
      'items.size',
      'items.packaging',
      sql<number>`SUM(sale_items.qty)`.as('qty_sold'),
      sql<number>`SUM(sale_items.line_total)`.as('total_revenue'),
      sql<number>`SUM(sale_items.line_total - (sale_items.qty * sale_items.cost_price_snapshot))`.as('estimated_profit')
    ])
    .where('sales.is_deleted', '=', 0)
    .where(sql`date(sales.date)`, '>=', start)
    .where(sql`date(sales.date)`, '<=', end)
    .groupBy('items.id')
    .orderBy('qty_sold', 'desc')
    .execute()

  // 3. PURCHASES ANALYTICS
  const purchasesRow = await db.selectFrom('purchases')
    .select([
      db.fn.count<number>('id').as('purchases_count'),
      db.fn.sum<number>('net_total').as('total_purchases'),
      db.fn.sum<number>('paid_amount').as('total_paid')
    ])
    .where('is_deleted', '=', 0)
    .where(sql`date(date)`, '>=', start)
    .where(sql`date(date)`, '<=', end)
    .executeTakeFirst()

  const purchasesCount = Number(purchasesRow?.purchases_count || 0)
  const totalPurchases = Number(purchasesRow?.total_purchases || 0)
  const purchasesPaid = Number(purchasesRow?.total_paid || 0)
  const purchasesUnpaid = totalPurchases - purchasesPaid

  return {
    pnl: {
      revenue,
      cogs,
      grossProfit,
      grossMargin: Number(grossMargin.toFixed(1)),
      expenses: finalTotalExpenses,
      expenseBreakdown: finalExpenseBreakdown.map(e => ({
        category: e.category_name,
        amount: Number(e.total_amount)
      })),
      netProfit,
      netMargin: Number(netMargin.toFixed(1))
    },
    sales: {
      salesCount,
      totalPaid,
      creditAmount: Math.max(0, revenue - totalPaid),
      totalItemsSold,
      channelBreakdown: channelBreakdown.map(c => ({
        channel: c.sale_type,
        count: Number(c.count),
        amount: Number(c.total_amount || 0)
      })),
      topItems: topSellingItems.map(i => ({
        id: i.id,
        name: i.item_name,
        variant: i.variant,
        size: i.size,
        packaging: i.packaging,
        qtySold: Number(i.qty_sold || 0),
        revenue: Number(i.total_revenue || 0),
        profit: Number(i.estimated_profit || 0)
      }))
    },
    purchases: {
      purchasesCount,
      totalPurchases,
      purchasesPaid,
      purchasesUnpaid
    }
  }
}

export async function getStockValuation() {
  const result = await db.selectFrom('items')
    .select([
      db.fn.count<number>('id').as('total_items'),
      sql<number>`SUM(current_stock * cost_price)`.as('total_cost_value'),
      sql<number>`SUM(current_stock * selling_price)`.as('total_retail_value')
    ])
    .where('is_deleted', '=', 0)
    .where('current_stock', '>', 0)
    .executeTakeFirst()

  const totalItems = Number(result?.total_items || 0)
  const costValue = Number(result?.total_cost_value || 0)
  const retailValue = Number(result?.total_retail_value || 0)
  const potentialProfit = retailValue - costValue

  return {
    totalItems,
    costValue,
    retailValue,
    potentialProfit
  }
}

export async function getPartyBalancesSummary() {
  // 1. Customer Receivables Aging
  const customerAging = await db.selectFrom('customers')
    .innerJoin('sales', 'sales.customer_id', 'customers.id')
    .select([
      'customers.id',
      'customers.name',
      'customers.phone',
      'customers.balance',
      'customers.ctn_balance',
      sql<number>`julianday('now') - julianday(MIN(sales.date))`.as('days_overdue')
    ])
    .where('customers.is_deleted', '=', 0)
    .where('customers.balance', '>', 0)
    .where('sales.status', '!=', 'paid')
    .where('sales.is_deleted', '=', 0)
    .groupBy('customers.id')
    .orderBy('days_overdue', 'desc')
    .execute()

  const mappedAging = customerAging.map(a => ({
    id: a.id,
    name: a.name,
    phone: a.phone,
    balance: a.balance,
    ctnBalance: a.ctn_balance || 0,
    daysOverdue: Math.floor(Number(a.days_overdue || 0)),
    bucket: Number(a.days_overdue) > 30 ? '>30 Days' : (Number(a.days_overdue) > 15 ? '16-30 Days' : '0-15 Days')
  }))

  const totalReceivables = mappedAging.reduce((sum, c) => sum + c.balance, 0)

  // 2. Supplier Payables
  const supplierPayables = await db.selectFrom('suppliers')
    .select([
      'id',
      'name',
      'phone',
      'balance'
    ])
    .where('is_deleted', '=', 0)
    .where('balance', '>', 0)
    .orderBy('balance', 'desc')
    .execute()

  const totalPayables = supplierPayables.reduce((sum, s) => sum + s.balance, 0)

  // 3. Carton Balances Summary
  const cartonsRow = await db.selectFrom('customers')
    .select(db.fn.sum<number>('ctn_balance').as('total_cartons'))
    .where('is_deleted', '=', 0)
    .where('ctn_balance', '>', 0)
    .executeTakeFirst()

  const totalCartonsOutstanding = Number(cartonsRow?.total_cartons || 0)

  return {
    totalReceivables,
    totalPayables,
    totalCartonsOutstanding,
    customerAging: mappedAging,
    supplierPayables: supplierPayables.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      balance: s.balance
    }))
  }
}
