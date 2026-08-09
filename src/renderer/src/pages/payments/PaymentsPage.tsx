import { useState } from 'react'
import { Banknote, User, Truck, Receipt, Trash2 } from 'lucide-react'
import { useCustomers, useSuppliers } from '../../hooks/useParties'
import { useRecordPayment, usePayments, useVoidPayment } from '../../hooks/usePayments'
import { useAccounts } from '../../hooks/useAccounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { numberToWords } from '../../lib/numberToWords'
import { useToast } from '@/hooks/use-toast'

export default function PaymentsPage() {
  const { data: customers = [] } = useCustomers()
  const { data: suppliers = [] } = useSuppliers()
  const { data: accounts = [] } = useAccounts()
  const { toast } = useToast()
  
  const recordPayment = useRecordPayment()
  const voidPayment = useVoidPayment()
  const { data: payments = [], isLoading: isLoadingPayments } = usePayments()

  
  const [partyType, setPartyType] = useState<'customer' | 'supplier'>('customer')
  const [partyId, setPartyId] = useState<number | ''>('')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, _setPaymentMethod] = useState<'cash' | 'bank' | 'easypaisa' | 'cheque'>('cash')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [isRefund, setIsRefund] = useState(false)

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partyId || !amount || !accountId) return

    try {
      await recordPayment.mutateAsync({
        party_type: partyType,
        party_id: Number(partyId),
        amount: Number(amount) * 100, // convert to paisa
        payment_method: paymentMethod,
        account_id: Number(accountId),
        reference_type: isRefund ? 'refund' : 'general', // Refunds don't settle FIFO
        is_refund: isRefund
      })
      
      setPartyId('')
      setAmount('')
      setAccountId('')
      setIsRefund(false)
      toast({ title: 'Success', description: 'Payment recorded successfully' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to record payment', variant: 'destructive' })
    }
  }

  const activeParties = partyType === 'customer' ? customers : suppliers
  const selectedParty = activeParties.find((p: any) => p.id === Number(partyId))

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
        <p className="text-muted-foreground mt-1">Process incoming payments from customers or outgoing payments to suppliers.</p>
      </div>

      <div className="bg-surface border shadow-sm rounded-xl overflow-hidden">
        <div className="flex border-b border-border bg-muted/20">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors ${partyType === 'customer' ? 'bg-surface text-primary border-b-2 border-primary' : 'text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => { setPartyType('customer'); setPartyId('') }}
          >
            <User className="w-5 h-5" /> Receive from Customer (In)
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-4 font-semibold transition-colors ${partyType === 'supplier' ? 'bg-surface text-destructive border-b-2 border-destructive' : 'text-muted-foreground hover:bg-muted/50'}`}
            onClick={() => { setPartyType('supplier'); setPartyId('') }}
          >
            <Truck className="w-5 h-5" /> Pay to Supplier (Out)
          </button>
        </div>

        <form onSubmit={handleRecordPayment} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4 md:col-span-2">
              <label className="text-sm font-semibold">Select {partyType === 'customer' ? 'Customer' : 'Supplier'}</label>
              <select 
                className="w-full h-12 bg-background border border-border rounded-md px-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                value={partyId}
                onChange={(e) => setPartyId(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select a {partyType}...</option>
                {activeParties.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.shop_name ? `(${p.shop_name})` : ''} - Balance: {formatMoney(p.balance)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold">Payment Amount (Rs)</label>
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-10 h-12 text-xl font-bold" 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  required
                />
              </div>
              {Number(amount) > 0 && <p className="text-xs text-muted-foreground italic mt-1">{numberToWords(Number(amount))}</p>}
              
              <div className="flex items-center gap-2 mt-4 pt-2">
                <input 
                  type="checkbox" 
                  id="is_refund" 
                  checked={isRefund} 
                  onChange={(e) => setIsRefund(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="is_refund" className="text-sm font-medium text-destructive cursor-pointer">
                  This is a Refund ({partyType === 'customer' ? 'Giving money back to customer' : 'Receiving money back from supplier'})
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold">Deposit Account</label>
              <select 
                className="w-full h-12 bg-background border border-border rounded-md px-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value) || '')}
                required
              >
                <option value="" disabled>Select account...</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-4 md:col-span-2 pt-2">
              <div className="p-4 bg-muted/20 border rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-semibold">{selectedParty?.name || 'No party selected'}</div>
                  <div className="text-sm text-muted-foreground">Current Balance: {selectedParty ? formatMoney(selectedParty.balance) : '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">New Balance Estimate</div>
                  <div className={`font-bold text-xl ${partyType === 'customer' ? 'text-success' : 'text-primary'}`}>
                    {selectedParty && amount ? formatMoney(selectedParty.balance + (Number(amount) * 100 * (isRefund ? 1 : -1))) : '-'}
                  </div>
                </div>
              </div>
              {!isRefund && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <Receipt className="w-3 h-3" /> Note: This payment will be automatically applied to the oldest unpaid invoices first (FIFO).
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setAmount(''); setPartyId(''); setAccountId(''); setIsRefund(false) }}>Reset</Button>
            <Button type="submit" className={`h-11 px-8 gap-2 font-bold ${isRefund ? 'bg-destructive hover:bg-destructive/90' : (partyType === 'customer' ? 'bg-success hover:bg-success/90' : 'bg-primary hover:bg-primary/90')}`} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Processing...' : `Record ${isRefund ? 'Refund' : (partyType === 'customer' ? 'Receipt' : 'Payment')}`}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-surface border shadow-sm rounded-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold">Recent Payments</h2>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm border-b">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Party</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoadingPayments ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No recent payments.</td></tr>
              ) : (
                payments.map((pmt: any) => (
                  <tr key={pmt.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">{new Date(pmt.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {pmt.direction === 'in' ? (
                        <span className="text-success font-medium">Receipt (In)</span>
                      ) : (
                        <span className="text-primary font-medium">Payment (Out)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{pmt.party_name}</td>
                    <td className="px-4 py-3">{pmt.account_name}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatMoney(pmt.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => {
                        if (confirm(`Void this ${formatMoney(pmt.amount)} payment? This cannot be undone.`)) {
                          voidPayment.mutate(pmt.id)
                        }
                      }} disabled={voidPayment.isPending}>
                        <Trash2 className="w-4 h-4 mr-2" /> Void
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
