import { ipcMain } from 'electron'
import * as accountsService from '../services/accounts.service'
import { requireRole } from './middleware'
import { CreateAccountSchema, TransferFundsSchema } from '../../shared/schemas'

export function registerAccountsIpc() {
  ipcMain.handle('accounts:getAll', async () => {
    return await accountsService.getAccounts()
  })

  ipcMain.handle('accounts:create', async (_, data: any, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateAccountSchema.parse(data)
    return await accountsService.createAccount(userId, validData)
  })

  ipcMain.handle('accounts:getTransactions', async (_, accountId?: number | null, page?: number, limit?: number, filters?: any) => {
    return await accountsService.getAccountTransactions(accountId, page, limit, filters)
  })

  ipcMain.handle('accounts:transfer', async (_, userId: number, data: any) => {
    await requireRole(['admin', 'manager'])
    const validData = TransferFundsSchema.parse(data)
    return await accountsService.transferFunds(userId, validData)
  })
}
