import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function usePurchases(page = 1, limit = 50, filters?: any) {
  return useQuery({
    queryKey: ['purchases', page, limit, filters],
    queryFn: async () => await window.api.purchases.getPurchases(page, limit, filters)
  })
}

export function usePurchaseDetails(id: number | null) {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => await window.api.purchases.getPurchaseDetails(id!),
    enabled: !!id
  })
}

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.purchases.createPurchase(data, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.purchases.updatePurchase(id, data, userId)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase', id] })
    }
  })
}

export function useVoidPurchase() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.purchases.voidPurchase(id, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
  })
}
