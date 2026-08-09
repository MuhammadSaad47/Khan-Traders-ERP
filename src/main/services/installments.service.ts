import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

export interface CreateInstallmentPlanInput {
  sale_id: number;
  total_amount: number;
  num_installments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  start_date: string; // YYYY-MM-DD
  late_fee_percent?: number;
  grace_period_days?: number;
}

export async function createInstallmentPlan(userId: number, input: CreateInstallmentPlanInput) {
  if (input.num_installments <= 0) throw new Error('Number of installments must be greater than zero')
  
  const result = await db.transaction().execute(async (trx) => {
    // 1. Create main plan (table is 'installment_plans', not 'installments')
    const plan = await trx.insertInto('installment_plans')
      .values({
        sale_id: input.sale_id,
        total_amount: input.total_amount,
        num_installments: input.num_installments,
        frequency: input.frequency,
        late_fee_percent: input.late_fee_percent || 0,
        grace_period_days: input.grace_period_days || 0
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    // 2. Generate schedule
    const installmentAmount = Math.ceil(input.total_amount / input.num_installments)
    let remainingAmount = input.total_amount
    
    const startDate = new Date(input.start_date)

    for (let i = 1; i <= input.num_installments; i++) {
      const amount = i === input.num_installments ? remainingAmount : installmentAmount
      remainingAmount -= amount
      
      const dueDate = new Date(startDate)
      // Calculate due date based on frequency
      if (input.frequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7)
      } else if (input.frequency === 'biweekly') {
        dueDate.setDate(dueDate.getDate() + (i - 1) * 14)
      } else {
        // monthly
        dueDate.setMonth(dueDate.getMonth() + (i - 1))
      }
      
      // Schema columns: plan_id, installment_no, due_date, amount_due, amount_paid, late_fee, late_fee_applied, payment_date, status
      await trx.insertInto('installment_schedule')
        .values({
          plan_id: plan.id,
          installment_no: i,
          due_date: dueDate.toISOString().split('T')[0],
          amount_due: amount,
          amount_paid: 0,
          status: 'pending'
        })
        .execute()
    }

    return plan
  })

  await writeAuditLog(userId, 'create', 'installment_plans', result.id, null, result)
  return result
}

export interface RecordInstallmentPaymentInput {
  schedule_id: number;
  amount: number;
  payment_method: 'cash' | 'bank' | 'easypaisa' | 'cheque' | 'other';
  account_id: number;
}

export async function recordInstallmentPayment(userId: number, input: RecordInstallmentPaymentInput) {
  const result = await db.transaction().execute(async (trx) => {
    const schedule = await trx.selectFrom('installment_schedule')
      .selectAll()
      .where('id', '=', input.schedule_id)
      .executeTakeFirst()
      
    if (!schedule) throw new Error('Schedule not found')
    
    // Schema: table is 'installment_plans', FK column is 'plan_id'
    const plan = await trx.selectFrom('installment_plans')
      .selectAll()
      .where('id', '=', schedule.plan_id)
      .executeTakeFirst()
      
    if (!plan) throw new Error('Plan not found')

    // Calculate late fee if applicable (only if not already applied by background job)
    let lateFee = schedule.late_fee || 0
    if (schedule.late_fee_applied === 0) {
      const today = new Date()
      const dueDate = new Date(schedule.due_date)
      dueDate.setDate(dueDate.getDate() + plan.grace_period_days)
      if (today > dueDate && plan.late_fee_percent > 0) {
        lateFee = Math.floor(schedule.amount_due * (plan.late_fee_percent / 100))
      }
    }

    // Amount covers late fee first, then principal
    const totalRequired = schedule.amount_due - schedule.amount_paid + lateFee
    const effectivePayment = Math.min(input.amount, totalRequired)
    
    const newPaidAmount = schedule.amount_paid + effectivePayment
    const status = newPaidAmount >= (schedule.amount_due + lateFee) ? 'paid' : 'partial'
    
    // 1. Update Schedule (correct columns: amount_paid, payment_date, late_fee, late_fee_applied)
    await trx.updateTable('installment_schedule')
      .set({ 
        amount_paid: newPaidAmount, 
        status, 
        payment_date: new Date().toISOString(),
        late_fee: lateFee,
        late_fee_applied: lateFee > 0 ? 1 : 0
      })
      .where('id', '=', schedule.id)
      .execute()

    // 2. Find Sale and Customer
    const sale = await trx.selectFrom('sales')
      .select(['id', 'customer_id'])
      .where('id', '=', plan.sale_id)
      .executeTakeFirst()

    if (sale && sale.customer_id) {
      // Update customer balance
      await trx.updateTable('customers')
        .set((eb) => ({
          balance: eb('balance', '-', effectivePayment)
        }))
        .where('id', '=', sale.customer_id)
        .execute()
        
      // Update sale paid_amount
      await trx.updateTable('sales')
        .set((eb) => ({
          paid_amount: eb('paid_amount', '+', effectivePayment)
        }))
        .where('id', '=', sale.id)
        .execute()

      // Insert into payments table
      const payment = await trx.insertInto('payments')
        .values({
          party_type: 'customer',
          party_id: sale.customer_id,
          direction: 'in',
          amount: effectivePayment,
          method: input.payment_method,
          account_id: input.account_id,
          reference_type: 'installment',
          reference_id: schedule.id,
          created_by: userId
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Record Account Transaction (correct columns: type='credit', description)
      await trx.insertInto('account_transactions')
        .values({
          account_id: input.account_id,
          type: 'credit',
          amount: effectivePayment,
          reference_type: 'payment',
          reference_id: payment.id,
          description: `Installment payment #${schedule.installment_no} for Sale #${sale.id}`,
          created_by: userId
        })
        .execute()

      await trx.updateTable('accounts')
        .set((eb) => ({
          current_balance: eb('current_balance', '+', effectivePayment)
        }))
        .where('id', '=', input.account_id)
        .execute()
    }

    return { success: true, lateFee, effectivePayment }
  })

  return result
}

export async function getInstallmentPlans(saleId?: number) {
  let query = db.selectFrom('installment_plans')
    .selectAll()
    .orderBy('created_at', 'desc')

  if (saleId) {
    query = query.where('sale_id', '=', saleId)
  }

  return await query.execute()
}

export async function getInstallmentSchedule(planId: number) {
  return await db.selectFrom('installment_schedule')
    .selectAll()
    .where('plan_id', '=', planId)
    .orderBy('installment_no', 'asc')
    .execute()
}

export async function applyLateFees() {
  await db.transaction().execute(async (trx) => {
    const overdue = await trx.selectFrom('installment_schedule as s')
      .innerJoin('installment_plans as p', 'p.id', 's.plan_id')
      .select([
        's.id', 's.amount_due', 's.due_date',
        'p.late_fee_percent', 'p.grace_period_days'
      ])
      .where('s.status', '=', 'pending')
      .where('s.late_fee_applied', '=', 0)
      .where('p.late_fee_percent', '>', 0)
      .execute()

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Midnight today

    for (const schedule of overdue) {
      const dueDate = new Date(schedule.due_date)
      dueDate.setDate(dueDate.getDate() + schedule.grace_period_days)

      if (today > dueDate) {
        const lateFee = Math.floor(schedule.amount_due * (schedule.late_fee_percent / 100))
        if (lateFee > 0) {
          await trx.updateTable('installment_schedule')
            .set({
              late_fee: lateFee,
              late_fee_applied: 1
            })
            .where('id', '=', schedule.id)
            .execute()
        }
      }
    }
  })
}
