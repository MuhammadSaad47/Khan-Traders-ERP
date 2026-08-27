import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateSaleReturn, useSaleReturns } from '../../hooks/useSales'
import { useAccounts } from '../../hooks/useAccounts'
import { RefreshCcw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export function SaleReturnDialog({ sale, items, open, onOpenChange }: { sale: any, items: any[], open: boolean, onOpenChange: (o: boolean) => void }) {
  const [returnQty, setReturnQty] = useState<Record<number, number>>({})
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [accountId, setAccountId] = useState<string>('')
  const { data: accounts = [] } = useAccounts()
  const { data: existingReturns = [] } = useSaleReturns(sale?.id)
  
  const createReturn = useCreateSaleReturn()

  if (!sale || !items) return null

  // Calculate previously returned amounts
  const getPreviouslyReturned = (saleItemId: number) => {
    let returned = 0
    existingReturns.forEach((ret: any) => {
      ret.items.forEach((item: any) => {
        if (item.sale_item_id === saleItemId) returned += item.qty
      })
    })
    return returned
  }

  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toFixed(0)}`

  let totalReturnValue = 0
  items.forEach(item => {
    const qty = returnQty[item.id] || 0
    totalReturnValue += qty * item.unit_price
  })

  const creditAmount = Math.max(0, totalReturnValue - (refundAmount * 100))

  const handleSubmit = () => {
    const itemsToReturn: { sale_item_id: number, qty: number }[] = []

    items.forEach(item => {
      let remainingToReturn = returnQty[item.id] || 0;
      if (remainingToReturn <= 0) return;

      // Grouped items have multiple original_items to split the return across
      const origItems = item.original_items || [{ id: item.id, qty: item.qty }];
      
      for (const orig of origItems) {
        if (remainingToReturn <= 0) break;
        
        const previouslyReturned = getPreviouslyReturned(orig.id);
        const available = orig.qty - previouslyReturned;
        
        const returnForOrig = Math.min(remainingToReturn, available);
        if (returnForOrig > 0) {
          itemsToReturn.push({ sale_item_id: orig.id, qty: returnForOrig });
          remainingToReturn -= returnForOrig;
        }
      }
    })

    if (itemsToReturn.length === 0) { toast({ title: 'Enter at least 1 item to return.', variant: 'destructive' }); return }
    if (refundAmount > 0 && !accountId) { toast({ title: 'Select an account for cash refund.', variant: 'destructive' }); return }

    createReturn.mutate({
      sale_id: sale.id,
      items: itemsToReturn,
      refund_amount: refundAmount * 100,
      credit_amount: creditAmount,
      account_id: accountId ? Number(accountId) : undefined
    }, {
      onSuccess: () => {
        setReturnQty({})
        setRefundAmount(0)
        setAccountId('')
        onOpenChange(false)
      },
      onError: (err: any) => {
        toast({ title: err.message, variant: 'destructive' })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Return for {sale.invoice_no}</DialogTitle>
          <DialogDescription>Enter quantities to return. Returned items will be added back to stock.</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-center">Orig Qty</th>
                <th className="pb-2 text-center text-muted-foreground">Returned</th>
                <th className="pb-2 text-center">Return Qty</th>
                <th className="pb-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const origItems = item.original_items || [{ id: item.id, qty: item.qty }];
                let prevReturned = 0;
                for (const orig of origItems) {
                  prevReturned += getPreviouslyReturned(orig.id);
                }
                
                const available = item.qty - prevReturned;
                const currentReturn = returnQty[item.id] || 0
                const itemSize = item.item_size || ''
                const itemPkg = item.item_packaging || ''
                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">
                      <div className="font-medium">{item.item_name || `Item #${item.item_id}`}</div>
                      {(itemSize || itemPkg) && <div className="text-xs text-muted-foreground">{[itemSize, itemPkg].filter(Boolean).join(' • ')}</div>}
                    </td>
                    <td className="py-2 text-center">{item.qty}</td>
                    <td className="py-2 text-center text-muted-foreground">{prevReturned}</td>
                    <td className="py-2 flex justify-center">
                      <Input 
                        type="number" 
                        min="0" 
                        max={available} 
                        className="w-20 h-8 text-center"
                        value={currentReturn || ''}
                        onChange={e => {
                          const v = Math.min(available, Math.max(0, Number(e.target.value)))
                          setReturnQty(prev => ({ ...prev, [item.id]: v }))
                        }}
                      />
                    </td>
                    <td className="py-2 text-right">{formatMoney(currentReturn * item.unit_price)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalReturnValue > 0 && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex justify-between font-bold">
              <span>Total Return Value:</span>
              <span>{formatMoney(totalReturnValue)}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block">Refund From Account (Optional if fully credited)</label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={accountId}
                  onChange={e => {
                    setAccountId(e.target.value)
                    if (!e.target.value) setRefundAmount(0)
                  }}
                >
                  <option value="">-- No Cash Refund --</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Rs {a.current_balance ? (a.current_balance / 100).toLocaleString() : 0})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Cash Refund (Rs)</label>
                  <Input 
                    type="number" 
                    min="0"
                    max={Math.min(totalReturnValue / 100, accountId ? (accounts.find(a => a.id === Number(accountId))?.current_balance || 0) / 100 : Infinity)}
                    value={refundAmount || ''}
                    onChange={e => {
                      const val = Number(e.target.value)
                      const max = Math.min(totalReturnValue / 100, accountId ? (accounts.find(a => a.id === Number(accountId))?.current_balance || 0) / 100 : Infinity)
                      setRefundAmount(val > max ? max : Math.max(0, val))
                    }}
                    disabled={!accountId}
                  />
                  {accountId && refundAmount >= (accounts.find(a => a.id === Number(accountId))?.current_balance || 0) / 100 && refundAmount > 0 && (
                    <p className="text-xs text-destructive mt-1">Maximum available balance reached</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Credit to Customer Account</label>
                  <div className="h-10 flex items-center font-mono font-bold text-lg">
                    {formatMoney(creditAmount)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createReturn.isPending || totalReturnValue === 0} className="gap-2">
            <RefreshCcw className="w-4 h-4" /> 
            {createReturn.isPending ? 'Processing...' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
