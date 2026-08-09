import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Trash2, Printer, CheckCircle, Package, XCircle } from 'lucide-react'
import { ThermalReceipt } from '../../components/ThermalReceipt'
import { useItems } from '../../hooks/useCatalog'
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

  const { data: items = [] } = useItems()
  const { data: customers = [] } = useCustomers()
  const { data: activeVans = [] } = useActiveAssignments()
  const cart = useCartStore()
  const createSale = useCreateSale()
  const updateSaleMutation = useUpdateSale()
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
      setCtnsReturned(editSaleData.sale.ctns_returned || 0)
      setSelectedVanId(editSaleData.sale.van_assignment_id || null)
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
  const [ctnsReturned, setCtnsReturned] = useState<number>(0)
  const [overheads, setOverheads] = useState<{category_id: number | string, amount: number, account_id: number | ''}[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'easypaisa' | 'bank' | 'other'>('cash')
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0])

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
        ctns_returned: ctnsReturned,
        date: saleDate ? new Date(saleDate).toISOString() : undefined,
        items: cart.items,
        overheads: overheads.filter(oh => oh.category_id && oh.amount > 0 && oh.account_id).map(oh => ({
          category_id: typeof oh.category_id === 'string' && !isNaN(Number(oh.category_id)) ? Number(oh.category_id) : oh.category_id,
          amount: oh.amount * 100,
          account_id: Number(oh.account_id)
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
      setCtnsReturned(0)
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
              const isOut = item.current_stock <= 0
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex flex-col text-left p-3 rounded-xl border bg-surface hover:border-primary transition-all active:scale-95 ${isOut ? 'opacity-50' : 'shadow-sm'}`}
                >
                  <div className="font-semibold truncate w-full">{item.name}</div>
                  <div className="text-sm text-muted-foreground truncate w-full">{item.variant || 'Standard'}</div>
                  <div className="mt-auto pt-3 flex flex-col gap-1 w-full">
                    <div className="flex justify-between w-full items-end">
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {formatMoney(item.selling_price)}
                      </div>
                      <div className="text-right text-xs mt-1">
                        <Badge variant={item.current_stock <= 0 ? 'destructive' : item.current_stock <= item.low_stock_threshold ? 'warning' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {item.current_stock} Pieces
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
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Current Sale
          </h2>
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
          {cart.customer_id && (() => {
            const cust = customers.find((c: any) => c.id === Number(cart.customer_id))
            if (!cust || !cust.credit_limit || cust.credit_limit <= 0) return null;
            const usage = cust.balance / cust.credit_limit;
            if (usage >= 1) return <div className="mt-2 text-xs font-bold text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">🚨 Over Credit Limit ({formatMoney(cust.balance)} / {formatMoney(cust.credit_limit)})</div>
            if (usage >= 0.8) return <div className="mt-2 text-xs font-bold text-yellow-600 bg-yellow-100 p-2 rounded border border-yellow-300">⚠️ Near Credit Limit ({formatMoney(cust.balance)} / {formatMoney(cust.credit_limit)})</div>
            return null;
          })()}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <Package className="w-12 h-12 mb-2" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.items.map((i) => (
              <div key={i.item_id} className="flex flex-col bg-background p-3 rounded-lg border border-border shadow-sm group">
                <div className="flex justify-between font-medium">
                  <span className="truncate pr-2">{i.name}</span>
                  <span>{formatMoney(i.line_total)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 gap-2">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-20 text-muted-foreground text-xs font-semibold mt-[2px]">Qty (Pieces):</span>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => cart.updateCtns(i.item_id, Math.max(1, i.qty - 1))}>-</Button>
                      <span className="w-6 text-center font-semibold">{i.qty}</span>
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => cart.updateCtns(i.item_id, i.qty + 1)}>+</Button>
                      <span className="text-xs text-muted-foreground ml-auto">@{formatMoney(i.unit_price)}</span>
                    </div>
                  </div>
                  <button onClick={() => cart.removeItem(i.item_id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 self-start mt-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
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

          <div className="flex flex-col pt-2">
            <div className="flex justify-between text-sm items-center">
              <span className="font-semibold">Paid Amount</span>
              <Input 
                type="number" 
                className="w-28 h-8 text-right font-bold text-success" 
                value={cart.paid_amount ? cart.paid_amount / 100 : ''} 
                onChange={(e) => cart.setPaidAmount(Number(e.target.value) * 100)}
                placeholder={netTotal > 0 ? (netTotal / 100).toString() : '0.00'}
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
        <DialogContent className="sm:max-w-[900px] flex gap-6">
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

            {/* Payment Method & Account Selection */}
            {cart.paid_amount > 0 && (
              <div className="pt-3 border-t border-border space-y-3">
                <div>
                  <span className="text-sm font-semibold block mb-1.5">Payment Method</span>
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
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Receive Into:</span>
                  <select
                    className="w-40 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2"
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                  >
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            {cart.customer_id && (
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-bold">Empty Ctns Returned:</span>
                <Input 
                  type="number" 
                  min="0"
                  className="w-24 h-8 text-right font-bold" 
                  value={ctnsReturned || ''} 
                  onChange={(e) => setCtnsReturned(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            )}
            
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
                    <Input 
                      type="number" min="0"
                      className="w-20 h-8 text-right" placeholder="Rs"
                      value={oh.amount || ''}
                      onChange={(e) => handleUpdateOverhead(idx, 'amount', Number(e.target.value))}
                    />
                    <select 
                      className="w-24 h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:ring-2"
                      value={oh.account_id}
                      onChange={(e) => handleUpdateOverhead(idx, 'account_id', Number(e.target.value) || '')}
                    >
                      <option value="" disabled>Paid From</option>
                      {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
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
