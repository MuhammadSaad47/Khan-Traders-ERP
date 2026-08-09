import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog } from './base.service'
import { randomUUID } from 'crypto'

export interface SaleItemInput {
  item_id: number;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface OverheadInput {
  category_id: number | string;
  amount: number;
  account_id: number;
}

export interface CreateSaleInput {
  customer_id?: number | null;
  subtotal: number;
  discount: number;
  net_total: number;
  paid_amount: number;
  payment_method?: 'cash' | 'easypaisa' | 'bank' | 'other';
  account_id?: number;
  sale_type: 'counter' | 'van' | 'wholesale';
  van_assignment_id?: number;
  date?: string;
  ctns_returned?: number;
  items: SaleItemInput[];
  overheads?: OverheadInput[];
  due_date?: string;
}

function generateInvoiceNo() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
  const randomStr = randomUUID().substring(0, 4).toUpperCase();
  return `INV-${year}${month}-${timestamp}-${randomStr}`;
}

export async function createSale(input: CreateSaleInput, userId: number) {
  const invoiceNo = generateInvoiceNo()
  const status = input.paid_amount >= input.net_total ? 'paid' : (input.paid_amount > 0 ? 'partial' : 'unpaid')
  
  const result = await db.transaction().execute(async (tx) => {
    // 0. Validate stock availability for ALL items before proceeding
    for (const item of input.items) {
      if (input.sale_type === 'van') {
        if (!input.van_assignment_id) throw new Error('Van assignment ID is required for van sales')
        const vanItem = await tx.selectFrom('van_assignment_items')
          .select(['qty_loaded', 'qty_returned'])
          .where('van_assignment_id', '=', input.van_assignment_id)
          .where('item_id', '=', item.item_id)
          .executeTakeFirst()
        if (!vanItem) throw new Error(`Item #${item.item_id} not loaded on this van`)
      } else {
        const stockRow = await tx.selectFrom('items')
          .select(['current_stock', 'name'])
          .where('id', '=', item.item_id)
          .where('is_deleted', '=', 0)
          .executeTakeFirst()
        if (!stockRow) throw new Error(`Item #${item.item_id} not found`)
        if (stockRow.current_stock < item.qty) {
          throw new Error(`Insufficient stock for "${stockRow.name}": available ${stockRow.current_stock}, requested ${item.qty}`)
        }
      }
    }

    // 0.5 Check Credit Limit
    if (input.customer_id) {
      const customer = await tx.selectFrom('customers').select(['balance', 'credit_limit']).where('id', '=', input.customer_id).executeTakeFirst()
      if (customer && customer.credit_limit > 0) {
        const unpaidAmount = input.net_total - input.paid_amount
        if (customer.balance + unpaidAmount > customer.credit_limit) {
          throw new Error(`Credit limit exceeded. Limit: Rs ${customer.credit_limit}, Current Balance: Rs ${customer.balance}, New Unpaid: Rs ${unpaidAmount}`)
        }
      }
    }

    // 1. Insert Sale
    const saleResult = await tx.insertInto('sales').values({
      invoice_no: invoiceNo,
      customer_id: input.customer_id || null,
      subtotal: input.subtotal,
      discount: input.discount,
      net_total: input.net_total,
      paid_amount: input.paid_amount,
      status: status,
      sale_type: input.sale_type,
      van_assignment_id: input.van_assignment_id,
      due_date: input.due_date || null,
      created_by: userId,
      date: input.date ? input.date : new Date().toISOString()
    }).returningAll().executeTakeFirstOrThrow()

    // 2. Insert Sale Items and Stock Movements
    for (const item of input.items) {
      // Fetch cost_price snapshot for accurate historical COGS
      const itemData = await tx.selectFrom('items').select('cost_price').where('id', '=', item.item_id).executeTakeFirstOrThrow()

      await tx.insertInto('sale_items').values({
        sale_id: saleResult.id,
        item_id: item.item_id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        cost_price_snapshot: itemData.cost_price
      }).execute()

      // Handle Stock (Van sales already had stock deducted from warehouse during van load)
      if (input.sale_type !== 'van') {
        await tx.insertInto('stock_movements').values({
          item_id: item.item_id,
          change_qty: -item.qty,
          type: 'sale',
          reference_type: 'sale',
          reference_id: saleResult.id,
          created_by: userId
        }).execute()

        await tx.updateTable('items')
          .set({ current_stock: sql`current_stock - ${item.qty}` })
          .where('id', '=', item.item_id)
          .execute()
      }

      // Ctn Tracking (if item is in ctns and customer exists)
      if (input.customer_id) {
        const itemInfo = await tx.selectFrom('items').select('units_per_ctn').where('id', '=', item.item_id).executeTakeFirst()
        if (itemInfo && itemInfo.units_per_ctn > 1) {
          const ctnQty = Math.floor(item.qty / itemInfo.units_per_ctn)
          if (ctnQty > 0) {
            await tx.insertInto('ctn_transactions').values({
              customer_id: input.customer_id,
              change_qty: ctnQty,
              reference_type: 'sale',
              reference_id: saleResult.id,
              note: `Issued ${ctnQty} ctns for sale`,
              created_by: userId
            }).execute()

            await tx.updateTable('customers')
              .set({ ctn_balance: sql`ctn_balance + ${ctnQty}` })
              .where('id', '=', input.customer_id)
              .execute()
          }
        }
      }
    }
    // Process Ctns Returned
    if (input.ctns_returned && input.ctns_returned > 0 && input.customer_id) {
      await tx.insertInto('ctn_transactions').values({
        customer_id: input.customer_id,
        change_qty: -input.ctns_returned, // Negative because they return it to us (reduces their balance)
        reference_type: 'sale',
        reference_id: saleResult.id,
        note: `Returned ${input.ctns_returned} empty ctns`,
        created_by: userId
      }).execute()

      await tx.updateTable('customers')
        .set({ ctn_balance: sql`ctn_balance - ${input.ctns_returned}` })
        .where('id', '=', input.customer_id)
        .execute()
    }

    // 3. Handle Payment (if any)
    if (input.paid_amount > 0 && input.account_id && input.payment_method) {
      // Only create a payments record if there's a real customer (not walk-in)
      if (input.customer_id) {
        await tx.insertInto('payments').values({
          party_type: 'customer',
          party_id: input.customer_id,
          direction: 'in',
          amount: input.paid_amount,
          method: input.payment_method,
          account_id: input.account_id,
          reference_type: 'sale',
          reference_id: saleResult.id,
          created_by: userId
        }).returningAll().executeTakeFirstOrThrow()
      }

      // Account Transaction (always recorded, even for walk-in cash sales)
      await tx.insertInto('account_transactions').values({
        account_id: input.account_id,
        type: 'credit',
        amount: input.paid_amount,
        reference_type: 'sale',
        reference_id: saleResult.id,
        description: `Payment for Sale ${invoiceNo}`,
        created_by: userId
      }).execute()

      // Update Account Balance Cache
      await tx.updateTable('accounts')
        .set({ current_balance: sql`current_balance + ${input.paid_amount}` })
        .where('id', '=', input.account_id)
        .execute()
    }

    // 4. Update Customer Balance (if unpaid/partial and customer exists)
    const unpaidAmount = input.net_total - input.paid_amount;
    if (unpaidAmount > 0 && input.customer_id) {
      await tx.updateTable('customers')
        .set({ balance: sql`balance + ${unpaidAmount}` }) // Positive balance = customer owes us
        .where('id', '=', input.customer_id)
        .execute()
    }

    // 5. Handle Overheads (Expenses)
    if (input.overheads && input.overheads.length > 0) {
      for (const oh of input.overheads) {
        let catId: number;
        if (typeof oh.category_id === 'string') {
          const newCat = await tx.insertInto('expense_categories')
            .values({ name: oh.category_id })
            .returningAll()
            .executeTakeFirstOrThrow()
          catId = newCat.id
        } else {
          catId = oh.category_id
        }

        const expense = await tx.insertInto('expenses')
          .values({
            category_id: catId,
            amount: oh.amount,
            account_id: oh.account_id,
            note: `[SALE-REF:${saleResult.id}] ${invoiceNo} Overhead`,
            sale_id: saleResult.id,
            created_by: userId
          })
          .returningAll()
          .executeTakeFirstOrThrow()

        await tx.updateTable('accounts')
          .set((eb) => ({
            current_balance: eb('current_balance', '-', oh.amount)
          }))
          .where('id', '=', oh.account_id)
          .execute()

        await tx.insertInto('account_transactions')
          .values({
            account_id: oh.account_id,
            type: 'debit',
            amount: oh.amount,
            reference_type: 'expense',
            reference_id: expense.id,
            description: `Sale Overhead: ${invoiceNo}`,
            created_by: userId
          })
          .execute()
      }
    }

    await writeAuditLog(userId, 'create', 'sales', saleResult.id, null, saleResult, tx)
    return saleResult
  })
  
  return result
}

export async function getSales(page = 1, limit = 50, _filters?: any) {
  let query = db.selectFrom('sales')
    .selectAll()
    .orderBy('date', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)

  return await query.execute()
}

export async function getSaleDetails(saleId: number) {
  const sale = await db.selectFrom('sales')
    .selectAll()
    .where('id', '=', saleId)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()

  if (!sale) return null

  const items = await db.selectFrom('sale_items')
    .innerJoin('items', 'items.id', 'sale_items.item_id')
    .select([
      'sale_items.id',
      'sale_items.item_id',
      'sale_items.qty',
      'sale_items.unit_price',
      'sale_items.line_total',
      'items.name as item_name',
      'items.variant as item_variant',
      'items.units_per_ctn'
    ])
    .where('sale_items.sale_id', '=', saleId)
    .execute()

  const overheads = await db.selectFrom('expenses')
    .innerJoin('expense_categories', 'expense_categories.id', 'expenses.category_id')
    .select(['expenses.id', 'expenses.amount', 'expenses.date', 'expenses.note', 'expense_categories.name as category_name'])
    .where('expenses.sale_id', '=', saleId)
    .where('expenses.is_deleted', '=', 0)
    .execute()

  return { sale, items, overheads }
}

export async function getSaleIdByInvoiceNo(invoiceNo: string) {
  const sale = await db.selectFrom('sales')
    .select('id')
    .where('invoice_no', '=', invoiceNo)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  return sale?.id || null
}

export async function updateSale(saleId: number, userId: number, input: CreateSaleInput) {
  if (input.items.length === 0) throw new Error('Sale must have at least one item')

  const result = await db.transaction().execute(async (tx) => {
    // 1. Fetch old data
    const oldSale = await tx.selectFrom('sales').selectAll().where('id', '=', saleId).executeTakeFirstOrThrow()
    const oldItems = await tx.selectFrom('sale_items').selectAll().where('sale_id', '=', saleId).execute()
    const oldCustomer = oldSale.customer_id
    const newCustomer = input.customer_id ?? null
    
    if (newCustomer !== oldCustomer) throw new Error("Cannot change customer on an existing sale.")

    // --- REVERSE OLD EFFECTS ---
    // A. Revert Stock
    for (const oldItem of oldItems) {
      await tx.updateTable('items')
        .set((eb) => ({ current_stock: eb('current_stock', '+', oldItem.qty) }))
        .where('id', '=', oldItem.item_id)
        .execute()
    }
    await tx.deleteFrom('stock_movements').where('reference_type', '=', 'sale').where('reference_id', '=', saleId).execute()
    await tx.deleteFrom('sale_items').where('sale_id', '=', saleId).execute()

    // A2. Revert Old Overheads (expenses linked to this sale)
    const oldOverheads = await tx.selectFrom('expenses')
      .selectAll()
      .where('sale_id', '=', saleId)
      .where('is_deleted', '=', 0)
      .execute()
    for (const oh of oldOverheads) {
      if (oh.account_id) {
        // Refund the account
        await tx.updateTable('accounts')
          .set((eb) => ({ current_balance: eb('current_balance', '+', oh.amount) }))
          .where('id', '=', oh.account_id)
          .execute()
        // Remove the account transaction
        await tx.deleteFrom('account_transactions')
          .where('reference_type', '=', 'expense')
          .where('reference_id', '=', oh.id)
          .execute()
      }
      // Soft-delete the old expense
      await tx.updateTable('expenses')
        .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
        .where('id', '=', oh.id)
        .execute()
    }

    // B. Revert Carton Transactions for this sale
    if (oldCustomer) {
      const oldCtns = await tx.selectFrom('ctn_transactions').selectAll().where('reference_type', '=', 'sale').where('reference_id', '=', saleId).execute()
      let totalCtnChange = 0
      for(const ctn of oldCtns) {
        totalCtnChange += ctn.change_qty // This was added to customer balance
      }
      if (totalCtnChange !== 0) {
        await tx.updateTable('customers')
          .set((eb) => ({ ctn_balance: eb('ctn_balance', '-', totalCtnChange) }))
          .where('id', '=', oldCustomer)
          .execute()
      }
      await tx.deleteFrom('ctn_transactions').where('reference_type', '=', 'sale').where('reference_id', '=', saleId).execute()
    }

    // C. Revert Customer Financial Balance (Only the UNPAID amount was added to balance)
    const oldUnpaidAmount = oldSale.net_total - oldSale.paid_amount
    if (oldUnpaidAmount !== 0 && oldCustomer) {
      await tx.updateTable('customers')
        .set((eb) => ({ balance: eb('balance', '-', oldUnpaidAmount) }))
        .where('id', '=', oldCustomer)
        .execute()
    }

    // Validate stock availability for all new items
    for (const item of input.items) {
      const stockRow = await tx.selectFrom('items')
        .select(['current_stock', 'name'])
        .where('id', '=', item.item_id)
        .executeTakeFirst()
      if (!stockRow) throw new Error(`Item #${item.item_id} not found`)
      if (stockRow.current_stock < item.qty) {
        throw new Error(`Insufficient stock for "${stockRow.name}": available ${stockRow.current_stock}, requested ${item.qty}`)
      }
    }

    // --- APPLY NEW EFFECTS ---
    // The new status depends on the existing paid_amount vs new net_total.
    // For safety, editing sales does not touch original payment records.
    const status = oldSale.paid_amount >= input.net_total ? 'paid' : (oldSale.paid_amount > 0 ? 'partial' : 'unpaid')

    const updatedSale = await tx.updateTable('sales')
      .set({
        subtotal: input.subtotal,
        discount: input.discount,
        net_total: input.net_total,
        status: status,
        sale_type: input.sale_type,
        van_assignment_id: input.van_assignment_id,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', saleId)
      .returningAll()
      .executeTakeFirstOrThrow()

    // Re-insert Sale Items and deduct Stock
    for (const item of input.items) {
      const itemData = await tx.selectFrom('items').select('cost_price').where('id', '=', item.item_id).executeTakeFirstOrThrow()

      await tx.insertInto('sale_items').values({
        sale_id: saleId,
        item_id: item.item_id,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total,
        cost_price_snapshot: itemData.cost_price
      }).execute()

      await tx.insertInto('stock_movements').values({
        item_id: item.item_id,
        change_qty: -item.qty,
        type: 'sale',
        reference_type: 'sale',
        reference_id: saleId,
        created_by: userId
      }).execute()

      await tx.updateTable('items')
        .set((eb) => ({ current_stock: eb('current_stock', '-', item.qty) }))
        .where('id', '=', item.item_id)
        .execute()

      if (oldCustomer) {
        const itemInfo = await tx.selectFrom('items').select('units_per_ctn').where('id', '=', item.item_id).executeTakeFirst()
        if (itemInfo && itemInfo.units_per_ctn > 1) {
          const ctnQty = Math.floor(item.qty / itemInfo.units_per_ctn)
          if (ctnQty > 0) {
            await tx.insertInto('ctn_transactions').values({
              customer_id: oldCustomer,
              change_qty: ctnQty,
              reference_type: 'sale',
              reference_id: saleId,
              note: `Issued ${ctnQty} ctns for edited sale`,
              created_by: userId
            }).execute()

            await tx.updateTable('customers')
              .set((eb) => ({ ctn_balance: eb('ctn_balance', '+', ctnQty) }))
              .where('id', '=', oldCustomer)
              .execute()
          }
        }
      }
    }

    if (input.ctns_returned && input.ctns_returned > 0 && oldCustomer) {
      await tx.insertInto('ctn_transactions').values({
        customer_id: oldCustomer,
        change_qty: -input.ctns_returned,
        reference_type: 'sale',
        reference_id: saleId,
        note: `Returned ${input.ctns_returned} empty ctns`,
        created_by: userId
      }).execute()

      await tx.updateTable('customers')
        .set((eb) => ({ ctn_balance: eb('ctn_balance', '-', input.ctns_returned || 0) }))
        .where('id', '=', oldCustomer)
        .execute()
    }

    // Re-apply Customer Financial Balance for the new unpaid amount
    const newUnpaidAmount = input.net_total - oldSale.paid_amount;
    if (newUnpaidAmount !== 0 && oldCustomer) {
      await tx.updateTable('customers')
        .set((eb) => ({ balance: eb('balance', '+', newUnpaidAmount) })) 
        .where('id', '=', oldCustomer)
        .execute()
    }

    // Re-apply new overheads
    if (input.overheads && input.overheads.length > 0) {
      for (const oh of input.overheads) {
        let catId: number;
        if (typeof oh.category_id === 'string') {
          const newCat = await tx.insertInto('expense_categories')
            .values({ name: oh.category_id })
            .returningAll()
            .executeTakeFirstOrThrow()
          catId = newCat.id
        } else {
          catId = oh.category_id
        }

        const expense = await tx.insertInto('expenses')
          .values({
            category_id: catId,
            amount: oh.amount,
            account_id: oh.account_id,
            note: `[SALE-REF:${saleId}] Overhead (edited)`,
            sale_id: saleId,
            created_by: userId
          })
          .returningAll()
          .executeTakeFirstOrThrow()

        await tx.updateTable('accounts')
          .set((eb) => ({
            current_balance: eb('current_balance', '-', oh.amount)
          }))
          .where('id', '=', oh.account_id)
          .execute()

        await tx.insertInto('account_transactions')
          .values({
            account_id: oh.account_id,
            type: 'debit',
            amount: oh.amount,
            reference_type: 'expense',
            reference_id: expense.id,
            description: `Sale Overhead (edited): ${updatedSale.invoice_no}`,
            created_by: userId
          })
          .execute()
      }
    }

    await writeAuditLog(userId, 'update', 'sales', saleId, oldSale, updatedSale, tx)
    return updatedSale
  })

  return result
}

export async function voidSale(saleId: number, userId: number) {
  const result = await db.transaction().execute(async (tx) => {
    // 1. Fetch sale
    const sale = await tx.selectFrom('sales').selectAll().where('id', '=', saleId).where('is_deleted', '=', 0).executeTakeFirst()
    if (!sale) throw new Error('Sale not found or already voided')

    // 2. Fetch items
    const items = await tx.selectFrom('sale_items').selectAll().where('sale_id', '=', saleId).execute()
    
    // 3. Revert Stock
    for (const item of items) {
      await tx.updateTable('items')
        .set((eb) => ({ current_stock: eb('current_stock', '+', item.qty) }))
        .where('id', '=', item.item_id)
        .execute()
        
      await tx.insertInto('stock_movements').values({
        item_id: item.item_id,
        change_qty: item.qty,
        type: 'adjustment', // Was sale_void but schema only allows adjustment
        reference_type: 'sale',
        reference_id: saleId,
        created_by: userId
      }).execute()
    }

    // 4. Revert Ctn Transactions
    if (sale.customer_id) {
      const ctns = await tx.selectFrom('ctn_transactions').selectAll().where('reference_type', '=', 'sale').where('reference_id', '=', saleId).execute()
      let ctnSum = 0;
      for(const c of ctns) { ctnSum += c.change_qty; }
      if (ctnSum !== 0) {
        await tx.updateTable('customers')
          .set((eb) => ({ ctn_balance: eb('ctn_balance', '-', ctnSum) }))
          .where('id', '=', sale.customer_id)
          .execute()
        await tx.deleteFrom('ctn_transactions').where('reference_type', '=', 'sale').where('reference_id', '=', saleId).execute()
      }
    }

    // 5. Soft-delete overheads and refund accounts
    const overheads = await tx.selectFrom('expenses').selectAll().where('sale_id', '=', saleId).where('is_deleted', '=', 0).execute()
    for (const oh of overheads) {
      if (oh.account_id) {
        await tx.updateTable('accounts')
          .set((eb) => ({ current_balance: eb('current_balance', '+', oh.amount) }))
          .where('id', '=', oh.account_id)
          .execute()
        await tx.insertInto('account_transactions').values({
          account_id: oh.account_id,
          type: 'credit',
          amount: oh.amount,
          reference_type: 'expense',
          reference_id: oh.id,
          description: `Sale Void - Overhead Refund: ${sale.invoice_no}`,
          created_by: userId
        }).execute()
      }
      await tx.updateTable('expenses').set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId }).where('id', '=', oh.id).execute()
    }

    // 6. Reverse all Income from this sale
    const incomeTxs = await tx.selectFrom('account_transactions')
      .selectAll()
      .where('reference_type', '=', 'sale')
      .where('reference_id', '=', saleId)
      .where('type', '=', 'credit')
      .execute()

    let sumDirectPayments = 0;
    for (const txRecord of incomeTxs) {
      sumDirectPayments += txRecord.amount;
      await tx.updateTable('accounts')
        .set((eb) => ({ current_balance: eb('current_balance', '-', txRecord.amount) }))
        .where('id', '=', txRecord.account_id)
        .execute()
      
      await tx.insertInto('account_transactions').values({
        account_id: txRecord.account_id,
        type: 'debit',
        amount: txRecord.amount,
        reference_type: 'sale',
        reference_id: saleId,
        description: `Sale Void - Income Reversal: ${sale.invoice_no}`,
        created_by: userId
      }).execute()
    }

    await tx.updateTable('payments')
      .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
      .where('reference_type', '=', 'sale')
      .where('reference_id', '=', saleId)
      .execute()

    // 7. Adjust Customer Balance
    if (sale.customer_id) {
      const amountToReverse = sale.net_total - sumDirectPayments;
      if (amountToReverse !== 0) {
        await tx.updateTable('customers')
          .set((eb) => ({ balance: eb('balance', '-', amountToReverse) }))
          .where('id', '=', sale.customer_id)
          .execute()
      }
    }

    // 8. Mark sale as voided
    const updatedSale = await tx.updateTable('sales')
      .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
      .where('id', '=', saleId)
      .returningAll()
      .executeTakeFirstOrThrow()
      
    await writeAuditLog(userId, 'delete', 'sales', saleId, sale, updatedSale, tx)
    return updatedSale
  })

  return result
}

export interface SaleReturnItemInput {
  sale_item_id: number;
  qty: number;
}

export interface CreateSaleReturnInput {
  sale_id: number;
  items: SaleReturnItemInput[];
  refund_amount: number;
  credit_amount: number;
  account_id?: number;
}

function generateReturnNo() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = randomUUID().substring(0, 4).toUpperCase();
  return `RET-${year}${month}-${timestamp}-${randomStr}`;
}

export async function createSaleReturn(input: CreateSaleReturnInput, userId: number) {
  return await db.transaction().execute(async (tx) => {
    const sale = await tx.selectFrom('sales').selectAll().where('id', '=', input.sale_id).executeTakeFirst();
    if (!sale) throw new Error('Sale not found');

    const saleItems = await tx.selectFrom('sale_items').selectAll().where('sale_id', '=', input.sale_id).execute();

    let totalAmount = 0;
    const itemsToInsert: { sale_item_id: number; item_id: number; qty: number; unit_price: number; line_total: number; }[] = [];

    for (const returnItem of input.items) {
      if (returnItem.qty <= 0) continue;
      
      const originalItem = saleItems.find(si => si.id === returnItem.sale_item_id);
      if (!originalItem) throw new Error(`Sale item ${returnItem.sale_item_id} not found in this sale`);

      const previousReturns = await tx.selectFrom('sale_return_items')
        .select(eb => eb.fn.sum<number>('qty').as('total_returned'))
        .where('sale_item_id', '=', returnItem.sale_item_id)
        .executeTakeFirst();
      
      const alreadyReturned = previousReturns?.total_returned || 0;
      if (alreadyReturned + returnItem.qty > originalItem.qty) {
        throw new Error(`Cannot return ${returnItem.qty}. Only ${originalItem.qty - alreadyReturned} remaining.`);
      }

      const lineTotal = returnItem.qty * originalItem.unit_price;
      totalAmount += lineTotal;
      itemsToInsert.push({
        sale_item_id: originalItem.id,
        item_id: originalItem.item_id,
        qty: returnItem.qty,
        unit_price: originalItem.unit_price,
        line_total: lineTotal
      });
    }

    if (itemsToInsert.length === 0) throw new Error('No items to return');
    if (input.refund_amount + input.credit_amount !== totalAmount) {
      throw new Error(`Refund + Credit (${input.refund_amount + input.credit_amount}) must equal total return value (${totalAmount})`);
    }

    if (input.refund_amount > 0 && !input.account_id) {
      throw new Error('Account ID is required for cash refunds');
    }

    const returnRecord = await tx.insertInto('sale_returns').values({
      return_no: generateReturnNo(),
      sale_id: sale.id,
      customer_id: sale.customer_id,
      total_amount: totalAmount,
      refund_amount: input.refund_amount,
      credit_amount: input.credit_amount,
      created_by: userId
    }).returningAll().executeTakeFirstOrThrow();

    for (const item of itemsToInsert) {
      await tx.insertInto('sale_return_items').values({
        return_id: returnRecord.id,
        ...item
      }).execute();

      await tx.updateTable('items')
        .set((eb) => ({ current_stock: eb('current_stock', '+', item.qty) }))
        .where('id', '=', item.item_id)
        .execute();

      await tx.insertInto('stock_movements').values({
        item_id: item.item_id,
        change_qty: item.qty,
        type: 'return_in', // Match schema check constraint
        reference_type: 'sale', // Schema only allows sale/purchase/etc
        reference_id: returnRecord.sale_id, // sale_id
        note: `Return for invoice ${sale.invoice_no}`,
        created_by: userId
      }).execute();
    }

    if (input.credit_amount > 0 && sale.customer_id) {
      await tx.updateTable('customers')
        .set((eb) => ({ balance: eb('balance', '-', input.credit_amount) }))
        .where('id', '=', sale.customer_id)
        .execute();
    }

    if (input.refund_amount > 0 && input.account_id) {
      await tx.updateTable('accounts')
        .set((eb) => ({ current_balance: eb('current_balance', '-', input.refund_amount) }))
        .where('id', '=', input.account_id)
        .execute();
      
      await tx.insertInto('account_transactions').values({
        account_id: input.account_id,
        type: 'debit',
        amount: input.refund_amount,
        reference_type: 'sale',
        reference_id: sale.id,
        description: `Cash refund for return ${returnRecord.return_no}`,
        created_by: userId
      }).execute();
    }

    await writeAuditLog(userId, 'create', 'sale_returns', returnRecord.id, null, returnRecord, tx);
    return returnRecord;
  });
}

export async function getSaleReturns(saleId: number) {
  const returns = await db.selectFrom('sale_returns')
    .selectAll()
    .where('sale_id', '=', saleId)
    .orderBy('created_at', 'desc')
    .execute();

  const enrichedReturns: any[] = [];
  for (const ret of returns) {
    const items = await db.selectFrom('sale_return_items')
      .innerJoin('items', 'items.id', 'sale_return_items.item_id')
      .select([
        'sale_return_items.id',
        'sale_return_items.qty',
        'sale_return_items.unit_price',
        'sale_return_items.line_total',
        'items.name as item_name'
      ])
      .where('sale_return_items.return_id', '=', ret.id)
      .execute();
    enrichedReturns.push({ ...ret, items });
  }
  return enrichedReturns;
}
