import { db } from '../db/connection'

export async function validateActiveUser(userId: number, trx?: any) {
  const conn = trx || db
  const user = await conn.selectFrom('users')
    .select(['is_active', 'is_deleted'])
    .where('id', '=', userId)
    .executeTakeFirst()
    
  if (!user) {
    throw new Error('Unauthorized: User does not exist.')
  }
  if (user.is_deleted === 1) {
    throw new Error('Unauthorized: User account has been deleted.')
  }
  if (user.is_active === 0) {
    throw new Error('Unauthorized: User account is suspended.')
  }
}

/**
 * Sanitize sensitive data before writing to audit log
 * Redacts password hashes, phone numbers, addresses for security
 */
function sanitizeForAudit(tableName: string, data: any): any {
  if (!data) return data
  
  // Define sensitive fields per table
  const sensitiveFields: Record<string, string[]> = {
    users: ['password_hash', 'password', 'phone', 'address'],
    customers: ['phone', 'address'],
    suppliers: ['phone', 'address'],
    business_settings: ['phone', 'address']
  }
  
  const fieldsToRedact = sensitiveFields[tableName] || []
  if (fieldsToRedact.length === 0) return data
  
  // Create shallow copy and redact sensitive fields
  const sanitized = { ...data }
  fieldsToRedact.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  })
  
  return sanitized
}

export async function writeAuditLog(
  userId: number | null,
  action: string,
  tableName: string,
  recordId: number,
  oldValue: any = null,
  newValue: any = null,
  trx?: any // Optional transaction handle — use this when calling from inside a transaction
) {
  const conn = trx || db
  if (userId) {
    await validateActiveUser(userId, conn)
  }
  
  // Sanitize sensitive data before logging
  const sanitizedOld = sanitizeForAudit(tableName, oldValue)
  const sanitizedNew = sanitizeForAudit(tableName, newValue)
  
  await conn.insertInto('audit_log').values({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_value: sanitizedOld ? JSON.stringify(sanitizedOld) : null,
    new_value: sanitizedNew ? JSON.stringify(sanitizedNew) : null,
    ip_address: null,
    user_agent: 'electron-main',
    created_at: new Date().toISOString()
  }).execute()
}

export async function softDelete(table: string, id: number, userId: number) {
  await db.updateTable(table as any)
    .set({ is_deleted: 1, deleted_at: new Date().toISOString(), deleted_by: userId } as any)
    .where('id', '=', id)
    .execute()

  await writeAuditLog(userId, 'delete', table, id)
}

/**
 * Validate that an account exists and is not deleted
 * Should be called before creating account_transactions or updating account balances
 * @param accountId - The account ID to validate
 * @param trx - Optional transaction context
 * @throws Error if account not found or deleted
 */
export async function validateAccountExists(accountId: number, trx?: any): Promise<void> {
  const conn = trx || db
  const account = await conn.selectFrom('accounts')
    .select('id')
    .where('id', '=', accountId)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  
  if (!account) {
    throw new Error(`Account #${accountId} not found or has been deleted`)
  }
}

/**
 * Validate that an account has enough balance to cover a debit amount.
 * @param accountId - The account ID to validate
 * @param amountRequired - The amount of money required
 * @param trx - Optional transaction context
 * @param errorMessage - Custom error message to show if balance is insufficient
 * @throws Error if insufficient funds
 */
export async function validateAccountBalance(
  accountId: number, 
  amountRequired: number, 
  trx?: any,
  errorMessage: string = 'Not enough money in the selected account.'
): Promise<void> {
  const conn = trx || db
  const account = await conn.selectFrom('accounts')
    .select(['name', 'current_balance'])
    .where('id', '=', accountId)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
  
  if (!account) {
    throw new Error(`Account #${accountId} not found or has been deleted`)
  }

  if (account.current_balance < amountRequired) {
    throw new Error(`${errorMessage} You need Rs ${(amountRequired / 100).toLocaleString()}, but the available balance in "${account.name}" is Rs ${(account.current_balance / 100).toLocaleString()}.`)
  }
}
