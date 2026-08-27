import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { useToast } from '@/hooks/use-toast'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => await window.api.catalog.getCategories()
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.catalog.createCategory(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => await window.api.catalog.updateCategory(id, data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (id: number) => await window.api.catalog.deleteCategory(id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  })
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => await window.api.catalog.getItems()
  })
}

// Hook for grouped items (merged by product for POS/Products pages)
export function useItemsGrouped() {
  return useQuery({
    queryKey: ['items-grouped'],
    queryFn: async () => await window.api.catalog.getItemsGrouped()
  })
}

export function useCreateItem() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.catalog.createItem(data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['items-grouped'] })
    }
  })
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return await window.api.catalog.updateItem(id, data, user!.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['items-grouped'] })
    }
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (id: number) => await window.api.catalog.deleteItem(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['items-grouped'] })
      toast({ title: 'Success', description: 'Item deleted successfully' })
    },
    onError: (error: any) => {
      const msg = error instanceof Error ? error.message : 'Failed to delete item'
      toast({ title: 'Delete Failed', description: msg.replace('Error invoking remote method \'catalog:deleteItem\': Error: ', ''), variant: 'destructive' })
    }
  })
}

// Analytics
export function useInventoryAnalytics() {
  return useQuery({
    queryKey: ['inventoryAnalytics'],
    queryFn: async () => await window.api.catalog.getAnalytics()
  })
}
