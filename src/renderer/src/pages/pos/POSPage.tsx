import { format } from 'date-fns'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Trash2, Printer, CheckCircle, Package, XCircle } from 'lucide-react'
import { ThermalReceipt } from '../../components/ThermalReceipt'
import { useItemsGrouped, useUpdateItem } from '../../hooks/useCatalog'
import { useCustomers, useCreateCustomer } from '../../hooks/useParties'
import { useActiveAssignments } from '../../hooks/useVans'
import { useCartStore } from '../../stores/cart.store'
import { useCreateSale, usePrintReceipt, useSaleDetails, useUpdateSale } from '../../hooks/useSales'
import { useAccounts } from '../../hooks/useAccounts'
import { useExpenseCategories } from '../../hooks/useExpenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { numberToWords } from '../../lib/numberToWords'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function POSPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryParams = new URLSearchParams(location.search)
  const editSaleId = queryParams.get('editSaleId') ? Number(queryParams.get('editSaleId')) : null

  const { data: items = [] } = useItemsGrouped()
  const { data: customers = [] } = useCustomers()
  const { data: activeVans = [] } = useActiveAssignments()
  const cart = useCartStore()
  const createSale = useCreateSale()
  const updateSaleMutation = useUpdateSale()
  const updateItemMutation = useUpdateItem()
  const printReceipt = usePrintReceipt()
  const createCustomer = useCreateCustomer()
  const { data: accounts = [] } = useAccounts()
  const { data: expenseCategories = [] } = useExpenseCategories()
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedVanId, setSelectedVanId] = useState<number | null>(null)
  
  const { data: editSaleData } = useSaleDetails(editSaleId)
  const [hasLoadedEdit, setHasLoadedEdit] = useState(false)

  // Populate POS with Edit Data
  useEffect(() => {
    if (editSaleId && editSaleData && !hasLoadedEdit) {
      cart.setCartItems(editSaleData.items.map((i: any) => ({
        item_id: i.item_id,
        name: i.item_name,
        qty: i.qty,
        unit_price: i.unit_price, // keeping it in paisa as cart expects
        line_total: i.qty * i.unit_price
      })))
      cart.setCustomer(editSaleData.sale.customer_id)
      cart.setDiscount(editSaleData.sale.discount)
      cart.setPaidAmount(editSaleData.sale.paid_amount)

      setSelectedVanId(editSaleData.sale.van_assignment_id || null)
      // Load the original sale date when editing
      if (editSaleData.sale.date) {
        setSaleDate(format(new Date(editSaleData.sale.date), 'yyyy-MM-dd'))
      }
      setHasLoadedEdit(true)
    }
  }, [editSaleId, editSaleData, hasLoadedEdit, cart])

  const handleCancelEdit = () => {
    cart.clearCart()
    navigate('/sales')
  }
  
  // Print preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [paperSize, setPaperSize] = useState<58 | 80>(80)

  const [overheads, setOverheads] = useState<{category_id: number | string, amount: number, account_id: number | ''}[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'easypaisa' | 'bank' | 'other'>('cash')
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [saleDate, setSaleDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // Auto-select first account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id)
    }
  }, [accounts, selectedAccountId])

  const handleAddOverhead = () => setOverheads([...overheads, { category_id: '', amount: 0, account_id: '' }])
  const handleRemoveOverhead = (idx: number) => setOverheads(overheads.filter((_, i) => i !== idx))
  const handleUpdateOverhead = (idx: number, field: 'category_id' | 'amount' | 'account_id', value: any) => {
    const newOverheads = [...overheads]
    newOverheads[idx] = { ...newOverheads[idx], [field]: value }
    setOverheads(newOverheads)
  }

  const overheadsTotal = overheads.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  const expenseCategoryOptions = expenseCategories.map((c: any) => ({ value: c.id.toString(), label: c.name }))

  useKeyboardShortcuts({
    'F2': () => searchInputRef.current?.focus(),
    'F9': () => {
      if (cart.items.length > 0 && !createSale.isPending && !previewOpen) {
        setPreviewOpen(true)
      }
    },
    'Esc': () => {
      if (previewOpen) {
        setPreviewOpen(false)
        setOverheads([])
      }
      else cart.clearCart()
    }
  })

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // New States for Cascading Filters
  const [filterName, setFilterName] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [filterPkg, setFilterPkg] = useState('')

  // Faceted Name Options
  const nameOptions = useMemo(() => {
    const names = new Set<string>()
    items.forEach((i: any) => {
      const matchesSearch = searchTerm ? (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.barcode && i.barcode.includes(searchTerm))) : true
      const matchesSize = filterSize ? i.size === filterSize : true
      const matchesPkg = filterPkg ? i.packaging === filterPkg : true
      if (matchesSearch && matchesSize && matchesPkg && i.name) names.add(i.name)
    })
    return Array.from(names).map(n => ({ value: n, label: n }))
  }, [items, searchTerm, filterSize, filterPkg])

  // Faceted Size Options
  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>()
    items.forEach((i: any) => {
      const matchesSearch = searchTerm ? (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.barcode && i.barcode.includes(searchTerm))) : true
      const matchesName = filterName ? i.name === filterName : true
      const matchesPkg = filterPkg ? i.packaging === filterPkg : true
      if (matchesSearch && matchesName && matchesPkg && i.size) sizes.add(i.size)
    })
    return Array.from(sizes).map(s => ({ value: s, label: s }))
  }, [items, searchTerm, filterName, filterPkg])

  // Faceted Pkg Options
  const pkgOptions = useMemo(() => {
    const pkgs = new Set<string>()
    items.forEach((i: any) => {
      const matchesSearch = searchTerm ? (i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.barcode && i.barcode.includes(searchTerm))) : true
      const matchesName = filterName ? i.name === filterName : true
      const matchesSize = filterSize ? i.size === filterSize : true
      if (matchesSearch && matchesName && matchesSize && i.packaging) pkgs.add(i.packaging)
    })
    return Array.from(pkgs).map(p => ({ value: p, label: p }))
  }, [items, searchTerm, filterName, filterSize])

  // Reset dependent filters when parent changes
  useEffect(() => {
    setFilterSize('')
    setFilterPkg('')
  }, [filterName])

  useEffect(() => {
    setFilterPkg('')
  }, [filterSize])

  // Intelligent Auto-Select Logic
  useEffect(() => {
    if (filterName && sizeOptions.length === 1 && filterSize !== sizeOptions[0].value) {
      setFilterSize(sizeOptions[0].value)
    }
  }, [filterName, sizeOptions, filterSize])

  useEffect(() => {
    if (filterSize && pkgOptions.length === 1 && filterPkg !== pkgOptions[0].value) {
      setFilterPkg(pkgOptions[0].value)
    }
  }, [filterSize, pkgOptions, filterPkg])

  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.barcode && item.barcode.includes(searchTerm))
    const matchesName = filterName ? item.name === filterName : true
    const matchesSize = filterSize ? item.size === filterSize : true
    const matchesPkg = filterPkg ? item.packaging === filterPkg : true
    return matchesSearch && matchesName && matchesSize && matchesPkg
  })

  const handleItemClick = (item: any) => {
    // Check if item is out of stock
    const stock = item.combined_stock || item.current_stock
    if (stock <= 0) {
      toast({ 
        title: 'Out of Stock', 
        description: `${item.name} is out of stock and cannot be added.`,
        variant: 'destructive'
      })
      return
    }
    
    // Check how many of this item are already in cart
    const cartQty = cart.items.find(ci => ci.item_id === item.id)?.qty || 0
    const availableQty = stock - cartQty
    
    if (availableQty <= 0) {
      toast({ 
        title: 'Insufficient Stock', 
        description: `Only ${cartQty} ${item.name} can be added (warehouse has ${stock} available).`,
        variant: 'destructive'
      })
      return
    }
    
    cart.addItem(item)
    setSearchTerm('')
    searchInputRef.current?.focus()
  }

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const customerOptions = customers.map((c: any) => ({
    value: c.id.toString(),
    label: `${c.name} ${c.balance > 0 ? `(Owes ${formatMoney(c.balance)})` : ''}`
  }))

  const vanOptions = [
    { value: 'none', label: '📦 Direct Warehouse Sale' },
    ...activeVans.map((v: any) => ({
      value: v.id.toString(),
      label: `🚚 Van Session #${v.id} - ${v.salesman_name}`
    }))
  ]

  const subtotal = cart.items.reduce((acc, i) => acc + i.line_total, 0)
  const netTotal = subtotal - cart.discount

  const totalCartCtns = cart.items.reduce((acc, i) => acc + (i.qty || 0), 0)
  const totalInventoryCtns = useMemo(() => {
    return items.reduce((acc: number, i: any) => acc + (i.combined_stock || i.current_stock || 0), 0)
  }, [items])

  const executeCheckout = async (widthSize: 58 | 80) => {
    if (cart.items.length === 0) return

    try {
      let final_customer_id = typeof cart.customer_id === 'number' ? cart.customer_id : undefined;
      if (typeof cart.customer_id === 'string' && cart.customer_id !== '') {
        if (isNaN(Number(cart.customer_id))) {
          const newCust = await createCustomer.mutateAsync({ name: cart.customer_id })
          final_customer_id = newCust.id;
        } else {
          final_customer_id = Number(cart.customer_id);
        }
      }

      const payload = {
        customer_id: final_customer_id,
        subtotal,
        discount: cart.discount,
        net_total: netTotal,
        paid_amount: cart.paid_amount,
        payment_method: cart.paid_amount > 0 ? selectedPaymentMethod : undefined,
        account_id: cart.paid_amount > 0 ? selectedAccountId : undefined, 
        sale_type: selectedVanId ? 'van' : cart.sale_type,
        van_assignment_id: selectedVanId || undefined,

        date: saleDate ? saleDate + 'T12:00:00.000Z' : undefined,
        items: cart.items,
        overheads: overheads.filter(oh => oh.category_id && oh.amount > 0 && oh.account_id).map(oh => ({
          category_id: typeof oh.category_id === 'string' && !isNaN(Number(oh.category_id)) ? Number(oh.category_id) : oh.category_id,
          amount: oh.amount * 100,
          account_id: Number(oh.account_id),
          date: saleDate ? saleDate + 'T12:00:00.000Z' : new Date().toISOString()
        }))
      }

      let sale;
      if (editSaleId) {
        sale = await updateSaleMutation.mutateAsync({ saleId: editSaleId, data: payload })
      } else {
        sale = await createSale.mutateAsync(payload)
      }

      const customer = final_customer_id ? customers.find((c: any) => c.id === final_customer_id) : undefined
      
      printReceipt.mutate({
        invoiceNo: sale.invoice_no,
        customerName: customer?.name,
        items: cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.unit_price, lineTotal: i.line_total })),
        subtotal,
        discount: cart.discount,
        netTotal,
        paidAmount: cart.paid_amount,
        date: sale.date,
        width: widthSize
      })

      setPreviewOpen(false)
      cart.clearCart()
      setSearchTerm('')

      setOverheads([])
      
      if (editSaleId) {
        navigate('/sales')
      } else {
        searchInputRef.current?.focus()
      }
      toast({ title: 'Success', description: editSaleId ? 'Sale updated successfully' : 'Sale completed successfully' })
    } catch (error: any) {
      console.error('Checkout failed:', error)
      const msg = error?.message || 'Failed to process transaction'
      toast({ title: 'Checkout Error', description: msg, variant: 'destructive' })
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      
      {/* Left Pane - Catalog/Search */}
      <div className="flex-1 flex flex-col p-4 gap-4 border-r border-border">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              ref={searchInputRef}
              autoFocus
              placeholder="Scan barcode or search item... (F2)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg bg-surface border-border shadow-sm ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredItems.length === 1) {
                  handleItemClick(filteredItems[0])
                }
              }}
            />
          </div>
          <div className="hidden sm:flex flex-col items-center justify-center bg-surface border border-border/60 rounded-lg px-4 h-12 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] cursor-default">
             <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider leading-tight">Total Inventory</span>
             <span className="font-extrabold text-sm leading-tight text-primary">{totalInventoryCtns.toLocaleString()} Ctns</span>
          </div>
        </div>

        {/* Cascading Advanced Filters */}
        <div className="flex items-center gap-2 pb-2 mt-1">
          <div className="flex-[2]">
            <Combobox 
              options={nameOptions} 
              value={filterName} 
              onChange={setFilterName} 
              placeholder="Filter by Name..."
              autoSelectFirstMatch={true}
            />
          </div>
          <div className="flex-1">
            <Combobox 
              options={sizeOptions} 
              value={filterSize} 
              onChange={setFilterSize} 
              placeholder="Size..."
              autoSelectFirstMatch={true}
            />
          </div>
          <div className="flex-1">
            <Combobox 
              options={pkgOptions} 
              value={filterPkg} 
              onChange={setFilterPkg} 
              placeholder="Pkg..."
              autoSelectFirstMatch={true}
            />
          </div>
          {(filterName || filterSize || filterPkg) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterName(''); setFilterSize(''); setFilterPkg(''); }} className="px-2 text-muted-foreground hover:text-foreground">
              Clear
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
            {filteredItems.map((item: any) => {
              const stock = item.combined_stock || item.current_stock
              const isOut = stock <= 0
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex flex-col text-left p-3 rounded-xl border bg-surface hover:border-primary transition-all active:scale-95 ${isOut ? 'opacity-50' : 'shadow-sm'}`}
                >
                  <div className="font-semibold truncate w-full">{item.name}</div>
                  <div className="text-sm text-muted-foreground truncate w-full">
                    {[item.variant, item.size, item.packaging].filter(Boolean).join(' • ') || 'Standard'}
                  </div>
                  <div className="mt-auto pt-3 flex flex-col gap-1 w-full">
                    <div className="flex justify-between w-full items-end">
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {formatMoney(item.selling_price)}
                      </div>
                      <div className="text-right text-xs mt-1">
                        <Badge variant={stock <= 0 ? 'destructive' : stock <= item.low_stock_threshold ? 'warning' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {stock} Ctns
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Pane - Cart */}
      <div className="w-[400px] flex flex-col bg-surface/50">
        <div className="p-4 border-b border-border bg-surface">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Current Sale
            </h2>
            {totalCartCtns > 0 && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-bold shadow-sm">
                {totalCartCtns.toLocaleString()} Ctns Total
              </Badge>
            )}
          </div>
          {editSaleId && (
            <div className="mt-3 text-sm font-bold text-blue-600 bg-blue-100 p-2 rounded border border-blue-200 flex justify-between items-center shadow-sm">
              <span>Editing Sale #{editSaleId}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-blue-700 hover:bg-blue-200" onClick={handleCancelEdit}>Cancel</Button>
            </div>
          )}
          <Combobox 
            className="mt-3 bg-background border-primary/30 font-medium"
            options={vanOptions}
            value={selectedVanId?.toString() || 'none'}
            onChange={(val) => setSelectedVanId(val === 'none' || !val ? null : Number(val))}
            placeholder="Select Sale Source..."
          />
          <Combobox 
            className="mt-2 bg-background"
            options={customerOptions}
            value={cart.customer_id?.toString() || ''}
            onChange={(val) => cart.setCustomer(val || undefined)}
            placeholder={selectedVanId ? "Walk-in Customer (Optional)" : "Walk-in Customer"}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <Package className="w-12 h-12 mb-2" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.items.map((i) => {
              const itemDetails = items.find((item: any) => item.id === i.item_id)
              return (
              <div key={i.item_id} className="flex flex-col bg-background p-3 rounded-lg border border-border shadow-sm group">
                <div className="flex justify-between font-medium">
                  <span className="truncate pr-2">{i.name}</span>
                  <span>{formatMoney(i.line_total)}</span>
                </div>
                {itemDetails && (itemDetails.size || itemDetails.packaging) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[itemDetails.size, itemDetails.packaging].filter(Boolean).join(' • ')}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 gap-2">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-muted-foreground text-xs font-semibold mt-[2px]">
                        Price:
                      </span>
                      <Input
                        type="number"
                        min="0"
                        className="w-24 h-7 text-center font-semibold px-1 bg-white/50"
                        value={i.unit_price / 100 || ''}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          const val = valStr ? Number(valStr) * 100 : 0;
                          cart.updatePrice(i.item_id, val);
                        }}
                        onBlur={async (e) => {
                          const valStr = e.target.value;
                          if (!valStr) return;
                          const val = Number(valStr) * 100;
                          const itemDetails = items.find((it: any) => it.id === i.item_id);
                          if (val > 0 && itemDetails && val !== itemDetails.selling_price) {
                            try {
                              const itemIds = itemDetails.grouped_ids || [itemDetails.id]
                              for (const itemId of itemIds) {
                                const fullItem = await window.api.catalog.getItems().then((all: any[]) => 
                                  all.find((it: any) => it.id === itemId)
                                )
                                if (fullItem) {
                                  await updateItemMutation.mutateAsync({
                                    id: itemId,
                                    data: {
                                      name: fullItem.name,
                                      variant: fullItem.variant || undefined,
                                      size: fullItem.size || undefined,
                                      packaging: fullItem.packaging || undefined,
                                      barcode: fullItem.barcode || undefined,
                                      selling_price: val,
                                      cost_price: fullItem.cost_price,
                                      supplier_id: fullItem.supplier_id || undefined,
                                      category_id: fullItem.category_id || undefined,

                                      low_stock_threshold: fullItem.low_stock_threshold
                                    }
                                  })
                                }
                              }
                              toast({ title: 'Price Updated', description: `Master price updated for ${i.name}` })
                            } catch (error: any) {
                              toast({ title: 'Error', description: 'Failed to update master price', variant: 'destructive' })
                            }
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground ml-auto">Total: {formatMoney(i.line_total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-muted-foreground text-xs font-semibold mt-[2px]">
                        Qty (Ctn):
                      </span>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => cart.updateCtns(i.item_id, Math.max(1, i.qty - 1))}>-</Button>
                      <Input
                        type="number"
                        min="0"
                        max={items.find((item: any) => item.id === i.item_id)?.combined_stock || items.find((item: any) => item.id === i.item_id)?.current_stock || i.qty}
                        className="w-20 h-7 text-center font-semibold px-1"
                        value={i.qty === 0 ? '' : i.qty}
                        onChange={(e) => {
                          const item = items.find((it: any) => it.id === i.item_id)
                          const maxQty = item?.combined_stock || item?.current_stock || i.qty
                          const valStr = e.target.value
                          if (valStr === '') {
                            cart.updateCtns(i.item_id, 0)
                            return
                          }
                          const val = parseInt(valStr)
                          if (!isNaN(val)) {
                            if (val > maxQty) {
                              toast({ 
                                title: 'Insufficient Stock', 
                                description: `Only ${maxQty} units available in warehouse.`,
                                variant: 'destructive'
                              })
                              cart.updateCtns(i.item_id, maxQty)
                            } else {
                              cart.updateCtns(i.item_id, val >= 0 ? val : 0)
                            }
                          }
                        }}
                      />
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => {
                        const item = items.find((it: any) => it.id === i.item_id)
                        const maxQty = item?.combined_stock || item?.current_stock || i.qty
                        if (i.qty + 1 <= maxQty) {
                          cart.updateCtns(i.item_id, i.qty + 1)
                        } else {
                          toast({ 
                            title: 'Stock Limit Reached', 
                            description: `Maximum available: ${maxQty} units`,
                            variant: 'destructive'
                          })
                        }
                      }}>+</Button>
                    </div>
                  </div>
                  <button onClick={() => cart.removeItem(i.item_id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 self-start mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})
          )}
        </div>

        <div className="p-4 bg-surface border-t border-border space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Discount</span>
            <Input 
              type="number" 
              className="w-24 h-7 text-right" 
              value={cart.discount ? cart.discount / 100 : ''} 
              onChange={(e) => cart.setDiscount(Number(e.target.value) * 100)}
              placeholder="0.00"
            />
          </div>
          
          <div className="flex flex-col pt-2 border-t border-border">
            <div className="flex justify-between font-bold text-xl">
              <span>Net Total</span>
              <span className="text-primary">{formatMoney(netTotal)}</span>
            </div>
            {netTotal > 0 && <p className="text-xs text-muted-foreground italic text-right">{numberToWords(netTotal / 100)}</p>}
          </div>

          <div className="flex flex-col pt-2 border-t border-border mt-2 space-y-3">
            <div>
              <span className="text-sm font-semibold block mb-1.5">Payment Method (Optional)</span>
              <div className="flex gap-2">
                {(['cash', 'easypaisa', 'bank', 'other'] as const).map(m => (
                  <Button
                    key={m}
                    type="button"
                    variant={selectedPaymentMethod === m ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 capitalize text-xs"
                    onClick={() => setSelectedPaymentMethod(m)}
                  >
                    {m === 'easypaisa' ? 'Easypaisa' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-semibold">Receive Into Account</span>
              <select
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2"
                value={selectedAccountId || ''}
                onChange={(e) => {
                  setSelectedAccountId(Number(e.target.value) || null)
                  if (!e.target.value) cart.setPaidAmount(0)
                }}
              >
                <option value="">-- Unpaid / Select Account --</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col pt-3 mt-1">
            <div className="flex justify-between text-sm items-center">
              <span className="font-semibold">Paid Amount</span>
              <Input 
                type="number" 
                className="w-28 h-8 text-right font-bold text-success" 
                value={cart.paid_amount ? cart.paid_amount / 100 : ''} 
                onChange={(e) => cart.setPaidAmount(Number(e.target.value) * 100)}
                placeholder={netTotal > 0 ? (netTotal / 100).toString() : '0.00'}
                disabled={!selectedAccountId}
              />
            </div>
            {cart.paid_amount > 0 && <p className="text-xs text-muted-foreground italic text-right mt-1">{numberToWords(cart.paid_amount / 100)}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            {editSaleId ? (
              <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive/10" onClick={handleCancelEdit}>
                <XCircle className="w-4 h-4 mr-1" /> Cancel Edit
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => cart.clearCart()}>Cancel (Esc)</Button>
            )}
            <Button 
              className={`flex-[2] gap-2 font-bold ${editSaleId ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              disabled={cart.items.length === 0}
              onClick={() => setPreviewOpen(true)}
            >
              <CheckCircle className="w-4 h-4" /> 
              {editSaleId ? 'Update Sale (F9)' : 'Checkout (F9)'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open)
        if (!open) setOverheads([])
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col md:flex-row gap-6">
          <div className="flex-1 flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>{editSaleId ? 'Update Sale & Print' : 'Complete Sale & Print'}</DialogTitle>
              <DialogDescription>
                Select receipt format to complete the transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 overflow-y-auto pr-2">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="font-bold">Sale Date:</span>
              <Input 
                type="date" 
                className="w-40 h-8" 
                value={saleDate} 
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Net Total:</span>
              <span className="font-mono">{formatMoney(netTotal)}</span>
            </div>
            <div className="flex justify-between text-success">
              <span className="font-bold">Paid:</span>
              <span className="font-mono">{formatMoney(cart.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-destructive pt-2 border-t border-border">
              <span className="font-bold">Due Balance:</span>
              <span className="font-mono">{formatMoney(Math.max(0, netTotal - cart.paid_amount))}</span>
            </div>



            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Sale Overheads</h3>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddOverhead}>+ Add</Button>
              </div>
              <div className="space-y-2">
                {overheads.length === 0 && <p className="text-xs text-muted-foreground italic">No overheads added.</p>}
                {overheads.map((oh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={expenseCategoryOptions}
                        value={oh.category_id?.toString() || ''}
                        onChange={(val) => handleUpdateOverhead(idx, 'category_id', val || '')}
                        placeholder="Category..."
                        className="h-8 text-sm w-full"
                      />
                    </div>
                    <select 
                      className="w-32 h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:ring-2"
                      value={oh.account_id}
                      onChange={(e) => {
                        handleUpdateOverhead(idx, 'account_id', Number(e.target.value) || '')
                        if (!e.target.value) handleUpdateOverhead(idx, 'amount', 0)
                      }}
                    >
                      <option value="" disabled>Paid From</option>
                      {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>)}
                    </select>
                    <div className="flex flex-col">
                      <Input 
                        type="number" min="0"
                        max={oh.account_id ? (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 : undefined}
                        className="w-20 h-8 text-right" placeholder="Rs"
                        value={oh.amount || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const max = oh.account_id ? (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 : Infinity;
                          handleUpdateOverhead(idx, 'amount', val > max ? max : val)
                        }}
                        disabled={!oh.account_id}
                      />
                      {oh.account_id && oh.amount >= (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 && oh.amount > 0 && (
                        <span className="text-[10px] text-destructive leading-tight mt-1">Max balance</span>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveOverhead(idx)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {overheadsTotal > 0 && (
                  <div className="flex justify-between text-sm font-bold text-muted-foreground pt-2">
                    <span>Total Overheads:</span>
                    <span>{formatMoney(overheadsTotal * 100)}</span>
                  </div>
                )}
              </div>
            </div>
            </div>
            
            <DialogFooter className="mt-auto pt-4 border-t border-border flex justify-end gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => executeCheckout(80)} 
                className="gap-2"
                disabled={createSale.isPending || updateSaleMutation.isPending}
              >
                <Printer className="w-4 h-4" /> Complete & Print (80mm)
              </Button>
              <Button 
                onClick={() => executeCheckout(58)} 
                variant="secondary" 
                className="gap-2"
                disabled={createSale.isPending || updateSaleMutation.isPending}
              >
                <Printer className="w-4 h-4" /> Complete & Print (58mm)
              </Button>
            </DialogFooter>
          </div>

          {/* Live Preview Pane */}
          <div className="w-[300px] sm:w-[350px] shrink-0 bg-muted/30 border border-border rounded-lg flex flex-col h-full overflow-hidden">
             <div className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground border-b flex justify-between items-center">
               <span>Live Preview</span>
               <select className="text-xs bg-background border p-0.5 rounded" value={paperSize} onChange={e => setPaperSize(Number(e.target.value) as 58|80)}>
                 <option value={80}>80mm</option>
                 <option value={58}>58mm</option>
               </select>
             </div>
             <div className="flex-1 overflow-y-auto p-4 bg-gray-100 flex justify-center">
                <ThermalReceipt data={{
                  invoiceNo: editSaleData?.sale?.invoice_no || 'INV-PREVIEW',
                  customerName: customers.find(c => c.id === cart.customer_id)?.name,
                  items: cart.items.map(i => ({
                    name: i.name,
                    qty: i.qty,
                    price: i.unit_price,
                    lineTotal: i.line_total
                  })),
                  subtotal: subtotal,
                  discount: cart.discount,
                  netTotal: netTotal,
                  paidAmount: cart.paid_amount,
                  date: saleDate,
                  width: paperSize
                }} />
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
