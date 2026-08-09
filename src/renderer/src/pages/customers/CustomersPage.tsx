import { useState } from 'react'
import { Plus, Search, Users, MapPin, Pencil, Trash2, Map } from 'lucide-react'
import { useCustomers, useAreas, useRoutes, useCreateCustomer, useUpdateCustomer, useCreateRoute, useCreateArea, useDeleteCustomer } from '../../hooks/useParties'
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
import { useToast } from '@/hooks/use-toast'

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useCustomers()
  const { data: areas = [] } = useAreas()
  const { data: routes = [] } = useRoutes()
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false)

  const filteredCustomers = customers.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.shop_name && c.shop_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleOpenModal = (customer?: any) => {
    setEditingCustomer(customer || null)
    setIsModalOpen(true)
  }

  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const createRoute = useCreateRoute()
  const createArea = useCreateArea()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const shop_name = (form.elements.namedItem('shop_name') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const address = (form.elements.namedItem('address') as HTMLInputElement).value
    const route_id_input = (form.elements.namedItem('route_id') as HTMLSelectElement).value
    const area_id_input = (form.elements.namedItem('area_id') as HTMLSelectElement).value
    const credit_limit_input = (form.elements.namedItem('credit_limit') as HTMLInputElement).value
    
    const credit_limit = credit_limit_input ? parseInt(credit_limit_input) * 100 : 0
    const route_id = route_id_input ? parseInt(route_id_input) : undefined
    const area_id = area_id_input ? parseInt(area_id_input) : undefined

    try {
      if (editingCustomer) {
        await updateCustomer.mutateAsync({ id: editingCustomer.id, data: { name, shop_name, phone, address, credit_limit, route_id, area_id } })
      } else {
        await createCustomer.mutateAsync({ name, shop_name, phone, address, credit_limit, route_id, area_id })
      }
      form.reset()
      setIsModalOpen(false)
      setEditingCustomer(null)
      toast({ title: 'Success', description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully` })
    } catch (error) {
      console.error('Failed to save customer:', error)
      toast({ title: 'Error', description: 'Failed to save customer', variant: 'destructive' })
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
          <Button variant="outline" className="gap-2" onClick={() => setIsAreaModalOpen(true)}>
            <MapPin className="w-4 h-4" /> Manage Areas
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsRouteModalOpen(true)}>
            <Map className="w-4 h-4" /> Manage Routes
          </Button>
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or shop..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-0 shadow-none ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>Customer / Shop</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Credit Status</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p>No customers found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c: any) => {
                  const route = routes.find((r: any) => r.id === c.route_id)
                  const area = areas.find((a: any) => a.id === c.area_id)
                  
                  // Credit logic
                  let dotColor = 'bg-success'
                  if (c.credit_limit > 0) {
                    const pct = c.balance / c.credit_limit
                    if (pct > 0.75) dotColor = 'bg-destructive'
                    else if (pct > 0.25) dotColor = 'bg-warning'
                  }

                  return (
                    <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          {c.shop_name && <span className="text-xs text-muted-foreground">{c.shop_name}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{route ? route.name : '-'} {area ? `(${area.name})` : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone || '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(c.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tabular-nums text-sm text-muted-foreground">
                            Limit: {formatMoney(c.credit_limit)}
                          </span>
                          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(c)}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {isManager && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(window.confirm(`Delete customer "${c.name}"?`)) deleteCustomer.mutate(c.id) }}>
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
        <DialogContent className="sm:max-w-[500px]">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Route</label>
                <select 
                  name="route_id" 
                  defaultValue={editingCustomer?.route_id || ''}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Route --</option>
                  {routes.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Area</label>
                <select 
                  name="area_id" 
                  defaultValue={editingCustomer?.area_id || ''}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Area --</option>
                  {areas.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Credit Limit (Rs)</label>
              <Input name="credit_limit" type="number" defaultValue={editingCustomer ? editingCustomer.credit_limit / 100 : ''} placeholder="0.00" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingCustomer ? 'Save Changes' : 'Create Customer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAreaModalOpen} onOpenChange={setIsAreaModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Manage Areas</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const name = ((e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement).value;
              if (!name) return;
              try { 
                await createArea.mutateAsync({ name }); 
                (e.target as HTMLFormElement).reset(); 
                toast({ title: 'Success', description: 'Area created successfully' })
              } catch(error){
                toast({ title: 'Error', description: 'Failed to create area', variant: 'destructive' })
              }
            }} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">New Area Name</label>
                <Input name="name" required placeholder="e.g. North City" className="h-9" />
              </div>
              <Button type="submit" size="sm" className="h-9">Add</Button>
            </form>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto">
              {areas.map((a: any) => (
                <div key={a.id} className="p-2 border rounded text-sm">{a.name}</div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Manage Routes</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const name = ((e.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement).value;
              if (!name) return;
              try { 
                await createRoute.mutateAsync({ name }); 
                (e.target as HTMLFormElement).reset(); 
                toast({ title: 'Success', description: 'Route created successfully' })
              } catch(error){
                toast({ title: 'Error', description: 'Failed to create route', variant: 'destructive' })
              }
            }} className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">New Route Name</label>
                <Input name="name" required placeholder="e.g. Route A" className="h-9" />
              </div>
              <Button type="submit" size="sm" className="h-9">Add</Button>
            </form>
            <div className="space-y-1 max-h-[40vh] overflow-y-auto">
              {routes.map((r: any) => (
                <div key={r.id} className="p-2 border rounded text-sm">{r.name}</div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
