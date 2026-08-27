import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog } from './base.service'
import { voidSale } from './sales.service'
import { voidPurchase } from './purchases.service'
import { voidPayment } from './payments.service'
import { deleteExpense } from './expenses.service'

export async function getAccounts() {
  return await db.selectFrom('accounts')
    .selectAll()
    .where('is_deleted', '=', 0)
    .orderBy('created_at', 'desc')
    .execute()
}

export interface CreateAccountInput {
  name: string;
  type: 'cash' | 'bank' | 'easypaisa' | 'cheque' | 'other';
  balance?: number;
}

export async function createAccount(userId: number, input: CreateAccountInput) {
  if (!input.name || !input.name.trim()) throw new Error('Account name is required')
  
  const opening = input.balance || 0
  
  const newAccount = await db.insertInto('accounts')
    .values({
      name: input.name.trim(),
      type: input.type,
      opening_balance: opening,
      current_balance: opening
    })
    .returningAll()
    .executeTakeFirstOrThrow()
    
  if (opening > 0) {
    await db.insertInto('account_transactions')
      .values({
        account_id: newAccount.id,
        type: 'credit',
        amount: opening,
        reference_type: 'adjustment',
        description: 'Opening Balance',
        created_by: userId
      })
      .execute()
  }
  
  await writeAuditLog(userId, 'create', 'accounts', newAccount.id, null, newAccount)
  return newAccount
}

export interface GetTransactionsFilters {
  type?: string;
  reference_type?: string;
  search?: string;
}

export async function getAccountTransactions(
  accountId?: number | null,
  page = 1,
  limit = 50,
  filters?: GetTransactionsFilters
) {
  let baseQuery = db.selectFrom('account_transactions as at')
    .innerJoin('accounts as a', 'a.id', 'at.account_id')
    .leftJoin('users as u', 'u.id', 'at.created_by')

  if (accountId && accountId > 0) {
    baseQuery = baseQuery.where('at.account_id', '=', accountId)
  }

  if (filters?.type && filters.type !== 'all') {
    baseQuery = baseQuery.where('at.type', '=', filters.type as any)
  }

  if (filters?.reference_type && filters.reference_type !== 'all') {
    baseQuery = baseQuery.where('at.reference_type', '=', filters.reference_type as any)
  }

  if (filters?.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim().toLowerCase()}%`
    baseQuery = baseQuery.where((eb) => eb.or([
      eb(eb.fn('lower', ['at.description']), 'like', term),
      eb(eb.fn('lower', ['a.name']), 'like', term)
    ]))
  }

  // Fetch paginated rows
  const transactions = await baseQuery
    .select([
      'at.id',
      'at.account_id',
      'a.name as account_name',
      'a.type as account_type',
      'at.type',
      'at.amount',
      'at.reference_type',
      'at.reference_id',
      'at.description',
      'at.date',
      'at.created_at',
      'u.full_name as created_by_name'
    ])
    .orderBy('at.date', 'desc')
    .orderBy('at.id', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute()

  // Fetch total count and totals
  const statsResult = await baseQuery
    .select([
      sql<number>`COUNT(at.id)`.as('total'),
      sql<number>`SUM(CASE WHEN at.type = 'credit' THEN at.amount ELSE 0 END)`.as('total_credits'),
      sql<number>`SUM(CASE WHEN at.type = 'debit' THEN at.amount ELSE 0 END)`.as('total_debits')
    ])
    .executeTakeFirst()

  const total = Number(statsResult?.total || 0)
  const totalCredits = Number(statsResult?.total_credits || 0)
  const totalDebits = Number(statsResult?.total_debits || 0)

  return {
    transactions,
    total,
    totalCredits,
    totalDebits
  }
}

export interface TransferFundsInput {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date?: string;
  description?: string;
}

export interface CapitalInvestmentInput {
  account_id: number;
  amount: number;
  date?: string;
  description?: string;
}

export async function addCapitalInvestment(userId: number, input: CapitalInvestmentInput) {
  if (input.amount <= 0) throw new Error('Investment amount must be greater than zero')

  const account = await db.selectFrom('accounts')
    .select(['id', 'name', 'current_balance'])
    .where('id', '=', input.account_id)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  
  if (!account) throw new Error('Account not found')

  const result = await db.transaction().execute(async (trx) => {
    const desc = input.description?.trim() || 'Capital Investment by Owner'

    // Record Credit (Money into account)
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.account_id,
        type: 'credit',
        amount: input.amount,
        reference_type: 'capital',
        reference_id: null,
        date: input.date || new Date().toISOString(),
        description: desc,
        created_by: userId
      })
      .execute()

    // Update account balance
    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '+', input.amount)
      }))
      .where('id', '=', input.account_id)
      .execute()

    return { success: true, newBalance: account.current_balance + input.amount }
  })

  await writeAuditLog(userId, 'capital', 'accounts', input.account_id, null, {
    amount: input.amount,
    description: input.description
  })

  return result
}

export interface WithdrawalInput {
  account_id: number;
  amount: number;
  date?: string;
  description?: string;
}

export async function withdrawCapital(userId: number, input: WithdrawalInput) {
  if (input.amount <= 0) throw new Error('Withdrawal amount must be greater than zero')

  const account = await db.selectFrom('accounts')
    .select(['id', 'name', 'current_balance'])
    .where('id', '=', input.account_id)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  
  if (!account) throw new Error('Account not found')
  
  if (account.current_balance < input.amount) {
    throw new Error(`Insufficient funds in "${account.name}": available Rs ${account.current_balance}, requested Rs ${input.amount}`)
  }

  const result = await db.transaction().execute(async (trx) => {
    const desc = input.description?.trim() || 'Capital Withdrawal by Owner'

    // Record Debit (Money out of account)
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.account_id,
        type: 'debit',
        amount: input.amount,
        reference_type: 'withdrawal',
        reference_id: null,
        date: input.date || new Date().toISOString(),
        description: desc,
        created_by: userId
      })
      .execute()

    // Update account balance
    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '-', input.amount)
      }))
      .where('id', '=', input.account_id)
      .execute()

    return { success: true, newBalance: account.current_balance - input.amount }
  })

  await writeAuditLog(userId, 'withdrawal', 'accounts', input.account_id, null, {
    amount: input.amount,
    description: input.description
  })

  return result
}

export async function transferFunds(userId: number, input: TransferFundsInput) {
  if (input.from_account_id === input.to_account_id) throw new Error('Cannot transfer to the same account')
  if (input.amount <= 0) throw new Error('Transfer amount must be greater than zero')

  const sourceAcc = await db.selectFrom('accounts').select(['id', 'name']).where('id', '=', input.from_account_id).executeTakeFirst()
  const destAcc = await db.selectFrom('accounts').select(['id', 'name']).where('id', '=', input.to_account_id).executeTakeFirst()
  
  if (!sourceAcc) throw new Error('Source account not found')

  const result = await db.transaction().execute(async (trx) => {
    const desc = input.description ? input.description.trim() : 'Inter-account transfer'
    const destName = destAcc ? destAcc.name : `#${input.to_account_id}`
    const sourceName = sourceAcc ? sourceAcc.name : `#${input.from_account_id}`

    // 1. Record Debit (Money out of source)
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.from_account_id,
        type: 'debit',
        amount: input.amount,
        reference_type: 'transfer',
        reference_id: input.to_account_id,
        date: input.date || new Date().toISOString(),
        description: `${desc} → ${destName}`,
        created_by: userId
      })
      .execute()

    const updateResult = await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '-', input.amount)
      }))
      .where('id', '=', input.from_account_id)
      .where('current_balance', '>=', input.amount)
      .executeTakeFirst()
      
    if (updateResult.numUpdatedRows === 0n) {
      throw new Error('Insufficient funds in source account or account not found')
    }

    // 2. Record Credit (Money into destination)
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.to_account_id,
        type: 'credit',
        amount: input.amount,
        reference_type: 'transfer',
        reference_id: input.from_account_id,
        date: input.date || new Date().toISOString(),
        description: `${desc} ← ${sourceName}`,
        created_by: userId
      })
      .execute()

    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '+', input.amount)
      }))
      .where('id', '=', input.to_account_id)
      .execute()

    return { success: true }
  })

  await writeAuditLog(userId, 'transfer', 'accounts', input.from_account_id, null, {
    to: input.to_account_id,
    amount: input.amount,
    description: input.description
  })

  return result
}

// Allowed reference types that can be edited/deleted directly from the Accounts page
const EDITABLE_REF_TYPES = ['capital', 'withdrawal', 'transfer']

export async function deleteAccountTransaction(userId: number, transactionId: number) {
  const tx = await db.selectFrom('account_transactions')
    .selectAll()
    .where('id', '=', transactionId)
    .executeTakeFirst()

  if (!tx) throw new Error('Transaction not found')

  // Route to the appropriate domain service for complex transactions
  if (tx.reference_type === 'sale' && tx.reference_id) {
    return await voidSale(tx.reference_id, userId)
  }
  
  if (tx.reference_type === 'purchase' && tx.reference_id) {
    return await voidPurchase(tx.reference_id, userId)
  }

  if (tx.reference_type === 'payment' && tx.reference_id) {
    return await voidPayment(tx.reference_id, userId)
  }

  if (tx.reference_type === 'expense' && tx.reference_id) {
    return await deleteExpense(userId, tx.reference_id)
  }

  if (!EDITABLE_REF_TYPES.includes(tx.reference_type as string)) {
    throw new Error(`Cannot directly delete transaction of type ${tx.reference_type}`)
  }

  await db.transaction().execute(async (trx) => {
    // Reverse the balance effect on the account
    if (tx.type === 'credit') {
      await trx.updateTable('accounts')
        .set((eb) => ({ current_balance: eb('current_balance', '-', tx.amount) }))
        .where('id', '=', tx.account_id)
        .execute()
    } else {
      await trx.updateTable('accounts')
        .set((eb) => ({ current_balance: eb('current_balance', '+', tx.amount) }))
        .where('id', '=', tx.account_id)
        .execute()
    }

    // For transfers, also reverse the counterpart transaction
    if (tx.reference_type === 'transfer' && tx.reference_id) {
      // Find the paired transaction (same reference_type=transfer, the other account, close in time)
      const counterpart = await trx.selectFrom('account_transactions')
        .selectAll()
        .where('reference_type', '=', 'transfer')
        .where('account_id', '=', tx.reference_id)
        .where('reference_id', '=', tx.account_id)
        .where('amount', '=', tx.amount)
        .where('id', '!=', transactionId)
        .orderBy('id', 'desc')
        .executeTakeFirst()

      if (counterpart) {
        if (counterpart.type === 'credit') {
          await trx.updateTable('accounts')
            .set((eb) => ({ current_balance: eb('current_balance', '-', counterpart.amount) }))
            .where('id', '=', counterpart.account_id)
            .execute()
        } else {
          await trx.updateTable('accounts')
            .set((eb) => ({ current_balance: eb('current_balance', '+', counterpart.amount) }))
            .where('id', '=', counterpart.account_id)
            .execute()
        }
        await trx.deleteFrom('account_transactions').where('id', '=', counterpart.id).execute()
      }
    }

    // Delete the transaction
    await trx.deleteFrom('account_transactions').where('id', '=', transactionId).execute()
  })

  await writeAuditLog(userId, 'delete', 'account_transactions', transactionId, tx, null)
  return { success: true }
}

export async function updateAccountTransaction(
  userId: number,
  transactionId: number,
  input: { amount?: number; description?: string; date?: string }
) {
  const tx = await db.selectFrom('account_transactions')
    .selectAll()
    .where('id', '=', transactionId)
    .executeTakeFirst()

  if (!tx) throw new Error('Transaction not found')
  if (!EDITABLE_REF_TYPES.includes(tx.reference_type as string)) {
    throw new Error('Only Capital Investment, Withdrawal, and Transfer transactions can be edited from here.')
  }

  const newAmount = input.amount !== undefined ? input.amount : tx.amount
  if (newAmount <= 0) throw new Error('Amount must be greater than zero')
  const amountDiff = newAmount - tx.amount

  await db.transaction().execute(async (trx) => {
    // Update the transaction record
    await trx.updateTable('account_transactions')
      .set({
        amount: newAmount,
        description: input.description !== undefined ? input.description : tx.description,
        date: input.date || tx.date
      })
      .where('id', '=', transactionId)
      .execute()

    // Adjust account balance if amount changed
    if (amountDiff !== 0) {
      if (tx.type === 'credit') {
        // Credit increased → add more; credit decreased → subtract
        await trx.updateTable('accounts')
          .set((eb) => ({ current_balance: eb('current_balance', '+', amountDiff) }))
          .where('id', '=', tx.account_id)
          .execute()
      } else {
        // Debit increased → subtract more; debit decreased → add back
        await trx.updateTable('accounts')
          .set((eb) => ({ current_balance: eb('current_balance', '-', amountDiff) }))
          .where('id', '=', tx.account_id)
          .execute()
      }

      // For transfers, also update the counterpart
      if (tx.reference_type === 'transfer' && tx.reference_id) {
        const counterpart = await trx.selectFrom('account_transactions')
          .selectAll()
          .where('reference_type', '=', 'transfer')
          .where('account_id', '=', tx.reference_id)
          .where('reference_id', '=', tx.account_id)
          .where('amount', '=', tx.amount)
          .where('id', '!=', transactionId)
          .orderBy('id', 'desc')
          .executeTakeFirst()

        if (counterpart) {
          await trx.updateTable('account_transactions')
            .set({ amount: newAmount, date: input.date || counterpart.date })
            .where('id', '=', counterpart.id)
            .execute()

          if (counterpart.type === 'credit') {
            await trx.updateTable('accounts')
              .set((eb) => ({ current_balance: eb('current_balance', '+', amountDiff) }))
              .where('id', '=', counterpart.account_id)
              .execute()
          } else {
            await trx.updateTable('accounts')
              .set((eb) => ({ current_balance: eb('current_balance', '-', amountDiff) }))
              .where('id', '=', counterpart.account_id)
              .execute()
          }
        }
      }
    }
  })

  await writeAuditLog(userId, 'update', 'account_transactions', transactionId, tx, { ...input })
  return { success: true }
}
