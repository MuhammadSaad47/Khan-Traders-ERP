import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'

export function useBackupLogs() {
  return useQuery({
    queryKey: ['settings', 'backups'],
    queryFn: async () => await window.api.settings.getBackupLogs()
  })
}

export function useCreateBackup() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async () => await window.api.settings.createBackup(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] })
  })
}

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['settings', 'business'],
    queryFn: async () => await window.api.settings.getBusinessSettings()
  })
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  
  return useMutation({
    mutationFn: async (data: any) => await window.api.settings.updateBusinessSettings(data, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'business'] })
  })
}

export function useCloudBackupStatus() {
  return useQuery({
    queryKey: ['settings', 'cloudBackupStatus'],
    queryFn: async () => await window.api.backup.status(),
    refetchInterval: 30000 // refresh every 30s
  })
}

export function useCloudBackupAuth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => await window.api.backup.auth(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'cloudBackupStatus'] })
  })
}

export function useCloudBackupUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => await window.api.backup.upload(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'cloudBackupStatus'] })
  })
}

export function useCloudBackupRestore() {
  return useMutation({
    mutationFn: async () => await window.api.backup.restore()
  })
}
