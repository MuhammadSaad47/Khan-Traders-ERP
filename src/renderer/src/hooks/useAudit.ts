import { useQuery } from '@tanstack/react-query'

export function useAuditLogs(page = 1, limit = 50, filters?: any) {
  return useQuery({
    queryKey: ['audit', 'logs', page, limit, filters],
    queryFn: async () => await window.api.audit.getLogs(page, limit, filters)
  })
}
