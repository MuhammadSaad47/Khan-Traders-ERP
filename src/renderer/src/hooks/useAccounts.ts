import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => await window.api.accounts.getAccounts()
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; type: string; opening_balance?: number }) => {
      return await window.api.accounts.createAccount(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
    }
  })
}

export function useAccountTransactions(
  accountId?: number | null,
  page = 1,
  limit = 50,
  filters?: { type?: string; reference_type?: string; search?: string }
) {
  return useQuery({
    queryKey: ['account_transactions', accountId, page, limit, filters],
    queryFn: async () => await window.api.accounts.getTransactions(accountId, page, limit, filters)
  })
}

export function useTransferFunds() {
  const queryClient = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)

  return useMutation({
    mutationFn: async (data: any) => {
      if (!userId) throw new Error('Unauthorized')
      return await window.api.accounts.transferFunds(data, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account_transactions'] })
    }
  })
}
