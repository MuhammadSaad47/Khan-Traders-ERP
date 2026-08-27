import { db } from '../db/connection'
import { writeAuditLog, validateAccountBalance } from './base.service'
import { sql } from 'kysely'

export interface ExpenseInput {
  category_id: number;
  amount: number;
  account_id: number;
  note?: string;
  date?: string;
  sale_id?: number;
}

export async function getExpenseCategories() {
  return await db.selectFrom('expense_categories')
    .selectAll()
    .where('is_deleted', '=', 0)
    .execute()
}

export async function createExpenseCategory(name: string) {
  return await db.insertInto('expense_categories').values({ name }).returningAll().executeTakeFirstOrThrow()
}

export async function getExpenses(filters?: { date_from?: string, date_to?: string, category_id?: number }) {
  let query = db.selectFrom('expenses')
    .innerJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .innerJoin('accounts', 'accounts.id', 'expenses.account_id')
    .leftJoin('users', 'users.id', 'expenses.created_by')
    .select([
      'expenses.id',
      'expenses.amount',
      'expenses.date',
      'expenses.note',
      'expense_categories.id as category_id',
      'expense_categories.name as category_name',
      'accounts.name as account_name',
      'users.username as created_by_name'
    ])
    .where('expenses.is_deleted', '=', 0)

  if (filters?.date_from) {
    query = query.where(sql`date(expenses.date)`, '>=', filters.date_from)
  }
  if (filters?.date_to) {
    query = query.where(sql`date(expenses.date)`, '<=', filters.date_to)
  }
  if (filters?.category_id) {
    query = query.where('expenses.category_id', '=', filters.category_id)
  }

  return await query.orderBy('expenses.date', 'desc').orderBy('expenses.created_at', 'desc').execute()
}

export async function createExpense(data: ExpenseInput, userId: number) {
  const expense = await db.transaction().execute(async (trx) => {
    await validateAccountBalance(data.account_id, data.amount, trx)

    const expense = await trx.insertInto('expenses')
      .values({
        category_id: data.category_id,
        amount: data.amount,
        account_id: data.account_id,
        note: data.note,
        date: data.date || new Date().toISOString(),
        sale_id: data.sale_id,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // Deduct from account
    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '-', data.amount)
      }))
      .where('id', '=', data.account_id)
      .execute()
      
    await trx.insertInto('account_transactions')
      .values({
        account_id: data.account_id,
        type: 'debit',
        amount: data.amount,
        reference_type: 'expense',
        reference_id: expense.id,
        date: data.date || new Date().toISOString(),
        description: `Expense: ${data.note || 'General'}`,
        created_by: userId
      })
      .execute()

    return expense
  })
  
  await writeAuditLog(userId, 'create', 'expenses', expense.id, null, expense)
  return expense
}

export async function deletePurchaseOverheads(purchaseId: number, userId: number) {
  const notePrefix = `[PUR-REF:${purchaseId}]%`
  const overheads = await db.selectFrom('expenses')
    .selectAll()
    .where('note', 'like', notePrefix)
    .where('is_deleted', '=', 0)
    .execute()

  if (overheads.length === 0) return

  await db.transaction().execute(async (trx) => {
    for (const oh of overheads) {
      if (oh.account_id) {
        // Refund the account
        await trx.updateTable('accounts')
          .set((eb) => ({
            current_balance: eb('current_balance', '+', oh.amount)
          }))
          .where('id', '=', oh.account_id)
          .execute()
          
        // Delete account transactions
        await trx.deleteFrom('account_transactions')
          .where('reference_type', '=', 'expense')
          .where('reference_id', '=', oh.id)
          .execute()
      }

      // Mark expense as deleted
      await trx.updateTable('expenses')
        .set({ is_deleted: 1 })
        .where('id', '=', oh.id)
        .execute()
    }
  })

  await writeAuditLog(userId, 'delete', 'expenses', purchaseId, null, { action: 'delete_purchase_overheads', count: overheads.length })
}

export async function deleteExpense(userId: number, expenseId: number) {
  const expense = await db.selectFrom('expenses')
    .selectAll()
    .where('id', '=', expenseId)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  if (!expense) throw new Error('Expense not found or already deleted')

  await db.transaction().execute(async (trx) => {
    if (expense.account_id) {
      // Refund the account
      await trx.updateTable('accounts')
        .set((eb) => ({
          current_balance: eb('current_balance', '+', expense.amount)
        }))
        .where('id', '=', expense.account_id)
        .execute()
        
      // Delete account transactions
      await trx.deleteFrom('account_transactions')
        .where('reference_type', '=', 'expense')
        .where('reference_id', '=', expense.id)
        .execute()
    }

    // Mark expense as deleted
    await trx.updateTable('expenses')
      .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
      .where('id', '=', expense.id)
      .execute()
  })

  await writeAuditLog(userId, 'delete', 'expenses', expenseId, expense, null)
  return { success: true }
}
