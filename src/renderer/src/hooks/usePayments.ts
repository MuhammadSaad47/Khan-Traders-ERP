import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function usePayments(page = 1, limit = 50, filters?: any) {
  return useQuery({
    queryKey: ['payments', page, limit, filters],
    queryFn: async () => await window.api.payments.getAll(page, limit, filters)
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.payments.recordPayment(data, userId)
    },
    onSuccess: (_, variables) => {
      if (variables.party_type === 'customer') {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        queryClient.invalidateQueries({ queryKey: ['sales'] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] })
        queryClient.invalidateQueries({ queryKey: ['purchases'] })
      }
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}

export function useVoidPayment() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.payments.voidPayment(id, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}
