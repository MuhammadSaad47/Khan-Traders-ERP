import { ipcMain } from 'electron'
import * as vanService from '../services/van_sales.service'
import { CreateVanAssignmentSchema, ReconcileVanAssignmentSchema } from '../../shared/schemas'
import { requireRole } from './middleware'

export function registerVanSalesIpc() {
  ipcMain.handle('vans:getActiveAssignments', async () => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.getActiveAssignments()
  })

  ipcMain.handle('vans:getAllAssignments', async (_, page?: number, limit?: number, filters?: any) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.getAllAssignments(page, limit, filters)
  })

  ipcMain.handle('vans:getAssignmentDetails', async (_, id: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.getAssignmentDetails(id)
  })

  ipcMain.handle('vans:getAssignmentReport', async (_, id: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.getVanAssignmentReport(id)
  })

  ipcMain.handle('vans:createAssignment', async (_, data, userId: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    const validData = CreateVanAssignmentSchema.parse(data)
    return await vanService.createVanAssignment(validData, userId)
  })
  
  ipcMain.handle('vans:reconcileAssignment', async (_, id: number, returns: any, userId: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    const validData = ReconcileVanAssignmentSchema.parse(returns || {})
    return await vanService.reconcileVanAssignment(id, {
      returns: validData.returns
    }, userId)
  })

  ipcMain.handle('vans:addExpense', async (_, vanAssignmentId: number, categoryId: number, amount: number, accountId: number, note: string, userId: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.addVanExpense(vanAssignmentId, categoryId, amount, accountId, note, userId)
  })

  ipcMain.handle('vans:getExpenses', async (_, vanAssignmentId: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.getVanExpenses(vanAssignmentId)
  })

  ipcMain.handle('vans:deleteAssignment', async (_, id: number, userId: number) => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return await vanService.deleteVanAssignment(id, userId)
  })
}
