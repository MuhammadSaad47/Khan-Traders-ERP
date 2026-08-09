import { ipcMain } from 'electron'
import * as purchasesService from '../services/purchases.service'
import { CreatePurchaseSchema, UpdatePurchaseSchema } from '../../shared/schemas'
import { requireRole } from './middleware'

export function registerPurchasesIpc() {
  ipcMain.handle('purchases:create', async (_, userId: number, data: any) => {
    const validData = CreatePurchaseSchema.parse(data)
    return await purchasesService.createPurchase(userId, validData)
  })

  ipcMain.handle('purchases:getAll', async (_, page?: number, limit?: number, filters?: any) => {
    return await purchasesService.getPurchases(page, limit, filters)
  })

  ipcMain.handle('purchases:getDetails', async (_, purchaseId: number) => {
    return await purchasesService.getPurchaseDetails(purchaseId)
  })

  ipcMain.handle('purchases:update', async (_, purchaseId: number, userId: number, data: any) => {
    await requireRole(['admin', 'manager'])
    const validData = UpdatePurchaseSchema.parse(data)
    return await purchasesService.updatePurchase(purchaseId, userId, validData as any) // need to leave this as any because UpdatePurchaseSchema doesn't exactly match CreatePurchaseInput (or does it? Let's try without as any)
  })

  ipcMain.handle('purchases:getIdByInvoiceNo', async (_, invoiceNo: string) => {
    return await purchasesService.getPurchaseIdByInvoiceNo(invoiceNo)
  })

  ipcMain.handle('purchases:void', async (_, purchaseId: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await purchasesService.voidPurchase(purchaseId, userId)
  })
}
