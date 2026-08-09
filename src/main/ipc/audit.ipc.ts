import { ipcMain } from 'electron'
import * as auditService from '../services/audit.service'

export function registerAuditIpc() {
  ipcMain.handle('audit:getLogs', async (_, page?: number, limit?: number, filters?: any) => {
    return await auditService.getAuditLogs(page, limit, filters)
  })
}
