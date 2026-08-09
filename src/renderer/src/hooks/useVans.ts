import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useActiveAssignments() {
  return useQuery({
    queryKey: ['vans', 'active'],
    queryFn: async () => await window.api.vans.getActiveAssignments()
  })
}

export function useAllAssignments(page = 1, limit = 50) {
  return useQuery({
    queryKey: ['vans', 'all', page, limit],
    queryFn: async () => await window.api.vans.getAllAssignments(page, limit)
  })
}

export function useAssignmentDetails(id: number) {
  return useQuery({
    queryKey: ['vans', 'details', id],
    queryFn: async () => await window.api.vans.getAssignmentDetails(id),
    enabled: !!id
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.vans.createAssignment(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vans'] })
  })
}

export function useReconcileAssignment() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, returns }: { id: number, returns: any }) => await window.api.vans.reconcileAssignment(id, returns, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vans'] })
  })
}

export function useAddVanExpense() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, categoryId, amount, accountId, note }: { id: number, categoryId: number, amount: number, accountId: number, note: string }) => 
      await window.api.vans.addExpense(id, categoryId, amount, accountId, note, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-assignments'] })
    }
  })
}
