import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog, validateAccountExists } from './base.service'

export interface PaymentAllocation {
  id: number;
  amount: number;
}

export interface RecordPaymentInput {
  party_type: 'customer' | 'supplier';
  party_id: number;
  amount: number;
  payment_method: 'cash' | 'bank' | 'easypaisa' | 'cheque' | 'other';
  account_id: number;
  reference_type?: 'sale' | 'purchase' | 'general' | 'refund';
  reference_id?: number;
  note?: string;
  date?: string;
  is_refund?: boolean;
  allocations?: PaymentAllocation[];
}

/**
 * Get all unpaid or partially paid documents (sales/purchases) for a given party.
 * Used by the frontend to display the invoice selection list.
 */
export async function getUnpaidDocuments(partyType: 'customer' | 'supplier', partyId: number) {
  const isCustomer = partyType === 'customer'
  const docTable = isCustomer ? 'sales' : 'purchases'
  const partyIdColumn = isCustomer ? 'customer_id' : 'supplier_id'

  const docs = await (db.selectFrom(docTable as any)
    .select(['id', 'invoice_no', 'date', 'net_total', 'paid_amount', 'status'])
    .where(partyIdColumn, '=', partyId)
    .where('status', 'in', ['unpaid', 'partial'])
    .where('is_deleted', '=', 0)
    .orderBy('date', 'asc')
    .orderBy('id', 'asc')
    .execute() as Promise<any[]>)

  return docs.map((doc: any) => ({
    ...doc,
    due_amount: doc.net_total - doc.paid_amount
  }))
}

export async function recordPayment(userId: number, input: RecordPaymentInput) {
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero')

  // Validate allocations match amount (if provided)
  if (input.allocations && input.allocations.length > 0) {
    const totalAllocated = input.allocations.reduce((s, a) => s + a.amount, 0)
    if (totalAllocated !== input.amount) {
      throw new Error(`Allocated amount (${totalAllocated}) must equal payment amount (${input.amount})`)
    }
  }

  const result = await db.transaction().execute(async (trx) => {
    const isCustomer = input.party_type === 'customer'
    const partyTable = isCustomer ? 'customers' : 'suppliers'
    const docTable = isCustomer ? 'sales' : 'purchases'
    const partyIdColumn = isCustomer ? 'customer_id' : 'supplier_id'

    // Fetch party — don't check balance for refunds
    const party = await trx.selectFrom(partyTable as any).select('balance').where('id', '=', input.party_id).executeTakeFirst()
    if (!party) throw new Error(`${input.party_type} not found`)
    
    if (!input.is_refund && input.amount > (party as any).balance) {
      throw new Error(`Payment amount exceeds outstanding balance (${(party as any).balance})`)
    }

    const direction = isCustomer
      ? (input.is_refund ? 'out' : 'in')
      : (input.is_refund ? 'in' : 'out')

    // 1. Insert into payments table
    const payment = await trx.insertInto('payments')
      .values({
        party_type: input.party_type,
        party_id: input.party_id,
        direction: direction,
        amount: input.amount,
        method: input.payment_method,
        account_id: input.account_id,
        reference_type: input.reference_type || (input.allocations?.length ? (isCustomer ? 'sale' : 'purchase') : 'general'),
        reference_id: input.reference_id || null,
        note: input.note || null,
        date: input.date || new Date().toISOString(),
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // 2. Update Party Balance (debit/credit)
    const partyOperator = input.is_refund ? '+' : '-'
    await trx.updateTable(partyTable as any)
      .set((eb: any) => ({ balance: eb('balance', partyOperator, input.amount) }))
      .where('id', '=', input.party_id)
      .execute()

    // 3. Invoice Settlement Logic (skip for refunds)
    if (!input.is_refund) {
      if (input.allocations && input.allocations.length > 0) {
        // EXPLICIT allocation: apply exact amounts to specific invoices
        for (const alloc of input.allocations) {
          const doc = await trx.selectFrom(docTable as any)
            .select(['id', 'net_total', 'paid_amount'])
            .where('id', '=', alloc.id)
            .where(partyIdColumn, '=', input.party_id)
            .executeTakeFirst()

          if (!doc) continue

          const newPaidAmount = (doc as any).paid_amount + alloc.amount
          const newStatus = newPaidAmount >= (doc as any).net_total ? 'paid' : 'partial'

          await trx.updateTable(docTable as any)
            .set({ paid_amount: newPaidAmount, status: newStatus })
            .where('id', '=', alloc.id)
            .execute()
          
          // FIXED: Track allocation for accurate void logic
          await trx.insertInto('payment_allocations')
            .values({
              payment_id: payment.id,
              reference_type: isCustomer ? 'sale' : 'purchase',
              reference_id: alloc.id,
              amount: alloc.amount
            })
            .execute()
        }
      } else if (input.reference_id && input.reference_type && input.reference_type !== 'general') {
        // Direct single invoice settlement
        const doc = await trx.selectFrom(docTable as any)
          .select(['id', 'net_total', 'paid_amount'])
          .where('id', '=', input.reference_id)
          .executeTakeFirst()

        if (doc) {
          const newPaidAmount = (doc as any).paid_amount + input.amount
          const newStatus = newPaidAmount >= (doc as any).net_total ? 'paid' : 'partial'
          await trx.updateTable(docTable as any)
            .set({ paid_amount: newPaidAmount, status: newStatus })
            .where('id', '=', input.reference_id)
            .execute()
          
          // FIXED: Track single allocation
          await trx.insertInto('payment_allocations')
            .values({
              payment_id: payment.id,
              reference_type: input.reference_type as 'sale' | 'purchase',
              reference_id: input.reference_id,
              amount: input.amount
            })
            .execute()
        }
      }
      // If no allocations and no reference_id, it's an unallocated advance — balance updated only
    }

    // Validate account exists before creating transaction
    await validateAccountExists(input.account_id, trx)

    // 4. Record in Account Ledger
    const accTxType = direction === 'in' ? 'credit' : 'debit'
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.account_id,
        type: accTxType,
        amount: input.amount,
        reference_type: 'payment',
        reference_id: payment.id,
        date: input.date || new Date().toISOString(),
        description: `${direction === 'in' ? 'Received from' : 'Paid to'} ${input.party_type} #${input.party_id}${input.is_refund ? ' (Refund)' : ''}`,
        created_by: userId
      })
      .execute()

    // 5. Update Account Balance
    const accOperator = direction === 'in' ? '+' : '-'
    await trx.updateTable('accounts')
      .set((eb: any) => ({ current_balance: eb('current_balance', accOperator, input.amount) }))
      .where('id', '=', input.account_id)
      .execute()

    return payment
  })

  await writeAuditLog(userId, 'create', 'payments', result.id, null, result)
  return result
}

export async function getPayments(page = 1, limit = 50, filters?: { party_type?: string, party_id?: number }) {
  let query = db.selectFrom('payments')
    .leftJoin('customers', (join) => join
      .on('payments.party_type', '=', 'customer')
      .onRef('payments.party_id', '=', 'customers.id')
    )
    .leftJoin('suppliers', (join) => join
      .on('payments.party_type', '=', 'supplier')
      .onRef('payments.party_id', '=', 'suppliers.id')
    )
    .leftJoin('accounts', 'accounts.id', 'payments.account_id')
    .select([
      'payments.id', 'payments.party_type', 'payments.party_id', 'payments.direction',
      'payments.amount', 'payments.method', 'payments.account_id', 'payments.reference_type',
      'payments.reference_id', 'payments.date', 'payments.note', 'payments.created_by',
      'payments.created_at'
    ])
    .select(sql<string>`COALESCE(customers.name, suppliers.name)`.as('party_name'))
    .select('accounts.name as account_name')
    .where('payments.is_deleted', '=', 0)
    .orderBy('payments.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)

  if (filters?.party_type) {
    query = query.where('payments.party_type', '=', filters.party_type)
  }
  if (filters?.party_id) {
    query = query.where('payments.party_id', '=', filters.party_id)
  }

  return await query.execute()
}

export async function voidPayment(paymentId: number, userId: number) {
  const result = await db.transaction().execute(async (trx) => {
    const payment = await trx.selectFrom('payments').selectAll()
      .where('id', '=', paymentId)
      .where('is_deleted', '=', 0)
      .executeTakeFirst()
    if (!payment) throw new Error('Payment not found or already voided')

    const isCustomer = payment.party_type === 'customer'
    const partyTable = isCustomer ? 'customers' : 'suppliers'
    const docTable = isCustomer ? 'sales' : 'purchases'
    const partyIdColumn = isCustomer ? 'customer_id' : 'supplier_id'

    // Determine if this payment was a refund
    const isRefund = isCustomer ? payment.direction === 'out' : payment.direction === 'in'
    const partyOperator = isRefund ? '-' : '+'

    // Revert Party Balance
    await trx.updateTable(partyTable as any)
      .set((eb: any) => ({ balance: eb('balance', partyOperator, payment.amount) }))
      .where('id', '=', payment.party_id)
      .execute()

    // Revert Account Transaction
    if (payment.account_id) {
      const reversalType = payment.direction === 'in' ? 'debit' : 'credit'
      const operator = payment.direction === 'in' ? '-' : '+'

      await trx.insertInto('account_transactions')
        .values({
          account_id: payment.account_id,
          type: reversalType,
          amount: payment.amount,
          reference_type: 'payment',
          reference_id: payment.id,
          description: `Payment Void Reversal: ${payment.party_type} #${payment.party_id}`,
          created_by: userId
        })
        .execute()

      await trx.updateTable('accounts')
        .set((eb: any) => ({ current_balance: eb('current_balance', operator, payment.amount) }))
        .where('id', '=', payment.account_id)
        .execute()
    }

    // FIXED: Revert Document paid_amount using TRACKED allocations
    // First, try to use tracked allocations (for payments after migration 0016)
    const trackedAllocations = await trx.selectFrom('payment_allocations')
      .selectAll()
      .where('payment_id', '=', paymentId)
      .execute()
    
    if (trackedAllocations.length > 0) {
      // Use tracked allocations (accurate)
      for (const alloc of trackedAllocations) {
        const doc = await trx.selectFrom(docTable as any)
          .select(['id', 'net_total', 'paid_amount'])
          .where('id', '=', alloc.reference_id)
          .executeTakeFirst()
        
        if (doc) {
          const newPaidAmount = (doc as any).paid_amount - alloc.amount
          const newStatus = newPaidAmount === 0 ? 'unpaid' : (newPaidAmount < (doc as any).net_total ? 'partial' : 'paid')
          
          await trx.updateTable(docTable as any)
            .set({ paid_amount: Math.max(0, newPaidAmount), status: newStatus })
            .where('id', '=', alloc.reference_id)
            .execute()
        }
      }
    } else if (payment.reference_type !== 'general') {
      // Fallback: Use old FIFO logic for legacy payments (before migration 0016)
      // This maintains backward compatibility with existing payments
      let remainingToUnapply = payment.amount

      const paidDocs = await (trx.selectFrom(docTable as any)
        .select(['id', 'net_total', 'paid_amount'])
        .where(partyIdColumn, '=', payment.party_id)
        .where('paid_amount', '>', 0)
        .where('is_deleted', '=', 0)
        .orderBy('date', 'desc')
        .orderBy('id', 'desc')
        .execute() as Promise<any[]>)

      for (const doc of paidDocs) {
        if (remainingToUnapply <= 0) break
        const amountToUnapply = Math.min(doc.paid_amount, remainingToUnapply)
        if (amountToUnapply > 0) {
          const newPaidAmount = doc.paid_amount - amountToUnapply
          const newStatus = newPaidAmount === 0 ? 'unpaid' : 'partial'
          await trx.updateTable(docTable as any)
            .set({ paid_amount: newPaidAmount, status: newStatus })
            .where('id', '=', doc.id)
            .execute()
          remainingToUnapply -= amountToUnapply
        }
      }
    }

    const updatedPayment = await trx.updateTable('payments')
      .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId })
      .where('id', '=', paymentId)
      .returningAll()
      .executeTakeFirstOrThrow()

    await writeAuditLog(userId, 'delete', 'payments', paymentId, payment, updatedPayment, trx)
    return updatedPayment
  })

  return result
}
