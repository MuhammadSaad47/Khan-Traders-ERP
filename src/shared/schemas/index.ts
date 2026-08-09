import { z } from 'zod'

export const SaleItemSchema = z.object({
  item_id: z.number().int().positive(),
  qty: z.number().int().positive(),
  unit_price: z.number().int().min(0),
  line_total: z.number().int().min(0),
})

export const CreateSaleSchema = z.object({
  customer_id: z.number().int().positive().nullable().optional(),
  subtotal: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
  net_total: z.number().int().min(0),
  paid_amount: z.number().int().min(0).default(0),
  payment_method: z.enum(['cash', 'easypaisa', 'bank', 'other']).optional(),
  account_id: z.number().int().positive().optional(),
  sale_type: z.enum(['counter', 'van', 'wholesale']),
  van_assignment_id: z.number().int().positive().optional(),
  ctns_returned: z.number().int().min(0).optional(),
  overheads: z.array(z.object({
    category_id: z.union([z.number(), z.string()]),
    amount: z.number().int().positive(),
    account_id: z.number().int().positive()
  })).optional(),
  due_date: z.string().optional(),
  date: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'Sale must have at least one item')
}).refine(data => {
  if (data.paid_amount > 0 && !data.account_id) return false;
  return true;
}, { message: 'Account ID is required for paid sales', path: ['account_id'] })

export const PurchaseItemSchema = z.object({
  item_id: z.number().int().positive(),
  qty: z.number().int().positive(),
  unit_cost: z.number().int().min(0),
  line_total: z.number().int().min(0),
})

export const CreatePurchaseSchema = z.object({
  supplier_id: z.number().int().positive(),
  subtotal: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
  net_total: z.number().int().min(0),
  paid_amount: z.number().int().min(0).default(0),
  payment_method: z.enum(['cash', 'bank', 'easypaisa', 'cheque', 'other']).optional(),
  account_id: z.number().int().positive().optional(),
  date: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'Purchase must have at least one item')
}).refine(data => {
  if (data.paid_amount > 0 && !data.account_id) return false;
  return true;
}, { message: 'Account ID is required for paid purchases', path: ['account_id'] })

export const UpdatePurchaseSchema = z.object({
  supplier_id: z.number().int().positive(),
  subtotal: z.number().int().min(0),
  discount: z.number().int().min(0).default(0),
  net_total: z.number().int().min(0),
  paid_amount: z.number().int().min(0).default(0),
  items: z.array(PurchaseItemSchema).min(1, 'Purchase must have at least one item')
})

export const RecordPaymentSchema = z.object({
  party_type: z.enum(['customer', 'supplier']),
  party_id: z.number().int().positive(),
  amount: z.number().int().positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bank', 'easypaisa', 'cheque', 'other']),
  account_id: z.number().int().positive(),
  reference_type: z.enum(['sale', 'purchase', 'installment', 'general', 'refund']).optional(),
  reference_id: z.number().int().positive().optional(),
  note: z.string().optional(),
  is_refund: z.boolean().optional()
})

export const CreateInstallmentPlanSchema = z.object({
  sale_id: z.number().int().positive(),
  total_amount: z.number().int().positive(),
  num_installments: z.number().int().positive(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  late_fee_percent: z.number().min(0).optional(),
  grace_period_days: z.number().int().min(0).optional()
})

export const RecordInstallmentPaymentSchema = z.object({
  schedule_id: z.number().int().positive(),
  amount: z.number().int().positive(),
  payment_method: z.enum(['cash', 'bank', 'easypaisa', 'cheque', 'other']),
  account_id: z.number().int().positive()
})

export const CreateVanAssignmentSchema = z.object({
  van_salesman_id: z.number().int().positive(),
  route_id: z.number().int().positive().optional(),
  notes: z.string().optional()
})

export const ReconcileVanAssignmentSchema = z.object({
  assignment_id: z.number().int().positive(),
  cash_collected: z.number().int().min(0),
  account_id: z.number().int().positive()
})

export const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['cash', 'bank', 'easypaisa', 'cheque', 'other']),
  balance: z.number().int().default(0),
  is_default: z.number().int().min(0).max(1).optional()
})

export const TransferFundsSchema = z.object({
  from_account_id: z.number().int().positive(),
  to_account_id: z.number().int().positive(),
  amount: z.number().int().positive(),
  reference: z.string().optional()
})

export const CreateCategorySchema = z.object({
  name: z.string().min(1)
})

export const CreateItemSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  category_id: z.number().int().positive(),
  cost_price: z.number().int().min(0),
  selling_price: z.number().int().min(0),
  wholesale_price: z.number().int().min(0).optional(),
  stock: z.number().int().default(0),
  min_stock: z.number().int().default(0),
  unit: z.string().default('pcs'),
  units_per_ctn: z.number().int().min(1).default(1),
  specs: z.string().optional(),
  supplier_id: z.number().int().positive().optional(),
  low_stock_threshold: z.number().int().min(0).default(0)
})

export const CreatePartySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  balance: z.number().int().default(0)
})

export const CreateCustomerSchema = CreatePartySchema.extend({
  route_id: z.number().int().positive().optional(),
  ctn_balance: z.number().int().default(0),
  credit_limit: z.number().int().min(0).default(0)
})

export const CreateAreaSchema = z.object({
  name: z.string().min(1)
})

export const CreateRouteSchema = z.object({
  name: z.string().min(1),
  area_id: z.number().int().positive()
})

export const CreateExpenseSchema = z.object({
  category_id: z.number().int().positive(),
  amount: z.number().int().positive(),
  account_id: z.number().int().positive(),
  note: z.string().optional()
})

export const CreateStockAdjustmentSchema = z.object({
  item_id: z.number().int().positive(),
  change_qty: z.number().int(),
  reason: z.enum(['damage', 'expiry', 'theft', 'recount', 'other']),
  note: z.string().optional()
})
