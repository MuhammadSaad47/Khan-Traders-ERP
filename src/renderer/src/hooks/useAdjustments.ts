import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useStockAdjustments() {
  return useQuery({
    queryKey: ['adjustments'],
    queryFn: async () => await window.api.adjustments.getAll()
  })
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.adjustments.create(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adjustments'] })
  })
}
