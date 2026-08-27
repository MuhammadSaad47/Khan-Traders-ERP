import { useEffect, useState, useCallback } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './stores/auth.store'
import Auth from './components/Auth'
import Shell from './components/layout/Shell'
import POSPage from './pages/pos/POSPage'
import SalesPage from './pages/sales/SalesPage'
import InventoryPage from './pages/inventory/InventoryPage'
import ProductsPage from './pages/products/ProductsPage'
import CustomersPage from './pages/customers/CustomersPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import AccountsPage from './pages/accounts/AccountsPage'
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
  const logout = useAuthStore(state => state.logout)
  const clearSessionOnAppRestart = useAuthStore(state => state.clearSessionOnAppRestart)
  const queryClient = useQueryClient()

  // Clear query cache when user logs out
  useEffect(() => {
    if (!user) {
      queryClient.clear()
    }
  }, [user, queryClient])

  const [isRestored, setIsRestored] = useState(false)
  const [appStartupHandled, setAppStartupHandled] = useState(false)

  // On app startup, clear session to require login
  useEffect(() => {
    if (!appStartupHandled) {
      clearSessionOnAppRestart()
      setAppStartupHandled(true)
    }
  }, [appStartupHandled, clearSessionOnAppRestart])

  // Listen for system lock/sleep events
  useEffect(() => {
    const handleSystemLock = () => {
      console.log('System locked - logging out user')
      logout()
    }

    window.electron?.ipcRenderer?.on('system-locked', handleSystemLock)

    return () => {
      window.electron?.ipcRenderer?.removeListener('system-locked', handleSystemLock)
    }
  }, [logout])

  useEffect(() => {
    if (user) {
      window.api?.auth?.restoreSession?.(user.id).then((res: any) => {
        if (res && res.success === false) {
          useAuthStore.getState().logout()
        } else {
          setIsRestored(true)
        }
      }).catch(console.error)
    } else {
      setIsRestored(true)
    }
  }, [user])

  // --- ZOOM SYSTEM: webFrame zoom ---
  // We reverted back to webFrame.setZoomFactor() because the input bug was caused
  // by the 'force-device-scale-factor' flag (which was removed).
  // CSS zoom causes layout shifting and right-alignment issues on scaled displays.
  const applyZoom = useCallback((zoomLevel: number) => {
    if (!isNaN(zoomLevel) && zoomLevel > 0) {
      document.documentElement.style.zoom = ''
      document.documentElement.style.fontSize = ''
      if (window.electron?.webFrame) {
        window.electron.webFrame.setZoomFactor(zoomLevel)
      }
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('app-zoom-level')
    const initialZoom = saved ? parseFloat(saved) : 1.0
    applyZoom(initialZoom)

    const handleZoomChanged = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && typeof customEvent.detail.zoom === 'number') {
        applyZoom(customEvent.detail.zoom)
      }
    }

    window.addEventListener('app-zoom-changed', handleZoomChanged)
    return () => window.removeEventListener('app-zoom-changed', handleZoomChanged)
  }, [applyZoom])

  if (!user) {
    return <Auth />
  }

  if (!isRestored) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>
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
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
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



