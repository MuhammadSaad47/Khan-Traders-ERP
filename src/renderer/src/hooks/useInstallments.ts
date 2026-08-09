import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useCreateInstallmentPlan() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.installments.createPlan(data, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
    }
  })
}

export function useRecordInstallmentPayment() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.installments.recordPayment(data, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
  })
}
