import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  auth: {
    hasAdmin: () => ipcRenderer.invoke('auth:hasAdmin'),
    setupFirstAdmin: (args: any) => ipcRenderer.invoke('auth:setupFirstAdmin', args),
    login: (args: any) => ipcRenderer.invoke('auth:login', args),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUsers: () => ipcRenderer.invoke('auth:getUsers'),
    createSalesman: (data: any, userId: number) => ipcRenderer.invoke('auth:createSalesman', data, userId)
  },
  catalog: {
    getCategories: () => ipcRenderer.invoke('catalog:getCategories'),
    createCategory: (data: any, userId: number) => ipcRenderer.invoke('catalog:createCategory', data, userId),
    updateCategory: (id: number, data: any, userId: number) => ipcRenderer.invoke('catalog:updateCategory', id, data, userId),
    deleteCategory: (id: number, userId: number) => ipcRenderer.invoke('catalog:deleteCategory', id, userId),
    getItems: () => ipcRenderer.invoke('catalog:getItems'),
    createItem: (data: any, userId: number) => ipcRenderer.invoke('catalog:createItem', data, userId),
    updateItem: (id: number, data: any, userId: number) => ipcRenderer.invoke('catalog:updateItem', id, data, userId),
    deleteItem: (id: number, userId: number) => ipcRenderer.invoke('catalog:deleteItem', id, userId),
  },
  parties: {
    getAreas: () => ipcRenderer.invoke('parties:getAreas'),
    createArea: (data: any, userId: number) => ipcRenderer.invoke('parties:createArea', data, userId),
    updateArea: (id: number, data: any, userId: number) => ipcRenderer.invoke('parties:updateArea', id, data, userId),
    deleteArea: (id: number, userId: number) => ipcRenderer.invoke('parties:deleteArea', id, userId),
    getRoutes: () => ipcRenderer.invoke('parties:getRoutes'),
    createRoute: (data: any, userId: number) => ipcRenderer.invoke('parties:createRoute', data, userId),
    updateRoute: (id: number, data: any, userId: number) => ipcRenderer.invoke('parties:updateRoute', id, data, userId),
    deleteRoute: (id: number, userId: number) => ipcRenderer.invoke('parties:deleteRoute', id, userId),
    getCustomers: () => ipcRenderer.invoke('parties:getCustomers'),
    createCustomer: (data: any, userId: number) => ipcRenderer.invoke('parties:createCustomer', data, userId),
    updateCustomer: (id: number, data: any, userId: number) => ipcRenderer.invoke('parties:updateCustomer', id, data, userId),
    deleteCustomer: (id: number, userId: number) => ipcRenderer.invoke('parties:deleteCustomer', id, userId),
    getSuppliers: () => ipcRenderer.invoke('parties:getSuppliers'),
    createSupplier: (data: any, userId: number) => ipcRenderer.invoke('parties:createSupplier', data, userId),
    updateSupplier: (id: number, data: any, userId: number) => ipcRenderer.invoke('parties:updateSupplier', id, data, userId),
    deleteSupplier: (id: number, userId: number) => ipcRenderer.invoke('parties:deleteSupplier', id, userId),
  },
  sales: {
    createSale: (data: any, userId: number) => ipcRenderer.invoke('sales:createSale', data, userId),
    getSales: (page?: number, limit?: number, filters?: any) => ipcRenderer.invoke('sales:getSales', page, limit, filters),
    getSaleDetails: (saleId: number) => ipcRenderer.invoke('sales:getSaleDetails', saleId),
    updateSale: (saleId: number, data: any, userId: number) => ipcRenderer.invoke('sales:updateSale', saleId, data, userId),
    voidSale: (saleId: number, userId: number) => ipcRenderer.invoke('sales:voidSale', saleId, userId),
    getIdByInvoiceNo: (invoiceNo: string) => ipcRenderer.invoke('sales:getSaleIdByInvoiceNo', invoiceNo),
    createSaleReturn: (data: any, userId: number) => ipcRenderer.invoke('sales:createSaleReturn', data, userId),
    getSaleReturns: (saleId: number) => ipcRenderer.invoke('sales:getSaleReturns', saleId)
  },
  printer: {
    printReceipt: (data: any) => ipcRenderer.invoke('printer:printReceipt', data)
  },
  purchases: {
    createPurchase: (data: any, userId: number) => ipcRenderer.invoke('purchases:create', userId, data),
    getPurchases: (page?: number, limit?: number, filters?: any) => ipcRenderer.invoke('purchases:getAll', page, limit, filters),
    getPurchaseDetails: (purchaseId: number) => ipcRenderer.invoke('purchases:getDetails', purchaseId),
    updatePurchase: (purchaseId: number, data: any, userId: number) => ipcRenderer.invoke('purchases:update', purchaseId, userId, data),
    voidPurchase: (purchaseId: number, userId: number) => ipcRenderer.invoke('purchases:void', purchaseId, userId),
    getIdByInvoiceNo: (invoiceNo: string) => ipcRenderer.invoke('purchases:getIdByInvoiceNo', invoiceNo)
  },
  payments: {
    recordPayment: (data: any, userId: number) => ipcRenderer.invoke('payments:record', userId, data),
    getAll: (page?: number, limit?: number, filters?: any) => ipcRenderer.invoke('payments:getAll', page, limit, filters),
    voidPayment: (paymentId: number, userId: number) => ipcRenderer.invoke('payments:void', paymentId, userId)
  },
  accounts: {
    getAccounts: () => ipcRenderer.invoke('accounts:getAll'),
    createAccount: (data: any, userId: number) => ipcRenderer.invoke('accounts:create', data, userId),
    getTransactions: (accountId?: number | null, page?: number, limit?: number, filters?: any) => ipcRenderer.invoke('accounts:getTransactions', accountId, page, limit, filters),
    transferFunds: (data: any, userId: number) => ipcRenderer.invoke('accounts:transfer', userId, data)
  },
  installments: {
    createPlan: (data: any, userId: number) => ipcRenderer.invoke('installments:create', userId, data),
    recordPayment: (data: any, userId: number) => ipcRenderer.invoke('installments:recordPayment', userId, data),
    getPlans: (saleId?: number) => ipcRenderer.invoke('installments:getPlans', saleId),
    getSchedule: (planId: number) => ipcRenderer.invoke('installments:getSchedule', planId)
  },
  dashboard: {
    getKPIs: () => ipcRenderer.invoke('dashboard:getKPIs'),
    getSalesTrend: () => ipcRenderer.invoke('dashboard:getSalesTrend'),
    getTopItems: () => ipcRenderer.invoke('dashboard:getTopItems'),
    getExpenseBreakdown: () => ipcRenderer.invoke('dashboard:getExpenseBreakdown'),
    getRecentActivity: () => ipcRenderer.invoke('dashboard:getRecentActivity'),
    getOverdueBalances: () => ipcRenderer.invoke('dashboard:getOverdueBalances')
  },
  reports: {
    getComprehensiveReport: (startDate: string, endDate: string) => ipcRenderer.invoke('reports:getComprehensiveReport', startDate, endDate),
    getProfitAndLoss: (startDate: string, endDate: string) => ipcRenderer.invoke('reports:getProfitAndLoss', startDate, endDate),
    getStockValuation: () => ipcRenderer.invoke('reports:getStockValuation'),
    getPartyBalancesSummary: () => ipcRenderer.invoke('reports:getPartyBalancesSummary'),
    getCustomerAging: () => ipcRenderer.invoke('reports:getCustomerAging')
  },
  vans: {
    getActiveAssignments: () => ipcRenderer.invoke('vans:getActiveAssignments'),
    getAllAssignments: (page?: number, limit?: number) => ipcRenderer.invoke('vans:getAllAssignments', page, limit),
    getAssignmentDetails: (id: number) => ipcRenderer.invoke('vans:getAssignmentDetails', id),
    createAssignment: (data: any, userId: number) => ipcRenderer.invoke('vans:createAssignment', data, userId),
    reconcileAssignment: (id: number, returns: any, userId: number) => ipcRenderer.invoke('vans:reconcileAssignment', id, returns, userId),
    addExpense: (vanAssignmentId: number, categoryId: number, amount: number, accountId: number, note: string, userId: number) => ipcRenderer.invoke('vans:addExpense', vanAssignmentId, categoryId, amount, accountId, note, userId),
    getExpenses: (vanAssignmentId: number) => ipcRenderer.invoke('vans:getExpenses', vanAssignmentId)
  },
  settings: {
    createBackup: (userId: number) => ipcRenderer.invoke('settings:createBackup', userId),
    getBackupLogs: () => ipcRenderer.invoke('settings:getBackupLogs'),
    getBusinessSettings: () => ipcRenderer.invoke('settings:getBusinessSettings'),
    updateBusinessSettings: (data: any, userId: number) => ipcRenderer.invoke('settings:updateBusinessSettings', data, userId)
  },
  audit: {
    getLogs: (page?: number, limit?: number, filters?: any) => ipcRenderer.invoke('audit:getLogs', page, limit, filters)
  },
  expenses: {
    getCategories: () => ipcRenderer.invoke('expenses:getCategories'),
    createCategory: (name: string) => ipcRenderer.invoke('expenses:createCategory', name),
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    create: (data: any, userId: number) => ipcRenderer.invoke('expenses:create', data, userId),
    deletePurchaseOverheads: (purchaseId: number, userId: number) => ipcRenderer.invoke('expenses:deletePurchaseOverheads', purchaseId, userId)
  },
  adjustments: {
    getAll: () => ipcRenderer.invoke('adjustments:getAll'),
    create: (data: any, userId: number) => ipcRenderer.invoke('adjustments:create', data, userId)
  },
  backup: {
    auth: () => ipcRenderer.invoke('backup:auth'),
    status: () => ipcRenderer.invoke('backup:status'),
    upload: () => ipcRenderer.invoke('backup:upload'),
    restore: () => ipcRenderer.invoke('backup:restore')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
