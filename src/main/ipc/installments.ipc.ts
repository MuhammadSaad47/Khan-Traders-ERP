import { ipcMain } from 'electron'
import * as installmentsService from '../services/installments.service'
import { CreateInstallmentPlanSchema, RecordInstallmentPaymentSchema } from '../../shared/schemas'

export function registerInstallmentsIpc() {
  ipcMain.handle('installments:create', async (_, userId: number, data: any) => {
    const validData = CreateInstallmentPlanSchema.parse(data)
    return await installmentsService.createInstallmentPlan(userId, validData)
  })

  ipcMain.handle('installments:recordPayment', async (_, userId: number, data: any) => {
    const validData = RecordInstallmentPaymentSchema.parse(data)
    return await installmentsService.recordInstallmentPayment(userId, validData)
  })

  ipcMain.handle('installments:getPlans', async (_, saleId?: number) => {
    return await installmentsService.getInstallmentPlans(saleId)
  })

  ipcMain.handle('installments:getSchedule', async (_, planId: number) => {
    return await installmentsService.getInstallmentSchedule(planId)
  })
}
