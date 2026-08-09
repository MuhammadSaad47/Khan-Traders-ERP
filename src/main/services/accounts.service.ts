import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

export async function getAccounts() {
  return await db.selectFrom('accounts')
    .selectAll()
    .where('is_deleted', '=', 0)
    .orderBy('name', 'asc')
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
      db.fn.count<number>('account_transactions.id').as('total'),
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
  description?: string;
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
