import { ipcMain } from 'electron'
import * as expensesService from '../services/expenses.service'
import { requireRole } from './middleware'
import { CreateExpenseSchema, CreateCategorySchema } from '../../shared/schemas'

export function registerExpensesIpc() {
  ipcMain.handle('expenses:getCategories', async () => await expensesService.getExpenseCategories())
  ipcMain.handle('expenses:createCategory', async (_, name) => {
    await requireRole(['admin', 'manager'])
    // Just reuse category schema for name validation
    const validData = CreateCategorySchema.parse({ name })
    return await expensesService.createExpenseCategory(validData.name)
  })
  ipcMain.handle('expenses:getAll', async (_, filters) => await expensesService.getExpenses(filters))
  ipcMain.handle('expenses:create', async (_, data, userId) => {
    const validData = CreateExpenseSchema.parse(data)
    return await expensesService.createExpense(validData, userId)
  })
  ipcMain.handle('expenses:deletePurchaseOverheads', async (_, purchaseId, userId) => {
    await requireRole(['admin', 'manager'])
    return await expensesService.deletePurchaseOverheads(purchaseId, userId)
  })
}
