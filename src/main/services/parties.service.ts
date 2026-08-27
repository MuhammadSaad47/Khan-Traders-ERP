import { db } from '../db/connection'
import { softDelete, writeAuditLog } from './base.service'

async function enforceUniquePhone(phone: string | undefined, partyType: 'customer' | 'supplier', excludeId?: number) {
  if (!phone || !phone.trim()) return;
  const cleanPhone = phone.trim();

  let customerQuery = db.selectFrom('customers').select('id').where('phone', '=', cleanPhone).where('is_deleted', '=', 0);
  if (partyType === 'customer' && excludeId) customerQuery = customerQuery.where('id', '!=', excludeId);
  if (await customerQuery.executeTakeFirst()) throw new Error(`Phone number ${cleanPhone} is already in use by a customer.`);

  let supplierQuery = db.selectFrom('suppliers').select('id').where('phone', '=', cleanPhone).where('is_deleted', '=', 0);
  if (partyType === 'supplier' && excludeId) supplierQuery = supplierQuery.where('id', '!=', excludeId);
  if (await supplierQuery.executeTakeFirst()) throw new Error(`Phone number ${cleanPhone} is already in use by a supplier.`);
}

export interface AreaInput {
  name: string;
}

export interface RouteInput {
  name: string;
  area_id?: number;
}

export interface CustomerInput {
  name: string;
  shop_name?: string;
  phone?: string;
  address?: string;
}

export interface SupplierInput {
  name: string;
  phone?: string;
  address?: string;
}

// ---- Areas ----
export async function getAreas() {
  return await db.selectFrom('areas').selectAll().where('is_deleted', '=', 0).orderBy('created_at', 'desc').execute()
}

export async function createArea(input: AreaInput, userId: number) {
  const result = await db.insertInto('areas').values({ ...input, deleted_at: null, deleted_by: null } as any).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'areas', result.id, null, result)
  return result
}

export async function updateArea(id: number, input: AreaInput, userId: number) {
  const old = await db.selectFrom('areas').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('areas').set({ ...input }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'areas', id, old, result)
  return result
}

export async function deleteArea(id: number, userId: number) {
  await softDelete('areas', id, userId)
}

// ---- Routes ----
export async function getRoutes() {
  return await db.selectFrom('routes').selectAll().where('is_deleted', '=', 0).orderBy('created_at', 'desc').execute()
}

export async function createRoute(input: RouteInput, userId: number) {
  const result = await db.insertInto('routes').values({ ...input, deleted_at: null, deleted_by: null } as any).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'routes', result.id, null, result)
  return result
}

export async function updateRoute(id: number, input: RouteInput, userId: number) {
  const old = await db.selectFrom('routes').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('routes').set({ ...input }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'routes', id, old, result)
  return result
}

export async function deleteRoute(id: number, userId: number) {
  await softDelete('routes', id, userId)
}

// ---- Customers ----

import { sql } from 'kysely'
async function enforceUniqueParty(name: string, address: string | undefined, type: string, excludeId?: number) {
  if (!name) return;
  const addressQuery = address ? address.trim().toLowerCase() : '';
  let query = db.selectFrom(type === 'customer' ? 'customers' : 'suppliers')
    .selectAll()
    .where(sql<string>`lower(name)`, '=', name.trim().toLowerCase())
    .where('is_deleted', '=', 0);
    
  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }
  
  const existing = await query.execute();
  const duplicate = existing.find(p => (p.address ? p.address.trim().toLowerCase() : '') === addressQuery);
  
  if (duplicate) {
    throw new Error(`A ${type} with the same name and address already exists.`);
  }
}


export async function getCustomers(filters?: { fromDate?: string; toDate?: string }) {
  let query = db.selectFrom('customers')
    .selectAll('customers')
    
  if (filters?.fromDate && filters?.toDate) {
    query = query.select([
      sql<number>`(
        SELECT COALESCE(SUM(si.qty), 0)
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE s.customer_id = customers.id
          AND s.is_deleted = 0
          AND s.date >= ${filters.fromDate}
          AND s.date <= ${filters.toDate + 'T23:59:59.999Z'}
      )`.as('total_ctns_sold')
    ])
  } else {
    query = query.select([
      sql<number>`(
        SELECT COALESCE(SUM(si.qty), 0)
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE s.customer_id = customers.id
          AND s.is_deleted = 0
      )`.as('total_ctns_sold')
    ])
  }

  return await query
    .where('customers.is_deleted', '=', 0)
    .orderBy('customers.created_at', 'desc')
    .execute()
}

export async function createCustomer(input: CustomerInput, userId: number) {
  await enforceUniquePhone(input.phone, 'customer')
  await enforceUniqueParty(input.name, input.address, 'customer')
  const result = await db.insertInto('customers').values({ ...input, deleted_at: null, deleted_by: null } as any).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'customers', result.id, null, result)
  return result
}

export async function updateCustomer(id: number, input: CustomerInput, userId: number) {
  await enforceUniquePhone(input.phone, 'customer', id)
  await enforceUniqueParty(input.name, input.address, 'customer', id)
  const old = await db.selectFrom('customers').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('customers').set({ ...input, updated_at: new Date().toISOString() }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'customers', id, old, result)
  return result
}

export async function deleteCustomer(id: number, userId: number) {
  // We allow soft-deletion even if they have balances or history,
  // so that the profile is hidden but historical records are preserved.
  await softDelete('customers', id, userId)
}

// ---- Suppliers ----
export async function getSuppliers() {
  return await db.selectFrom('suppliers').selectAll().where('is_deleted', '=', 0).orderBy('created_at', 'desc').execute()
}

export async function createSupplier(input: SupplierInput, userId: number) {
  await enforceUniquePhone(input.phone, 'supplier')
  await enforceUniqueParty(input.name, input.address, 'supplier')
  const result = await db.insertInto('suppliers').values({ ...input, deleted_at: null, deleted_by: null } as any).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'suppliers', result.id, null, result)
  return result
}

export async function updateSupplier(id: number, input: SupplierInput, userId: number) {
  await enforceUniquePhone(input.phone, 'supplier', id)
  await enforceUniqueParty(input.name, input.address, 'supplier', id)
  const old = await db.selectFrom('suppliers').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('suppliers').set({ ...input, updated_at: new Date().toISOString() }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'suppliers', id, old, result)
  return result
}

export async function deleteSupplier(id: number, userId: number) {
  // We allow soft-deletion even if they have balances or history,
  // so that the profile is hidden but historical records are preserved.
  await softDelete('suppliers', id, userId)
}

// ---- Statements ----
export async function getCustomerStatement(customerId: number, fromDate: string, toDate: string) {
  const customer = await db.selectFrom('customers').select(['balance']).where('id', '=', customerId).executeTakeFirst()
  const currentBalance = customer?.balance || 0

  const safeFromDate = fromDate.includes('T') ? fromDate : fromDate + 'T00:00:00.000Z'
  const safeToDate = toDate.includes('T') ? toDate : toDate + 'T23:59:59.999Z'

  // 1. Fetch future transactions (>= safeFromDate) to reverse and find Opening Balance
  const futureSales = await db.selectFrom('sales')
    .select([db.fn.sum('net_total').as('total'), db.fn.sum('paid_amount').as('paid')])
    .where('customer_id', '=', customerId).where('is_deleted', '=', 0).where('date', '>=', safeFromDate)
    .executeTakeFirst()
  
  const futurePayments = await db.selectFrom('payments')
    .select([db.fn.sum('amount').as('total')])
    .where('party_id', '=', customerId).where('party_type', '=', 'customer').where('is_deleted', '=', 0).where('date', '>=', safeFromDate)
    .executeTakeFirst()

  const futureReturns = await db.selectFrom('sale_returns')
    .select([db.fn.sum('credit_amount').as('total')])
    .where('customer_id', '=', customerId).where('date', '>=', safeFromDate)
    .executeTakeFirst()

  const futureSalesDebit = Number(futureSales?.total) || 0
  const futurePaymentsCredit = Number(futurePayments?.total) || 0
  const futureReturnsCredit = Number(futureReturns?.total) || 0
  
  // To find opening balance, reverse the future transactions:
  // Current Balance = Opening + Sales(Debit) - Payments(Credit) - Returns(Credit)
  // Opening = Current Balance - Sales + Payments + Returns
  const openingBalance = currentBalance - futureSalesDebit + futurePaymentsCredit + futureReturnsCredit

  // 2. Fetch statement transactions (between safeFromDate and safeToDate)
  const sales = await db.selectFrom('sales')
    .select(['id', 'invoice_no as reference', 'date', 'net_total as amount', 'paid_amount as paid', 'status'])
    .where('customer_id', '=', customerId).where('is_deleted', '=', 0)
    .where('date', '>=', safeFromDate).where('date', '<=', safeToDate).execute()

  const payments = await db.selectFrom('payments')
    .select(['id', 'method as reference', 'date', 'amount', 'note'])
    .where('party_id', '=', customerId).where('party_type', '=', 'customer').where('is_deleted', '=', 0)
    .where('date', '>=', safeFromDate).where('date', '<=', safeToDate).execute()

  const returns = await db.selectFrom('sale_returns')
    .select(['id', 'return_no as reference', 'date', 'total_amount', 'refund_amount', 'credit_amount'])
    .where('customer_id', '=', customerId)
    .where('date', '>=', safeFromDate).where('date', '<=', safeToDate).execute()

  // 3. Map to unified lines
  let allLines: any[] = []
  sales.forEach(s => allLines.push({ type: 'sale', id: s.id, date: s.date, reference: s.reference, debit: s.amount, credit: 0, description: 'Sale Invoice' }))
  payments.forEach(p => allLines.push({ type: 'payment', id: p.id, date: p.date, reference: p.reference, debit: 0, credit: p.amount, description: p.note || 'Payment Received' }))
  returns.forEach(r => { if (r.credit_amount > 0) allLines.push({ type: 'return', id: r.id, date: r.date, reference: r.reference, debit: 0, credit: r.credit_amount, description: 'Sale Return (Credited)' }) })

  // 4. Sort chronologically and apply running balance
  allLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = openingBalance
  const processedLines = allLines.map(line => {
    runningBalance = runningBalance + line.debit - line.credit
    return { ...line, balance: runningBalance }
  })

  // 5. Totals
  const totals = processedLines.reduce((acc, curr) => {
    acc.totalDebit += curr.debit
    acc.totalCredit += curr.credit
    return acc
  }, { totalDebit: 0, totalCredit: 0 })

  return { openingBalance, lines: processedLines, closingBalance: runningBalance, totals }
}

export async function getSupplierStatement(supplierId: number, fromDate: string, toDate: string) {
  const supplier = await db.selectFrom('suppliers').select(['balance']).where('id', '=', supplierId).executeTakeFirst()
  const currentBalance = supplier?.balance || 0

  const safeFromDate = fromDate.includes('T') ? fromDate : fromDate + 'T00:00:00.000Z'
  const safeToDate = toDate.includes('T') ? toDate : toDate + 'T23:59:59.999Z'

  // 1. Fetch future transactions (>= safeFromDate)
  const futurePurchases = await db.selectFrom('purchases')
    .select([db.fn.sum('net_total').as('total'), db.fn.sum('paid_amount').as('paid')])
    .where('supplier_id', '=', supplierId).where('is_deleted', '=', 0).where('date', '>=', safeFromDate)
    .executeTakeFirst()
  
  const futurePayments = await db.selectFrom('payments')
    .select([db.fn.sum('amount').as('total')])
    .where('party_id', '=', supplierId).where('party_type', '=', 'supplier').where('is_deleted', '=', 0).where('date', '>=', safeFromDate)
    .executeTakeFirst()

  const futurePurchasesDebit = Number(futurePurchases?.total) || 0
  const futurePaymentsCredit = Number(futurePayments?.total) || 0
  
  // Opening = Current Balance - Purchases + Payments
  const openingBalance = currentBalance - futurePurchasesDebit + futurePaymentsCredit

  // 2. Fetch statement transactions
  const purchases = await db.selectFrom('purchases')
    .select(['id', 'invoice_no as reference', 'date', 'net_total as amount', 'paid_amount as paid', 'status'])
    .where('supplier_id', '=', supplierId).where('is_deleted', '=', 0)
    .where('date', '>=', safeFromDate).where('date', '<=', safeToDate).execute()

  const payments = await db.selectFrom('payments')
    .select(['id', 'method as reference', 'date', 'amount', 'note'])
    .where('party_id', '=', supplierId).where('party_type', '=', 'supplier').where('is_deleted', '=', 0)
    .where('date', '>=', safeFromDate).where('date', '<=', safeToDate).execute()

  // 3. Map to unified lines
  let allLines: any[] = []
  purchases.forEach(p => allLines.push({ type: 'purchase', id: p.id, date: p.date, reference: p.reference, debit: p.amount, credit: 0, description: 'Purchase Invoice' }))
  payments.forEach(p => allLines.push({ type: 'payment', id: p.id, date: p.date, reference: p.reference, debit: 0, credit: p.amount, description: p.note || 'Payment Sent' }))

  // 4. Sort chronologically and apply running balance
  allLines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = openingBalance
  const processedLines = allLines.map(line => {
    runningBalance = runningBalance + line.debit - line.credit
    return { ...line, balance: runningBalance }
  })

  // 5. Totals
  const totals = processedLines.reduce((acc, curr) => {
    acc.totalDebit += curr.debit
    acc.totalCredit += curr.credit
    return acc
  }, { totalDebit: 0, totalCredit: 0 })

  return { openingBalance, lines: processedLines, closingBalance: runningBalance, totals }
}

export async function getTopCustomers() {
  const data = await db.selectFrom('sales')
    .innerJoin('customers', 'customers.id', 'sales.customer_id')
    .select([
      'customers.id',
      'customers.name',
      db.fn.sum('sales.net_total').as('total_volume')
    ])
    .where('sales.is_deleted', '=', 0)
    .where('customers.is_deleted', '=', 0)
    .groupBy('customers.id')
    .orderBy('total_volume', 'desc')
    .limit(10)
    .execute()

  return data.map(d => ({
    id: d.id,
    name: d.name,
    total_volume: Number(d.total_volume)
  }))
}

export async function getTopSuppliers() {
  const data = await db.selectFrom('purchases')
    .innerJoin('suppliers', 'suppliers.id', 'purchases.supplier_id')
    .select([
      'suppliers.id',
      'suppliers.name',
      db.fn.sum('purchases.net_total').as('total_volume')
    ])
    .where('purchases.is_deleted', '=', 0)
    .where('suppliers.is_deleted', '=', 0)
    .groupBy('suppliers.id')
    .orderBy('total_volume', 'desc')
    .limit(10)
    .execute()

  return data.map(d => ({
    id: d.id,
    name: d.name,
    total_volume: Number(d.total_volume)
  }))
}
