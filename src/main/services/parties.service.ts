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
  area_id?: number;
  route_id?: number;
  credit_limit: number;
}

export interface SupplierInput {
  name: string;
  phone?: string;
  address?: string;
}

// ---- Areas ----
export async function getAreas() {
  return await db.selectFrom('areas').selectAll().where('is_deleted', '=', 0).orderBy('name', 'asc').execute()
}

export async function createArea(input: AreaInput, userId: number) {
  const result = await db.insertInto('areas').values({ ...input }).returningAll().executeTakeFirstOrThrow()
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
  return await db.selectFrom('routes').selectAll().where('is_deleted', '=', 0).orderBy('name', 'asc').execute()
}

export async function createRoute(input: RouteInput, userId: number) {
  const result = await db.insertInto('routes').values({ ...input }).returningAll().executeTakeFirstOrThrow()
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
export async function getCustomers() {
  return await db.selectFrom('customers').selectAll().where('is_deleted', '=', 0).orderBy('name', 'asc').execute()
}

export async function createCustomer(input: CustomerInput, userId: number) {
  await enforceUniquePhone(input.phone, 'customer')
  const result = await db.insertInto('customers').values({ ...input }).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'customers', result.id, null, result)
  return result
}

export async function updateCustomer(id: number, input: CustomerInput, userId: number) {
  await enforceUniquePhone(input.phone, 'customer', id)
  const old = await db.selectFrom('customers').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('customers').set({ ...input, updated_at: new Date().toISOString() }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'customers', id, old, result)
  return result
}

export async function deleteCustomer(id: number, userId: number) {
  const customer = await db.selectFrom('customers').select(['balance', 'ctn_balance']).where('id', '=', id).executeTakeFirst()
  if (customer) {
    if (customer.balance > 0) throw new Error(`Cannot delete customer with outstanding balance of Rs ${customer.balance}`)
    if (customer.ctn_balance > 0) throw new Error(`Cannot delete customer with unreturned cartons (${customer.ctn_balance})`)
  }
  await softDelete('customers', id, userId)
}

// ---- Suppliers ----
export async function getSuppliers() {
  return await db.selectFrom('suppliers').selectAll().where('is_deleted', '=', 0).orderBy('name', 'asc').execute()
}

export async function createSupplier(input: SupplierInput, userId: number) {
  await enforceUniquePhone(input.phone, 'supplier')
  const result = await db.insertInto('suppliers').values({ ...input }).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'suppliers', result.id, null, result)
  return result
}

export async function updateSupplier(id: number, input: SupplierInput, userId: number) {
  await enforceUniquePhone(input.phone, 'supplier', id)
  const old = await db.selectFrom('suppliers').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('suppliers').set({ ...input, updated_at: new Date().toISOString() }).where('id', '=', id).returningAll().executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'suppliers', id, old, result)
  return result
}

export async function deleteSupplier(id: number, userId: number) {
  const supplier = await db.selectFrom('suppliers').select(['balance']).where('id', '=', id).executeTakeFirst()
  if (supplier && supplier.balance > 0) {
    throw new Error(`Cannot delete supplier with outstanding balance of Rs ${supplier.balance}`)
  }
  await softDelete('suppliers', id, userId)
}
