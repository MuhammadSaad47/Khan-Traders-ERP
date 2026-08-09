import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateSaleReturn, useSaleReturns } from '../../hooks/useSales'
import { useAccounts } from '../../hooks/useAccounts'
import { RefreshCcw } from 'lucide-react'

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
    const itemsToReturn = Object.entries(returnQty)
      .map(([saleItemId, qty]) => ({ sale_item_id: Number(saleItemId), qty }))
      .filter(i => i.qty > 0)

    if (itemsToReturn.length === 0) return alert('Enter at least 1 item to return.')
    if (refundAmount > 0 && !accountId) return alert('Select an account for cash refund.')

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
        alert(err.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px]">
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
                const prevReturned = getPreviouslyReturned(item.id)
                const available = item.qty - prevReturned
                const currentReturn = returnQty[item.id] || 0
                return (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.item_name || `Item #${item.item_id}`}</td>
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

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold mb-1 block">Cash Refund (Rs)</label>
                <Input 
                  type="number" 
                  min="0"
                  max={totalReturnValue / 100}
                  value={refundAmount || ''}
                  onChange={e => setRefundAmount(Math.min(totalReturnValue / 100, Math.max(0, Number(e.target.value))))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Credit to Customer Account</label>
                <div className="h-10 flex items-center font-mono font-bold text-lg">
                  {formatMoney(creditAmount)}
                </div>
              </div>
            </div>

            {refundAmount > 0 && (
              <div>
                <label className="text-xs font-semibold mb-1 block">Refund From Account</label>
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                >
                  <option value="" disabled>Select Account...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
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
