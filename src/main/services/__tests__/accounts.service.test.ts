import { describe, it, expect, beforeEach } from 'vitest'
import { getAccounts, transferFunds } from '../accounts.service'
import { db } from '../../db/connection'
import { resetDb } from '../../__tests__/setup'

describe('Accounts Service Integration', () => {
  let sourceAccountId: number;
  let targetAccountId: number;

  beforeEach(async () => {
    await resetDb()

    // Create accounts
    const acc1 = await db.insertInto('accounts').values({
      name: 'Cash Register 1',
      type: 'cash',
      opening_balance: 10000,
      current_balance: 10000
    }).returningAll().executeTakeFirstOrThrow()
    sourceAccountId = acc1.id

    const acc2 = await db.insertInto('accounts').values({
      name: 'Bank Account 1',
      type: 'bank',
      opening_balance: 5000,
      current_balance: 5000
    }).returningAll().executeTakeFirstOrThrow()
    targetAccountId = acc2.id
  })

  it('should get active accounts', async () => {
    const accounts = await getAccounts()
    expect(accounts.length).toBe(2)
  })

  it('should successfully transfer funds between accounts', async () => {
    const transfer = await transferFunds(1, {
      from_account_id: sourceAccountId,
      to_account_id: targetAccountId,
      amount: 1000,
      description: 'Deposit cash to bank'
    })

    expect(transfer).toBeDefined()

    // Verify Balances
    const updatedSource = await db.selectFrom('accounts').where('id', '=', sourceAccountId).selectAll().executeTakeFirst()
    expect(updatedSource?.current_balance).toBe(9000)

    const updatedTarget = await db.selectFrom('accounts').where('id', '=', targetAccountId).selectAll().executeTakeFirst()
    expect(updatedTarget?.current_balance).toBe(6000)

    // Verify Transactions
    const txns = await db.selectFrom('account_transactions')
      .where('reference_type', '=', 'transfer')
      .where('amount', '=', 1000)
      .selectAll()
      .execute()
    
    expect(txns.length).toBe(2)
    const debit = txns.find(t => t.type === 'debit')
    const credit = txns.find(t => t.type === 'credit')
    
    expect(debit?.account_id).toBe(sourceAccountId) // Money left source
    expect(credit?.account_id).toBe(targetAccountId) // Money entered target
  })

  it('should fail transfer if insufficient funds', async () => {
    await expect(transferFunds(1, {
      from_account_id: sourceAccountId,
      to_account_id: targetAccountId,
      amount: 15000,
      description: 'Overdraft'
    })).rejects.toThrow('Insufficient funds')
  })
})
