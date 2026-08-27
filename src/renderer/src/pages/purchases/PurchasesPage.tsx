import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, PackagePlus, Trash2, Download, CalendarDays, CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'
import html2pdf from 'html2pdf.js'
import logo from '../../assets/logo_color.png'
import Barcode from 'react-barcode'
import { usePurchases, useCreatePurchase, usePurchaseDetails, useUpdatePurchase, useVoidPurchase } from '../../hooks/usePurchases'
import { useSuppliers, useCreateSupplier } from '../../hooks/useParties'
import { useItems } from '../../hooks/useCatalog'
import { useAccounts } from '../../hooks/useAccounts'
import { useExpenseCategories, useCreateExpense, useExpenses, useCreateExpenseCategory, useDeletePurchaseOverheads } from '../../hooks/useExpenses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '../../components/ui/combobox'
import { numberToWords } from '../../lib/numberToWords'
import { useToast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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

export default function PurchasesPage() {
  const [dateRange, setDateRange] = useState({ 
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), 
    to: format(new Date(), 'yyyy-MM-dd') 
  })
  const { data: purchases = [], isLoading } = usePurchases(1, 500, { fromDate: dateRange.from, toDate: dateRange.to })
  const { data: suppliers = [] } = useSuppliers()
  const { data: items = [] } = useItems()
  const { data: accounts = [] } = useAccounts()
  const createPurchase = useCreatePurchase()
  const createSupplier = useCreateSupplier()
  const { data: expenseCategories = [] } = useExpenseCategories()
  const { data: allExpenses = [] } = useExpenses()
  const createExpense = useCreateExpense()
  const createExpenseCategory = useCreateExpenseCategory()
  const { toast } = useToast()
  
  const location = useLocation()
  const navigate = useNavigate()
  const queryParams = new URLSearchParams(location.search)
  const initialEditId = queryParams.get('editPurchaseId') ? Number(queryParams.get('editPurchaseId')) : null

  const [searchTerm, setSearchTerm] = useState('')
  
  // Record Purchase State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editPurchaseId, setEditPurchaseId] = useState<number | null>(null)
  const [viewPurchaseId, setViewPurchaseId] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, id: number} | null>(null)
  
  const updatePurchase = useUpdatePurchase()
  const deleteOverheads = useDeletePurchaseOverheads()
  const voidPurchase = useVoidPurchase()
  
  // Details Hook
  const { data: purchaseDetailsData } = usePurchaseDetails(viewPurchaseId)
  const details = purchaseDetailsData?.purchase
  const detailsItems = purchaseDetailsData?.items || []
  const detailsOverheads = allExpenses.filter((e: any) => e.note?.includes(`[PUR-REF:${viewPurchaseId}]`))
  const detailsOverheadsTotal = detailsOverheads.reduce((sum: number, e: any) => sum + e.amount, 0)
  const totalLandedCost = (details?.net_total || 0) + detailsOverheadsTotal

  const [supplierId, setSupplierId] = useState<string>('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [purchaseDate, setPurchaseDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [purchaseItems, setPurchaseItems] = useState<{item_id: number, qty: number, unit_cost: number}[]>([])
  const [discount, setDiscount] = useState<number>(0)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [overheads, setOverheads] = useState<{category_id: number | '', amount: number, account_id: number | ''}[]>([])

  // Cascading Filter States
  const [filterName, setFilterName] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [filterPkg, setFilterPkg] = useState('')
  const [filterVariant, setFilterVariant] = useState('')

  // Compute Cascading Options
  const filteredDropdownItems = useMemo(() => {
    return supplierId ? items.filter((i: any) => i.supplier_id?.toString() === supplierId) : items;
  }, [items, supplierId])

  const nameOptions = useMemo(() => {
    const names = new Set<string>()
    filteredDropdownItems.forEach((i: any) => i.name && names.add(i.name))
    return Array.from(names).map(n => ({ value: n, label: n }))
  }, [filteredDropdownItems])

  const sizeOptions = useMemo(() => {
    if (!filterName) return []
    const sizes = new Set<string>()
    filteredDropdownItems.forEach((i: any) => {
      if (i.name === filterName && i.size) sizes.add(i.size)
    })
    return Array.from(sizes).map(s => ({ value: s, label: s }))
  }, [filteredDropdownItems, filterName])

  const pkgOptions = useMemo(() => {
    if (!filterName) return []
    const pkgs = new Set<string>()
    filteredDropdownItems.forEach((i: any) => {
      if (i.name === filterName && (!filterSize || i.size === filterSize) && i.packaging) {
        pkgs.add(i.packaging)
      }
    })
    return Array.from(pkgs).map(p => ({ value: p, label: p }))
  }, [filteredDropdownItems, filterName, filterSize])

  const variantOptions = useMemo(() => {
    if (!filterName) return []
    const filteredCatalogItems = filteredDropdownItems.filter((i: any) => {
      return (!filterName || i.name === filterName) &&
             (!filterSize || i.size === filterSize) &&
             (!filterPkg || i.packaging === filterPkg)
    })
    const variants = new Set<string>()
    filteredCatalogItems.forEach((i: any) => {
      if (i.variant) variants.add(i.variant)
    })
    return Array.from(variants).map(v => ({ value: v, label: v }))
  }, [filteredDropdownItems, filterName, filterSize, filterPkg])

  // Cascading Resets
  useEffect(() => {
    setFilterSize('')
    setFilterPkg('')
    setFilterVariant('')
  }, [filterName])

  useEffect(() => {
    setFilterPkg('')
    setFilterVariant('')
  }, [filterSize])
  
  useEffect(() => {
    setFilterVariant('')
  }, [filterPkg])

  // Intelligent Auto-Select
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

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const subtotal = purchaseItems.reduce((acc, curr) => acc + (curr.qty * curr.unit_cost), 0)
  const netTotal = subtotal - (discount * 100)

  const handleAddItem = (itemId: number) => {
    if (!itemId) return
    const item = items.find((i: any) => i.id === itemId)
    if (!item) return
    setPurchaseItems([...purchaseItems, { item_id: itemId, qty: 0, unit_cost: item.cost_price || 0 }])
  }

  const handleUpdateItem = (index: number, field: 'qty' | 'unit_cost', value: number) => {
    const newItems = [...purchaseItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setPurchaseItems(newItems)
  }

  const handleUpdateQtyByCtns = (index: number, ctns: number) => {
    handleUpdateItem(index, 'qty', ctns)
  }

  const handleUpdateCostByCtn = (index: number, ctnCost: number) => {
    handleUpdateItem(index, 'unit_cost', ctnCost)
  }

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const handleAddOverhead = () => setOverheads([...overheads, { category_id: '', amount: 0, account_id: '' }])
  const handleRemoveOverhead = (idx: number) => setOverheads(overheads.filter((_, i) => i !== idx))
  const handleUpdateOverhead = (idx: number, field: 'category_id' | 'amount' | 'account_id', value: any) => {
    const newOverheads = [...overheads]
    newOverheads[idx] = { ...newOverheads[idx], [field]: value }
    setOverheads(newOverheads)
  }
  const overheadsTotal = overheads.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const expenseCategoryOptions = expenseCategories.map((c: any) => ({ value: c.id.toString(), label: c.name }))

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId || purchaseItems.length === 0) return
    if (paidAmount > 0 && !accountId) { toast({ title: 'Select an account for the payment', variant: 'destructive' }); return }

    try {
      let final_supplier_id = supplierId ? (isNaN(Number(supplierId)) ? undefined : parseInt(supplierId)) : undefined
      
      if (supplierId && isNaN(Number(supplierId))) {
        const newSup = await createSupplier.mutateAsync({ name: supplierId })
        final_supplier_id = newSup.id
      }
      
      if (!final_supplier_id) { toast({ title: 'Supplier could not be determined', variant: 'destructive' }); return }

      if (editPurchaseId) {
        await updatePurchase.mutateAsync({
          id: editPurchaseId,
          data: {
            supplier_id: final_supplier_id,
            subtotal: subtotal,
            discount: discount * 100,
            net_total: netTotal,
            paid_amount: paidAmount * 100,
            payment_method: paidAmount > 0 ? 'cash' : undefined,
            account_id: paidAmount > 0 ? Number(accountId) : undefined,
            items: purchaseItems.map(i => ({
              item_id: i.item_id,
              qty: i.qty,
              unit_cost: i.unit_cost,
              line_total: i.qty * i.unit_cost
            }))
          }
        })

        await deleteOverheads.mutateAsync(editPurchaseId)

        for (const oh of overheads) {
          if (oh.category_id && oh.amount > 0 && oh.account_id) {
            let final_cat_id = typeof oh.category_id === 'number' ? oh.category_id : undefined
            if (typeof oh.category_id === 'string' && oh.category_id !== '') {
              if (isNaN(Number(oh.category_id))) {
                const newCat = await createExpenseCategory.mutateAsync(oh.category_id)
                final_cat_id = newCat.id
              } else {
                final_cat_id = Number(oh.category_id)
              }
            }
            if (final_cat_id) {
              await createExpense.mutateAsync({
                category_id: final_cat_id,
                amount: oh.amount * 100,
                account_id: oh.account_id,
                date: purchaseDate + 'T12:00:00.000Z',
                note: `[PUR-REF:${editPurchaseId}] ${searchTerm /* fallback */} Overhead Cost`
              })
            }
          }
        }
      } else {
        const purchase = await createPurchase.mutateAsync({
          supplier_id: final_supplier_id,
          subtotal: subtotal,
          discount: discount * 100,
          net_total: netTotal,
          paid_amount: paidAmount * 100,
          payment_method: paidAmount > 0 ? 'cash' : undefined,
          account_id: paidAmount > 0 ? Number(accountId) : undefined,
          date: purchaseDate + 'T12:00:00.000Z',
          items: purchaseItems.map(i => ({
            item_id: i.item_id,
            qty: i.qty,
            unit_cost: i.unit_cost,
            line_total: i.qty * i.unit_cost
          }))
        })

        // Save Overheads
        for (const oh of overheads) {
          if (oh.category_id && oh.amount > 0 && oh.account_id) {
            let final_cat_id = typeof oh.category_id === 'number' ? oh.category_id : undefined
            if (typeof oh.category_id === 'string' && oh.category_id !== '') {
              if (isNaN(Number(oh.category_id))) {
                const newCat = await createExpenseCategory.mutateAsync(oh.category_id)
                final_cat_id = newCat.id
              } else {
                final_cat_id = Number(oh.category_id)
              }
            }
            
            if (final_cat_id) {
              await createExpense.mutateAsync({
                category_id: final_cat_id,
                amount: oh.amount * 100,
                account_id: oh.account_id,
                date: purchaseDate + 'T12:00:00.000Z',
                note: `[PUR-REF:${purchase.id}] ${purchase.invoice_no} Overhead Cost`
              })
            }
          }
        }
      }

      setIsModalOpen(false)
      setEditPurchaseId(null)
      setSupplierId('')
      setAccountId('')
      setPurchaseItems([])
      setDiscount(0)
      setPaidAmount(0)
      setOverheads([])
      toast({ title: 'Success', description: 'Purchase recorded successfully' })
      
      if (editPurchaseId) {
        navigate('/purchases') // Clear URL params
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to record purchase', variant: 'destructive' })
    }
  }

  const handleDownloadPDF = () => {
    const element = document.getElementById('purchase-invoice-content');
    if (!element) return;
    
    const opt = {
      margin:       0.5,
      filename:     `Purchase_Invoice_${details?.id}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  }

  const handleEditClick = async (p: any) => {
    const detailsData = await window.api.purchases.getPurchaseDetails(p.id)
    if (!detailsData) return

    setEditPurchaseId(p.id)
    setSupplierId(detailsData.purchase.supplier_id?.toString() || '')
    setDiscount(detailsData.purchase.discount / 100)
    setPaidAmount(detailsData.purchase.paid_amount / 100)
    
    // Try to load the account_id from existing payment records
    let existingAccountId: number | '' = ''
    if (detailsData.purchase.paid_amount > 0) {
      try {
        const paymentsResponse = await window.api.payments.getAll(1, 100, {}) as any
        const linkedPayment = (paymentsResponse?.payments || paymentsResponse || []).find(
          (pay: any) => pay.reference_type === 'purchase' && pay.reference_id === p.id
        )
        if (linkedPayment?.account_id) {
          existingAccountId = linkedPayment.account_id
        }
      } catch { /* fallback: user re-selects */ }
    }
    setAccountId(existingAccountId)
    
    // Load existing purchase date
    if (detailsData.purchase.date) {
      setPurchaseDate(format(new Date(detailsData.purchase.date), 'yyyy-MM-dd'))
    }
    
    setPurchaseItems(detailsData.items.map((i: any) => ({
      item_id: i.item_id,
      qty: i.qty,
      unit_cost: i.unit_cost
    })))

    const purOverheads = allExpenses.filter((e: any) => e.note?.includes(`[PUR-REF:${p.id}]`))
    setOverheads(purOverheads.map((e: any) => ({
      category_id: e.category_id,
      amount: e.amount / 100,
      account_id: e.account_id
    })))

    setIsModalOpen(true)
  }

  // Handle URL Param Edit
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)
  useEffect(() => {
    if (initialEditId && !hasLoadedInitial && purchases.length > 0) { // check purchases to wait for app load
      const p = purchases.find((x: any) => x.id === initialEditId)
      if (p) {
        handleEditClick(p)
      } else {
        // Fetch manually if not in current page
        handleEditClick({ id: initialEditId })
      }
      setHasLoadedInitial(true)
    }
  }, [initialEditId, hasLoadedInitial, purchases])

  const supplierOptions = suppliers.map((s: any) => ({ value: s.id.toString(), label: s.name }))

  const filteredCatalogItems = items.filter((item: any) => {
    // Only show items for the selected supplier (or no filter if supplier not selected)
    const matchesSupplier = supplierId ? item.supplier_id === parseInt(supplierId) : true
    const matchesName = filterName ? item.name === filterName : true
    const matchesSize = filterSize ? item.size === filterSize : true
    const matchesPkg = filterPkg ? item.packaging === filterPkg : true
    const matchesVariant = filterVariant ? item.variant === filterVariant : true
    return matchesSupplier && matchesName && matchesSize && matchesPkg && matchesVariant
  })

  const filteredPurchases = purchases.filter((p: any) => 
    p.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground mt-1">Record inward stock and supplier invoices.</p>
        </div>
        <div className="flex gap-3">
          <Button className="gap-2" onClick={() => {
            setEditPurchaseId(null)
            setSupplierId('')
            setAccountId('')
            setPurchaseItems([])
            setDiscount(0)
            setPaidAmount(0)
            setOverheads([])
            setFilterName('')
            setFilterSize('')
            setFilterPkg('')
            setFilterVariant('')
            setPurchaseDate(format(new Date(), 'yyyy-MM-dd'))
            setIsModalOpen(true)
          }}>
            <PackagePlus className="w-4 h-4" /> Record Purchase
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-surface p-4 rounded-xl border shadow-sm mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by invoice number or supplier..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 border-0 shadow-none ring-1 ring-inset ring-border/50 focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-lg border shadow-sm text-sm">
          <CalendarIcon className="w-4 h-4 text-muted-foreground ml-2" />
          <input 
            type="date" 
            className="bg-transparent focus:outline-none border-none text-muted-foreground cursor-pointer"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
          <span className="text-muted-foreground">to</span>
          <input 
            type="date" 
            className="bg-transparent focus:outline-none border-none text-muted-foreground cursor-pointer mr-1"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Net Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Loading purchases...
                  </TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                      <p>No purchases found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((p: any) => (
                  <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium font-mono text-sm">{p.invoice_no}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(p.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{p.supplier_name || 'Unknown'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(p.net_total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-success">{formatMoney(p.paid_amount)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.status === 'paid' ? 'success' : p.status === 'partial' ? 'warning' : 'destructive'}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleEditClick(p)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setViewPurchaseId(p.id)}>
                          View Details
                        </Button>
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editPurchaseId ? 'Edit Purchase' : 'Record Purchase'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePurchase} className="flex-1 flex flex-col overflow-hidden pt-4 gap-0">
            <div className="flex-1 overflow-y-auto px-1 pb-4 flex flex-col gap-4">
              <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4 shrink-0">
              {/* Transaction Date Picker */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <label className="text-sm font-semibold block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                  <p className="text-xs text-muted-foreground italic mt-1">Defaults to today. Change to backdate this purchase.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier</label>
                  <Combobox 
                    options={supplierOptions} 
                    value={supplierId} 
                    onChange={setSupplierId} 
                    placeholder="-- Select Supplier --"
                    disabled={!!editPurchaseId}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Search & Select Items</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Combobox options={nameOptions} value={filterName} onChange={setFilterName} placeholder="Item Name..." className="bg-background" />
                  </div>
                  <div className="w-[120px]">
                    <Combobox options={sizeOptions} value={filterSize} onChange={setFilterSize} placeholder="Size..." disabled={!filterName || sizeOptions.length === 0} className="bg-background" />
                  </div>
                  <div className="w-[120px]">
                    <Combobox options={pkgOptions} value={filterPkg} onChange={setFilterPkg} placeholder="Pkg..." disabled={!filterName || pkgOptions.length === 0} className="bg-background" />
                  </div>
                  {variantOptions.length > 0 && (
                    <div className="w-[130px]">
                      <Combobox options={variantOptions} value={filterVariant} onChange={setFilterVariant} placeholder="Variant..." className="bg-background" />
                    </div>
                  )}
                  <div className="flex-1 min-w-[120px]">
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (filteredCatalogItems.length === 1) {
                          handleAddItem(filteredCatalogItems[0].id)
                          setFilterName('')
                          setFilterSize('')
                          setFilterPkg('')
                          setFilterVariant('')
                        }
                      }}
                      disabled={filteredCatalogItems.length !== 1}
                      className="w-full gap-2 whitespace-nowrap"
                    >
                      <PackagePlus className="w-4 h-4" />
                      Add Item
                    </Button>
                  </div>
                  {(filterName || filterSize || filterPkg || filterVariant) && (
                    <Button variant="ghost" size="icon" type="button" onClick={() => { setFilterName(''); setFilterSize(''); setFilterPkg(''); setFilterVariant(''); }} className="text-muted-foreground hover:text-foreground shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-md p-2 space-y-2 min-h-[200px] shrink-0">
              {purchaseItems.length === 0 && <div className="text-muted-foreground text-sm text-center py-8">No items added to purchase yet.</div>}
              {purchaseItems.map((pi, idx) => {
                const item = items.find((i: any) => i.id === pi.item_id)
                return (
                  <div key={idx} className="flex items-center gap-3 bg-muted/20 p-2 rounded border">
                    <div className="flex-1 font-medium text-sm flex items-center flex-wrap gap-1">
                      {item?.name}
                      {item?.size && <span className="text-muted-foreground text-xs font-normal border px-1 rounded bg-background/50">{item.size}</span>}
                      {item?.packaging && <span className="text-muted-foreground text-xs font-normal border px-1 rounded bg-background/50">{item.packaging}</span>}
                      {item?.variant && <span className="text-muted-foreground text-xs font-normal italic">{item.variant}</span>}

                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" min="0" 
                        value={pi.qty === 0 ? '' : pi.qty} 
                        onChange={(e) => handleUpdateQtyByCtns(idx, e.target.value === '' ? 0 : (Number(e.target.value) || 0))} 
                        className="w-20 h-8 text-center" placeholder="0" title="Ctns"
                      />
                      
                      <div className="mx-2 text-muted-foreground">x</div>
                      
                      <Input 
                        type="number" 
                        value={(pi.unit_cost / 100).toFixed(0)} 
                        onChange={(e) => handleUpdateCostByCtn(idx, Number(e.target.value) * 100)} 
                        className="w-24 h-8 text-right" placeholder="Ctn Cost" title="Cost per Ctn"
                      />
                      <div className="w-24 text-right font-medium text-sm">{formatMoney(pi.qty * pi.unit_cost)}</div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(idx)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-border shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Overhead Expenses</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddOverhead}>+ Add Overhead</Button>
              </div>
              <div className="space-y-2">
                {overheads.map((oh, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={expenseCategoryOptions}
                        value={oh.category_id?.toString() || ''}
                        onChange={(val) => handleUpdateOverhead(idx, 'category_id', val || '')}
                        placeholder="Category..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <select 
                      className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2"
                      value={oh.account_id}
                      onChange={(e) => {
                        handleUpdateOverhead(idx, 'account_id', Number(e.target.value) || '')
                        if (!e.target.value) handleUpdateOverhead(idx, 'amount', 0)
                      }}
                      required
                    >
                      <option value="" disabled>Account (Paid From)...</option>
                      {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>)}
                    </select>
                    <div className="flex flex-col">
                      <Input 
                        type="number" min="0"
                        max={oh.account_id ? (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 : undefined}
                        className="w-24 h-8" placeholder="Rs"
                        value={oh.amount || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const max = oh.account_id ? (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 : Infinity;
                          handleUpdateOverhead(idx, 'amount', val > max ? max : val)
                        }}
                        disabled={!oh.account_id}
                        required
                      />
                      {oh.account_id && oh.amount >= (accounts.find((a: any) => a.id === oh.account_id)?.current_balance || 0) / 100 && oh.amount > 0 && (
                        <span className="text-[10px] text-destructive leading-tight mt-1">Max balance</span>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveOverhead(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4 shrink-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Account</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                    value={accountId}
                    onChange={(e) => {
                      setAccountId(Number(e.target.value) || '')
                      if (!e.target.value) setPaidAmount(0)
                    }}
                    
                  >
                    <option value="">-- Unpaid / Select Account --</option>
                    {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paid Amount (Rs)</label>
                  <Input 
                    type="number" 
                    value={paidAmount || ''} 
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const max = accountId ? (accounts.find((a: any) => a.id === accountId)?.current_balance || 0) / 100 : Infinity;
                      setPaidAmount(val > max ? max : val)
                    }} 
                    placeholder="0.00" 
                    disabled={accountId === ''} 
                    min="0" 
                    max={accountId ? (accounts.find((a: any) => a.id === accountId)?.current_balance || 0) / 100 : undefined}
                  />
                  {accountId && paidAmount >= (accounts.find((a: any) => a.id === accountId)?.current_balance || 0) / 100 && paidAmount > 0 && (
                    <p className="text-xs text-destructive">Maximum available balance reached</p>
                  )}
                  {paidAmount > 0 && <p className="text-xs text-muted-foreground italic">{numberToWords(paidAmount)}</p>}
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal:</span> <span>{formatMoney(subtotal)}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Discount (Rs):</span> <Input type="number" className="w-24 h-8 text-right" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
                <div className="flex flex-col pt-2 border-t mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Supplier Net Total:</span> <span className="text-primary">{formatMoney(netTotal)}</span>
                  </div>
                  {netTotal > 0 && <p className="text-xs text-muted-foreground italic text-right">{numberToWords(netTotal / 100)}</p>}
                </div>
                <div className="flex justify-between text-sm pt-1"><span>Due to Supplier:</span> <span className="text-destructive font-medium">{formatMoney(Math.max(0, netTotal - (paidAmount * 100)))}</span></div>
                {overheadsTotal > 0 && (
                  <div className="flex justify-between font-bold text-sm pt-2 text-muted-foreground">
                    <span>+ Overheads:</span> <span>{formatMoney(overheadsTotal * 100)}</span>
                  </div>
                )}
              </div>
              </div>
            </div>

            <DialogFooter className="pt-3 pb-4 border-t shrink-0 mt-2 px-1">
              <Button type="button" variant="outline" onClick={() => {
                setIsModalOpen(false)
                if (editPurchaseId && initialEditId) navigate('/purchases')
              }}>Cancel</Button>
              <Button type="submit" disabled={createPurchase.isPending || updatePurchase.isPending || purchaseItems.length === 0}>
                {editPurchaseId ? 'Update Purchase' : 'Complete Purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPurchaseId} onOpenChange={(open) => !open && setViewPurchaseId(null)}>
        <DialogContent hideClose className="max-w-[850px] w-[95vw] p-0 overflow-hidden bg-background border-none shadow-2xl">
          {!details ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading consignment details...
            </div>
          ) : (
            <div className="flex flex-col max-h-[90vh]">
              {/* Action Bar */}
              <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
                <h2 className="font-semibold">Consignment Details</h2>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={() => {
                    setDeleteConfirm({ open: true, id: details.id })
                  }} disabled={voidPurchase.isPending}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {voidPurchase.isPending ? 'Voiding...' : 'Void Purchase'}
                  </Button>
                  <Button variant="outline" onClick={() => setViewPurchaseId(null)}>Close</Button>
                  <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
              </div>
              
              {/* Printable Invoice Area */}
              <div id="purchase-invoice-content" className="flex-1 overflow-y-auto p-6 md:p-10 bg-white text-black font-sans">
                <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-8">
                  <div className="flex items-center gap-4">
                    <img src={logo} alt="Khan Traders Logo" className="h-24 w-auto object-contain" />
                    <div>
                      <h1 className="font-black text-3xl tracking-wider text-primary">KHAN TRADERS</h1>
                      <h2 className="font-bold text-lg text-gray-700">Whole Sale</h2>
                      <p className="text-sm font-semibold text-gray-600">Soft Drinks Wholesale Distributors</p>
                      <p className="text-sm text-gray-500 whitespace-pre-line mt-1">
                        Main Kohat Road Darwazgai, Near Rahim Abad{'\n'}
                        03139924928 | 03469118339 | 03489854823 | 03132626869
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <h1 className="text-4xl font-black text-gray-200 tracking-wider mb-2 uppercase text-right">Purchase Invoice</h1>
                    <div className="bg-white p-1 rounded border border-gray-200">
                      <Barcode value={details.invoice_no} width={1.2} height={40} fontSize={10} displayValue={false} margin={0} background="#ffffff" lineColor="#000000" />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mb-8">
                  <div>
                    <h3 className="font-bold text-sm mb-1 text-gray-800">Supplier</h3>
                    <p className="font-bold text-lg text-gray-900">{details.supplier_name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-sm mb-1 text-gray-800">Invoice Details</h3>
                    <p className="text-sm text-gray-700">Invoice No.: {details.invoice_no}</p>
                    <p className="text-sm text-gray-700">Date: {new Date(details.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                  </div>
                </div>

                <table className="w-full text-sm mb-8 border-collapse">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="py-2 px-3 text-left w-12 border-r border-primary-foreground/20">#</th>
                      <th className="py-2 px-3 text-left border-r border-primary-foreground/20">Item Received</th>
                      <th className="py-2 px-3 text-center border-r border-primary-foreground/20">Quantity</th>
                      <th className="py-2 px-3 text-center border-r border-primary-foreground/20">Unit</th>
                      <th className="py-2 px-3 text-right border-r border-primary-foreground/20">Cost/Unit</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsItems.map((di: any, idx: number) => {
                      const itemName = di.item_name || `Item #${di.item_id}`;
                      const size = di.item_size ? ` - ${di.item_size}` : '';
                      const variant = di.item_variant ? ` - ${di.item_variant}` : '';
                      const packing = di.item_packaging ? ` (${di.item_packaging})` : '';
                      const fullName = `${itemName}${size}${variant}${packing}`;

                      return (
                        <tr key={di.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                          <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-gray-800 uppercase">{fullName}</td>
                          <td className="py-2 px-3 text-center font-medium text-gray-700">{di.qty}</td>
                          <td className="py-2 px-3 text-center text-gray-600">Ctns</td>
                          <td className="py-2 px-3 text-right text-gray-700">{formatMoney(di.unit_cost)}</td>
                          <td className="py-2 px-3 text-right font-medium text-gray-800">{formatMoney(di.line_total)}</td>
                        </tr>
                      )
                    })}
                    <tr className="font-bold border-b-[3px] border-gray-800">
                      <td colSpan={2} className="py-2 px-3 text-center text-gray-800">Total</td>
                      <td className="py-2 px-3 text-center text-gray-900">{detailsItems.reduce((acc: number, curr: any) => acc + curr.qty, 0)}</td>
                      <td colSpan={2}></td>
                      <td className="py-2 px-3 text-right text-gray-900">{formatMoney(details.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-between items-start gap-8">
                  <div className="flex-1 mt-2">
                    <h4 className="font-bold text-sm mb-1 text-gray-800">Invoice Amount In Words</h4>
                    <p className="text-sm capitalize mb-6 text-gray-700">
                      {numberToWords(details.net_total / 100)} Rupees only
                    </p>
                  </div>

                  <div className="w-[320px]">
                    <div className="flex justify-between py-1.5 text-sm text-gray-700">
                      <span>Sub Total</span>
                      <span>{formatMoney(details.subtotal)}</span>
                    </div>
                    {details.discount > 0 && (
                      <div className="flex justify-between py-1.5 text-sm text-red-600 font-medium">
                        <span>Discount</span>
                        <span>-{formatMoney(details.discount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between py-2 text-sm font-bold bg-primary text-primary-foreground px-3 mt-1">
                      <span>Supplier Net Total</span>
                      <span>{formatMoney(details.net_total)}</span>
                    </div>

                    <div className="flex justify-between py-1.5 text-sm mt-2 text-gray-700">
                      <span>Paid</span>
                      <span>{formatMoney(details.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm font-medium text-gray-800 border-b border-gray-400">
                      <span>Balance Due</span>
                      <span>{formatMoney(Math.max(0, details.net_total - details.paid_amount))}</span>
                    </div>

                    {detailsOverheads.length > 0 && (
                       <div className="mt-6 border-t-2 border-dashed border-gray-300 pt-3">
                         <h4 className="text-[11px] font-bold text-gray-500 uppercase mb-2">Internal Overhead Expenses</h4>
                         {detailsOverheads.map((oh: any, i: number) => (
                           <div key={i} className="flex justify-between text-xs text-gray-600 mb-1">
                             <span>{oh.note?.replace(`[PUR-REF:${viewPurchaseId}]`, '').trim() || 'Overhead'}</span>
                             <span>{formatMoney(oh.amount)}</span>
                           </div>
                         ))}
                         <div className="flex justify-between text-xs font-bold text-gray-800 mt-2 pt-1 border-t border-gray-200">
                           <span>Total Overheads</span>
                           <span>{formatMoney(detailsOverheadsTotal)}</span>
                         </div>
                         <div className="flex justify-between py-2 text-sm font-bold bg-gray-800 text-white px-3 mt-3">
                           <span>Total Landed Cost</span>
                           <span>{formatMoney(totalLandedCost)}</span>
                         </div>
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {deleteConfirm && (
        <ConfirmDialog 
          open={deleteConfirm.open} 
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          title="Void Purchase"
          description="Are you sure you want to void this purchase? This will revert stock and financial records. This action cannot be undone."
          onConfirm={() => {
            voidPurchase.mutate(deleteConfirm.id, {
              onSuccess: () => {
                setViewPurchaseId(null)
                setDeleteConfirm(null)
              }
            })
          }}
        />
      )}
    </div>
  )
}
