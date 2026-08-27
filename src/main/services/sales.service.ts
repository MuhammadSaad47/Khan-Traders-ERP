import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog, validateAccountExists, validateAccountBalance } from './base.service'
import { randomUUID } from 'crypto'

export interface SaleItemInput {
  item_id: number;
  qty: number;
  unit_price: number;
  line_total: number;
  grouped_ids?: number[];
}

export interface OverheadInput {
  category_id: number | string;
  amount: number;
  account_id: number;
  date?: string;
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
  // CRITICAL VALIDATION: Ensure discount doesn't exceed subtotal (data integrity for long-term use)
  if (input.discount > input.subtotal) {
    throw new Error(`Invalid discount: Rs ${input.discount} cannot exceed subtotal Rs ${input.subtotal}`)
  }

  // CRITICAL VALIDATION: Ensure net_total calculation is correct
  const expectedNetTotal = input.subtotal - input.discount
  if (input.net_total !== expectedNetTotal) {
    throw new Error(`Invalid net total: expected Rs ${expectedNetTotal} (subtotal ${input.subtotal} - discount ${input.discount}), received Rs ${input.net_total}`)
  }

  const invoiceNo = generateInvoiceNo()
  if (input.paid_amount < 0) throw new Error('Paid amount cannot be negative. Please use the unpaid option instead.')

  const status = input.paid_amount >= input.net_total ? 'paid' : (input.paid_amount > 0 ? 'partial' : 'unpaid')

  const result = await db.transaction().execute(async (tx) => {


    // 0.5 Validate stock availability for ALL items before proceeding (~50ms for multiple items)
    for (const item of input.items) {
      if (item.grouped_ids && item.grouped_ids.length > 0) {
        const stockRows = await tx.selectFrom('items')
          .select(['current_stock', 'name'])
          .where('id', 'in', item.grouped_ids)
          .where('is_deleted', '=', 0)
          .execute()

        const totalStock = stockRows.reduce((sum, row) => sum + row.current_stock, 0)
        if (totalStock < item.qty) {
          throw new Error(`Insufficient stock for "${stockRows[0]?.name || 'Item'}": available ${totalStock}, requested ${item.qty}`)
        }
      } else {
        // Van sales also check warehouse inventory (not pre-loaded items)
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

    // 2. Insert Sale Items and Stock Movements (FIFO for grouped items)
    for (const item of input.items) {
      const idsToProcess = (item.grouped_ids && item.grouped_ids.length > 0) ? item.grouped_ids : [item.item_id];

      const stockRows = await tx.selectFrom('items')
        .select(['id', 'current_stock', 'cost_price', 'units_per_ctn'])
        .where('id', 'in', idsToProcess)
        .where('is_deleted', '=', 0)
        .where('current_stock', '>', 0)
        .orderBy('created_at', 'asc') // FIFO
        .execute()

      let remainingQtyToDeduct = item.qty;

      for (const stockRow of stockRows) {
        if (remainingQtyToDeduct <= 0) break;

        const deductQty = Math.min(remainingQtyToDeduct, stockRow.current_stock);

        await tx.insertInto('sale_items').values({
          sale_id: saleResult.id,
          item_id: stockRow.id,
          qty: deductQty,
          unit_price: item.unit_price,
          line_total: deductQty * item.unit_price,
          cost_price_snapshot: stockRow.cost_price
        }).execute()

        await tx.insertInto('stock_movements').values({
          item_id: stockRow.id,
          change_qty: -deductQty,
          type: 'sale',
          reference_type: 'sale',
          reference_id: saleResult.id,
          created_by: userId
        }).execute()

        await tx.updateTable('items')
          .set({ current_stock: sql`current_stock - ${deductQty}` })
          .where('id', '=', stockRow.id)
          .execute()


        remainingQtyToDeduct -= deductQty;
      }

      // Fallback if stock was insufficient but they bypassed validation (edge case)
      if (remainingQtyToDeduct > 0) {
        const fallbackRow = await tx.selectFrom('items')
          .select(['id', 'cost_price', 'units_per_ctn'])
          .where('id', '=', item.item_id)
          .executeTakeFirstOrThrow()

        await tx.insertInto('sale_items').values({
          sale_id: saleResult.id,
          item_id: fallbackRow.id,
          qty: remainingQtyToDeduct,
          unit_price: item.unit_price,
          line_total: remainingQtyToDeduct * item.unit_price,
          cost_price_snapshot: fallbackRow.cost_price
        }).execute()

        await tx.insertInto('stock_movements').values({
          item_id: fallbackRow.id,
          change_qty: -remainingQtyToDeduct,
          type: 'sale',
          reference_type: 'sale',
          reference_id: saleResult.id,
          created_by: userId
        }).execute()

        await tx.updateTable('items')
          .set({ current_stock: sql`current_stock - ${remainingQtyToDeduct}` })
          .where('id', '=', fallbackRow.id)
          .execute()

      }
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
          date: input.date || new Date().toISOString(),
          created_by: userId
        }).returningAll().executeTakeFirstOrThrow()
      }

      // Validate account exists before creating transaction
      await validateAccountExists(input.account_id, tx)

      // Account Transaction (always recorded, even for walk-in cash sales)
      await tx.insertInto('account_transactions').values({
        account_id: input.account_id,
        type: 'credit',
        amount: input.paid_amount,
        reference_type: 'sale',
        reference_id: saleResult.id,
        date: input.date || new Date().toISOString(),
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
        // CRITICAL FIX: Validate account has sufficient balance before deducting
        await validateAccountBalance(oh.account_id, oh.amount, tx, 'Not enough cash in this account to pay for the overhead.')

        let catId: number;
        if (typeof oh.category_id === 'string') {
          // Normalize category name: trim, Title Case for consistency
          const normalizedName = oh.category_id.trim()
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());

          // Check if category already exists (case-insensitive) to prevent duplicates like "Fuel" vs "fuel"
          const existingCat = await tx.selectFrom('expense_categories')
            .select('id')
            .where(sql`LOWER(name)`, '=', normalizedName.toLowerCase())
            .where('is_deleted', '=', 0)
            .executeTakeFirst()

          if (existingCat) {
            catId = existingCat.id
          } else {
            const newCat = await tx.insertInto('expense_categories')
              .values({ name: normalizedName })
              .returningAll()
              .executeTakeFirstOrThrow()
            catId = newCat.id
          }
        } else {
          catId = oh.category_id
        }

        const expense = await tx.insertInto('expenses')
          .values({
            category_id: catId,
            amount: oh.amount,
            account_id: oh.account_id,
            date: oh.date || input.date || new Date().toISOString(),
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
            date: oh.date || input.date || new Date().toISOString(),
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
    .leftJoin('van_assignments', 'van_assignments.id', 'sales.van_assignment_id')
    .leftJoin('users', 'users.id', 'van_assignments.van_salesman_id')
    .leftJoin('customers', 'customers.id', 'sales.customer_id')
    .select([
      'sales.id',
      'sales.invoice_no',
      sql<number>`(SELECT COALESCE(SUM(qty), 0) FROM sale_items WHERE sale_items.sale_id = sales.id)`.as('total_ctns'),
      'sales.customer_id',
      'customers.name as customer_name',
      'sales.subtotal',
      'sales.discount',
      'sales.net_total',
      'sales.paid_amount',
      'sales.status',
      'sales.sale_type',
      'sales.van_assignment_id',
      'sales.date',
      db.fn.coalesce('users.full_name', 'users.username').as('van_salesman_name')
    ])
    .where('sales.is_deleted', '=', 0)

  if (_filters?.fromDate) {
    query = query.where('sales.date', '>=', _filters.fromDate)
  }
  if (_filters?.toDate) {
    query = query.where('sales.date', '<=', _filters.toDate + 'T23:59:59.999Z')
  }

  query = query.orderBy('sales.date', 'desc')
    .orderBy('sales.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)

  return await query.execute()
}

export async function getSaleDetails(saleId: number) {
  const sale = await db.selectFrom('sales')
    .leftJoin('customers', 'customers.id', 'sales.customer_id')
    .selectAll('sales')
    .select(['customers.name as customer_name'])
    .where('sales.id', '=', saleId)
    .where('sales.is_deleted', '=', 0)
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
  // CRITICAL VALIDATION: Ensure discount doesn't exceed subtotal (data integrity for long-term use)
  if (input.discount > input.subtotal) {
    throw new Error(`Invalid discount: Rs ${input.discount} cannot exceed subtotal Rs ${input.subtotal}`)
  }

  // CRITICAL VALIDATION: Ensure net_total calculation is correct
  const expectedNetTotal = input.subtotal - input.discount
  if (input.net_total !== expectedNetTotal) {
    throw new Error(`Invalid net total: expected Rs ${expectedNetTotal} (subtotal ${input.subtotal} - discount ${input.discount}), received Rs ${input.net_total}`)
  }

  if (input.items.length === 0) throw new Error('Sale must have at least one item')
  if (input.paid_amount && input.paid_amount < 0) throw new Error('Paid amount cannot be negative.')

  const result = await db.transaction().execute(async (tx) => {
    // 1. Fetch old data
    const oldSale = await tx.selectFrom('sales').selectAll().where('id', '=', saleId).executeTakeFirstOrThrow()
    const oldItems = await tx.selectFrom('sale_items').selectAll().where('sale_id', '=', saleId).execute()
    const oldCustomer = oldSale.customer_id ? Number(oldSale.customer_id) : null
    const newCustomer = input.customer_id ? Number(input.customer_id) : null

    if (newCustomer !== oldCustomer) throw new Error(`Cannot change customer on an existing sale.`)

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
      if (item.grouped_ids && item.grouped_ids.length > 0) {
        const stockRows = await tx.selectFrom('items')
          .select(['current_stock', 'name'])
          .where('id', 'in', item.grouped_ids)
          .where('is_deleted', '=', 0)
          .execute()

        const totalStock = stockRows.reduce((sum, row) => sum + row.current_stock, 0)
        if (totalStock < item.qty) {
          throw new Error(`Insufficient stock for "${stockRows[0]?.name || 'Item'}": available ${totalStock}, requested ${item.qty}`)
        }
      } else {
        const stockRow = await tx.selectFrom('items')
          .select(['current_stock', 'name'])
          .where('id', '=', item.item_id)
          .executeTakeFirst()
        if (!stockRow) throw new Error(`Item #${item.item_id} not found`)
        if (stockRow.current_stock < item.qty) {
          throw new Error(`Insufficient stock for "${stockRow.name}": available ${stockRow.current_stock}, requested ${item.qty}`)
        }
      }
    }

    // --- APPLY NEW EFFECTS ---
    // Handle new payments if user inputted a higher paid_amount
    const inputPaidAmount = input.paid_amount || 0
    if (inputPaidAmount < oldSale.paid_amount) {
      throw new Error(`Cannot reduce paid amount (from Rs ${oldSale.paid_amount / 100} to Rs ${inputPaidAmount / 100}) via Edit Sale. Please use the Payments module to issue refunds.`)
    }

    const paymentDifference = inputPaidAmount - oldSale.paid_amount
    const newPaidAmount = inputPaidAmount
    const status = newPaidAmount >= input.net_total ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'unpaid')

    const updatedSale = await tx.updateTable('sales')
      .set({
        subtotal: input.subtotal,
        discount: input.discount,
        net_total: input.net_total,
        paid_amount: newPaidAmount,
        status: status,
        sale_type: input.sale_type,
        van_assignment_id: input.van_assignment_id,
        date: input.date || oldSale.date,
        due_date: input.due_date !== undefined ? input.due_date : oldSale.due_date,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', saleId)
      .returningAll()
      .executeTakeFirstOrThrow()

    // If new payment was added, record it
    if (paymentDifference > 0) {
      if (!input.account_id) throw new Error('An account must be selected to receive the additional payment.')

      if (oldCustomer) {
        const paymentRes = await tx.insertInto('payments').values({
          party_type: 'customer',
          party_id: oldCustomer,
          direction: 'in',
          amount: paymentDifference,
          method: input.payment_method || 'cash',
          account_id: input.account_id,
          reference_type: 'sale',
          reference_id: saleId,
          date: input.date || new Date().toISOString(),
          created_by: userId
        }).returningAll().executeTakeFirstOrThrow()

        await tx.insertInto('payment_allocations').values({
          payment_id: paymentRes.id,
          reference_type: 'sale',
          reference_id: saleId,
          amount: paymentDifference
        }).execute()
      }

      await validateAccountExists(input.account_id, tx)

      await tx.insertInto('account_transactions').values({
        account_id: input.account_id,
        type: 'credit',
        amount: paymentDifference,
        reference_type: 'sale',
        reference_id: saleId,
        date: input.date || new Date().toISOString(),
        description: `Additional Payment for Edited Sale ${oldSale.invoice_no}`,
        created_by: userId
      }).execute()

      await tx.updateTable('accounts')
        .set({ current_balance: sql`current_balance + ${paymentDifference}` })
        .where('id', '=', input.account_id)
        .execute()
    }

    // Re-insert Sale Items and deduct Stock (FIFO for grouped items)
    for (const item of input.items) {
      const idsToProcess = (item.grouped_ids && item.grouped_ids.length > 0) ? item.grouped_ids : [item.item_id];

      const stockRows = await tx.selectFrom('items')
        .select(['id', 'current_stock', 'cost_price', 'units_per_ctn'])
        .where('id', 'in', idsToProcess)
        .where('is_deleted', '=', 0)
        .where('current_stock', '>', 0)
        .orderBy('created_at', 'asc') // FIFO
        .execute()

      let remainingQtyToDeduct = item.qty;

      for (const stockRow of stockRows) {
        if (remainingQtyToDeduct <= 0) break;

        const deductQty = Math.min(remainingQtyToDeduct, stockRow.current_stock);

        await tx.insertInto('sale_items').values({
          sale_id: saleId,
          item_id: stockRow.id,
          qty: deductQty,
          unit_price: item.unit_price,
          line_total: deductQty * item.unit_price,
          cost_price_snapshot: stockRow.cost_price
        }).execute()

        await tx.insertInto('stock_movements').values({
          item_id: stockRow.id,
          change_qty: -deductQty,
          type: 'sale',
          reference_type: 'sale',
          reference_id: saleId,
          created_by: userId
        }).execute()

        await tx.updateTable('items')
          .set((eb) => ({ current_stock: eb('current_stock', '-', deductQty) }))
          .where('id', '=', stockRow.id)
          .execute()

        if (oldCustomer && stockRow.units_per_ctn > 1) {
          if (deductQty > 0) {
            await tx.insertInto('ctn_transactions').values({
              customer_id: updatedSale.customer_id!,
              change_qty: deductQty,
              reference_type: 'sale',
              reference_id: saleId,
              note: `Issued ${deductQty} ctns for sale (updated)`,
              created_by: userId
            }).execute()

            await tx.updateTable('customers')
              .set((eb) => ({ ctn_balance: eb('ctn_balance', '+', deductQty) }))
              .where('id', '=', oldCustomer)
              .execute()
          }
        }

        remainingQtyToDeduct -= deductQty;
      }

      // Fallback if stock was insufficient but they bypassed validation
      if (remainingQtyToDeduct > 0) {
        const fallbackRow = await tx.selectFrom('items')
          .select(['id', 'cost_price', 'units_per_ctn'])
          .where('id', '=', item.item_id)
          .executeTakeFirstOrThrow()

        await tx.insertInto('sale_items').values({
          sale_id: saleId,
          item_id: fallbackRow.id,
          qty: remainingQtyToDeduct,
          unit_price: item.unit_price,
          line_total: remainingQtyToDeduct * item.unit_price,
          cost_price_snapshot: fallbackRow.cost_price
        }).execute()

        await tx.insertInto('stock_movements').values({
          item_id: fallbackRow.id,
          change_qty: -remainingQtyToDeduct,
          type: 'sale',
          reference_type: 'sale',
          reference_id: saleId,
          created_by: userId
        }).execute()

        await tx.updateTable('items')
          .set((eb) => ({ current_stock: eb('current_stock', '-', remainingQtyToDeduct) }))
          .where('id', '=', fallbackRow.id)
          .execute()

      }
    }



    // Re-apply Customer Financial Balance for the new unpaid amount
    const newUnpaidAmount = input.net_total - inputPaidAmount;
    if (newUnpaidAmount !== 0 && oldCustomer) {
      await tx.updateTable('customers')
        .set((eb) => ({ balance: eb('balance', '+', newUnpaidAmount) }))
        .where('id', '=', oldCustomer)
        .execute()
    }

    // Re-apply new overheads
    if (input.overheads && input.overheads.length > 0) {
      for (const oh of input.overheads) {
        await validateAccountBalance(oh.account_id, oh.amount, tx)

        let catId: number;
        if (typeof oh.category_id === 'string') {
          // Normalize category name: trim, Title Case for consistency
          const normalizedName = oh.category_id.trim()
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());

          // Check if category already exists (case-insensitive) to prevent duplicates like "Fuel" vs "fuel"
          const existingCat = await tx.selectFrom('expense_categories')
            .select('id')
            .where(sql`LOWER(name)`, '=', normalizedName.toLowerCase())
            .where('is_deleted', '=', 0)
            .executeTakeFirst()

          if (existingCat) {
            catId = existingCat.id
          } else {
            const newCat = await tx.insertInto('expense_categories')
              .values({ name: normalizedName })
              .returningAll()
              .executeTakeFirstOrThrow()
            catId = newCat.id
          }
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
        type: 'sale_void', // Clear distinction from manual adjustments
        reference_type: 'sale',
        reference_id: saleId,
        created_by: userId
      }).execute()
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

      if (sale.customer_id) {
        await tx.insertInto('payments').values({
          party_type: 'customer',
          party_id: sale.customer_id,
          direction: 'out',
          amount: input.refund_amount,
          method: 'cash',
          account_id: input.account_id,
          reference_type: 'general',
          reference_id: returnRecord.id,
          note: `Cash refund for return ${returnRecord.return_no}`,
          created_by: userId
        }).execute();
      }

      // FIXED: Update original sale's paid_amount and status when refund is given
      const newPaidAmount = Math.max(0, sale.paid_amount - input.refund_amount);
      const newStatus = newPaidAmount === 0 ? 'unpaid' :
        (newPaidAmount >= sale.net_total ? 'paid' : 'partial');

      await tx.updateTable('sales')
        .set({
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', sale.id)
        .execute();
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
