import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

export interface StockAdjustmentInput {
  item_id: number;
  change_qty: number;
  reason: 'damage' | 'expiry' | 'theft' | 'recount' | 'other';
  note?: string;
}

export async function getStockAdjustments() {
  return await db.selectFrom('stock_adjustments')
    .innerJoin('items', 'items.id', 'stock_adjustments.item_id')
    .leftJoin('users', 'users.id', 'stock_adjustments.created_by')
    .select([
      'stock_adjustments.id',
      'stock_adjustments.change_qty',
      'stock_adjustments.cost_price_snapshot',
      'stock_adjustments.total_value',
      'stock_adjustments.reason',
      'stock_adjustments.note',
      'stock_adjustments.created_at',
      'items.name as item_name',
      'users.username as created_by_name'
    ])
    .orderBy('stock_adjustments.created_at', 'desc')
    .execute()
}

export async function createStockAdjustment(data: StockAdjustmentInput, userId: number) {
  return await db.transaction().execute(async (trx) => {
    // Fetch item cost price AND current stock for validation
    const item = await trx.selectFrom('items')
      .select(['cost_price', 'current_stock', 'name'])
      .where('id', '=', data.item_id)
      .executeTakeFirst()

    if (!item) throw new Error(`Item #${data.item_id} not found`)

    // CRITICAL: Prevent stock from going negative on damage/theft/expiry adjustments
    if (data.change_qty < 0 && (item.current_stock + data.change_qty) < 0) {
      throw new Error(
        `Cannot remove ${Math.abs(data.change_qty)} unit(s) from "${item.name}": only ${item.current_stock} in stock.`
      )
    }

    const costPrice = item.cost_price || 0
    const totalValue = Math.abs(data.change_qty) * costPrice

    const adj = await trx.insertInto('stock_adjustments')
      .values({
        item_id: data.item_id,
        change_qty: data.change_qty,
        cost_price_snapshot: costPrice,
        total_value: totalValue,
        reason: data.reason,
        note: data.note,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()
      
    // Update main stock
    await trx.updateTable('items')
      .set((eb) => ({
        current_stock: eb('current_stock', '+', data.change_qty)
      }))
      .where('id', '=', data.item_id)
      .execute()
      
    // Record movement
    await trx.insertInto('stock_movements')
      .values({
        item_id: data.item_id,
        change_qty: data.change_qty,
        type: data.reason === 'damage' ? 'damage' : 'adjustment',
        reference_type: 'stock_adjustment',
        reference_id: adj.id,
        note: data.note,
        created_by: userId
      })
      .execute()
      
    await writeAuditLog(userId, 'create', 'stock_adjustments', adj.id, null, adj, trx)
    return adj
  })
}
