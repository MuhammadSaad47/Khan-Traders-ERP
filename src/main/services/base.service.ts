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
  await conn.insertInto('audit_log').values({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_value: oldValue ? JSON.stringify(oldValue) : null,
    new_value: newValue ? JSON.stringify(newValue) : null,
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
