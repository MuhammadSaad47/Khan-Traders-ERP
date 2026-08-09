import { ipcMain } from 'electron'
import * as salesService from '../services/sales.service'
import * as printerService from '../services/printer.service'
import { CreateSaleSchema } from '../../shared/schemas'
import { requireRole } from './middleware'

export function registerSalesIpc() {
  ipcMain.handle('sales:createSale', async (_, data, userId: number) => {
    const validData = CreateSaleSchema.parse(data)
    return await salesService.createSale(validData, userId)
  })

  ipcMain.handle('sales:getSales', async (_, page?: number, limit?: number, filters?: any) => {
    return await salesService.getSales(page, limit, filters)
  })

  ipcMain.handle('sales:getSaleDetails', async (_, saleId: number) => {
    return await salesService.getSaleDetails(saleId)
  })

  ipcMain.handle('sales:updateSale', async (_, saleId: number, data: any, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateSaleSchema.parse(data)
    return await salesService.updateSale(saleId, userId, validData)
  })

  ipcMain.handle('sales:voidSale', async (_, saleId: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await salesService.voidSale(saleId, userId)
  })

  ipcMain.handle('printer:printReceipt', async (_, data: printerService.PrintReceiptInput) => {
    return await printerService.printReceipt(data)
  })

  ipcMain.handle('sales:getSaleIdByInvoiceNo', async (_, invoiceNo: string) => {
    return await salesService.getSaleIdByInvoiceNo(invoiceNo)
  })

  ipcMain.handle('sales:createSaleReturn', async (_, data: salesService.CreateSaleReturnInput, userId: number) => {
    return await salesService.createSaleReturn(data, userId)
  })

  ipcMain.handle('sales:getSaleReturns', async (_, saleId: number) => {
    return await salesService.getSaleReturns(saleId)
  })
}
