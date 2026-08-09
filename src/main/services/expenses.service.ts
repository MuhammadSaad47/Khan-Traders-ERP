import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

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
    .execute()
}

export async function createExpenseCategory(name: string) {
  return await db.insertInto('expense_categories').values({ name }).returningAll().executeTakeFirstOrThrow()
}

export async function getExpenses() {
  return await db.selectFrom('expenses')
    .innerJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .innerJoin('accounts', 'accounts.id', 'expenses.account_id')
    .leftJoin('users', 'users.id', 'expenses.created_by')
    .select([
      'expenses.id',
      'expenses.amount',
      'expenses.date',
      'expenses.note',
      'expense_categories.name as category_name',
      'accounts.name as account_name',
      'users.username as created_by_name'
    ])
    .where('expenses.is_deleted', '=', 0)
    .orderBy('expenses.date', 'desc')
    .execute()
}

export async function createExpense(data: ExpenseInput, userId: number) {
  const expense = await db.transaction().execute(async (trx) => {
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
