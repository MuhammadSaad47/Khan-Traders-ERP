import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        hasAdmin: () => Promise<boolean>
        setupFirstAdmin: (args: any) => Promise<any>
        login: (args: any) => Promise<any>
        logout: () => Promise<void>
        getUsers: () => Promise<any[]>
        createSalesman: (data: any, userId: number) => Promise<any>
      }
      catalog: {
        getCategories: () => Promise<any[]>
        createCategory: (data: any, userId: number) => Promise<any>
        updateCategory: (id: number, data: any, userId: number) => Promise<any>
        deleteCategory: (id: number, userId: number) => Promise<void>
        getItems: () => Promise<any[]>
        createItem: (data: any, userId: number) => Promise<any>
        updateItem: (id: number, data: any, userId: number) => Promise<any>
        deleteItem: (id: number, userId: number) => Promise<void>
      }
      parties: {
        getAreas: () => Promise<any[]>
        createArea: (data: any, userId: number) => Promise<any>
        updateArea: (id: number, data: any, userId: number) => Promise<any>
        deleteArea: (id: number, userId: number) => Promise<void>
        getRoutes: () => Promise<any[]>
        createRoute: (data: any, userId: number) => Promise<any>
        updateRoute: (id: number, data: any, userId: number) => Promise<any>
        deleteRoute: (id: number, userId: number) => Promise<void>
        getCustomers: () => Promise<any[]>
        createCustomer: (data: any, userId: number) => Promise<any>
        updateCustomer: (id: number, data: any, userId: number) => Promise<any>
        deleteCustomer: (id: number, userId: number) => Promise<void>
        getSuppliers: () => Promise<any[]>
        createSupplier: (data: any, userId: number) => Promise<any>
        updateSupplier: (id: number, data: any, userId: number) => Promise<any>
        deleteSupplier: (id: number, userId: number) => Promise<void>
      }
      sales: {
        createSale: (data: any, userId: number) => Promise<any>
        getSales: (page?: number, limit?: number, filters?: any) => Promise<any[]>
        getSaleDetails: (saleId: number) => Promise<any>
        updateSale: (saleId: number, data: any, userId: number) => Promise<any>
        voidSale: (saleId: number, userId: number) => Promise<any>
        getIdByInvoiceNo: (invoiceNo: string) => Promise<number | null>
        createSaleReturn: (data: any, userId: number) => Promise<any>
        getSaleReturns: (saleId: number) => Promise<any[]>
      }
      printer: {
        printReceipt: (data: any) => Promise<void>
      }
      purchases: {
        createPurchase: (data: any, userId: number) => Promise<any>
        getPurchases: (page?: number, limit?: number, filters?: any) => Promise<any[]>
        getPurchaseDetails: (id: number) => Promise<any>
        updatePurchase: (id: number, data: any, userId: number) => Promise<any>
        voidPurchase: (id: number, userId: number) => Promise<any>
        getIdByInvoiceNo: (invoiceNo: string) => Promise<number | null>
      }
      payments: {
        recordPayment: (data: any, userId: number) => Promise<any>
        getAll: (page?: number, limit?: number, filters?: any) => Promise<any[]>
        voidPayment: (paymentId: number, userId: number) => Promise<any>
      }
      accounts: {
        getAccounts: () => Promise<any[]>
        createAccount: (data: any) => Promise<any>
        getTransactions: (accountId?: number | null, page?: number, limit?: number, filters?: any) => Promise<any>
        transferFunds: (data: any, userId: number) => Promise<any>
      }
      installments: {
        createPlan: (data: any, userId: number) => Promise<any>
        recordPayment: (data: any, userId: number) => Promise<any>
      }
      dashboard: {
        getKPIs: () => Promise<any>
        getSalesTrend: () => Promise<any[]>
        getTopItems: () => Promise<any[]>
        getExpenseBreakdown: () => Promise<any>
        getRecentActivity: () => Promise<any[]>
        getOverdueBalances: () => Promise<any>
      }
      reports: {
        getComprehensiveReport: (startDate: string, endDate: string) => Promise<any>
        getProfitAndLoss: (startDate: string, endDate: string) => Promise<any>
        getStockValuation: () => Promise<any>
        getPartyBalancesSummary: () => Promise<any>
        getCustomerAging: () => Promise<any[]>
      }
      vans: {
        getActiveAssignments: () => Promise<any[]>
        getAllAssignments: (page?: number, limit?: number) => Promise<any>
        getAssignmentDetails: (id: number) => Promise<any>
        createAssignment: (data: any, userId: number) => Promise<any>
        reconcileAssignment: (id: number, returns: any, userId: number) => Promise<any>
        addExpense: (vanAssignmentId: number, categoryId: number, amount: number, accountId: number, note: string, userId: number) => Promise<any>
        getExpenses: (vanAssignmentId: number) => Promise<any[]>
      }
      settings: {
        createBackup: (userId: number) => Promise<any>
        getBackupLogs: () => Promise<any[]>
        getBusinessSettings: () => Promise<any>
        updateBusinessSettings: (data: any, userId: number) => Promise<any>
      }
      audit: {
        getLogs: (page?: number, limit?: number, filters?: any) => Promise<any[]>
      }
      expenses: {
        getCategories: () => Promise<any[]>
        createCategory: (name: string) => Promise<any>
        getAll: () => Promise<any[]>
        create: (data: any, userId: number) => Promise<any>
        deletePurchaseOverheads: (purchaseId: number, userId: number) => Promise<void>
      }
      adjustments: {
        getAll: () => Promise<any[]>
        create: (data: any, userId: number) => Promise<any>
      }
      backup: {
        auth: () => Promise<any>
        status: () => Promise<any>
        upload: () => Promise<any>
        restore: () => Promise<any>
      }
    }
  }
}
