import { useState } from 'react'
import * as useVans from '../../hooks/useVans'
import { useAuthStore } from '../../stores/auth.store'
import { useUsers, useCreateSalesman } from '../../hooks/useUsers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Truck, Plus, CheckCircle2, Receipt, Banknote } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'

export default function VanSalesPage() {
  const { data: assignments = [] } = useVans.useActiveAssignments()
  const createAssignment = useVans.useCreateAssignment()
  const reconcileAssignment = useVans.useReconcileAssignment()
  const user = useAuthStore(state => state.user)
  const { data: users = [] } = useUsers()
  const addSalesman = useCreateSalesman()
  
  const [loadOpen, setLoadOpen] = useState(false)
  const [reconcileOpen, setReconcileOpen] = useState<{open: boolean, id: number | null}>({ open: false, id: null })
  
  const [page, setPage] = useState(1)
  const { data: allAssignmentsData, isLoading: isLoadingAll } = useVans.useAllAssignments(page, 10)
  const allAssignments = allAssignmentsData?.assignments || []
  const totalAssignments = allAssignmentsData?.total || 0
  const totalPages = Math.ceil(totalAssignments / 10)
  
  // Dummy states for form inputs (in a real app, use react-hook-form)
  const [salesmanId, setSalesmanId] = useState<number | ''>(user?.id || '')
  
  const [addSalesmanOpen, setAddSalesmanOpen] = useState(false)
  const [salesmanForm, setSalesmanForm] = useState({ fullName: '', phone: '', address: '' })
  
  const { data: accounts = [] } = useAccounts()
  const addExpense = useVans.useAddVanExpense()

  const [expenseOpen, setExpenseOpen] = useState<{open: boolean, id: number | null}>({ open: false, id: null })
  const [expenseForm, setExpenseForm] = useState({ amount: '', note: '', categoryId: 1, accountId: '' })

  const [depositAccountId, setDepositAccountId] = useState<number | ''>('')
  
  // Custom hook usage for reconcile details
  const { data: reconcileDetails } = useVans.useAssignmentDetails(reconcileOpen.id as number)

  const handleLoadVan = async () => {
    if (!salesmanId) return alert('Select Salesman')

    const payload = {
      van_salesman_id: Number(salesmanId),
    }
    await createAssignment.mutateAsync(payload)
    setLoadOpen(false)
  }

  const handleAddSalesman = async () => {
    if (!salesmanForm.fullName) return alert('Name is required')
    await addSalesman.mutateAsync(salesmanForm)
    setAddSalesmanOpen(false)
    setSalesmanForm({ fullName: '', phone: '', address: '' })
  }

  const handleAddExpense = async () => {
    if (!expenseOpen.id || !expenseForm.amount || !expenseForm.accountId) return
    await addExpense.mutateAsync({
      id: expenseOpen.id,
      amount: Number(expenseForm.amount) * 100, // paisa
      categoryId: Number(expenseForm.categoryId),
      accountId: Number(expenseForm.accountId),
      note: expenseForm.note
    })
    setExpenseOpen({ open: false, id: null })
    setExpenseForm({ amount: '', note: '', categoryId: 1, accountId: '' })
  }

  const handleReconcile = async () => {
    if (!reconcileOpen.id || !depositAccountId) return alert("Select deposit account")
    
    const cashCollected = (reconcileDetails?.stats?.total_collected || 0) - (reconcileDetails?.stats?.total_expenses || 0)

    await reconcileAssignment.mutateAsync({ 
      id: reconcileOpen.id, 
      returns: {
        cash_collected: cashCollected > 0 ? cashCollected : 0,
        account_id: Number(depositAccountId)
      } 
    })
    
    setReconcileOpen({ open: false, id: null })
    setDepositAccountId('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Van Sales</h1>
          <p className="text-muted-foreground mt-1">Manage active van loads and end-of-day reconciliation.</p>
        </div>
          <Button onClick={() => setLoadOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Open New Van Session
          </Button>
      </div>

      <h2 className="text-xl font-bold mb-4">Active Assignments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-xl border-dashed">
            No active van assignments. Load a van to get started.
          </div>
        ) : (
          assignments.map((assignment: any) => (
            <Card key={assignment.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    {assignment.salesman_name}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Active
                  </span>
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
                    onClick={() => setExpenseOpen({ open: true, id: assignment.id })}
                    variant="outline" 
                    className="flex-1 gap-2 border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <Receipt className="w-4 h-4" /> Add Expense
                  </Button>
                  <Button 
                    onClick={() => setReconcileOpen({ open: true, id: assignment.id })}
                    variant="outline" 
                    className="flex-1 gap-2 text-success hover:text-success hover:bg-success/10 border-success/20"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Reconcile EOD
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Van Sales History</h2>
        <div className="bg-surface border shadow-sm rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Session ID</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Salesman</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoadingAll ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading history...</td></tr>
                ) : allAssignments.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No van sessions found.</td></tr>
                ) : (
                  allAssignments.map((assignment: any) => (
                    <tr key={assignment.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">#{assignment.id}</td>
                      <td className="px-4 py-3">{new Date(assignment.date).toLocaleString()}</td>
                      <td className="px-4 py-3">{assignment.salesman_name}</td>
                      <td className="px-4 py-3 capitalize">{assignment.status.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-muted-foreground">{assignment.notes || '-'}</td>
                    </tr>
                  ))
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
        <DialogContent className="max-w-md">
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
                      {users.map((u: any) => (
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

      {/* Reconcile Modal */}
      <Dialog open={reconcileOpen.open} onOpenChange={(o) => !o && setReconcileOpen({ open: false, id: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End of Day Reconciliation</DialogTitle>
          </DialogHeader>
          {reconcileDetails ? (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              
              {/* Financial Summary */}
              <div className="bg-muted p-4 rounded-lg space-y-2 mb-2">
                <h3 className="font-bold border-b pb-2 mb-2 flex items-center gap-2"><Banknote className="w-4 h-4" /> Financial Summary</h3>
                <div className="flex justify-between text-sm">
                  <span>Cash Collected from Sales:</span>
                  <span>Rs {((reconcileDetails.stats.total_collected || 0) / 100).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive">
                  <span>Less Van Expenses:</span>
                  <span>- Rs {((reconcileDetails.stats.total_expenses || 0) / 100).toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2 text-success">
                  <span>Net Cash to Deposit:</span>
                  <span>Rs {(((reconcileDetails.stats.total_collected || 0) - (reconcileDetails.stats.total_expenses || 0)) / 100).toFixed(0)}</span>
                </div>
                
                <div className="pt-2 mt-2 border-t">
                  <label className="text-sm font-medium mb-1 block">Deposit Cash To</label>
                  <select 
                    className="w-full h-9 border rounded-md px-2 text-sm"
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(Number(e.target.value))}
                  >
                    <option value="" disabled>Select Account...</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-8 text-muted-foreground">Loading details...</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen({ open: false, id: null })}>Cancel</Button>
            <Button onClick={handleReconcile} disabled={reconcileAssignment.isPending}>Confirm & Close Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Modal */}
      <Dialog open={expenseOpen.open} onOpenChange={(o) => !o && setExpenseOpen({ open: false, id: null })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Van Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select 
                className="w-full h-10 border rounded-md px-3 text-sm"
                value={expenseForm.categoryId}
                onChange={(e) => setExpenseForm({...expenseForm, categoryId: Number(e.target.value)})}
              >
                <option value={1}>Fuel</option>
                <option value={2}>Food / Meals</option>
                <option value={3}>Toll Tax</option>
                <option value={4}>Maintenance</option>
                <option value={5}>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (Rs)</label>
              <Input 
                type="number" min="1"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid From (Cash Drawer)</label>
              <select 
                className="w-full h-10 border rounded-md px-3 text-sm"
                value={expenseForm.accountId}
                onChange={(e) => setExpenseForm({...expenseForm, accountId: e.target.value})}
              >
                <option value="" disabled>Select Account...</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input 
                value={expenseForm.note}
                onChange={(e) => setExpenseForm({...expenseForm, note: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen({ open: false, id: null })}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={addExpense.isPending}>Save Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Salesman Modal */}
      <Dialog open={addSalesmanOpen} onOpenChange={setAddSalesmanOpen}>
        <DialogContent className="max-w-sm">
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
    </div>
  )
}
