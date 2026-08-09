import { ipcMain } from 'electron'
import * as reportsService from '../services/reports.service'
import { requireRole } from './middleware'

export function registerReportsIpc() {
  ipcMain.handle('reports:getComprehensiveReport', async (_, startDate: string, endDate: string) => {
    await requireRole(['admin', 'manager'])
    return await reportsService.getComprehensiveReport(startDate, endDate)
  })

  ipcMain.handle('reports:getProfitAndLoss', async (_, startDate: string, endDate: string) => {
    await requireRole(['admin', 'manager'])
    const report = await reportsService.getComprehensiveReport(startDate, endDate)
    return report.pnl
  })

  ipcMain.handle('reports:getStockValuation', async () => {
    await requireRole(['admin', 'manager'])
    return await reportsService.getStockValuation()
  })

  ipcMain.handle('reports:getPartyBalancesSummary', async () => {
    await requireRole(['admin', 'manager'])
    return await reportsService.getPartyBalancesSummary()
  })

  ipcMain.handle('reports:getCustomerAging', async () => {
    await requireRole(['admin', 'manager'])
    const summary = await reportsService.getPartyBalancesSummary()
    return summary.customerAging
  })
}
