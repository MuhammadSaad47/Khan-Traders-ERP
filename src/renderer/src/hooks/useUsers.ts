import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => await window.api.auth.getUsers()
  })
}

export function useVanSalesmen() {
  return useQuery({
    queryKey: ['van-salesmen'],
    queryFn: async () => await window.api.auth.getVanSalesmen()
  })
}

export function useCreateSalesman() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: { fullName: string, phone: string, address: string }) => await window.api.auth.createSalesman(data, user!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['van-salesmen'] })
    }
  })
}

export function useChangePassword() {
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: { currentPassword: string, newPassword: string }) => {
      if (!user) throw new Error('User not authenticated')
      return await window.api.auth.changePassword(data, user.id)
    }
  })
}

export function useResetPassword() {
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: { targetUserId: number, newPassword: string }) => {
      if (!user) throw new Error('User not authenticated')
      return await window.api.auth.resetPassword(data, user.id)
    }
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: { username: string, fullName: string, role: string, password: string }) => {
      if (!user) throw new Error('User not authenticated')
      return await window.api.auth.createUser(data, user.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (targetUserId: number) => {
      if (!user) throw new Error('User not authenticated')
      return await window.api.auth.deleteUser(targetUserId, user.id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })
}
