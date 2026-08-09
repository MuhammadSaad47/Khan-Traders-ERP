import { useQuery } from '@tanstack/react-query'

export function useComprehensiveReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'comprehensive', startDate, endDate],
    queryFn: async () => await window.api.reports.getComprehensiveReport(startDate, endDate),
    enabled: !!startDate && !!endDate
  })
}

export function useProfitAndLoss(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['reports', 'pnl', startDate, endDate],
    queryFn: async () => await window.api.reports.getProfitAndLoss(startDate, endDate),
    enabled: !!startDate && !!endDate
  })
}

export function useStockValuation() {
  return useQuery({
    queryKey: ['reports', 'valuation'],
    queryFn: async () => await window.api.reports.getStockValuation()
  })
}

export function usePartyBalancesSummary() {
  return useQuery({
    queryKey: ['reports', 'party_balances'],
    queryFn: async () => await window.api.reports.getPartyBalancesSummary()
  })
}

export function useCustomerAging() {
  return useQuery({
    queryKey: ['reports', 'aging'],
    queryFn: async () => await window.api.reports.getCustomerAging()
  })
}
