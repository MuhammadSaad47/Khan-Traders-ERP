import { describe, it, expect, beforeEach } from 'vitest'
import { createInstallmentPlan, recordInstallmentPayment, getInstallmentSchedule } from '../installments.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'
import { createSale } from '../sales.service'
import { createCategory, createItem } from '../catalog.service'

describe('Installments Service Integration', () => {
  let customerId: number;
  let accountId: number;
  let saleId: number;

  beforeEach(async () => {
    await resetDb()

    const customer = await db.insertInto('customers').values({
      name: 'Test Customer',
      balance: 0
    }).returningAll().executeTakeFirstOrThrow()
    customerId = customer.id

    const account = await db.insertInto('accounts').values({
      name: 'Cash Register',
      type: 'cash',
      opening_balance: 10000,
      current_balance: 10000
    }).returningAll().executeTakeFirstOrThrow()
    accountId = account.id

    const cat = await createCategory({ name: 'Electronics', description: '' }, 1)
    const item = await createItem({
      name: 'Fridge',
      category_id: cat.id,
      selling_price: 50000,
      cost_price: 40000,
      low_stock_threshold: 1,
      units_per_ctn: 1
    }, 1)
    
    // Add stock so sale doesn't fail CHECK constraint
    await db.updateTable('items').set({ current_stock: 10 }).where('id', '=', item.id).execute()

    // Create unpaid sale
    const sale = await createSale({
      customer_id: customerId,
      subtotal: 50000,
      discount: 0,
      net_total: 50000,
      paid_amount: 0,
      sale_type: 'counter',
      items: [{ item_id: item.id, qty: 1, unit_price: 50000, line_total: 50000 }]
    }, 1)
    saleId = sale.id
  })

  it('should create an installment plan and generate schedule', async () => {
    const plan = await createInstallmentPlan(1, {
      sale_id: saleId,
      total_amount: 50000,
      num_installments: 5,
      frequency: 'monthly',
      late_fee_percent: 5,
      grace_period_days: 7,
      start_date: new Date().toISOString()
    })

    expect(plan.id).toBeDefined()
    expect(plan.num_installments).toBe(5)

    const schedule = await getInstallmentSchedule(plan.id)
    expect(schedule.length).toBe(5)
    expect(schedule[0].amount_due).toBe(10000)
    expect(schedule[0].status).toBe('pending')
  })

  it('should record an installment payment and update the schedule', async () => {
    const plan = await createInstallmentPlan(1, {
      sale_id: saleId,
      total_amount: 50000,
      num_installments: 5,
      frequency: 'monthly',
      late_fee_percent: 5,
      grace_period_days: 7,
      start_date: new Date().toISOString()
    })

    const schedule = await getInstallmentSchedule(plan.id)
    const firstInstallment = schedule[0]

    const payment = await recordInstallmentPayment(1, {
      schedule_id: firstInstallment.id,
      amount: 10000,
      account_id: accountId,
      payment_method: 'cash'
    })

    expect(payment).toBeDefined()

    // Verify Schedule updated
    const updatedSchedule = await getInstallmentSchedule(plan.id)
    expect(updatedSchedule[0].status).toBe('paid')
    expect(updatedSchedule[0].amount_paid).toBe(10000)
    
    // Verify Customer Balance reduced (paid 10000 towards 50000 owed)
    const updatedCustomer = await db.selectFrom('customers').where('id', '=', customerId).selectAll().executeTakeFirst()
    expect(updatedCustomer?.balance).toBe(40000)

    // Verify Account Balance increased
    const updatedAccount = await db.selectFrom('accounts').where('id', '=', accountId).selectAll().executeTakeFirst()
    expect(updatedAccount?.current_balance).toBe(20000)
  })
})
