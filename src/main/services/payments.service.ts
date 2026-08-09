import { sql } from 'kysely'
import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

export interface RecordPaymentInput {
  party_type: 'customer' | 'supplier';
  party_id: number;
  amount: number;
  payment_method: 'cash' | 'bank' | 'easypaisa' | 'cheque' | 'other';
  account_id: number;
  reference_type?: 'sale' | 'purchase' | 'installment' | 'general' | 'refund';
  reference_id?: number;
  note?: string;
  is_refund?: boolean;
}

export async function recordPayment(userId: number, input: RecordPaymentInput) {
  if (input.amount <= 0) throw new Error('Payment amount must be greater than zero')
  
  const result = await db.transaction().execute(async (trx) => {
    // 1. Determine direction and tables
    const isCustomer = input.party_type === 'customer'
    const partyTable = isCustomer ? 'customers' : 'suppliers'
    
    // Check party balance to prevent overpayment
    const party = await trx.selectFrom(partyTable as any).select('balance').where('id', '=', input.party_id).executeTakeFirst()
    if (!party) throw new Error(`${input.party_type} not found`)
    if (input.amount > party.balance) {
      throw new Error(`Payment amount (${input.amount}) exceeds outstanding balance (${party.balance})`)
    }

    const docTable = isCustomer ? 'sales' : 'purchases'
    const partyIdColumn = isCustomer ? 'customer_id' : 'supplier_id'
    const direction = isCustomer 
      ? (input.is_refund ? 'out' : 'in') 
      : (input.is_refund ? 'in' : 'out')
    
    // 2. Insert into payments table
    const payment = await trx.insertInto('payments')
      .values({
        party_type: input.party_type,
        party_id: input.party_id,
        direction: direction,
        amount: input.amount,
        method: input.payment_method,
        account_id: input.account_id,
        reference_type: input.reference_type || 'general',
        reference_id: input.reference_id || null,
        note: input.note || null,
        created_by: userId
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // 3. Update Party Balance
    // Normal: Payment decreases balance. Refund: Increases balance.
    const partyOperator = input.is_refund ? '+' : '-'
    await trx.updateTable(partyTable as any)
      .set((eb) => ({
        balance: eb('balance', partyOperator, input.amount)
      }))
      .where('id', '=', input.party_id)
      .execute()

    // 4. FIFO Settlement Logic (Skip for refunds)
    let remainingAmountToSettle = input.amount
    
    if (!input.is_refund) {
    if (input.reference_type === 'general' || !input.reference_id) {
      // Find all unpaid or partially paid invoices for this party, oldest first
      let pendingDocsQuery = trx.selectFrom(docTable as any)
        .select(['id', 'net_total', 'paid_amount'])
        .where(partyIdColumn, '=', input.party_id)
        .where('status', 'in', ['unpaid', 'partial'])
        .where('is_deleted', '=', 0)

      // Prevent regular payments from settling installment plans
      if (isCustomer) {
        pendingDocsQuery = pendingDocsQuery.where((eb) => eb.not(eb.exists(
          trx.selectFrom('installment_plans')
            .select('id')
            .whereRef('installment_plans.sale_id', '=', 'sales.id' as any)
        )))
      }

      const pendingDocs = await pendingDocsQuery.orderBy('date', 'asc').orderBy('id', 'asc').execute()

      for (const doc of pendingDocs) {
        if (remainingAmountToSettle <= 0) break
        
        const due = doc.net_total - doc.paid_amount
        const amountToApply = Math.min(due, remainingAmountToSettle)
        
        if (amountToApply > 0) {
          const newPaidAmount = doc.paid_amount + amountToApply
          const newStatus = newPaidAmount >= doc.net_total ? 'paid' : 'partial'
          
          await trx.updateTable(docTable as any)
            .set({ paid_amount: newPaidAmount, status: newStatus })
            .where('id', '=', doc.id)
            .execute()
            
          remainingAmountToSettle -= amountToApply
        }
      }
    } else if (input.reference_type !== 'installment') {
      // Direct invoice settlement (skip for installments — handled by installments service)
      const doc = await trx.selectFrom(docTable as any)
        .select(['id', 'net_total', 'paid_amount'])
        .where('id', '=', input.reference_id)
        .executeTakeFirst()
        
      if (doc) {
        const newPaidAmount = doc.paid_amount + input.amount
        const newStatus = newPaidAmount >= doc.net_total ? 'paid' : 'partial'
        
        await trx.updateTable(docTable as any)
          .set({ paid_amount: newPaidAmount, status: newStatus })
          .where('id', '=', doc.id)
          .execute()
      }
    }
    } // Close if (!input.is_refund)

    // 5. Record in Account Ledger
    const accTxType = direction === 'in' ? 'credit' : 'debit'
    await trx.insertInto('account_transactions')
      .values({
        account_id: input.account_id,
        type: accTxType,
        amount: input.amount,
        reference_type: 'payment',
        reference_id: payment.id,
        description: `${direction === 'in' ? 'Received from' : 'Paid to'} ${input.party_type} #${input.party_id}${input.is_refund ? ' (Refund)' : ''}`,
        created_by: userId
      })
      .execute()

    // 6. Update Account Balance
    const accOperator = direction === 'in' ? '+' : '-'
    
    await trx.updateTable('accounts')
      .set((eb) => ({
        current_balance: eb('current_balance', accOperator, input.amount)
      }))
      .where('id', '=', input.account_id)
      .execute()

    return { payment, settledAmount: input.amount - remainingAmountToSettle, excess: remainingAmountToSettle }
  })

  await writeAuditLog(userId, 'create', 'payments', result.payment.id, null, result.payment)
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
    .select([
      'payments.id', 'payments.party_type', 'payments.party_id', 'payments.direction',
      'payments.amount', 'payments.method', 'payments.account_id', 'payments.reference_type',
      'payments.reference_id', 'payments.date', 'payments.note', 'payments.created_by',
      'payments.created_at'
    ])
    .select(sql<string>`COALESCE(customers.name, suppliers.name)`.as('party_name'))
    .orderBy('payments.date', 'desc')
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
    // 1. Fetch payment
    const payment = await trx.selectFrom('payments').selectAll().where('id', '=', paymentId).where('is_deleted', '=', 0).executeTakeFirst()
    if (!payment) throw new Error('Payment not found or already voided')

    const isCustomer = payment.party_type === 'customer'
    const partyTable = isCustomer ? 'customers' : 'suppliers'
    const docTable = isCustomer ? 'sales' : 'purchases'
    const partyIdColumn = isCustomer ? 'customer_id' : 'supplier_id'

    // 2. Revert Party Balance
    await trx.updateTable(partyTable as any)
      .set((eb) => ({
        balance: eb('balance', '+', payment.amount)
      }))
      .where('id', '=', payment.party_id)
      .execute()

    // 3. Revert Account Transaction
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
        .set((eb) => ({
          current_balance: eb('current_balance', operator, payment.amount)
        }))
        .where('id', '=', payment.account_id)
        .execute()
    }

    // 4. Revert Document paid_amount (Reverse FIFO or Direct)
    if (payment.reference_type === 'general' || !payment.reference_id) {
      let remainingAmountToUnapply = payment.amount
      
      let paidDocsQuery = trx.selectFrom(docTable as any)
        .select(['id', 'net_total', 'paid_amount'])
        .where(partyIdColumn, '=', payment.party_id)
        .where('status', 'in', ['paid', 'partial'])
        .where('is_deleted', '=', 0)

      if (isCustomer) {
        paidDocsQuery = paidDocsQuery.where((eb) => eb.not(eb.exists(
          trx.selectFrom('installment_plans')
            .select('id')
            .whereRef('installment_plans.sale_id', '=', 'sales.id' as any)
        )))
      }

      const paidDocs = await paidDocsQuery.orderBy('date', 'desc').orderBy('id', 'desc').execute()

      for (const doc of paidDocs) {
        if (remainingAmountToUnapply <= 0) break
        
        const amountToUnapply = Math.min(doc.paid_amount, remainingAmountToUnapply)
        
        if (amountToUnapply > 0) {
          const newPaidAmount = doc.paid_amount - amountToUnapply
          const newStatus = newPaidAmount === 0 ? 'unpaid' : 'partial'
          
          await trx.updateTable(docTable as any)
            .set({ paid_amount: newPaidAmount, status: newStatus })
            .where('id', '=', doc.id)
            .execute()
            
          remainingAmountToUnapply -= amountToUnapply
        }
      }
    } else if (payment.reference_type !== 'installment') {
      const doc = await trx.selectFrom(docTable as any)
        .select(['id', 'net_total', 'paid_amount'])
        .where('id', '=', payment.reference_id)
        .executeTakeFirst()
        
      if (doc) {
        const newPaidAmount = Math.max(0, doc.paid_amount - payment.amount)
        const newStatus = newPaidAmount === 0 ? 'unpaid' : 'partial'
        
        await trx.updateTable(docTable as any)
          .set({ paid_amount: newPaidAmount, status: newStatus })
          .where('id', '=', doc.id)
          .execute()
      }
    }

    // 5. Mark payment as voided
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
