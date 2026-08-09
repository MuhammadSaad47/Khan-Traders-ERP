import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { useToast } from '@/hooks/use-toast'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => await window.api.parties.getCustomers()
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.parties.createCustomer(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => await window.api.parties.updateCustomer(id, data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => await window.api.parties.deleteCustomer(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: 'Success', description: 'Customer deleted successfully' })
    },
    onError: (error: any) => {
      const msg = error instanceof Error ? error.message : 'Failed to delete customer'
      toast({ title: 'Delete Failed', description: msg.replace('Error invoking remote method \'parties:deleteCustomer\': Error: ', ''), variant: 'destructive' })
    }
  })
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => await window.api.parties.getSuppliers()
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.parties.createSupplier(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => await window.api.parties.updateSupplier(id, data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => await window.api.parties.deleteSupplier(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast({ title: 'Success', description: 'Supplier deleted successfully' })
    },
    onError: (error: any) => {
      const msg = error instanceof Error ? error.message : 'Failed to delete supplier'
      toast({ title: 'Delete Failed', description: msg.replace('Error invoking remote method \'parties:deleteSupplier\': Error: ', ''), variant: 'destructive' })
    }
  })
}

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => await window.api.parties.getAreas()
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.parties.createArea(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['areas'] })
  })
}

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => await window.api.parties.getRoutes()
  })
}

export function useCreateRoute() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.parties.createRoute(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] })
  })
}
