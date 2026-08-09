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
    const adj = await trx.insertInto('stock_adjustments')
      .values({
        item_id: data.item_id,
        change_qty: data.change_qty,
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
      
    await writeAuditLog(userId, 'create', 'stock_adjustments', adj.id, null, adj)
    return adj
  })
}
