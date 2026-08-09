import { ipcMain } from 'electron'
import * as adjustmentsService from '../services/stock_adjustments.service'
import { requireRole } from './middleware'
import { CreateStockAdjustmentSchema } from '../../shared/schemas'

export function registerAdjustmentsIpc() {
  ipcMain.handle('adjustments:getAll', async () => await adjustmentsService.getStockAdjustments())
  ipcMain.handle('adjustments:create', async (_, data, userId) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateStockAdjustmentSchema.parse(data)
    return await adjustmentsService.createStockAdjustment(validData, userId)
  })
}
