import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

export interface VanAssignmentInput {
  van_salesman_id: number;
  route_id?: number;
  notes?: string;
  items?: { item_id: number, qty_loaded: number }[];
}

export async function createVanAssignment(input: VanAssignmentInput, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const assignment = await trx.insertInto('van_assignments')
      .values({
        van_salesman_id: input.van_salesman_id,
        route_id: input.route_id,
        notes: input.notes,
        status: 'loaded',
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()
      
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        if (item.qty_loaded <= 0) continue;
        
        // 1. Deduct stock from warehouse
        await trx.updateTable('items')
          .set((eb) => ({ current_stock: eb('current_stock', '-', item.qty_loaded) }))
          .where('id', '=', item.item_id)
          .execute()
          
        // 2. Add to van items
        await trx.insertInto('van_assignment_items')
          .values({
            van_assignment_id: assignment.id,
            item_id: item.item_id,
            qty_loaded: item.qty_loaded,
            qty_returned: 0
          })
          .execute()
          
        // 3. Record stock movement
        await trx.insertInto('stock_movements')
          .values({
            item_id: item.item_id,
            change_qty: -item.qty_loaded,
            type: 'van_load',
            reference_type: 'van_assignment',
            reference_id: assignment.id,
            created_by: userId
          })
          .execute()
      }
    }
      
    return assignment
  })
  
  await writeAuditLog(userId, 'create', 'van_assignments', result.id, null, result)
  return result
}

export async function getActiveAssignments() {
  // Schema CHECK: status IN ('loaded','in_progress','reconciled')
  // Active = not yet reconciled
  const result = await db.selectFrom('van_assignments')
    .innerJoin('users', 'users.id', 'van_assignments.van_salesman_id')
    .select([
      'van_assignments.id',
      'van_assignments.date',
      'van_assignments.status',
      'van_assignments.notes',
      'users.username as salesman_name'
    ])
    .where('van_assignments.status', 'in', ['loaded', 'in_progress'])
    .orderBy('van_assignments.date', 'desc')
    .execute()
    
  return result
}

export async function getAssignmentDetails(id: number) {
  const assignment = await db.selectFrom('van_assignments')
    .innerJoin('users', 'users.id', 'van_assignments.van_salesman_id')
    .leftJoin('routes', 'routes.id', 'van_assignments.route_id')
    .select([
      'van_assignments.id',
      'van_assignments.van_salesman_id',
      'van_assignments.date',
      'van_assignments.status',
      'van_assignments.notes',
      'users.username as salesman_name',
      'routes.name as route_name'
    ])
    .where('van_assignments.id', '=', id)
    .executeTakeFirstOrThrow()

  const salesStats = await db.selectFrom('sales')
    .select([
      db.fn.sum('net_total').as('total_sales'),
      db.fn.sum('paid_amount').as('total_collected')
    ])
    .where('van_assignment_id', '=', id)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  const expensesStats = await db.selectFrom('expenses')
    .select([
      db.fn.sum('amount').as('total_expenses')
    ])
    .where('van_assignment_id', '=', id)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  return { 
    ...assignment, 
    stats: {
      total_sales: Number(salesStats?.total_sales || 0),
      total_collected: Number(salesStats?.total_collected || 0),
      total_expenses: Number(expensesStats?.total_expenses || 0)
    }
  }
}

export async function reconcileVanAssignment(id: number, data: { cash_collected: number, account_id: number, returns?: { item_id: number, qty_returned: number }[] }, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const old = await trx.selectFrom('van_assignments').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    
    // Mark as reconciled
    const assignment = await trx.updateTable('van_assignments')
      .set({ status: 'reconciled' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
      
    if (data.cash_collected > 0) {
      await trx.insertInto('account_transactions')
        .values({
          account_id: data.account_id,
          type: 'credit',
          amount: data.cash_collected,
          reference_type: 'adjustment', // Matches constraint
          reference_id: id,
          description: `Van EOD Deposit (Assignment #${id})`,
          created_by: userId
        })
        .execute()

      await trx.updateTable('accounts')
        .set((eb) => ({
          current_balance: eb('current_balance', '+', data.cash_collected)
        }))
        .where('id', '=', data.account_id)
        .execute()
    }
    
    if (data.returns && data.returns.length > 0) {
      for (const ret of data.returns) {
        if (ret.qty_returned <= 0) continue;

        await trx.updateTable('van_assignment_items')
          .set({ qty_returned: ret.qty_returned })
          .where('van_assignment_id', '=', id)
          .where('item_id', '=', ret.item_id)
          .execute()

        await trx.updateTable('items')
          .set((eb) => ({ current_stock: eb('current_stock', '+', ret.qty_returned) }))
          .where('id', '=', ret.item_id)
          .execute()

        await trx.insertInto('stock_movements')
          .values({
            item_id: ret.item_id,
            change_qty: ret.qty_returned,
            type: 'van_unload',
            reference_type: 'van_assignment',
            reference_id: id,
            created_by: userId
          })
          .execute()
      }
    }

    return { old, assignment }
  })
  
  await writeAuditLog(userId, 'update', 'van_assignments', id, result.old, result.assignment)
  return result.assignment
}

export async function getAllAssignments(page = 1, limit = 50) {
  const baseQuery = db.selectFrom('van_assignments')
    .innerJoin('users', 'users.id', 'van_assignments.van_salesman_id')

  const assignments = await baseQuery
    .select([
      'van_assignments.id',
      'van_assignments.date',
      'van_assignments.status',
      'van_assignments.notes',
      'users.username as salesman_name'
    ])
    .orderBy('van_assignments.date', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute()

  const totalResult = await db.selectFrom('van_assignments')
    .select(db.fn.count<number>('id').as('count'))
    .executeTakeFirst()
    
  return {
    assignments,
    total: Number(totalResult?.count || 0)
  }
}

export async function addVanExpense(vanAssignmentId: number, categoryId: number, amount: number, accountId: number, note: string, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const expense = await trx.insertInto('expenses')
      .values({
        category_id: categoryId,
        amount,
        account_id: accountId,
        van_assignment_id: vanAssignmentId,
        note,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', '-', amount)
      }))
      .where('id', '=', accountId)
      .execute()

    await trx.insertInto('account_transactions')
      .values({
        account_id: accountId,
        type: 'debit',
        amount,
        reference_type: 'expense',
        reference_id: expense.id,
        description: `Van Assignment #${vanAssignmentId} Expense`,
        created_by: userId
      })
      .execute()
      
    return expense
  })
    
  await writeAuditLog(userId, 'create', 'expenses', result.id, null, result)
  return result
}

export async function getVanExpenses(vanAssignmentId: number) {
  return await db.selectFrom('expenses')
    .leftJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .leftJoin('accounts', 'accounts.id', 'expenses.account_id')
    .select([
      'expenses.id',
      'expenses.amount',
      'expenses.date',
      'expenses.note',
      'expense_categories.name as category_name',
      'accounts.name as account_name'
    ])
    .where('expenses.van_assignment_id', '=', vanAssignmentId)
    .where('expenses.is_deleted', '=', 0)
    .orderBy('expenses.date', 'desc')
    .execute()
}
