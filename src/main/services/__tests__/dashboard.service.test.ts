import { describe, it, expect, beforeEach } from 'vitest'
import { getKPIs, getExpenseBreakdown, getOverdueBalances, getRecentActivity } from '../dashboard.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'
import { createSale } from '../sales.service'
import { createCategory, createItem } from '../catalog.service'
import { createExpense, createExpenseCategory } from '../expenses.service'
import { subDays, format } from 'date-fns'

describe('Dashboard Service Integration', () => {
  beforeEach(async () => {
    await resetDb()

    // 1. Create dependencies
    const cat = await createCategory({ name: 'Drinks', description: '' }, 1)
    const item = await createItem({
      name: 'Cola',
      category_id: cat.id,
      selling_price: 150,
      cost_price: 100,
      low_stock_threshold: 10,
      units_per_ctn: 1
    }, 1)
    // Manually add stock
    await db.updateTable('items').set({ current_stock: 50 }).where('id', '=', item.id).execute()

    const customer = await db.insertInto('customers').values({
      name: 'Dashboard Customer',
      balance: 1000
    }).returningAll().executeTakeFirstOrThrow()

    const account = await db.insertInto('accounts').values({
      name: 'Main Safe',
      type: 'cash',
      opening_balance: 5000,
      current_balance: 5000
    }).returningAll().executeTakeFirstOrThrow()

    // 2. Create a Sale (Revenue)
    await createSale({
      customer_id: customer.id,
      subtotal: 1500, // 10 qty * 150
      discount: 0,
      net_total: 1500,
      paid_amount: 1500, // Fully paid
      payment_method: 'cash',
      account_id: account.id,
      sale_type: 'counter',
      items: [{ item_id: item.id, qty: 10, unit_price: 150, line_total: 1500 }]
    }, 1)

    // 3. Create an Expense
    const expCat = await createExpenseCategory('Utilities')
    await createExpense({
      category_id: expCat.id,
      amount: 200,
      account_id: account.id,
      note: 'Electric bill'
    }, 1)

    // 4. Create an Overdue Sale
    const overdueDate = format(subDays(new Date(), 2), 'yyyy-MM-dd')
    await db.insertInto('sales').values({
      invoice_no: 'INV-OVERDUE-1',
      customer_id: customer.id,
      date: overdueDate,
      due_date: overdueDate,
      subtotal: 500,
      discount: 0,
      net_total: 500,
      paid_amount: 0,
      status: 'unpaid',
      sale_type: 'counter',
      created_by: 1
    }).execute()
  })

  it('should calculate accurate KPIs (Profit = Revenue - COGS - Expenses)', async () => {
    const kpis = await getKPIs()
    
    // Revenue = 1500
    // COGS = 10 qty * 100 cost = 1000
    // Expenses = 200
    // Profit = 1500 - 1000 - 200 = 300
    expect(kpis.salesToday).toBe(1500)
    expect(kpis.profitToday).toBe(300)
    
    // Receivables = customer balance = 1000
    expect(kpis.receivables).toBe(1000)

    // Cash = 5000 (open) + 1500 (sale) - 200 (expense) = 6300
    expect(kpis.cashOnHand).toBe(6300)

    // Items low stock = 0 (we have 40 stock, threshold is 10)
    expect(kpis.lowStockCount).toBe(0)
  })

  it('should get expense breakdown', async () => {
    const breakdown = await getExpenseBreakdown()
    expect(breakdown.length).toBe(1)
    expect(breakdown[0].name).toBe('Utilities')
    expect(breakdown[0].value).toBe(200)
  })

  it('should get overdue balances', async () => {
    const overdue = await getOverdueBalances()
    expect(overdue.length).toBe(1)
    expect(overdue[0].reference).toBe('INV-OVERDUE-1')
    expect(overdue[0].amount).toBe(500)
  })

  it('should get recent activity from audit logs', async () => {
    const activity = await getRecentActivity()
    expect(activity.length).toBeGreaterThan(0)
    expect(activity[0].entity).toBeDefined()
    expect(activity[0].action).toBeDefined()
  })
})
