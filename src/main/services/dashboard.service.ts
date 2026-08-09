import { db } from '../db/connection'
import { sql } from 'kysely'
import { applyLateFees } from './installments.service'
import { subDays, format } from 'date-fns'

export async function getKPIs() {
  // Fire and forget late fee application to act as a lightweight cron
  applyLateFees().catch(err => console.error('Failed to apply late fees:', err))

  const today = format(new Date(), 'yyyy-MM-dd')

  // Sales Today
  const salesToday = await db.selectFrom('sales')
    .select(db.fn.sum('net_total').as('total'))
    .where('is_deleted', '=', 0)
    .where('date', '>=', today)
    .executeTakeFirst()

  // COGS Today
  const cogsToday = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .innerJoin('items', 'items.id', 'sale_items.item_id')
    .select(sql`SUM(sale_items.qty * sale_items.cost_price_snapshot)`.as('total'))
    .where('sales.is_deleted', '=', 0)
    .where('sales.date', '>=', today)
    .executeTakeFirst()

  // Expenses Today
  const expensesToday = await db.selectFrom('expenses')
    .select(db.fn.sum('amount').as('total'))
    .where('is_deleted', '=', 0)
    .where('date', '>=', today)
    .executeTakeFirst()

  const salesTotal = Number(salesToday?.total || 0)
  const cogsTotal = Number(cogsToday?.total || 0)
  const expTotal = Number(expensesToday?.total || 0)
  const profitToday = salesTotal - cogsTotal - expTotal

  // Receivables (Customers owing us)
  const receivables = await db.selectFrom('customers')
    .select(db.fn.sum('balance').as('total'))
    .where('is_deleted', '=', 0)
    .where('balance', '>', 0)
    .executeTakeFirst()

  // Cash on Hand
  const cash = await db.selectFrom('accounts')
    .select(db.fn.sum('current_balance').as('total'))
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  // Low Stock
  const lowStock = await db.selectFrom('items')
    .select(db.fn.count('id').as('count'))
    .where('is_deleted', '=', 0)
    .whereRef('current_stock', '<=', 'low_stock_threshold')
    .executeTakeFirst()

  return {
    salesToday: salesTotal,
    profitToday,
    receivables: Number(receivables?.total || 0),
    cashOnHand: Number(cash?.total || 0),
    lowStockCount: Number(lowStock?.count || 0)
  }
}

export async function getSalesTrend() {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  
  // Group by date(date)
  const trend = await db.selectFrom('sales')
    .select([
      sql<string>`date(date)`.as('day'),
      db.fn.sum('net_total').as('total')
    ])
    .where('is_deleted', '=', 0)
    .where('date', '>=', thirtyDaysAgo)
    .groupBy('day')
    .orderBy('day', 'asc')
    .execute()

  return trend.map(t => ({ day: t.day, total: Number(t.total) }))
}

export async function getTopItems() {
  // Top 5 items sold by qty in the last 30 days
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

  const items = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .innerJoin('items', 'items.id', 'sale_items.item_id')
    .select([
      'items.name',
      db.fn.sum('sale_items.qty').as('total_qty')
    ])
    .where('sales.is_deleted', '=', 0)
    .where('sales.date', '>=', thirtyDaysAgo)
    .groupBy('items.id')
    .orderBy('total_qty', 'desc')
    .limit(5)
    .execute()

  return items.map(i => ({ name: i.name, qty: Number(i.total_qty) }))
}

export async function getExpenseBreakdown() {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  
  const data = await db.selectFrom('expenses')
    .innerJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .select([
      'expense_categories.name',
      db.fn.sum('expenses.amount').as('total')
    ])
    .where('expenses.is_deleted', '=', 0)
    .where('expenses.date', '>=', thirtyDaysAgo)
    .groupBy('expense_categories.id')
    .execute()

  return data.map(d => ({ name: d.name, value: Number(d.total) }))
}

export async function getRecentActivity() {
  const logs = await db.selectFrom('audit_log')
    .leftJoin('users', 'users.id', 'audit_log.user_id')
    .select([
      'audit_log.id',
      'audit_log.action',
      'audit_log.table_name',
      'audit_log.created_at',
      'users.username'
    ])
    .orderBy('audit_log.created_at', 'desc')
    .limit(10)
    .execute()
    
  return logs.map(l => ({
    id: l.id,
    action: l.action,
    entity: l.table_name,
    user: l.username || 'System',
    time: l.created_at
  }))
}

export async function getOverdueBalances() {
  const today = format(new Date(), 'yyyy-MM-dd')
  
  const overdueSales = await db.selectFrom('sales')
    .innerJoin('customers', 'customers.id', 'sales.customer_id')
    .select([
      'sales.invoice_no as reference',
      'customers.name as party',
      sql<number>`(sales.net_total - sales.paid_amount)`.as('amount'),
      'sales.due_date'
    ])
    .where('sales.status', 'in', ['unpaid', 'partial'])
    .where('sales.due_date', '<', today)
    .where('sales.is_deleted', '=', 0)
    .orderBy('sales.due_date', 'asc')
    .limit(10)
    .execute()
    
  return overdueSales.map(s => ({
    type: 'sale',
    reference: s.reference,
    party: s.party,
    amount: Number(s.amount),
    dueDate: s.due_date
  }))
}
