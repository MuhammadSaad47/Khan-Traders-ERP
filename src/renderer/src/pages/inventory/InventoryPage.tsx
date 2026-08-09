import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Filter, Pencil, Trash2, FolderTree } from 'lucide-react'
import { useItems, useCategories, useCreateItem, useUpdateItem, useCreateCategory, useUpdateCategory, useDeleteCategory, useDeleteItem } from '../../hooks/useCatalog'
import { useSuppliers, useCreateSupplier } from '../../hooks/useParties'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { CATALOG_ITEMS, getSizesForCategory, getPackagingForCategory, getValidSizesForPackaging, getValidPackagingForSize } from '../../lib/catalog-data'
import { Badge } from '@/components/ui/badge'
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
import { useToast } from '@/hooks/use-toast'

export default function InventoryPage() {
  const { data: items = [], isLoading } = useItems()
  const { data: categories = [] } = useCategories()
  const { data: suppliers = [] } = useSuppliers()
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  // State for Comboboxes
  const [itemName, setItemName] = useState('')
  const [itemSize, setItemSize] = useState('')
  const [itemPackaging, setItemPackaging] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  // Update combobox states when editing changes
  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name || '')
      setItemSize(editingItem.size || '')
      setItemPackaging(editingItem.packaging || '')
      setCategoryId(editingItem.category_id?.toString() || '')
      setSupplierId(editingItem.supplier_id?.toString() || '')
    } else {
      setItemName('')
      setItemSize('')
      setItemPackaging('')
      setCategoryId('')
      setSupplierId('')
    }
  }, [editingItem])
  
  // Combine DB items with Catalog items for suggestions
  const itemOptions = useMemo(() => {
    const names = new Set<string>()
    items.forEach((i: any) => names.add(i.name))
    CATALOG_ITEMS.forEach(i => names.add(i.name))
    return Array.from(names).map(n => ({ value: n, label: n }))
  }, [items])

  const selectedItemData = CATALOG_ITEMS.find(i => i.name === itemName);
  const rawSizeOptions = getSizesForCategory(selectedItemData?.category);
  const rawPkgOptions = getPackagingForCategory(selectedItemData?.category);

  const sizeOptions = getValidSizesForPackaging(itemPackaging, rawSizeOptions).map(s => ({ value: s, label: s }));
  const packagingOptions = getValidPackagingForSize(itemSize, rawPkgOptions).map(p => ({ value: p, label: p }));

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const createSupplier = useCreateSupplier()

  const categoryOptions = categories.map((c: any) => ({ value: c.id.toString(), label: c.name }))
  const supplierOptions = suppliers.map((s: any) => ({ value: s.id.toString(), label: s.name }))

  const filteredItems = items.filter((item: any) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.barcode && item.barcode.includes(searchTerm))
  )

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleOpenModal = (item?: any) => {
    setEditingItem(item || null)
    setIsModalOpen(true)
  }

  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const variant = (form.elements.namedItem('variant') as HTMLInputElement).value
    const size = (form.elements.namedItem('size') as HTMLInputElement).value
    const packaging = (form.elements.namedItem('packaging') as HTMLInputElement).value
    const barcode_input = (form.elements.namedItem('barcode') as HTMLInputElement).value
    const barcode = barcode_input ? barcode_input : undefined
    
    const selling_price_input = (form.elements.namedItem('selling_price') as HTMLInputElement).value
    const cost_price_input = (form.elements.namedItem('cost_price') as HTMLInputElement).value
    const low_stock_threshold_input = (form.elements.namedItem('low_stock_threshold') as HTMLInputElement).value

    const selling_price = selling_price_input ? Math.round(parseFloat(selling_price_input) * 100) : 0
    const cost_price = cost_price_input ? Math.round(parseFloat(cost_price_input) * 100) : 0
    
    let final_supplier_id = supplierId ? (isNaN(Number(supplierId)) ? undefined : parseInt(supplierId)) : undefined
    let final_category_id = categoryId ? (isNaN(Number(categoryId)) ? undefined : parseInt(categoryId)) : undefined
    
    const low_stock_threshold = low_stock_threshold_input ? parseInt(low_stock_threshold_input) : 10
    
    try {
      // Handle Inline Custom Entity Creation
      if (categoryId && isNaN(Number(categoryId))) {
        const newCat = await createCategory.mutateAsync({ name: categoryId })
        final_category_id = newCat.id
      }
      if (supplierId && isNaN(Number(supplierId))) {
        const newSup = await createSupplier.mutateAsync({ name: supplierId })
        final_supplier_id = newSup.id
      }

      const payload = {
        name,
        variant,
        size,
        packaging,
        barcode,
        selling_price,
        cost_price,
        supplier_id: final_supplier_id,
        category_id: final_category_id,
        units_per_ctn: 1,
        low_stock_threshold
      }

      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, data: payload })
      } else {
        await createItem.mutateAsync(payload)
      }
      form.reset()
      setItemName('')
      setItemSize('')
      setItemPackaging('')
      setCategoryId('')
      setSupplierId('')
      setIsModalOpen(false)
      setEditingItem(null)
      toast({ title: 'Success', description: `Item ${editingItem ? 'updated' : 'created'} successfully` })
    } catch (error) {
      console.error('Failed to save item:', error)
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' })
    }
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const description = (form.elements.namedItem('description') as HTMLInputElement).value

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: { name, description } })
      } else {
        await createCategory.mutateAsync({ name, description })
      }
      form.reset()
      setEditingCategory(null)
      toast({ title: 'Success', description: `Category ${editingCategory ? 'updated' : 'created'} successfully` })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save category', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your catalog, stock levels, and pricing.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setIsCategoryModalOpen(true)}>
            <FolderTree className="w-4 h-4" /> Manage Categories
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          <Button onClick={() => handleOpenModal(null)} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search items by name or barcode..." 
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
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Barcode</TableHead>
                {isManager && <TableHead className="text-right">Cost Price</TableHead>}
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 7 : 6} className="h-32 text-center text-muted-foreground">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 7 : 6} className="h-32 text-center text-muted-foreground">
                    No items found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: any) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      {item.name}
                      <div className="flex gap-1 mt-0.5">
                        {item.size && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.size}</span>}
                        {item.packaging && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.packaging}</span>}
                        {item.variant && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.variant}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs bg-background">
                        {categories.find((c: any) => c.id === item.category_id)?.name || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs bg-background">
                        {suppliers.find((s: any) => s.id === item.supplier_id)?.name || 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-sm">{item.barcode || '-'}</TableCell>
                    {isManager && <TableCell className="text-right tabular-nums">{formatMoney(item.cost_price)}</TableCell>}
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(item.selling_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.current_stock <= 0 ? 'destructive' : item.current_stock <= item.low_stock_threshold ? 'warning' : 'secondary'}>
                        {item.current_stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(item)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isManager && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(window.confirm(`Delete item "${item.name}"?`)) deleteItem.mutate(item.id) }}>
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
            <DialogTitle>{editingItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input type="hidden" name="name" value={itemName} />
                <Combobox options={itemOptions} value={itemName} onChange={setItemName} placeholder="e.g. Coca Cola" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category (Optional)</label>
                <Combobox 
                  options={categoryOptions} 
                  value={categoryId} 
                  onChange={setCategoryId} 
                  placeholder="-- Select Category --" 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Packaging</label>
                <input type="hidden" name="packaging" value={itemPackaging} />
                <Combobox options={packagingOptions} value={itemPackaging} onChange={setItemPackaging} placeholder="e.g. PET" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Size</label>
                <input type="hidden" name="size" value={itemSize} />
                <Combobox options={sizeOptions} value={itemSize} onChange={setItemSize} placeholder="e.g. 1.5L" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Flavor / Variant</label>
                <Input name="variant" defaultValue={editingItem?.variant || ''} placeholder="e.g. Orange" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Barcode (Optional)</label>
                <Input name="barcode" defaultValue={editingItem?.barcode || ''} placeholder="Scan barcode..." />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ctn Selling Price</label>
                <Input name="selling_price" type="number" step="0.01" defaultValue={editingItem ? (editingItem.selling_price / 100).toFixed(2) : ''} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ctn Cost Price</label>
                <Input name="cost_price" type="number" step="0.01" defaultValue={editingItem ? (editingItem.cost_price / 100).toFixed(2) : ''} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier (Optional)</label>
                <Combobox 
                  options={supplierOptions} 
                  value={supplierId} 
                  onChange={setSupplierId} 
                  placeholder="-- Select Supplier --" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Low Stock Alert (Ctns)</label>
                <Input name="low_stock_threshold" type="number" min="0" defaultValue={editingItem?.low_stock_threshold || 10} required />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Save Changes' : 'Create Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <form onSubmit={handleSaveCategory} className="flex gap-2 items-end border p-3 rounded-md bg-muted/20">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Name</label>
                <Input name="name" defaultValue={editingCategory?.name || ''} placeholder="Category Name" required className="h-8 text-sm" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Input name="description" defaultValue={editingCategory?.description || ''} placeholder="Optional" className="h-8 text-sm" />
              </div>
              <Button type="submit" size="sm" className="h-8">{editingCategory ? 'Update' : 'Add'}</Button>
              {editingCategory && (
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEditingCategory(null)}>Cancel</Button>
              )}
            </form>
            
            <div className="space-y-2">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-2 border rounded-md bg-background">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.description || '-'}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCategory(c)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if(confirm('Delete category?')) deleteCategory.mutate(c.id) }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">No categories found.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
