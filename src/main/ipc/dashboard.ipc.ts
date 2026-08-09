import { ipcMain } from 'electron'
import * as dashboardService from '../services/dashboard.service'

export function registerDashboardIpc() {
  ipcMain.handle('dashboard:getKPIs', async () => {
    return await dashboardService.getKPIs()
  })

  ipcMain.handle('dashboard:getSalesTrend', async () => {
    return await dashboardService.getSalesTrend()
  })

  ipcMain.handle('dashboard:getTopItems', async () => {
    return await dashboardService.getTopItems()
  })

  ipcMain.handle('dashboard:getExpenseBreakdown', async () => {
    return await dashboardService.getExpenseBreakdown()
  })

  ipcMain.handle('dashboard:getRecentActivity', async () => {
    return await dashboardService.getRecentActivity()
  })

  ipcMain.handle('dashboard:getOverdueBalances', async () => {
    return await dashboardService.getOverdueBalances()
  })
}
