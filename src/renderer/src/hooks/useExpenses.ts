import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => await window.api.expenses.getAll()
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: async () => await window.api.expenses.getCategories()
  })
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => await window.api.expenses.createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', 'categories'] })
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.expenses.create(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] })
  })
}

export function useDeletePurchaseOverheads() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (purchaseId: number) => await window.api.expenses.deletePurchaseOverheads(purchaseId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] })
  })
}
