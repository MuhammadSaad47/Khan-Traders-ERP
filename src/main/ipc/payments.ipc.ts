import { ipcMain } from 'electron'
import * as paymentsService from '../services/payments.service'
import { RecordPaymentSchema } from '../../shared/schemas'
import { requireRole } from './middleware'

export function registerPaymentsIpc() {
  ipcMain.handle('payments:record', async (_, userId: number, data: any) => {
    const validData = RecordPaymentSchema.parse(data)
    return await paymentsService.recordPayment(userId, validData)
  })

  ipcMain.handle('payments:getAll', async (_, page?: number, limit?: number, filters?: any) => {
    return await paymentsService.getPayments(page, limit, filters)
  })

  ipcMain.handle('payments:void', async (_, paymentId: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await paymentsService.voidPayment(paymentId, userId)
  })

  ipcMain.handle('payments:getUnpaidDocuments', async (_, partyType: 'customer' | 'supplier', partyId: number) => {
    return await paymentsService.getUnpaidDocuments(partyType, partyId)
  })
}
