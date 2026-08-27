import { useQuery } from '@tanstack/react-query'

export function useKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => await window.api.dashboard.getKPIs()
  })
}

export function useSalesTrend() {
  return useQuery({
    queryKey: ['dashboard', 'sales-trend'],
    queryFn: async () => await window.api.dashboard.getSalesTrend()
  })
}

export function useTopItems() {
  return useQuery({
    queryKey: ['dashboard', 'top-items'],
    queryFn: async () => await window.api.dashboard.getTopItems()
  })
}

export function useExpenseBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'expense-breakdown'],
    queryFn: async () => await window.api.dashboard.getExpenseBreakdown()
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => await window.api.dashboard.getRecentActivity()
  })
}

export function useOverdueBalances() {
  return useQuery({
    queryKey: ['dashboard', 'overdue-balances'],
    queryFn: async () => await window.api.dashboard.getOverdueBalances()
  })
}
