import { useState } from 'react'
import { Plus, Search, Users, Pencil, Trash2, CalendarIcon, FileText } from 'lucide-react'
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../../hooks/useParties'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'
import { CustomerStatementDialog } from './CustomerStatementDialog'
import { TopPartiesDialog } from '../../components/TopPartiesDialog'
import { useTopCustomers } from '../../hooks/useParties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuthStore } from '../../stores/auth.store'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'

export default function CustomersPage() {
  const getDateRangeForPreset = (p: DatePreset) => {
    const now = new Date()
    const today = format(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 'yyyy-MM-dd')
    
    switch (p) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday': {
        const yesterday = format(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), 'yyyy-MM-dd')
        return { from: yesterday, to: yesterday }
      }
      case 'this_week':
        return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
      case 'this_month':
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
      case 'last_month': {
        const lm = subMonths(now, 1)
        return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }
      }
      default:
        return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: today }
    }
  }

  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [dateRange, setDateRange] = useState(getDateRangeForPreset('this_month'))
  
  const handlePresetChange = (p: DatePreset) => {
    setPreset(p)
    if (p !== 'custom') {
      setDateRange(getDateRangeForPreset(p))
    }
  }
  const { data: customers = [], isLoading } = useCustomers({ fromDate: dateRange.from, toDate: dateRange.to })
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statementOpen, setStatementOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, id: number, name: string} | null>(null)
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false)
  const { data: topCustomers = [], isLoading: isLoadingTopCustomers } = useTopCustomers()
  const filteredCustomers = customers.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.shop_name && c.shop_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesUnpaid = showUnpaidOnly ? c.balance > 0 : true
    return matchesSearch && matchesUnpaid
  })

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleOpenModal = (customer?: any) => {
    setEditingCustomer(customer || null)
    setIsModalOpen(true)
  }

  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const shop_name = (form.elements.namedItem('shop_name') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const address = (form.elements.namedItem('address') as HTMLInputElement).value
    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, data: { name, shop_name, phone, address } })
      } else {
        await createCustomer.mutateAsync({ name, shop_name, phone, address })
      }
      form.reset()
      setIsModalOpen(false)
      setEditingCustomer(null)
      toast({ title: 'Success', description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully` })
    } catch (error) {
      console.error('Failed to save customer:', error)
      const msg = (error as any)?.message?.replace(/Error invoking remote method '.*?': Error: /, '') || 'Failed to save customer'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage client ledgers, routes, and credit limits.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setAnalyticsOpen(true)} className="gap-2">
            Top Customers
          </Button>
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or shop..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-0 shadow-none ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <Button
          variant={showUnpaidOnly ? 'default' : 'outline'}
          onClick={() => setShowUnpaidOnly(!showUnpaidOnly)}
          className={`gap-2 ${showUnpaidOnly ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}`}
        >
          {showUnpaidOnly ? 'Showing Unpaid Only' : 'Show Unpaid'}
        </Button>

        <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border">
          {(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'] as DatePreset[]).map((p) => (
            <Button
              key={p}
              variant={preset === p ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs capitalize rounded-lg px-2.5 font-medium"
              onClick={() => handlePresetChange(p)}
            >
              {p.replace('_', ' ')}
            </Button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border text-xs font-medium">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            <input 
              type="date" 
              className="bg-transparent focus:outline-none"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
            <span className="text-muted-foreground">to</span>
            <input 
              type="date" 
              className="bg-transparent focus:outline-none"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>Customer / Shop</TableHead>

                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Ctns Sold (Period)</TableHead>
                <TableHead className="text-right">Owed Balance</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p>No customers found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c: any) => {

                  
                  // Credit logic
                  // Removed credit limit indicator logic

                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          {c.shop_name && <span className="text-xs text-muted-foreground">{c.shop_name}</span>}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {c.total_ctns_sold || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={c.balance > 0 ? 'text-destructive font-bold' : ''}>
                          {formatMoney(c.balance || 0)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => {
                            setSelectedCustomer(c)
                            setStatementOpen(true)
                          }} title="View Statement">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(c)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {isManager && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm({ open: true, id: c.id, name: c.name })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Create New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input name="name" defaultValue={editingCustomer?.name || ''} placeholder="e.g. Ali Khan" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shop Name (Optional)</label>
                <Input name="shop_name" defaultValue={editingCustomer?.shop_name || ''} placeholder="e.g. Khan Traders" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input name="phone" defaultValue={editingCustomer?.phone || ''} placeholder="e.g. 0300-1234567" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input name="address" defaultValue={editingCustomer?.address || ''} placeholder="Full address..." />
            </div>


            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingCustomer ? 'Save Changes' : 'Create Customer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        customerId={selectedCustomer?.id || null}
        customerName={selectedCustomer?.name || ''}
        fromDate={dateRange.from}
        toDate={dateRange.to}
      />

      <TopPartiesDialog 
        open={analyticsOpen} 
        onOpenChange={setAnalyticsOpen} 
        title="Top Customers (All Time)" 
        parties={topCustomers} 
        isLoading={isLoadingTopCustomers} 
      />

      {deleteConfirm && (
        <ConfirmDialog 
          open={deleteConfirm.open} 
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          title="Delete Customer"
          description={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          onConfirm={() => {
            deleteCustomer.mutate(deleteConfirm.id)
            setDeleteConfirm(null)
          }}
        />
      )}

    </div>
  )
}
