import { ipcMain } from 'electron'
import * as catalogService from '../services/catalog.service'
import { requireRole } from './middleware'
import { CreateCategorySchema, CreateItemSchema } from '../../shared/schemas'

export function registerCatalogIpc() {
  // Categories
  ipcMain.handle('catalog:getCategories', async () => {
    return await catalogService.getCategories()
  })
  
  ipcMain.handle('catalog:createCategory', async (_, data, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateCategorySchema.parse(data)
    return await catalogService.createCategory(validData, userId)
  })
  
  ipcMain.handle('catalog:updateCategory', async (_, id: number, data, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateCategorySchema.parse(data)
    return await catalogService.updateCategory(id, validData, userId)
  })
  
  ipcMain.handle('catalog:deleteCategory', async (_, id: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await catalogService.deleteCategory(id, userId)
  })

  // Items
  ipcMain.handle('catalog:getItems', async () => {
    return await catalogService.getItems()
  })
  
  ipcMain.handle('catalog:createItem', async (_, data, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateItemSchema.parse(data)
    return await catalogService.createItem(validData, userId)
  })
  
  ipcMain.handle('catalog:updateItem', async (_, id: number, data, userId: number) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateItemSchema.parse(data)
    return await catalogService.updateItem(id, validData, userId)
  })
  
  ipcMain.handle('catalog:deleteItem', async (_, id: number, userId: number) => {
    await requireRole(['admin', 'manager'])
    return await catalogService.deleteItem(id, userId)
  })
}
