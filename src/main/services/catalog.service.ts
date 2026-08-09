import { db } from '../db/connection'
import { softDelete, writeAuditLog } from './base.service'

export interface CategoryInput {
  name: string;
  description?: string;
}

export interface ItemInput {
  name: string;
  variant?: string;
  size?: string;
  packaging?: string;
  barcode?: string;
  category_id?: number;
  supplier_id?: number;
  units_per_ctn: number;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
}

// ---- Categories ----
export async function getCategories() {
  return await db.selectFrom('categories')
    .selectAll()
    .where('is_deleted', '=', 0)
    .orderBy('name', 'asc')
    .execute()
}

export async function createCategory(input: CategoryInput, userId: number) {
  const result = await db.insertInto('categories')
    .values({ ...input })
    .returningAll()
    .executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'categories', result.id, null, result)
  return result
}

export async function updateCategory(id: number, input: CategoryInput, userId: number) {
  const old = await db.selectFrom('categories').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('categories')
    .set({ ...input })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'categories', id, old, result)
  return result
}

export async function deleteCategory(id: number, userId: number) {
  await softDelete('categories', id, userId)
}

// ---- Items ----
export async function getItems() {
  return await db.selectFrom('items')
    .selectAll()
    .where('is_deleted', '=', 0)
    .orderBy('name', 'asc')
    .execute()
}

export async function createItem(input: ItemInput, userId: number) {
  const result = await db.insertInto('items')
    .values({ ...input })
    .returningAll()
    .executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'items', result.id, null, result)
  return result
}

export async function updateItem(id: number, input: ItemInput, userId: number) {
  const old = await db.selectFrom('items').selectAll().where('id', '=', id).executeTakeFirst()
  const result = await db.updateTable('items')
    .set({ ...input, updated_at: new Date().toISOString() })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'update', 'items', id, old, result)
  return result
}

export async function deleteItem(id: number, userId: number) {
  const activeVan = await db.selectFrom('van_assignment_items')
    .innerJoin('van_assignments', 'van_assignments.id', 'van_assignment_items.van_assignment_id')
    .where('van_assignment_items.item_id', '=', id)
    .where('van_assignments.status', 'in', ['loaded', 'in_progress'])
    .select('van_assignments.id')
    .executeTakeFirst()
    
  if (activeVan) {
    throw new Error(`Cannot delete item because it is loaded on active Van Assignment #${activeVan.id}`)
  }

  await softDelete('items', id, userId)
}
