import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import Auth from './components/Auth'
import Shell from './components/layout/Shell'
import POSPage from './pages/pos/POSPage'
import SalesPage from './pages/sales/SalesPage'
import InventoryPage from './pages/inventory/InventoryPage'
import CustomersPage from './pages/customers/CustomersPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import AccountsPage from './pages/accounts/AccountsPage'
import InstallmentsPage from './pages/installments/InstallmentsPage'
import ReportsPage from './pages/reports/ReportsPage'
import VanSalesPage from './pages/vans/VanSalesPage'
import ExpensesPage from './pages/expenses/ExpensesPage'
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage'
import SettingsPage from './pages/settings/SettingsPage'
import AuditLogPage from './pages/settings/AuditLogPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'

import DashboardPage from './pages/dashboard/DashboardPage'

function App(): React.JSX.Element {
  const user = useAuthStore(state => state.user)

  if (!user) {
    return <Auth />
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/installments" element={<InstallmentsPage />} />
            <Route path="/vans" element={<VanSalesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/adjustments" element={<AdjustmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/audit" element={<AuditLogPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
