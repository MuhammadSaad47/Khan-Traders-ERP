import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import * as settingsService from '../services/settings.service'
import * as printerService from '../services/printer.service'
import { requireRole } from './middleware'
import { getActiveUserId } from '../services/auth.service'
import { db } from '../db/connection'

export function registerSettingsIpc() {
  ipcMain.handle('settings:createBackup', async (event, userId: number) => {
    await requireRole(['admin'])
    // Optionally let user select directory
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (canceled || filePaths.length === 0) {
      return { canceled: true }
    }
    
    return await settingsService.createBackup(filePaths[0], userId)
  })

  ipcMain.handle('settings:getBackupLogs', async () => {
    await requireRole(['admin'])
    return await settingsService.getBackupLogs()
  })

  ipcMain.handle('settings:getBusinessSettings', async () => {
    return await settingsService.getBusinessSettings()
  })

  ipcMain.handle('settings:updateBusinessSettings', async (_, data) => {
    const userId = getActiveUserId()!
    return await settingsService.updateBusinessSettings(data, userId)
  })

  // ── Printer Settings ──────────────────────────────────────────────────────
  ipcMain.handle('settings:getPrinterConfig', async () => {
    return await printerService.getPrinterConfig()
  })

  ipcMain.handle('settings:savePrinterConfig', async (_, data: { interface: string; type: string; width: number }) => {
    const existing = await db.selectFrom('business_settings').select('id').executeTakeFirst()
    if (existing) {
      await db.updateTable('business_settings')
        .set({
          printer_interface: data.interface || null,
          printer_type: data.type || 'EPSON',
          printer_width: data.width || 80,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', existing.id)
        .execute()
    }
    return { success: true }
  })

  ipcMain.handle('settings:testPrint', async () => {
    return await printerService.testPrint()
  })

  ipcMain.handle('settings:getSystemPrinters', async (event) => {
    return await event.sender.getPrintersAsync()
  })
  // ─────────────────────────────────────────────────────────────────────────

  ipcMain.handle('settings:exportLogs', async (event) => {
    await requireRole(['admin', 'manager'])
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { success: false, error: 'No window found' }
    
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Select Destination Folder for Diagnostic Logs',
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true }
    }
    
    try {
      const destDir = filePaths[0]
      const userDataDir = app.getPath('userData')
      const dateStr = new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/[/:]/g, '-').replace(/, /g, '_')
      
      const exportDir = path.join(destDir, `khan_trader_diagnostics_${dateStr}`)
      fs.mkdirSync(exportDir, { recursive: true })
      
      // ===== 1. COPY DATABASE =====
      const dbPath = path.join(userDataDir, 'khan-trader.sqlite')
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, path.join(exportDir, 'khan-trader.sqlite'))
      }
      
      // ===== 2. COPY CRASH LOGS =====
      const crashLogPath = path.join(userDataDir, 'crash.log')
      if (fs.existsSync(crashLogPath)) {
        fs.copyFileSync(crashLogPath, path.join(exportDir, 'crash.log'))
      }
      
      // ===== 3. COLLECT SYSTEM INFORMATION =====
      const systemInfo = {
        timestamp: new Date().toISOString(),
        app: {
          name: app.getName(),
          version: app.getVersion(),
          electronVersion: process.versions.electron,
          nodeVersion: process.version,
          chromiumVersion: process.versions.chrome,
          platform: process.platform,
          arch: process.arch,
          userDataPath: userDataDir
        },
        system: {
          os: os.type(),
          osVersion: os.release(),
          osPlatform: os.platform(),
          osArch: os.arch(),
          hostname: os.hostname(),
          totalMemory: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
          freeMemory: `${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`,
          cpuCores: os.cpus().length,
          cpuModel: os.cpus()[0]?.model || 'Unknown',
          uptime: `${(os.uptime() / 3600).toFixed(2)} hours`
        },
        user: {
          username: os.userInfo().username,
          homedir: os.userInfo().homedir
        }
      }
      
      // ===== 4. COLLECT DATABASE STATISTICS =====
      const dbStats: any = {
        collected_at: new Date().toISOString(),
        tables: {}
      }
      
      try {
        // Get business settings
        const settings = await db.selectFrom('business_settings').selectAll().executeTakeFirst()
        if (settings) {
          dbStats.business = {
            name: settings.business_name,
            currency: settings.currency_symbol,
            lowStockThreshold: settings.low_stock_threshold_default
          }
        }
        
        // Count records in each table
        const products = await db.selectFrom('items').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const sales = await db.selectFrom('sales').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const purchases = await db.selectFrom('purchases').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const customers = await db.selectFrom('customers').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const users = await db.selectFrom('users').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const auditLogs = await db.selectFrom('audit_log').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        const expenses = await db.selectFrom('expenses').select(db.fn.count<number>('id').as('count')).executeTakeFirst()
        
        dbStats.tables = {
          products: products?.count || 0,
          sales: sales?.count || 0,
          purchases: purchases?.count || 0,
          customers: customers?.count || 0,
          users: users?.count || 0,
          audit_logs: auditLogs?.count || 0,
          expenses: expenses?.count || 0
        }
        
        // Get last activity timestamps
        const lastSale = await db.selectFrom('sales').select('created_at').orderBy('created_at', 'desc').limit(1).executeTakeFirst()
        const lastPurchase = await db.selectFrom('purchases').select('created_at').orderBy('created_at', 'desc').limit(1).executeTakeFirst()
        const lastAudit = await db.selectFrom('audit_log').select('created_at').orderBy('created_at', 'desc').limit(1).executeTakeFirst()
        
        dbStats.lastActivity = {
          lastSale: lastSale?.created_at || 'Never',
          lastPurchase: lastPurchase?.created_at || 'Never',
          lastAudit: lastAudit?.created_at || 'Never'
        }
        
        // Get low stock products
        const lowStockProducts = await db.selectFrom('items')
          .select(['name', 'current_stock', 'low_stock_threshold'])
          .where('current_stock', '<=', (eb) => eb.ref('low_stock_threshold'))
          .execute()
        
        dbStats.alerts = {
          lowStockCount: lowStockProducts.length,
          lowStockProducts: lowStockProducts.slice(0, 10) // First 10
        }
        
      } catch (dbError: any) {
        dbStats.error = `Failed to collect database stats: ${dbError.message}`
      }
      
      // ===== 5. EXPORT RECENT AUDIT LOGS =====
      try {
        const recentAudits = await db.selectFrom('audit_log')
          .leftJoin('users', 'audit_log.user_id', 'users.id')
          .select([
            'audit_log.id',
            'audit_log.action',
            'audit_log.table_name',
            'audit_log.record_id',
            'audit_log.old_value',
            'audit_log.new_value',
            'audit_log.created_at',
            'users.username',
            'users.full_name'
          ])
          .orderBy('audit_log.created_at', 'desc')
          .limit(500) // Last 500 audit entries
          .execute()
        
        if (recentAudits.length > 0) {
          const auditLogContent = recentAudits.map(log => 
            `[${log.created_at}] ${log.username || 'system'} (${log.full_name || 'N/A'}) - ${log.action} on ${log.table_name}${log.record_id ? ` #${log.record_id}` : ''}`
          ).join('\n')
          
          fs.writeFileSync(path.join(exportDir, 'audit_logs_recent.txt'), auditLogContent, 'utf-8')
          
          // Also save as JSON for detailed analysis
          fs.writeFileSync(
            path.join(exportDir, 'audit_logs_recent.json'), 
            JSON.stringify(recentAudits, null, 2), 
            'utf-8'
          )
        }
      } catch (auditError: any) {
        console.error('Failed to export audit logs:', auditError)
      }
      
      // ===== 6. CREATE DIAGNOSTIC SUMMARY (JSON) =====
      const diagnosticData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: getActiveUserId(),
          version: '1.0.0'
        },
        system: systemInfo,
        database: dbStats
      }
      
      fs.writeFileSync(
        path.join(exportDir, 'diagnostic_summary.json'),
        JSON.stringify(diagnosticData, null, 2),
        'utf-8'
      )
      
      // ===== 7. CREATE HUMAN-READABLE SUMMARY (TXT) =====
      const summaryContent = `
╔═══════════════════════════════════════════════════════════════╗
║           KHAN TRADERS - DIAGNOSTIC REPORT                    ║
╚═══════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 APPLICATION INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  App Name:          ${systemInfo.app.name}
  App Version:       ${systemInfo.app.version}
  Electron:          ${systemInfo.app.electronVersion}
  Node.js:           ${systemInfo.app.nodeVersion}
  Platform:          ${systemInfo.app.platform} (${systemInfo.app.arch})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SYSTEM INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Operating System:  ${systemInfo.system.os} ${systemInfo.system.osVersion}
  Architecture:      ${systemInfo.system.osArch}
  Hostname:          ${systemInfo.system.hostname}
  CPU:               ${systemInfo.system.cpuModel} (${systemInfo.system.cpuCores} cores)
  Total Memory:      ${systemInfo.system.totalMemory}
  Free Memory:       ${systemInfo.system.freeMemory}
  System Uptime:     ${systemInfo.system.uptime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BUSINESS INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Business Name:     ${dbStats.business?.name || 'Not configured'}
  Currency:          ${dbStats.business?.currency || 'Rs'}
  Low Stock Alert:   ${dbStats.business?.lowStockThreshold || 10} units

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DATABASE STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Products:          ${dbStats.tables?.products || 0} records
  Sales:             ${dbStats.tables?.sales || 0} transactions
  Purchases:         ${dbStats.tables?.purchases || 0} transactions
  Customers:         ${dbStats.tables?.customers || 0} records
  Users:             ${dbStats.tables?.users || 0} accounts
  Audit Logs:        ${dbStats.tables?.audit_logs || 0} entries
  Expenses:          ${dbStats.tables?.expenses || 0} records

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RECENT ACTIVITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Last Sale:         ${dbStats.lastActivity?.lastSale || 'Never'}
  Last Purchase:     ${dbStats.lastActivity?.lastPurchase || 'Never'}
  Last Audit Log:    ${dbStats.lastActivity?.lastAudit || 'Never'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ALERTS & WARNINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Low Stock Items:   ${dbStats.alerts?.lowStockCount || 0} products
${dbStats.alerts?.lowStockProducts?.length > 0 ? '\n  Top Low Stock Products:\n' + dbStats.alerts.lowStockProducts.map((p: any) => `    - ${p.name}: ${p.current_stock} units (threshold: ${p.low_stock_threshold})`).join('\n') : '  No low stock items'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EXPORTED FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ khan-trader.sqlite          Complete database backup
  ✓ diagnostic_summary.json     Machine-readable diagnostic data
  ✓ diagnostic_summary.txt      This human-readable report
  ✓ audit_logs_recent.txt       Last 500 audit log entries (text)
  ✓ audit_logs_recent.json      Last 500 audit log entries (JSON)
  ${fs.existsSync(crashLogPath) ? '✓ crash.log                  Application crash logs' : '  (No crash logs found)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TROUBLESHOOTING GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO SEND TO TECHNICAL SUPPORT:

  1. Compress/Zip this entire folder
  2. Send via one of these methods:
     
     📧 Email:      saad@khantraders.com
     💬 WhatsApp:   +92-XXX-XXXXXXX
     ☁️  Drive:      Upload to Google Drive and share link
     💾 USB:        Copy to USB drive for in-person support

WHAT DEVELOPERS CAN DO WITH THIS DATA:

  • Reproduce your exact issue with your data
  • Analyze sales/purchase patterns for bugs
  • Check database integrity and relationships
  • Review recent user actions via audit logs
  • Verify system compatibility issues
  • Identify performance bottlenecks

PRIVACY & SECURITY:

  ✓ Passwords are encrypted (bcrypt hashed)
  ✓ Security question answers are encrypted
  ✓ No plain-text sensitive data exposed
  ✗ Business data (products, sales, prices) IS included
  
  → Only send to trusted technical support personnel
  → This data is for troubleshooting purposes only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for using Khan Traders Management System!
For support, contact: saad@khantraders.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      
      fs.writeFileSync(path.join(exportDir, 'diagnostic_summary.txt'), summaryContent, 'utf-8')
      
      // ===== 8. CREATE README =====
      const readmeContent = `╔═══════════════════════════════════════════════════════════════╗
║    KHAN TRADERS - DIAGNOSTIC EXPORT PACKAGE                   ║
╚═══════════════════════════════════════════════════════════════╝

Generated: ${new Date().toLocaleString()}

📦 PACKAGE CONTENTS:
   
   📄 diagnostic_summary.txt     ← READ THIS FIRST! 
      Complete diagnostic report in human-readable format
      
   📄 diagnostic_summary.json    
      Machine-readable diagnostic data (for developers)
      
   📊 khan-trader.sqlite         
      Your complete database backup
      
   📝 audit_logs_recent.txt      
      Last 500 user activities (readable format)
      
   📝 audit_logs_recent.json     
      Last 500 user activities (JSON format)
      
   ⚠️  crash.log (if exists)      
      Application error logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 QUICK START FOR SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open "diagnostic_summary.txt" to see overview
2. Compress this folder to a .zip file
3. Send to technical support via email/WhatsApp/Drive

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 SUPPORT CONTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email:     saad@khantraders.com
WhatsApp:  +92-XXX-XXXXXXX
Website:   https://khantraders.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 PRIVACY NOTICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Passwords are encrypted and cannot be read
✓ Security question answers are encrypted
✓ Only send to trusted technical support
✓ This data is for troubleshooting only

Your privacy and security are our top priority.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      
      fs.writeFileSync(path.join(exportDir, 'README.txt'), readmeContent, 'utf-8')
      
      return { success: true, path: exportDir }
    } catch (error: any) {
      console.error('Export logs error:', error)
      return { success: false, error: error.message }
    }
  })
}
