import { ipcMain } from 'electron'
import * as vanService from '../services/van_sales.service'
import { CreateVanAssignmentSchema, ReconcileVanAssignmentSchema } from '../../shared/schemas'

export function registerVanSalesIpc() {
  ipcMain.handle('vans:getActiveAssignments', async () => {
    return await vanService.getActiveAssignments()
  })

  ipcMain.handle('vans:getAllAssignments', async (_, page?: number, limit?: number) => {
    return await vanService.getAllAssignments(page, limit)
  })

  ipcMain.handle('vans:getAssignmentDetails', async (_, id: number) => {
    return await vanService.getAssignmentDetails(id)
  })

  ipcMain.handle('vans:createAssignment', async (_, data, userId: number) => {
    const validData = CreateVanAssignmentSchema.parse(data)
    return await vanService.createVanAssignment(validData, userId)
  })
  
  ipcMain.handle('vans:reconcileAssignment', async (_, id: number, returns: any, userId: number) => {
    const validData = ReconcileVanAssignmentSchema.parse(returns)
    return await vanService.reconcileVanAssignment(id, {
      cash_collected: validData.cash_collected,
      account_id: validData.account_id
    }, userId)
  })

  ipcMain.handle('vans:addExpense', async (_, vanAssignmentId: number, categoryId: number, amount: number, accountId: number, note: string, userId: number) => {
    return await vanService.addVanExpense(vanAssignmentId, categoryId, amount, accountId, note, userId)
  })

  ipcMain.handle('vans:getExpenses', async (_, vanAssignmentId: number) => {
    return await vanService.getVanExpenses(vanAssignmentId)
  })
}
