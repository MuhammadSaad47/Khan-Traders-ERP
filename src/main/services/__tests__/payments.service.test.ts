import { describe, it, expect, beforeEach } from 'vitest'
import { recordPayment, getPayments } from '../payments.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'

describe('Payments Service Integration', () => {
  let customerId: number;
  let accountId: number;

  beforeEach(async () => {
    await resetDb()

    // Create customer with a balance (owes us money)
    const customer = await db.insertInto('customers').values({
      name: 'Test Customer',
      balance: 5000 // Owes 5000
    }).returningAll().executeTakeFirstOrThrow()
    customerId = customer.id

    // Create account
    const account = await db.insertInto('accounts').values({
      name: 'Cash Register',
      type: 'cash',
      opening_balance: 1000,
      current_balance: 1000
    }).returningAll().executeTakeFirstOrThrow()
    accountId = account.id
  })

  it('should record an incoming payment from a customer and update ledgers', async () => {
    const input = {
      party_type: 'customer' as const,
      party_id: customerId,
      direction: 'in' as const,
      amount: 2000, // Customer pays 2000
      payment_method: 'cash' as const,
      account_id: accountId,
      note: 'Partial payment'
    }

    const result = await recordPayment(1, input)
    expect(result.payment).toBeDefined()
    expect(result.payment.amount).toBe(2000)

    // 1. Verify Customer Balance decreased (Owes 5000 - 2000 = 3000)
    const updatedCustomer = await db.selectFrom('customers').where('id', '=', customerId).selectAll().executeTakeFirst()
    expect(updatedCustomer?.balance).toBe(3000)

    // 2. Verify Account Balance increased (Started 1000 + 2000 = 3000)
    const updatedAccount = await db.selectFrom('accounts').where('id', '=', accountId).selectAll().executeTakeFirst()
    expect(updatedAccount?.current_balance).toBe(3000)

    // 3. Verify Account Transaction
    const txn = await db.selectFrom('account_transactions')
      .where('reference_type', '=', 'payment')
      .where('reference_id', '=', result.payment.id)
      .selectAll()
      .executeTakeFirst()
      
    expect(txn?.type).toBe('credit') // Money in
    expect(txn?.amount).toBe(2000)
  })

  it('should retrieve a list of payments', async () => {
    await recordPayment(1, {
      party_type: 'customer',
      party_id: customerId,
      amount: 500,
      payment_method: 'cash',
      account_id: accountId
    })

    const payments = await getPayments(1, 10, { party_type: 'customer' })
    expect(payments.length).toBe(1)
    expect(payments[0].amount).toBe(500)
    expect(payments[0].party_name).toBe('Test Customer')
  })
})
