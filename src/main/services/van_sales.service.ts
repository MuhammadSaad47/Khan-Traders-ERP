import { db } from '../db/connection'
import { writeAuditLog, validateAccountBalance } from './base.service'

export interface VanAssignmentInput {
  van_salesman_id: number;
  route_id?: number;
  notes?: string;
  items?: { item_id: number, qty_loaded: number }[];
}

export async function createVanAssignment(input: VanAssignmentInput, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    // CRITICAL FIX: Prevent multiple active van assignments for same salesman
    const existingActive = await trx.selectFrom('van_assignments')
      .select(['id', 'status'])
      .where('van_salesman_id', '=', input.van_salesman_id)
      .where('status', 'in', ['loaded', 'in_progress'])
      .executeTakeFirst()

    if (existingActive) {
      throw new Error(`Van salesman already has an active assignment (ID: ${existingActive.id}, Status: ${existingActive.status}). Please reconcile or complete it before creating a new one.`)
    }

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
        
        // 1. Add to van items (Do NOT deduct from warehouse stock since POS handles it)
        await trx.insertInto('van_assignment_items')
          .values({
            van_assignment_id: assignment.id,
            item_id: item.item_id,
            qty_loaded: item.qty_loaded,
            qty_returned: 0
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
      db.fn.coalesce('users.full_name', 'users.username').as('salesman_name')
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
      db.fn.coalesce('users.full_name', 'users.username').as('salesman_name'),
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

export async function reconcileVanAssignment(id: number, data: { returns?: { item_id: number, qty_returned: number }[] }, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const old = await trx.selectFrom('van_assignments').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    
    // Mark as completed (using 'reconciled' to match DB constraints)
    const assignment = await trx.updateTable('van_assignments')
      .set({ status: 'reconciled' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
      
    // Record returned quantities for reporting purposes ONLY (do NOT add back to warehouse stock, as it never left)
    if (data.returns && data.returns.length > 0) {
      for (const ret of data.returns) {
        if (ret.qty_returned <= 0) continue;

        await trx.updateTable('van_assignment_items')
          .set({ qty_returned: ret.qty_returned })
          .where('van_assignment_id', '=', id)
          .where('item_id', '=', ret.item_id)
          .execute()
      }
    }

    return { old, assignment }
  })
  
  await writeAuditLog(userId, 'update', 'van_assignments', id, result.old, result.assignment)
  return result.assignment
}

export async function getAllAssignments(page = 1, limit = 50, filters?: { fromDate?: string, toDate?: string }) {
  let baseQuery = db.selectFrom('van_assignments')
    .innerJoin('users', 'users.id', 'van_assignments.van_salesman_id')

  if (filters?.fromDate) {
    baseQuery = baseQuery.where('van_assignments.created_at', '>=', filters.fromDate)
  }
  if (filters?.toDate) {
    baseQuery = baseQuery.where('van_assignments.created_at', '<=', filters.toDate + 'T23:59:59.999Z')
  }

  const assignments = await baseQuery
    .select([
      'van_assignments.id',
      'van_assignments.date',
      'van_assignments.status',
      'van_assignments.notes',
      db.fn.coalesce('users.full_name', 'users.username').as('salesman_name')
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
    // Validate account has sufficient funds before deducting
    await validateAccountBalance(accountId, amount, trx, 'Not enough balance in the selected account to record this expense.')

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

export async function deleteVanAssignment(id: number, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const old = await trx.selectFrom('van_assignments').where('id', '=', id).selectAll().executeTakeFirstOrThrow()
    
    // CRITICAL FIX: Check for linked sales before allowing deletion
    const linkedSales = await trx.selectFrom('sales')
      .select(trx.fn.count<number>('id').as('count'))
      .where('van_assignment_id', '=', id)
      .where('is_deleted', '=', 0)
      .executeTakeFirst()

    const salesCount = Number(linkedSales?.count || 0)
    if (salesCount > 0) {
      throw new Error(`Cannot delete van assignment: ${salesCount} sale(s) are linked to this assignment. Please void the sales first or keep the assignment for historical records.`)
    }
    
    // Delete the assignment (soft delete not needed - just remove it)
    await trx.deleteFrom('van_assignments')
      .where('id', '=', id)
      .execute()

    // Delete all associated expenses (hard delete - no financial impact since accounts were already debited)
    await trx.deleteFrom('expenses')
      .where('van_assignment_id', '=', id)
      .execute()

    // Delete all associated items
    await trx.deleteFrom('van_assignment_items')
      .where('van_assignment_id', '=', id)
      .execute()

    return { old }
  })
  
  await writeAuditLog(userId, 'delete', 'van_assignments', id, result.old, null)
  return { success: true }
}

export async function getVanAssignmentReport(id: number) {
  const assignment = await getAssignmentDetails(id)
  if (!assignment) throw new Error('Assignment not found')

  const items = await db.selectFrom('van_assignment_items')
    .innerJoin('items', 'items.id', 'van_assignment_items.item_id')
    .select([
      'van_assignment_items.item_id',
      'items.name as item_name',
      'van_assignment_items.qty_loaded',
      'van_assignment_items.qty_returned'
    ])
    .where('van_assignment_items.van_assignment_id', '=', id)
    .execute()

  const expenses = await db.selectFrom('expenses')
    .innerJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .select([
      'expenses.id',
      'expenses.amount',
      'expenses.note',
      'expense_categories.name as category_name'
    ])
    .where('expenses.van_assignment_id', '=', id)
    .where('expenses.is_deleted', '=', 0)
    .execute()

  const sales = await db.selectFrom('sales')
    .selectAll()
    .where('van_assignment_id', '=', id)
    .where('is_deleted', '=', 0)
    .execute()

  // Calculate sold qty per item
  const soldQtyByItem: Record<number, number> = {}
  
  if (sales.length > 0) {
    const saleIds = sales.map(s => s.id)
    const saleItems = await db.selectFrom('sale_items')
      .selectAll()
      .where('sale_id', 'in', saleIds)
      .execute()

    for (const item of saleItems) {
      soldQtyByItem[item.item_id] = (soldQtyByItem[item.item_id] || 0) + item.qty
    }
  }

  // Combine loaded with sold
  const reportItems = items.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    qty_loaded: item.qty_loaded,
    qty_sold: soldQtyByItem[item.item_id] || 0,
    qty_returned: item.qty_returned || 0,
    expected_return: item.qty_loaded - (soldQtyByItem[item.item_id] || 0)
  }))

  const totalSales = sales.reduce((sum, sale) => sum + sale.net_total, 0)
  const totalCashCollected = sales.filter(s => s.paid_amount > 0).reduce((sum, sale) => sum + sale.paid_amount, 0)
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return {
    assignment: assignment,
    sales,
    items: reportItems,
    expenses: expenses,
    summary: {
      totalSales,
      totalCashCollected,
      totalExpenses,
      expectedCashToDeposit: totalCashCollected
    }
  }
}
