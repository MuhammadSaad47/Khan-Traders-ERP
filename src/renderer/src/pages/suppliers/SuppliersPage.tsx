import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Truck, Pencil, Trash2 } from 'lucide-react'
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../../hooks/useParties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { CATALOG_SUPPLIERS } from '../../lib/catalog-data'
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

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)
  
  const [supplierName, setSupplierName] = useState('')

  useEffect(() => {
    if (editingSupplier) {
      setSupplierName(editingSupplier.name || '')
    } else {
      setSupplierName('')
    }
  }, [editingSupplier])

  const supplierOptions = useMemo(() => {
    const names = new Set<string>()
    suppliers.forEach((s: any) => names.add(s.name))
    CATALOG_SUPPLIERS.forEach(s => names.add(s))
    return Array.from(names).map(n => ({ value: n, label: n }))
  }, [suppliers])

  const filteredSuppliers = suppliers.filter((s: any) => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleOpenModal = (supplier?: any) => {
    setEditingSupplier(supplier || null)
    setIsModalOpen(true)
  }

  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const address = (form.elements.namedItem('address') as HTMLInputElement).value

    try {
      if (editingSupplier) {
        await updateSupplier.mutateAsync({ id: editingSupplier.id, data: { name, phone, address } })
      } else {
        await createSupplier.mutateAsync({ name, phone, address })
      }
      form.reset()
      setSupplierName('')
      setIsModalOpen(false)
      setEditingSupplier(null)
      toast({ title: 'Success', description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully` })
    } catch (error) {
      console.error('Failed to save supplier:', error)
      toast({ title: 'Error', description: 'Failed to save supplier', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage supplier balances and contact info.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="w-4 h-4" /> New Supplier
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name..." 
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
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Loading suppliers...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Truck className="w-12 h-12 mb-4 opacity-20" />
                      <p>No suppliers found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((s: any) => (
                  <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.phone || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {s.address || '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(s.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(s)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isManager && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(window.confirm(`Delete supplier "${s.name}"?`)) deleteSupplier.mutate(s.id) }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Create New Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Name</label>
              <input type="hidden" name="name" value={supplierName} />
              <Combobox options={supplierOptions} value={supplierName} onChange={setSupplierName} placeholder="e.g. Best Distributors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input name="phone" defaultValue={editingSupplier?.phone || ''} placeholder="e.g. 0300-1234567" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input name="address" defaultValue={editingSupplier?.address || ''} placeholder="Full address..." />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingSupplier ? 'Save Changes' : 'Create Supplier'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
