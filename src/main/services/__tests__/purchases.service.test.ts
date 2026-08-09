import { describe, it, expect, beforeEach } from 'vitest'
import { createPurchase, getPurchaseDetails, voidPurchase } from '../purchases.service'
import { createItem, createCategory } from '../catalog.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'

describe('Purchases Service Integration', () => {
  let supplierId: number;
  let itemId: number;
  let accountId: number;

  beforeEach(async () => {
    await resetDb()

    // Create supplier
    const supplier = await db.insertInto('suppliers').values({
      name: 'Test Supplier',
      phone: '1234567890',
      address: 'Test Address'
    }).returningAll().executeTakeFirstOrThrow()
    supplierId = supplier.id

    // Create item
    const cat = await createCategory({ name: 'Snacks', description: '' }, 1)
    const item = await createItem({
      name: 'Chips',
      category_id: cat.id,
      selling_price: 100,
      cost_price: 50,
      low_stock_threshold: 10,
      units_per_ctn: 1
    }, 1)
    itemId = item.id

    // Create account for payments
    const account = await db.insertInto('accounts').values({
      name: 'Cash',
      type: 'cash',
      opening_balance: 10000,
      current_balance: 10000
    }).returningAll().executeTakeFirstOrThrow()
    accountId = account.id
  })

  it('should create a paid purchase and update ledgers (Item Stock, Supplier Balance, Account Balance)', async () => {
    const input = {
      supplier_id: supplierId,
      subtotal: 500, // 10 qty * 50 cost
      discount: 0,
      net_total: 500,
      paid_amount: 500, // fully paid
      payment_method: 'cash' as any,
      account_id: accountId,
      items: [
        { item_id: itemId, qty: 10, unit_cost: 50, line_total: 500 }
      ]
    }

    const purchase = await createPurchase(1, input)
    
    expect(purchase).toBeDefined()
    expect(purchase.status).toBe('paid')

    // 1. Verify Item Stock Movement
    const updatedItem = await db.selectFrom('items').where('id', '=', itemId).selectAll().executeTakeFirst()
    expect(updatedItem?.current_stock).toBe(10) // Started at 0, bought 10
    
    const movement = await db.selectFrom('stock_movements').where('reference_id', '=', purchase.id).selectAll().executeTakeFirst()
    expect(movement?.type).toBe('purchase')
    expect(movement?.change_qty).toBe(10)

    // 2. Verify Supplier Balance (Bought 500, Paid 500 -> Balance should be 0)
    const updatedSupplier = await db.selectFrom('suppliers').where('id', '=', supplierId).selectAll().executeTakeFirst()
    expect(updatedSupplier?.balance).toBe(0)

    // 3. Verify Account Balance (Started 10000, paid 500 -> 9500)
    const updatedAccount = await db.selectFrom('accounts').where('id', '=', accountId).selectAll().executeTakeFirst()
    expect(updatedAccount?.current_balance).toBe(9500)

    // 4. Verify Payments & Account Transactions
    const payment = await db.selectFrom('payments').where('reference_id', '=', purchase.id).selectAll().executeTakeFirst()
    expect(payment?.amount).toBe(500)
    expect(payment?.direction).toBe('out')
    
    const txn = await db.selectFrom('account_transactions').where('reference_id', '=', purchase.id).selectAll().executeTakeFirst()
    expect(txn?.type).toBe('debit') // We paid out
    expect(txn?.amount).toBe(500)
  })

  it('should create an unpaid purchase and update supplier balance', async () => {
    const input = {
      supplier_id: supplierId,
      subtotal: 500,
      discount: 0,
      net_total: 500,
      paid_amount: 0, // unpaid
      items: [
        { item_id: itemId, qty: 10, unit_cost: 50, line_total: 500 }
      ]
    }

    const purchase = await createPurchase(1, input)
    expect(purchase.status).toBe('unpaid')

    // Verify Supplier Balance (Bought 500, Paid 0 -> Balance should be -500 (we owe them))
    // Wait, let's check how the supplier balance works in Khan Trader:
    // "balance: +ve = we owe supplier". Let's verify our code logic.
    const updatedSupplier = await db.selectFrom('suppliers').where('id', '=', supplierId).selectAll().executeTakeFirst()
    expect(updatedSupplier?.balance).toBe(500) // We owe 500
  })

  it('should retrieve purchase details successfully', async () => {
    const input = {
      supplier_id: supplierId,
      subtotal: 200,
      discount: 0,
      net_total: 200,
      paid_amount: 0,
      items: [
        { item_id: itemId, qty: 4, unit_cost: 50, line_total: 200 }
      ]
    }
    const purchase = await createPurchase(1, input)

    const details = await getPurchaseDetails(purchase.id)
    expect(details).toBeDefined()
    expect(details?.purchase?.supplier_name).toBe('Test Supplier')
    expect(details?.items?.length).toBe(1)
    expect(details?.items?.[0].qty).toBe(4)
  })

  it('should void a purchase softly and restore inventory and account balances', async () => {
    // 1. Create a paid purchase
    const input = {
      supplier_id: supplierId,
      subtotal: 500,
      discount: 0,
      net_total: 500,
      paid_amount: 500, // fully paid
      payment_method: 'cash' as any,
      account_id: accountId,
      items: [
        { item_id: itemId, qty: 10, unit_cost: 50, line_total: 500 }
      ]
    }

    const purchase = await createPurchase(1, input)
    
    // Inventory is now 10.
    const stockAfterPurchase = await db.selectFrom('items').where('id', '=', itemId).select('current_stock').executeTakeFirst()
    expect(stockAfterPurchase?.current_stock).toBe(10)

    // Account balance is 10000 - 500 = 9500
    const accountAfterPurchase = await db.selectFrom('accounts').where('id', '=', accountId).select('current_balance').executeTakeFirst()
    expect(accountAfterPurchase?.current_balance).toBe(9500)

    // 2. Void Purchase
    await voidPurchase(purchase.id, 1)

    // 3. Assertions
    const voidedPurchase = await db.selectFrom('purchases').where('id', '=', purchase.id).selectAll().executeTakeFirst()
    expect(voidedPurchase?.is_deleted).toBe(1) // soft deleted

    // Inventory restored to 0
    const stockAfterVoid = await db.selectFrom('items').where('id', '=', itemId).select('current_stock').executeTakeFirst()
    expect(stockAfterVoid?.current_stock).toBe(0)
    
    // Account balance restored to 10000
    const accountAfterVoid = await db.selectFrom('accounts').where('id', '=', accountId).select('current_balance').executeTakeFirst()
    expect(accountAfterVoid?.current_balance).toBe(10000)
  })
})
