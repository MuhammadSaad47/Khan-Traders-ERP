import { db } from '../db/connection'
import { softDelete, writeAuditLog } from './base.service'
import { format, startOfMonth } from 'date-fns'

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
    .orderBy('created_at', 'desc')
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

import { sql } from 'kysely'
async function enforceUniqueItem(input: any, excludeId?: number) {
  let query = db.selectFrom('items')
    .selectAll()
    .where(sql<string>`lower(name)`, '=', (input.name || '').trim().toLowerCase())
    .where('supplier_id', '=', input.supplier_id || null)
    .where('is_deleted', '=', 0);

  if (excludeId) {
    query = query.where('id', '!=', excludeId);
  }

  const existingItems = await query.execute();
  const duplicate = existingItems.find(item => {
    const sizeMatch = (item.size || '').trim().toLowerCase() === (input.size || '').trim().toLowerCase();
    const pkgMatch = (item.packaging || '').trim().toLowerCase() === (input.packaging || '').trim().toLowerCase();
    return sizeMatch && pkgMatch;
  });

  if (duplicate) {
    throw new Error('An identical item (same name, size, and packaging) already exists for this supplier.');
  }
}

export async function getItems() {
  return await db.selectFrom('items')
    .selectAll()
    .where('is_deleted', '=', 0)
    .orderBy('created_at', 'desc')
    .execute()
}

// Get items grouped by product (name+size+packaging) for POS and Products pages
// Merges items from different suppliers into single product view
export async function getItemsGrouped() {
  const allItems = await db.selectFrom('items')
    .selectAll()
    .where('is_deleted', '=', 0)
    .execute()

  // Group items by product key (name + size + packaging + variant)
  const groupedMap = new Map<string, any>()

  for (const item of allItems) {
    const key = `${item.name}|${item.size || ''}|${item.packaging || ''}|${item.variant || ''}`
    
    if (!groupedMap.has(key)) {
      // First item for this product - use as base
      groupedMap.set(key, {
        ...item,
        grouped_ids: [item.id], // Track all item IDs in this group
        grouped_costs: [item.cost_price], // Track all costs for averaging
        grouped_selling_prices: [item.selling_price], // Track all selling prices
        combined_stock: item.current_stock,
        weighted_cost: item.cost_price,
        total_cost_value: item.current_stock * item.cost_price,
        total_selling_value: item.current_stock * item.selling_price
      })
    } else {
      // Merge with existing group
      const existing = groupedMap.get(key)!
      
      // Calculate weighted average cost based on stock
      const totalStock = existing.combined_stock + item.current_stock
      const totalValue = existing.total_cost_value + (item.current_stock * item.cost_price)
      const totalSellingValue = existing.total_selling_value + (item.current_stock * item.selling_price)
      
      // Track all costs and selling prices for simple averaging when stock is 0
      const allCosts = [...existing.grouped_costs, item.cost_price]
      const allSellingPrices = [...existing.grouped_selling_prices, item.selling_price]
      
      // If we have stock, use weighted average; otherwise use simple average
      let weightedCost: number
      let weightedSellingPrice: number
      
      if (totalStock > 0) {
        weightedCost = Math.round(totalValue / totalStock)
        weightedSellingPrice = Math.round(totalSellingValue / totalStock)
      } else {
        // Simple average when no stock (e.g., newly added items before purchase)
        weightedCost = Math.round(allCosts.reduce((sum, c) => sum + c, 0) / allCosts.length)
        weightedSellingPrice = Math.round(allSellingPrices.reduce((sum, p) => sum + p, 0) / allSellingPrices.length)
      }
      
      groupedMap.set(key, {
        ...existing,
        grouped_ids: [...existing.grouped_ids, item.id],
        grouped_costs: allCosts,
        grouped_selling_prices: allSellingPrices,
        combined_stock: totalStock,
        weighted_cost: weightedCost,
        selling_price: weightedSellingPrice,
        total_cost_value: totalValue,
        total_selling_value: totalSellingValue,
        // Clear supplier_id since this represents merged items
        supplier_id: null
      })
    }
  }

  return Array.from(groupedMap.values())
}

export async function createItem(input: ItemInput, userId: number) {
  await enforceUniqueItem(input);
  const result = await db.insertInto('items')
    .values({ ...input })
    .returningAll()
    .executeTakeFirstOrThrow()
  await writeAuditLog(userId, 'create', 'items', result.id, null, result)
  return result
}

export async function updateItem(id: number, input: ItemInput, userId: number) {
  await enforceUniqueItem(input, id);
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

export async function getInventoryAnalytics() {
  const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const items = await db.selectFrom('items')
    .where('items.is_deleted', '=', 0)
    .select(['id', 'name'])
    .execute()
    
  const overallSales = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .where('sales.is_deleted', '=', 0)
    .select(['item_id', db.fn.sum('qty').as('total_qty')])
    .groupBy('item_id')
    .execute()

  const monthlySales = await db.selectFrom('sale_items')
    .innerJoin('sales', 'sales.id', 'sale_items.sale_id')
    .where('sales.is_deleted', '=', 0)
    .where('sales.date', '>=', thisMonthStart)
    .select(['item_id', db.fn.sum('qty').as('total_qty')])
    .groupBy('item_id')
    .execute()

  const overallMap = new Map(overallSales.map(s => [s.item_id, Number(s.total_qty)]))
  const monthlyMap = new Map(monthlySales.map(s => [s.item_id, Number(s.total_qty)]))

  return items.map(i => ({
    item_id: i.id,
    item_name: i.name,
    sold_this_month: monthlyMap.get(i.id) || 0,
    sold_overall: overallMap.get(i.id) || 0
  })).sort((a, b) => b.sold_overall - a.sold_overall)
}
