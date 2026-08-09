import { useState } from 'react'
import { useAuditLogs } from '../../hooks/useAudit'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileSearch } from 'lucide-react'

export default function AuditLogPage() {
  const [filters, setFilters] = useState<{table?: string, action?: string}>({})
  const { data: logs = [] } = useAuditLogs(1, 50, filters)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all system changes and actions.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={filters.action || 'all'} onValueChange={(v) => setFilters(prev => ({...prev, action: v === 'all' ? undefined : v}))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>

        <Input 
          placeholder="Filter by table name..." 
          className="max-w-xs"
          value={filters.table || ''}
          onChange={(e) => setFilters(prev => ({...prev, table: e.target.value || undefined}))}
        />
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead className="w-48">Timestamp</TableHead>
              <TableHead className="w-32">User</TableHead>
              <TableHead className="w-24">Action</TableHead>
              <TableHead className="w-32">Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <FileSearch className="w-8 h-8 mb-2 opacity-50" />
                    No audit logs found matching your filters.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id} className="text-sm hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap font-mono text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{log.username}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      log.action === 'create' ? 'bg-success/10 text-success' :
                      log.action === 'update' ? 'bg-warning/10 text-warning' :
                      log.action === 'delete' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}>
                      {log.action.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                  <TableCell className="font-mono text-xs">{log.record_id}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground cursor-help" title={log.new_value || log.old_value}>
                    {log.new_value || log.old_value || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
