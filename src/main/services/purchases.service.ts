import { db } from '../db/connection'
import { writeAuditLog, validateAccountBalance } from './base.service'
import { randomUUID } from 'crypto'

export interface PurchaseItemInput {
  item_id: number;
  qty: number;
  unit_cost: number;
  line_total: number;
}

export interface CreatePurchaseInput {
  supplier_id: number;
  subtotal: number;
  discount: number;
  net_total: number;
  paid_amount: number;
  payment_method?: 'cash' | 'bank' | 'easypaisa' | 'cheque' | 'other';
  account_id?: number;
  date?: string;
  items: PurchaseItemInput[];
}

export async function createPurchase(userId: number, input: CreatePurchaseInput) {
  // CRITICAL VALIDATION: Ensure discount doesn't exceed subtotal (data integrity for long-term use)
  if (input.discount > input.subtotal) {
    throw new Error(`Invalid discount: Rs ${input.discount} cannot exceed subtotal Rs ${input.subtotal}`)
  }
  
  // CRITICAL VALIDATION: Ensure net_total calculation is correct
  const expectedNetTotal = input.subtotal - input.discount
  if (input.net_total !== expectedNetTotal) {
    throw new Error(`Invalid net total: expected Rs ${expectedNetTotal} (subtotal ${input.subtotal} - discount ${input.discount}), received Rs ${input.net_total}`)
  }
  
  // Validate input
  if (input.paid_amount < 0) throw new Error('Paid amount cannot be negative. Please use the unpaid option instead.')
  if (input.items.length === 0) throw new Error('Purchase must have at least one item')
  if (input.paid_amount > 0 && !input.account_id) throw new Error('Account ID is required for paid purchases')

  const timestamp = Date.now().toString().slice(-6);
  const randomStr = randomUUID().substring(0, 4).toUpperCase();
  const invoiceNo = `PUR-${timestamp}-${randomStr}`
  const status = input.paid_amount === 0 ? 'unpaid' : (input.paid_amount >= input.net_total ? 'paid' : 'partial')
  const balanceDelta = input.net_total - input.paid_amount

  const result = await db.transaction().execute(async (trx) => {
    // 1. Insert Purchase Record
    const purchase = await trx.insertInto('purchases')
      .values({
        supplier_id: input.supplier_id,
        invoice_no: invoiceNo,
        date: input.date || new Date().toISOString(),
        subtotal: input.subtotal,
        discount: input.discount,
        net_total: input.net_total,
        paid_amount: input.paid_amount,
        status: status,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // 2. Insert Purchase Items & Update Stock
    for (const item of input.items) {
      // Insert purchase item (schema column is unit_cost, not unit_price)
      await trx.insertInto('purchase_items')
        .values({
          purchase_id: purchase.id,
          item_id: item.item_id,
          qty: item.qty,
          unit_cost: item.unit_cost,
          line_total: item.line_total
        })
        .execute()

      const currentItem = await trx.selectFrom('items').select(['current_stock', 'cost_price']).where('id', '=', item.item_id).executeTakeFirstOrThrow()

      const totalCurrentValue = currentItem.current_stock * currentItem.cost_price;
      const totalNewValue = item.qty * item.unit_cost; 
      const newTotalStock = currentItem.current_stock + item.qty;
      const newMovingAvg = newTotalStock > 0 ? Math.round((totalCurrentValue + totalNewValue) / newTotalStock) : item.unit_cost;

      // Update Stock (increase)
      await trx.updateTable('items')
        .set((eb) => ({
          current_stock: eb('current_stock', '+', item.qty),
          cost_price: newMovingAvg
        }))
        .where('id', '=', item.item_id)
        .execute()

      // Record Stock Movement (correct columns: change_qty, type='purchase', reference_type='purchase')
      await trx.insertInto('stock_movements')
        .values({
          item_id: item.item_id,
          change_qty: item.qty,
          type: 'purchase',
          reference_type: 'purchase',
          reference_id: purchase.id,
          created_by: userId
        })
        .execute()
    }

    // 3. Update Supplier Balance (adjust by balanceDelta, which can be negative if overpaid)
    if (balanceDelta !== 0) {
      await trx.updateTable('suppliers')
        .set((eb) => ({
          balance: eb('balance', '+', balanceDelta)
        }))
        .where('id', '=', input.supplier_id)
        .execute()
    }

    // 4. Record Payment in Account Ledger (if any amount was paid)
    if (input.paid_amount > 0 && input.account_id) {
      // Insert into payments table (was missing before!)
      await trx.insertInto('payments')
        .values({
          party_type: 'supplier',
          party_id: input.supplier_id,
          direction: 'out',
          amount: input.paid_amount,
          method: input.payment_method || 'cash',
          account_id: input.account_id,
          reference_type: 'purchase',
          reference_id: purchase.id,
          created_by: userId
        })
        .execute()

      // Validate account exists and has sufficient funds
      await validateAccountBalance(input.account_id, input.paid_amount, trx)

      // Record Account Transaction (correct columns: type='debit', description)
      await trx.insertInto('account_transactions')
        .values({
          account_id: input.account_id,
          type: 'debit',
          amount: input.paid_amount,
          reference_type: 'purchase',
          reference_id: purchase.id,
          description: `Payment for Purchase ${invoiceNo}`,
          created_by: userId
        })
        .execute()

      // Decrease Account Balance (Money out)
      await trx.updateTable('accounts')
        .set((eb) => ({
          current_balance: eb('current_balance', '-', input.paid_amount)
        }))
        .where('id', '=', input.account_id)
        .execute()
    }

    await writeAuditLog(userId, 'create', 'purchases', purchase.id, null, purchase, trx)
    return purchase
  })

  return result
}

export async function getPurchases(page = 1, limit = 50, filters?: { supplier_id?: number, status?: string, fromDate?: string, toDate?: string }) {
  let query = db.selectFrom('purchases')
    .leftJoin('suppliers', 'purchases.supplier_id', 'suppliers.id')
    .select([
      'purchases.id',
      'purchases.invoice_no',
      'purchases.date',
      'purchases.net_total',
      'purchases.paid_amount',
      'purchases.status',
      'suppliers.name as supplier_name'
    ])
    .where('purchases.is_deleted', '=', 0)

  if (filters?.supplier_id) {
    query = query.where('purchases.supplier_id', '=', filters.supplier_id)
  }
  if (filters?.status) {
    query = query.where('purchases.status', '=', filters.status)
  }
  if (filters?.fromDate) {
    query = query.where('purchases.date', '>=', filters.fromDate)
  }
  if (filters?.toDate) {
    query = query.where('purchases.date', '<=', filters.toDate + 'T23:59:59.999Z')
  }

  query = query.orderBy('purchases.date', 'desc')
    .orderBy('purchases.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)

  return await query.execute()
}

export async function getPurchaseDetails(purchaseId: number) {
  const purchase = await db.selectFrom('purchases')
    .leftJoin('suppliers', 'purchases.supplier_id', 'suppliers.id')
    .select([
      'purchases.id',
      'purchases.supplier_id',
      'purchases.invoice_no',
      'purchases.date',
      'purchases.subtotal',
      'purchases.discount',
      'purchases.net_total',
      'purchases.paid_amount',
      'purchases.status',
      'suppliers.name as supplier_name'
    ])
    .where('purchases.id', '=', purchaseId)
    .where('purchases.is_deleted', '=', 0)
    .executeTakeFirst()

  if (!purchase) return null

  const items = await db.selectFrom('purchase_items')
    .innerJoin('items', 'items.id', 'purchase_items.item_id')
    .select([
      'purchase_items.id',
      'purchase_items.item_id',
      'purchase_items.qty',
      'purchase_items.unit_cost',
      'purchase_items.line_total',
      'items.name as item_name',
      'items.size as item_size',
      'items.packaging as item_packaging',
      'items.variant as item_variant'
    ])
    .where('purchase_items.purchase_id', '=', purchaseId)
    .execute()

  return { purchase, items }
}

export async function getPurchaseIdByInvoiceNo(invoiceNo: string) {
  const purchase = await db.selectFrom('purchases')
    .select('id')
    .where('invoice_no', '=', invoiceNo)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  return purchase?.id || null
}

export async function updatePurchase(purchaseId: number, userId: number, input: CreatePurchaseInput) {
  // CRITICAL VALIDATION: Ensure discount doesn't exceed subtotal (data integrity for long-term use)
  if (input.discount > input.subtotal) {
    throw new Error(`Invalid discount: Rs ${input.discount} cannot exceed subtotal Rs ${input.subtotal}`)
  }
  
  // CRITICAL VALIDATION: Ensure net_total calculation is correct
  const expectedNetTotal = input.subtotal - input.discount
  if (input.net_total !== expectedNetTotal) {
    throw new Error(`Invalid net total: expected Rs ${expectedNetTotal} (subtotal ${input.subtotal} - discount ${input.discount}), received Rs ${input.net_total}`)
  }
  
  if (input.paid_amount < 0) throw new Error('Paid amount cannot be negative. Please use the unpaid option instead.')
  if (input.items.length === 0) throw new Error('Purchase must have at least one item')
  if (input.paid_amount > 0 && !input.account_id) throw new Error('Account ID is required when paying')

  const result = await db.transaction().execute(async (trx) => {
    // --- 1. FETCH OLD DATA ---
    const oldPurchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).executeTakeFirstOrThrow()
    const oldItems = await trx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).execute()
    
    const netTotalDelta = input.net_total - oldPurchase.net_total
    const paidAmountDelta = input.paid_amount - oldPurchase.paid_amount

    // --- 2. VALIDATE NET STOCK CHANGES ---
    const allItemIds = new Set([...oldItems.map(i => i.item_id), ...input.items.map(i => i.item_id)])

    for (const itemId of allItemIds) {
      const oldItem = oldItems.find(i => i.item_id === itemId)
      const newItem = input.items.find(i => i.item_id === itemId)
      
      const oldQty = oldItem ? oldItem.qty : 0
      const newQty = newItem ? newItem.qty : 0
      const netChange = newQty - oldQty

      if (netChange < 0) {
        const currentStock = await trx.selectFrom('items')
          .select(['current_stock', 'name'])
          .where('id', '=', itemId)
          .executeTakeFirst()
        
        if (!currentStock) throw new Error(`Item #${itemId} not found`)
        
        if (currentStock.current_stock + netChange < 0) {
          throw new Error(`Cannot update purchase: Item "${currentStock.name}" has insufficient stock to apply changes. Current stock: ${currentStock.current_stock}, reduction requested: ${-netChange}.`)
        }
      }
    }

    // Remove old DB effects so we can cleanly insert new ones
    await trx.deleteFrom('stock_movements').where('reference_type', '=', 'purchase').where('reference_id', '=', purchaseId).execute()
    await trx.deleteFrom('purchase_items').where('purchase_id', '=', purchaseId).execute()

    // (Old payment deletion logic removed to safely support external payments)

    // --- 4. APPLY NEW EFFECTS ---
    // Status is recalculated based on the NEW paid_amount vs the NEW net_total
    const status = input.paid_amount === 0 ? 'unpaid' : (input.paid_amount >= input.net_total ? 'paid' : 'partial')

    const updatedPurchase = await trx.updateTable('purchases')
      .set({
        subtotal: input.subtotal,
        discount: input.discount,
        net_total: input.net_total,
        paid_amount: input.paid_amount,
        status: status,
        date: input.date || oldPurchase.date
      })
      .where('id', '=', purchaseId)
      .returningAll()
      .executeTakeFirstOrThrow()

    // Apply item updates
    for (const itemId of allItemIds) {
      const oldItem = oldItems.find(i => i.item_id === itemId)
      const newItem = input.items.find(i => i.item_id === itemId)
      
      const oldQty = oldItem ? oldItem.qty : 0
      const oldUnitCost = oldItem ? oldItem.unit_cost : 0
      
      const newQty = newItem ? newItem.qty : 0
      const newUnitCost = newItem ? newItem.unit_cost : 0
      
      const netChange = newQty - oldQty

      if (newItem) {
        await trx.insertInto('purchase_items')
          .values({
            purchase_id: purchaseId,
            item_id: itemId,
            qty: newQty,
            unit_cost: newUnitCost,
            line_total: newItem.line_total
          })
          .execute()
          
        await trx.insertInto('stock_movements')
          .values({
            item_id: itemId, change_qty: newQty, type: 'purchase',
            reference_type: 'purchase', reference_id: purchaseId, created_by: userId
          })
          .execute()
      }

      // Calculate stock and moving average mathematically without touching DB twice
      const currentItem = await trx.selectFrom('items').select(['current_stock', 'cost_price']).where('id', '=', itemId).executeTakeFirstOrThrow()
      
      const revertedStock = currentItem.current_stock - oldQty
      const revertedTotalValue = (currentItem.current_stock * currentItem.cost_price) - (oldQty * oldUnitCost)
      
      const newTotalStock = revertedStock + newQty
      const newTotalValue = revertedTotalValue + (newQty * newUnitCost)
      const newMovingAvg = newTotalStock > 0 ? Math.max(0, Math.round(newTotalValue / newTotalStock)) : (newItem ? newUnitCost : currentItem.cost_price)

      if (netChange !== 0 || newMovingAvg !== currentItem.cost_price) {
        await trx.updateTable('items')
          .set((eb) => ({ 
            current_stock: eb('current_stock', '+', netChange), 
            cost_price: newMovingAvg 
          }))
          .where('id', '=', itemId)
          .execute()
      }
    }

    // --- 5. ADJUST PAYMENTS (if paid amount changed) ---
    // Instead of deleting and recreating payments (which breaks if external payments were made),
    // we only issue a delta adjustment to safely correct the balances.
    if (paidAmountDelta !== 0 && input.account_id) {
      const absDelta = Math.abs(paidAmountDelta)
      
      // Validate account has sufficient funds if delta > 0 (paying more)
      if (paidAmountDelta > 0) {
        await validateAccountBalance(input.account_id, absDelta, trx)
      }

      const paymentDirection = paidAmountDelta > 0 ? 'out' : 'in'
      
      // Create new payment adjustment record
      await trx.insertInto('payments')
        .values({
          party_type: 'supplier',
          party_id: oldPurchase.supplier_id!,
          direction: paymentDirection,
          amount: absDelta,
          method: input.payment_method || 'cash',
          account_id: input.account_id,
          reference_type: 'purchase',
          reference_id: purchaseId,
          created_by: userId,
          note: `Adjustment during purchase edit`
        })
        .execute()

      // Record account transaction
      const accTxType = paidAmountDelta > 0 ? 'debit' : 'credit'
      const accDesc = paidAmountDelta > 0 
        ? `Additional payment for Purchase ${oldPurchase.invoice_no}` 
        : `Refund for overpayment on Purchase ${oldPurchase.invoice_no}`
        
      await trx.insertInto('account_transactions')
        .values({
          account_id: input.account_id,
          type: accTxType,
          amount: absDelta,
          reference_type: 'purchase',
          reference_id: purchaseId,
          description: accDesc,
          created_by: userId
        })
        .execute()

      // Adjust account balance
      const accountOperator = paidAmountDelta > 0 ? '-' : '+'
      await trx.updateTable('accounts')
        .set((eb) => ({ current_balance: eb('current_balance', accountOperator, absDelta) }))
        .where('id', '=', input.account_id)
        .execute()
    }

    // --- 6. ADJUST SUPPLIER BALANCE ---
    // Supplier balance = what we owe them. Formula:
    //   net_total goes up → we owe more (balance increases)
    //   paid_amount goes up → we paid more (balance decreases)
    // So: balanceDelta = netTotalDelta - paidAmountDelta
    const balanceDelta = netTotalDelta - paidAmountDelta
    if (balanceDelta !== 0) {
      await trx.updateTable('suppliers')
        .set((eb) => ({ balance: eb('balance', '+', balanceDelta) }))
        .where('id', '=', oldPurchase.supplier_id!)
        .execute()
    }

    await writeAuditLog(userId, 'update', 'purchases', purchaseId, oldPurchase, updatedPurchase, trx)
    return updatedPurchase
  })

  return result
}

export async function voidPurchase(purchaseId: number, userId: number) {
  const result = await db.transaction().execute(async (tx) => {
    // 1. Fetch purchase
    const purchase = await tx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).where('is_deleted', '=', 0).executeTakeFirst()
    if (!purchase) throw new Error('Purchase not found or already voided')

    // 2. Fetch items
    const items = await tx.selectFrom('purchase_items').selectAll().where('purchase_id', '=', purchaseId).execute()
    
    // 3. Revert Stock
    for (const item of items) {
      await tx.updateTable('items')
        .set((eb) => ({ current_stock: eb('current_stock', '-', item.qty) }))
        .where('id', '=', item.item_id)
        .execute()
        
      await tx.insertInto('stock_movements').values({
        item_id: item.item_id,
        change_qty: -item.qty,
        type: 'purchase_void', // Clear distinction from manual adjustments
        reference_type: 'purchase',
        reference_id: purchaseId,
        created_by: userId
      }).execute()
    }

    // 4. Reverse Direct Payments (Money out gets refunded back to us)
    const directPayments = await tx.selectFrom('payments')
      .selectAll()
      .where('reference_type', '=', 'purchase')
      .where('reference_id', '=', purchaseId)
      .where('is_deleted', '=', 0)
      .execute()

    let sumDirectPayments = 0;
    for (const p of directPayments) {
      sumDirectPayments += p.amount;
      if (p.account_id) {
        // Refund back to our account
        await tx.updateTable('accounts')
          .set((eb) => ({ current_balance: eb('current_balance', '+', p.amount) }))
          .where('id', '=', p.account_id)
          .execute()
        
        await tx.insertInto('account_transactions').values({
          account_id: p.account_id,
          type: 'credit', // Money coming back in
          amount: p.amount,
          reference_type: 'purchase',
          reference_id: purchaseId,
          description: `Purchase Void - Payment Refund: ${purchase.invoice_no}`,
          created_by: userId
        }).execute()
      }
      await tx.updateTable('payments').set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId }).where('id', '=', p.id).execute()
    }

    // 5. Adjust Supplier Balance
    if (purchase.supplier_id) {
      const amountToReverse = purchase.net_total - sumDirectPayments;
      if (amountToReverse !== 0) {
        await tx.updateTable('suppliers')
          .set((eb) => ({ balance: eb('balance', '-', amountToReverse) }))
          .where('id', '=', purchase.supplier_id)
          .execute()
      }
    }

    // 6. Mark purchase as voided
    const updatedPurchase = await tx.updateTable('purchases')
      .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
      .where('id', '=', purchaseId)
      .returningAll()
      .executeTakeFirstOrThrow()
      
    await writeAuditLog(userId, 'delete', 'purchases', purchaseId, purchase, updatedPurchase, tx)
    return updatedPurchase
  })

  return result
}
