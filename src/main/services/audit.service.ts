import { db } from '../db/connection'

export async function getAuditLogs(page = 1, limit = 50, filters?: { table?: string, action?: string, userId?: number }) {
  let query = db.selectFrom('audit_log')
    .leftJoin('users', 'users.id', 'audit_log.user_id')
    .select([
      'audit_log.id',
      'audit_log.action',
      'audit_log.table_name',
      'audit_log.record_id',
      'audit_log.old_value',
      'audit_log.new_value',
      'audit_log.created_at',
      'users.username'
    ])
    .orderBy('audit_log.created_at', 'desc')

  if (filters?.table) {
    query = query.where('audit_log.table_name', '=', filters.table)
  }
  if (filters?.action) {
    query = query.where('audit_log.action', '=', filters.action)
  }
  if (filters?.userId) {
    query = query.where('audit_log.user_id', '=', filters.userId)
  }

  const offset = (page - 1) * limit
  return await query.limit(limit).offset(offset).execute()
}
