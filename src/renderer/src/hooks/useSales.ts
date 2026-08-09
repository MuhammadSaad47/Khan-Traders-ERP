import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => await window.api.sales.getSales()
  })
}

export function useSaleDetails(saleId: number | null) {
  return useQuery({
    queryKey: ['sales', saleId],
    queryFn: async () => await window.api.sales.getSaleDetails(saleId!),
    enabled: !!saleId
  })
}

export function useIdByInvoiceNo(invoiceNo: string | null) {
  return useQuery({
    queryKey: ['sales', 'id', invoiceNo],
    queryFn: () => window.api.sales.getIdByInvoiceNo(invoiceNo!),
    enabled: !!invoiceNo
  })
}

export function useCreateSaleReturn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { sale_id: number; items: any[]; refund_amount: number; credit_amount: number; account_id?: number }) =>
      window.api.sales.createSaleReturn(data, 1), // Assuming user ID 1 for now
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale-details', variables.sale_id] })
      queryClient.invalidateQueries({ queryKey: ['sale-returns', variables.sale_id] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
    }
  })
}

export function useSaleReturns(saleId: number) {
  return useQuery({
    queryKey: ['sale-returns', saleId],
    queryFn: () => window.api.sales.getSaleReturns(saleId),
    enabled: !!saleId
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.sales.createSale(data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['items'] }) // Invalidate inventory stock
      queryClient.invalidateQueries({ queryKey: ['customers'] }) // Invalidate balances
    }
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: number, data: any }) => await window.api.sales.updateSale(saleId, data, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sales', variables.saleId] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })
}

export function usePrintReceipt() {
  return useMutation({
    mutationFn: async (data: any) => await window.api.printer.printReceipt(data)
  })
}

export function useVoidSale() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (saleId: number) => await window.api.sales.voidSale(saleId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}
