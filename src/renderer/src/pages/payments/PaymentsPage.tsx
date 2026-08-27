import { format } from 'date-fns'
import { useState, useEffect } from 'react'
import { User, Truck, Trash2, CheckSquare, Square, Receipt, CalendarDays } from 'lucide-react'
import { useCustomers, useSuppliers } from '../../hooks/useParties'
import { useRecordPayment, usePayments, useVoidPayment, useUnpaidDocuments } from '../../hooks/usePayments'
import { useAccounts } from '../../hooks/useAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { numberToWords } from '../../lib/numberToWords'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/auth.store'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
export default function PaymentsPage() {
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()
  const { data: accounts = [] } = useAccounts()
  const { toast } = useToast()
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'admin' || user?.role === 'manager'

  const recordPayment = useRecordPayment()
  const voidPayment = useVoidPayment()
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments()

  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [partyId, setPartyId] = useState<number | ''>('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [allocations, setAllocations] = useState<Record<number, string>>({}) // invoiceId -> input string (Rs)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, id: number, message: string} | null>(null)

  const { data: unpaidDocs = [], isLoading: isLoadingDocs } = useUnpaidDocuments(
    partyId ? partyType : null,
    partyId ? Number(partyId) : null
  )

  // Reset invoice selections when party changes
  useEffect(() => {
    setAllocations({})
    setSelectedInvoices(new Set())
  }, [partyId, partyType])

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })

  const activeParties = partyType === 'customer' ? customers : suppliers
  const selectedParty = activeParties.find((p: any) => p.id === Number(partyId))

  // Total allocated (in paisa)
  const totalAllocated = Array.from(selectedInvoices).reduce((sum, id) => {
    const val = parseFloat(allocations[id] || '0')
    return sum + (isNaN(val) ? 0 : Math.round(val * 100))
  }, 0)

  const handleToggleInvoice = (doc: any) => {
    const id = doc.id
    setSelectedInvoices(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Auto-fill with remaining due if not set
        if (!allocations[id]) {
          setAllocations(a => ({ ...a, [id]: (doc.due_amount / 100).toFixed(0) }))
        }
      }
      return next
    })
  }

  const handleAllocationChange = (id: number, value: string) => {
    setAllocations(a => ({ ...a, [id]: value }))
  }

  const handleSelectAll = () => {
    const allIds = new Set(unpaidDocs.map((d: any) => d.id))
    setSelectedInvoices(allIds)
    const newAllocs: Record<number, string> = {}
    unpaidDocs.forEach((d: any) => { newAllocs[d.id] = (d.due_amount / 100).toFixed(0) })
    setAllocations(newAllocs)
  }

  const handleClearAll = () => {
    setSelectedInvoices(new Set())
    setAllocations({})
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partyId || !accountId) return

    if (selectedInvoices.size === 0) {
      toast({ title: 'No invoices selected', description: 'Please select at least one invoice to allocate the payment.', variant: 'destructive' })
      return
    }
    if (totalAllocated <= 0) {
      toast({ title: 'Invalid amount', description: 'Total allocated amount must be greater than zero.', variant: 'destructive' })
      return
    }

    // Validate each allocated amount
    for (const id of Array.from(selectedInvoices)) {
      const doc = unpaidDocs.find((d: any) => d.id === id)
      const allocated = Math.round(parseFloat(allocations[id] || '0') * 100)
      if (allocated <= 0) {
        toast({ title: 'Invalid allocation', description: `Amount for invoice #${id} must be greater than zero.`, variant: 'destructive' })
        return
      }
      if (doc && allocated > doc.due_amount) {
        toast({ title: 'Over-allocation', description: `Amount for invoice #${id} exceeds its due amount of ${formatMoney(doc.due_amount)}.`, variant: 'destructive' })
        return
      }
    }

    const allocationList = Array.from(selectedInvoices).map(id => ({
      id,
      amount: Math.round(parseFloat(allocations[id] || '0') * 100)
    }))

    try {
      await recordPayment.mutateAsync({
        party_type: partyType,
        party_id: Number(partyId),
        amount: totalAllocated,
        payment_method: 'cash',
        account_id: Number(accountId),
        note: note || undefined,
        date: paymentDate + 'T12:00:00.000Z',
        is_refund: false,
        allocations: allocationList
      })

      setPartyId('')
      setAccountId('')
      setAllocations({})
      setSelectedInvoices(new Set())
      setNote('')
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      toast({ title: 'Success', description: `Payment of ${formatMoney(totalAllocated)} recorded successfully.` })
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Error', description: err.message || 'Failed to record payment', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row h-full">
        {/* LEFT PANEL: Form */}
        <div className="lg:w-[420px] flex-shrink-0 flex flex-col border-r border-border overflow-y-auto bg-surface">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold tracking-tight">Record Payment</h1>
            <p className="text-sm text-muted-foreground mt-1">Allocate payments to specific invoices.</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex border-b bg-muted/20">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${partyType === 'customer' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => { setPartyType('customer'); setPartyId('') }}
            >
              <User className="w-4 h-4" /> Receive (In)
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${partyType === 'supplier' ? 'bg-surface text-destructive border-b-2 border-destructive' : 'text-muted-foreground hover:bg-muted/50'}`}
              onClick={() => { setPartyType('supplier'); setPartyId('') }}
            >
              <Truck className="w-4 h-4" /> Pay Out
            </button>
          </div>

          <form onSubmit={handleRecordPayment} className="flex flex-col flex-1">
            <div className="p-5 space-y-4 flex-1">
              {/* Party Select */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">{partyType === 'customer' ? 'Customer' : 'Supplier'}</label>
                <select
                  className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm hover:border-primary/50 transition-colors"
                  value={partyId}
                  onChange={(e) => setPartyId(Number(e.target.value) || '')}
                  required
                >
                  <option value="" disabled>Select a {partyType}...</option>
                  {activeParties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.shop_name ? ` (${p.shop_name})` : ''} — Due: {formatMoney(p.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Select */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Deposit Account</label>
                <select
                  className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm hover:border-primary/50 transition-colors"
                  value={accountId}
                  onChange={(e) => setAccountId(Number(e.target.value) || '')}
                  required
                >
                  <option value="" disabled>Select account...</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Note (Optional)</label>
                <Input
                  placeholder="e.g. Cash received at counter"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-primary" /> Payment Date
                </label>
                <input
                  type="date"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:border-primary/50 transition-colors"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
                <p className="text-xs text-muted-foreground italic">Defaults to today. Change to backdate this payment.</p>
              </div>

              </div>

            {/* Payment Summary & Submit */}
            <div className="p-5 border-t bg-muted/10 space-y-3">
              {selectedParty && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold">{formatMoney(selectedParty.balance)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Selected ({selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''})
                </span>
                <span className="text-xl font-bold text-primary">
                  {totalAllocated > 0 ? formatMoney(totalAllocated) : '—'}
                </span>
              </div>
              {totalAllocated > 0 && (
                <p className="text-xs text-muted-foreground italic">{numberToWords(totalAllocated / 100)}</p>
              )}
              {selectedParty && totalAllocated > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">New Balance After Payment</span>
                  <span className="font-semibold text-success">{formatMoney(Math.max(0, selectedParty.balance - totalAllocated))}</span>
                </div>
              )}
              {partyType === 'supplier' && accountId && totalAllocated > (accounts.find((a: any) => a.id === accountId)?.current_balance || 0) && (
                <p className="text-sm font-bold text-destructive text-center py-1">Insufficient funds in selected account!</p>
              )}
              <Button
                type="submit"
                className={`w-full h-11 font-bold text-base gap-2 text-white ${partyType === 'customer' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={!!(recordPayment.isPending || selectedInvoices.size === 0 || totalAllocated <= 0 || (partyType === 'supplier' && accountId && totalAllocated > (accounts.find((a: any) => a.id === accountId)?.current_balance || 0)))}
              >
                <Receipt className="w-4 h-4" />
                {recordPayment.isPending ? 'Processing...' : (partyType === 'customer' ? 'Record Receipt' : 'Record Payment')}
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT PANEL: Invoice List + Recent Payments */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Invoice Selection Table */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between bg-muted/10">
              <div>
                <h2 className="font-semibold">
                  {partyId ? `Unpaid Invoices` : 'Select a party to see unpaid invoices'}
                </h2>
                {partyId && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Check invoices below and enter the amount to allocate to each.
                  </p>
                )}
              </div>
              {partyId && unpaidDocs.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>Select All</Button>
                  <Button variant="ghost" size="sm" onClick={handleClearAll}>Clear</Button>
                </div>
              )}
            </div>

            {!partyId ? (
              <div className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <User className="w-12 h-12 opacity-20" />
                <p className="text-sm">Select a customer or supplier to view their unpaid invoices.</p>
              </div>
            ) : isLoadingDocs ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading invoices...</div>
            ) : unpaidDocs.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <CheckSquare className="w-10 h-10 opacity-20" />
                <p className="text-sm">All invoices are paid! No outstanding balance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold w-10"></th>
                      <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                      <th className="px-4 py-3 text-right font-semibold">Paid</th>
                      <th className="px-4 py-3 text-right font-semibold text-destructive">Due</th>
                      <th className="px-4 py-3 text-right font-semibold">Pay Amount (Rs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unpaidDocs.map((doc: any) => {
                      const isSelected = selectedInvoices.has(doc.id)
                      const allocVal = allocations[doc.id] || ''
                      const allocPaisa = Math.round(parseFloat(allocVal || '0') * 100)
                      const isOverAllocated = allocPaisa > doc.due_amount

                      return (
                        <tr
                          key={doc.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                          onClick={() => handleToggleInvoice(doc)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleInvoice(doc)}
                              className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">{doc.invoice_no}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.date)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatMoney(doc.net_total)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatMoney(doc.paid_amount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-destructive">{formatMoney(doc.due_amount)}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <Input
                              type="number"
                              className={`w-28 h-10 text-right text-sm ml-auto font-semibold border-2 rounded-lg transition-colors ${isOverAllocated ? 'border-destructive ring-1 ring-destructive bg-destructive/5' : 'border-border hover:border-primary/50 focus:border-primary'}`}
                              placeholder="0"
                              value={allocVal}
                              disabled={!isSelected}
                              onChange={(e) => handleAllocationChange(doc.id, e.target.value)}
                              min="1"
                              max={(doc.due_amount / 100).toFixed(0)}
                              onClick={(e) => { e.stopPropagation(); if (!isSelected) handleToggleInvoice(doc) }}
                            />
                            {isOverAllocated && <p className="text-xs text-destructive mt-0.5 font-semibold">⚠ Exceeds due</p>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="border-t flex flex-col" style={{ maxHeight: '280px' }}>
            <div className="px-5 py-3 border-b bg-muted/10">
              <h2 className="font-semibold text-sm">Recent Payments</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Party</th>
                    <th className="px-4 py-2 text-left font-semibold">Account</th>
                    <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    {isManager && <th className="px-4 py-2 text-right font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingPayments ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No recent payments.</td></tr>
                  ) : (
                    payments.map((pmt: any) => (
                      <tr key={pmt.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground">{new Date(pmt.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          {pmt.direction === 'in'
                            ? <span className="text-success font-medium">Receipt (In)</span>
                            : <span className="text-primary font-medium">Payment (Out)</span>}
                        </td>
                        <td className="px-4 py-2">{pmt.party_name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{pmt.account_name || '-'}</td>
                        <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(pmt.amount)}</td>
                        {isManager && (
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setDeleteConfirm({
                                  open: true,
                                  id: pmt.id,
                                  message: `Void this ${formatMoney(pmt.amount)} payment? This cannot be undone.`
                                })
                              }}
                              disabled={voidPayment.isPending}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Void
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {deleteConfirm && (
        <ConfirmDialog 
          open={deleteConfirm.open} 
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          title="Void Payment"
          description={deleteConfirm.message}
          onConfirm={() => {
            voidPayment.mutate(deleteConfirm.id)
            setDeleteConfirm(null)
          }}
        />
      )}
    </div>
  )
}
