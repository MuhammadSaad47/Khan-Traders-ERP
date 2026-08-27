import { useState } from 'react'
import * as useVans from '../../hooks/useVans'
import { useAuthStore } from '../../stores/auth.store'
import { useVanSalesmen, useCreateSalesman } from '../../hooks/useUsers'
// useSales omitted
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Truck, Plus, CheckCircle2, Trash2, TrendingUp } from 'lucide-react'
// useAccounts omitted
import { Badge } from '@/components/ui/badge'
import { VanAssignmentReportDialog } from './VanAssignmentReportDialog'
import { format, subDays } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function VanSalesPage() {
  const { data: assignments = [] } = useVans.useActiveAssignments()
  const createAssignment = useVans.useCreateAssignment()
  const reconcileAssignment = useVans.useReconcileAssignment()
  const deleteAssignment = useVans.useDeleteVanAssignment()
  const user = useAuthStore(state => state.user)
  const { data: vanSalesmen = [] } = useVanSalesmen()
  const addSalesman = useCreateSalesman()
  // allSales omitted
  
  const [loadOpen, setLoadOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState<{open: boolean, id: number | null}>({ open: false, id: null })
  const [deleteOpen, setDeleteOpen] = useState<{open: boolean, id: number | null}>({ open: false, id: null })
  const [completeOpen, setCompleteOpen] = useState<{open: boolean, id: number | null}>({ open: false, id: null })
  
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })
  
  const { data: allAssignmentsData, isLoading: isLoadingAll } = useVans.useAllAssignments(page, 10, { fromDate: dateRange.from, toDate: dateRange.to })
  const allAssignmentsHistory = allAssignmentsData?.assignments || []
  const totalAssignments = allAssignmentsData?.total || 0
  const totalPages = Math.ceil(totalAssignments / 10)
  
  const [salesmanId, setSalesmanId] = useState<number | ''>(user?.id || '')
  const [addSalesmanOpen, setAddSalesmanOpen] = useState(false)
  const [salesmanForm, setSalesmanForm] = useState({ fullName: '', phone: '', address: '' })

  const handleLoadVan = async () => {
    if (!salesmanId) { toast({ title: 'Select Salesman', variant: 'destructive' }); return }

    const payload = {
      van_salesman_id: Number(salesmanId),
    }
    await createAssignment.mutateAsync(payload)
    setLoadOpen(false)
    setSalesmanId(user?.id || '')
  }

  const handleAddSalesman = async () => {
    if (!salesmanForm.fullName) { toast({ title: 'Name is required', variant: 'destructive' }); return }
    await addSalesman.mutateAsync(salesmanForm)
    setAddSalesmanOpen(false)
    setSalesmanForm({ fullName: '', phone: '', address: '' })
  }

  const handleComplete = async (id: number) => {
    if (!id) return;
    
    await reconcileAssignment.mutateAsync({ 
      id: id, 
      returns: {} 
    })
  }

  const handleDeleteAssignment = async () => {
    if (!deleteOpen.id) return
    try {
      await deleteAssignment.mutateAsync(deleteOpen.id)
      toast({ title: 'Van session deleted successfully!' })
      setDeleteOpen({ open: false, id: null })
    } catch (e: any) {
      toast({ title: 'Failed to delete van session', description: e.message, variant: 'destructive' })
    }
  }

  // formatMoney omitted

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Van Sales</h1>
          <p className="text-muted-foreground mt-1">Manage van sessions and view transaction history.</p>
        </div>
          <Button onClick={() => setLoadOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Open New Van Session
          </Button>
      </div>

      <h2 className="text-xl font-bold mb-4">Active Sessions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {assignments.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-xl border-dashed">
            No active van sessions. Start a new session to begin selling.
          </div>
        ) : (
          assignments.map((assignment: any) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  {assignment.salesman_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  Started: {new Date(assignment.date).toLocaleString()}
                </div>
                {assignment.notes && (
                  <div className="text-sm mb-4 bg-muted p-2 rounded-md">
                    {assignment.notes}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setReportOpen({ open: true, id: assignment.id })}
                    variant="outline" 
                    className="flex-1 gap-2 border-primary/20 hover:bg-primary/10 text-primary"
                  >
                    <TrendingUp className="w-4 h-4" /> View Report
                  </Button>
                  <Button 
                    onClick={() => setCompleteOpen({ open: true, id: assignment.id })}
                    variant="outline" 
                    className="flex-1 gap-2 text-success hover:text-success hover:bg-success/10 border-success/20"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </Button>
                  <Button 
                    onClick={() => setDeleteOpen({ open: true, id: assignment.id })}
                    variant="outline" 
                    className="gap-2 border-destructive/20 hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Session History</h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">From</div>
            <Input 
              type="date" 
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-auto h-8 text-sm"
            />
            <div className="text-sm text-muted-foreground ml-2">To</div>
            <Input 
              type="date" 
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-auto h-8 text-sm"
            />
          </div>
        </div>
        <div className="bg-surface border shadow-sm rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Session ID</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Salesman</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoadingAll ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading history...</td></tr>
                ) : allAssignmentsHistory.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No van sessions found.</td></tr>
                ) : (
                  allAssignmentsHistory.map((assignment: any) => {
                    // sessionSales omitted
                    return (
                      <tr key={assignment.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">#{assignment.id}</td>
                        <td className="px-4 py-3">{new Date(assignment.date).toLocaleString()}</td>
                        <td className="px-4 py-3">{assignment.salesman_name}</td>
                        <td className="px-4 py-3">
                          <Badge variant={assignment.status === 'reconciled' ? 'success' : assignment.status === 'in_progress' ? 'warning' : 'outline'}>
                            {assignment.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setReportOpen({ open: true, id: assignment.id })} className="text-primary hover:text-primary/80 h-8 px-2">
                            View Report
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalAssignments)} of {totalAssignments} entries
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Load Van Modal */}
      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Open New Van Session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="pb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Salesman</label>
                <div className="flex items-center gap-2">
                  <Select value={salesmanId.toString()} onValueChange={(val) => setSalesmanId(Number(val))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Salesman..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vanSalesmen.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.full_name || u.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setAddSalesmanOpen(true)} title="Add New Salesman">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadOpen(false)}>Cancel</Button>
            <Button onClick={handleLoadVan} disabled={createAssignment.isPending}>Start Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VanAssignmentReportDialog 
        open={reportOpen.open} 
        onOpenChange={(o) => !o && setReportOpen({ open: false, id: null })} 
        assignmentId={reportOpen.id} 
      />

      {/* Add Salesman Modal */}
      <Dialog open={addSalesmanOpen} onOpenChange={setAddSalesmanOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Salesman</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <Input 
                value={salesmanForm.fullName}
                onChange={(e) => setSalesmanForm({...salesmanForm, fullName: e.target.value})}
                placeholder="e.g. Ali Khan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input 
                value={salesmanForm.phone}
                onChange={(e) => setSalesmanForm({...salesmanForm, phone: e.target.value})}
                placeholder="e.g. 0300-1234567"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input 
                value={salesmanForm.address}
                onChange={(e) => setSalesmanForm({...salesmanForm, address: e.target.value})}
                placeholder="e.g. 123 Main St"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSalesmanOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSalesman} disabled={addSalesman?.isPending}>Save Salesman</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Modal */}
      <Dialog open={deleteOpen.open} onOpenChange={(o) => !o && setDeleteOpen({ open: false, id: null })}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Van Session</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            <p className="mb-4">Are you sure you want to delete this van session?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>All loaded items will be restored to inventory</li>
              <li>Associated expenses will be deleted</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen({ open: false, id: null })}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAssignment} disabled={deleteAssignment.isPending}>
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog 
        open={completeOpen.open} 
        onOpenChange={(o) => !o && setCompleteOpen({ open: false, id: null })}
        title="Complete Session"
        description="Are you sure you want to mark this session as completed? Make sure you have reviewed the report and transferred any cash to the main account first."
        onConfirm={() => {
          if (completeOpen.id) handleComplete(completeOpen.id)
          setCompleteOpen({ open: false, id: null })
        }}
      />
    </div>
  )
}
