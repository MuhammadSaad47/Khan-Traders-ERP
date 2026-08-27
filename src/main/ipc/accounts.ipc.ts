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

  ipcMain.handle('accounts:addCapital', async (_, data: any, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await accountsService.addCapitalInvestment(userId, data)
  })

  ipcMain.handle('accounts:withdrawCapital', async (_, data: any, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await accountsService.withdrawCapital(userId, data)
  })

  ipcMain.handle('accounts:deleteTransaction', async (_, transactionId: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await accountsService.deleteAccountTransaction(userId, transactionId)
  })

  ipcMain.handle('accounts:updateTransaction', async (_, transactionId: number, data: any, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await accountsService.updateAccountTransaction(userId, transactionId, data)
  })
}
