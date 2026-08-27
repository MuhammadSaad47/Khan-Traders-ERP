import { ipcMain } from 'electron'
import * as partiesService from '../services/parties.service'
import { requireRole } from './middleware'
import { CreateAreaSchema, CreateRouteSchema, CreateCustomerSchema, CreatePartySchema } from '../../shared/schemas'

export function registerPartiesIpc() {
  // Areas
  ipcMain.handle('parties:getAreas', async () => await partiesService.getAreas())
  ipcMain.handle('parties:createArea', async (_, data, userId) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateAreaSchema.parse(data)
    return await partiesService.createArea(validData, userId)
  })
  ipcMain.handle('parties:updateArea', async (_, id, data, userId) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateAreaSchema.parse(data)
    return await partiesService.updateArea(id, validData, userId)
  })
  ipcMain.handle('parties:deleteArea', async (_, id, userId) => {
    await requireRole(['admin', 'manager'])
    return await partiesService.deleteArea(id, userId)
  })

  // Routes
  ipcMain.handle('parties:getRoutes', async () => await partiesService.getRoutes())
  ipcMain.handle('parties:createRoute', async (_, data, userId) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateRouteSchema.parse(data)
    return await partiesService.createRoute(validData, userId)
  })
  ipcMain.handle('parties:updateRoute', async (_, id, data, userId) => {
    await requireRole(['admin', 'manager'])
    const validData = CreateRouteSchema.parse(data)
    return await partiesService.updateRoute(id, validData, userId)
  })
  ipcMain.handle('parties:deleteRoute', async (_, id, userId) => {
    await requireRole(['admin', 'manager'])
    return await partiesService.deleteRoute(id, userId)
  })

  // Customers
  ipcMain.handle('parties:getCustomers', async (_, filters) => await partiesService.getCustomers(filters))
  ipcMain.handle('parties:createCustomer', async (_, data, userId) => {
    const validData = CreateCustomerSchema.parse(data)
    return await partiesService.createCustomer(validData, userId)
  })
  ipcMain.handle('parties:updateCustomer', async (_, id, data, userId) => {
    const validData = CreateCustomerSchema.parse(data)
    return await partiesService.updateCustomer(id, validData, userId)
  })
  ipcMain.handle('parties:deleteCustomer', async (_, id, userId) => {
    await requireRole(['admin', 'manager'])
    return await partiesService.deleteCustomer(id, userId)
  })

  // Suppliers
  ipcMain.handle('parties:getSuppliers', async () => await partiesService.getSuppliers())
  ipcMain.handle('parties:createSupplier', async (_, data, userId) => {
    const validData = CreatePartySchema.parse(data)
    return await partiesService.createSupplier(validData, userId)
  })
  ipcMain.handle('parties:updateSupplier', async (_, id, data, userId) => {
    const validData = CreatePartySchema.parse(data)
    return await partiesService.updateSupplier(id, validData, userId)
  })
  ipcMain.handle('parties:deleteSupplier', async (_, id: number, userId: number) => {
    await requireRole(['admin'])
    return await partiesService.deleteSupplier(id, userId)
  })

  // Statements
  ipcMain.handle('parties:getCustomerStatement', async (_, customerId: number, fromDate: string, toDate: string) => {
    return await partiesService.getCustomerStatement(customerId, fromDate, toDate)
  })

  ipcMain.handle('parties:getSupplierStatement', async (_, supplierId: number, fromDate: string, toDate: string) => {
    return await partiesService.getSupplierStatement(supplierId, fromDate, toDate)
  })

  // Analytics
  ipcMain.handle('parties:getTopCustomers', async () => await partiesService.getTopCustomers())
  ipcMain.handle('parties:getTopSuppliers', async () => await partiesService.getTopSuppliers())
}
