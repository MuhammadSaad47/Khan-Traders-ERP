import { db, sqlite } from '../db/connection'
import { writeAuditLog } from './base.service'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export async function createBackup(destinationPath?: string, userId?: number) {
  try {
    const fileName = `khan-trader-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
    const backupDir = destinationPath || path.join(app.getPath('userData'), 'backups')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const fullPath = path.join(backupDir, fileName)
    
    // Perform SQLite native backup (thread-safe, handles locking)
    await sqlite.backup(fullPath)
    
    const stats = fs.statSync(fullPath)
    
    const result = await db.insertInto('backup_log')
      .values({
        file_path: fullPath,
        size_bytes: stats.size,
        destination: 'local',
        status: 'success'
      })
      .returningAll()
      .executeTakeFirstOrThrow()
      
    if (userId) {
      await writeAuditLog(userId, 'create', 'backup_log', result.id, null, result)
    }
    
    return { success: true, path: fullPath, size: stats.size, log: result }
  } catch (error: any) {
    await db.insertInto('backup_log')
      .values({
        file_path: 'failed',
        size_bytes: 0,
        destination: 'local',
        status: 'failed'
      })
      .execute()
      
    throw error
  }
}

export async function getBackupLogs() {
  return await db.selectFrom('backup_log')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(50)
    .execute()
}

export async function getBusinessSettings() {
  const settings = await db.selectFrom('business_settings').selectAll().executeTakeFirst()
  if (!settings) {
    // Return defaults if not initialized
    return {
      business_name: 'Khan Traders',
      address: '',
      phone: '',
      currency_symbol: 'Rs',
      receipt_footer: 'Thank you for your business!',
      low_stock_threshold_default: 10,
      theme: 'system'
    }
  }
  return settings
}

export async function updateBusinessSettings(data: any, userId: number) {
  const existing = await db.selectFrom('business_settings').selectAll().executeTakeFirst()
  
  if (existing) {
    const updated = await db.updateTable('business_settings')
      .set({
        ...data,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirstOrThrow()
      
    await writeAuditLog(userId, 'update', 'business_settings', updated.id, existing, updated)
    return updated
  } else {
    const created = await db.insertInto('business_settings')
      .values({
        business_name: data.business_name || 'Khan Traders',
        address: data.address || null,
        phone: data.phone || null,
        currency_symbol: data.currency_symbol || 'Rs',
        receipt_footer: data.receipt_footer || 'Thank you!',
        low_stock_threshold_default: data.low_stock_threshold_default || 10,
        theme: data.theme || 'system'
      })
      .returningAll()
      .executeTakeFirstOrThrow()
      
    await writeAuditLog(userId, 'create', 'business_settings', created.id, null, created)
    return created
  }
}
