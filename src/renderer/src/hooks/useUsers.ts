import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => await window.api.auth.getUsers()
  })
}

export function useCreateSalesman() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: { fullName: string, phone: string, address: string }) => await window.api.auth.createSalesman(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })
}
