import { useState } from 'react'
import { Search, Save, X } from 'lucide-react'
import { useItemsGrouped, useUpdateItem } from '../../hooks/useCatalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

export default function ProductsPage() {
  const { data: items = [], isLoading } = useItemsGrouped()
  const { toast } = useToast()
  const updateItem = useUpdateItem()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [editingPrices, setEditingPrices] = useState<Record<number, string>>({})
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.size && item.size.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.packaging && item.packaging.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let matchesStock = true
    const stock = item.combined_stock !== undefined ? item.combined_stock : item.current_stock
    if (stockFilter === 'low') {
      matchesStock = stock <= item.low_stock_threshold && stock > 0
    } else if (stockFilter === 'out') {
      matchesStock = stock <= 0
    }

    return matchesSearch && matchesStock
  })

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleStartEdit = (itemId: number, currentPrice: number) => {
    setEditingPrices(prev => ({
      ...prev,
      [itemId]: Math.round(currentPrice / 100).toString() // Show as whole number (no decimals)
    }))
  }

  const handleCancelEdit = (itemId: number) => {
    setEditingPrices(prev => {
      const newState = { ...prev }
      delete newState[itemId]
      return newState
    })
  }

  const handleSavePrice = async (item: any) => {
    await handleSavePriceEdit(item)
  }

  const handleSavePriceEdit = async (item: any) => {
    const newPriceStr = editingPrices[item.id]
    if (!newPriceStr || parseFloat(newPriceStr) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid price', variant: 'destructive' })
      return
    }

    setSavingIds(prev => new Set(prev).add(item.id))

    try {
      const selling_price = Math.round(parseFloat(newPriceStr) * 100)
      
      // If this is a grouped item, update ALL items in the group
      const itemIds = item.grouped_ids || [item.id]
      
      for (const itemId of itemIds) {
        // Fetch the full item data for this ID
        const fullItem = await window.api.catalog.getItems().then((items: any[]) => 
          items.find((i: any) => i.id === itemId)
        )
        
        if (fullItem) {
          await updateItem.mutateAsync({
            id: itemId,
            data: {
              name: fullItem.name,
              variant: fullItem.variant || undefined,
              size: fullItem.size || undefined,
              packaging: fullItem.packaging || undefined,
              barcode: fullItem.barcode || undefined, // Convert null to undefined for Zod
              selling_price,
              cost_price: fullItem.cost_price,
              supplier_id: fullItem.supplier_id || undefined,
              category_id: fullItem.category_id || undefined,

              low_stock_threshold: fullItem.low_stock_threshold
            }
          })
        }
      }

      handleCancelEdit(item.id)
      toast({ 
        title: 'Price Updated', 
        description: `${item.name} selling price updated to Rs ${(selling_price / 100).toFixed(0)}/ctn for all suppliers` 
      })
    } catch (error) {
      console.error('Failed to update price:', error)
      const msg = (error as any)?.message?.replace(/Error invoking remote method '.*?': Error: /, '') || 'Failed to update price'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSavingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, item: any) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSavePrice(item)
    } else if (e.key === 'Escape') {
      handleCancelEdit(item.id)
    }
  }

  const isEditing = (itemId: number) => itemId in editingPrices
  const isSaving = (itemId: number) => savingIds.has(itemId)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Pricing</h1>
          <p className="text-muted-foreground mt-1">Manage selling prices for all products</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search products by name, size, or packaging..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-0 shadow-none ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={stockFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStockFilter('all')}
            size="sm"
          >
            All Stock
          </Button>
          <Button
            variant={stockFilter === 'low' ? 'default' : 'outline'}
            onClick={() => setStockFilter('low')}
            size="sm"
            className={stockFilter === 'low' ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}
          >
            Low Stock
          </Button>
          <Button
            variant={stockFilter === 'out' ? 'default' : 'outline'}
            onClick={() => setStockFilter('out')}
            size="sm"
            className={stockFilter === 'out' ? 'bg-destructive hover:bg-destructive/90 text-white border-destructive' : 'text-destructive border-red-200 hover:bg-red-50'}
          >
            Out of Stock
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[40%]">Product Name</TableHead>
                <TableHead className="text-right">Cost/Ctn</TableHead>
                <TableHead className="text-right w-[200px]">Current Selling Price</TableHead>
                <TableHead className="text-right w-[200px]">New Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No products found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: any) => (
                  <TableRow key={item.id} className={`group hover:bg-muted/30 transition-colors ${isEditing(item.id) ? 'bg-muted/20' : ''}`}>
                    <TableCell className="font-medium">
                      {item.name}
                      <div className="flex gap-1 mt-0.5">
                        {item.size && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.size}</span>}
                        {item.packaging && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.packaging}</span>}
                        {item.variant && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.variant}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(item.weighted_cost || item.cost_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {isEditing(item.id) ? (
                        <span className="text-muted-foreground line-through">
                          {formatMoney(item.selling_price)}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item.id, item.selling_price)}
                          className="hover:bg-primary/10 px-3 py-1.5 rounded transition-colors cursor-pointer w-full text-right"
                        >
                          {formatMoney(item.selling_price)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing(item.id) ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-muted-foreground">Rs</span>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={editingPrices[item.id]}
                            onChange={(e) => setEditingPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onKeyDown={(e) => handleKeyDown(e, item)}
                            autoFocus
                            disabled={isSaving(item.id)}
                            className="w-28 h-9 text-right font-semibold"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.combined_stock <= 0 ? 'destructive' : item.combined_stock <= item.low_stock_threshold ? 'warning' : 'secondary'}>
                        {item.combined_stock || item.current_stock} Ctns
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing(item.id) ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(item)}
                            disabled={isSaving(item.id)}
                            className="h-8 px-3"
                          >
                            {isSaving(item.id) ? (
                              <span className="animate-spin">⏳</span>
                            ) : (
                              <><Save className="w-3 h-3 mr-1" /> Save</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelEdit(item.id)}
                            disabled={isSaving(item.id)}
                            className="h-8 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(item.id, item.selling_price)}
                          className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Edit Price
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
