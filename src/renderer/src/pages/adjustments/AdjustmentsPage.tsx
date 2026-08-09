import { useState } from 'react'
import { useStockAdjustments, useCreateAdjustment } from '../../hooks/useAdjustments'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useItems } from '../../hooks/useCatalog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, PackageMinus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function AdjustmentsPage() {
  const { data: adjustments = [] } = useStockAdjustments()
  const { data: items = [] } = useItems()
  const createAdjustment = useCreateAdjustment()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})

  useKeyboardShortcuts({
    'Ctrl+N': () => setOpen(true),
    'Escape': () => setOpen(false)
  })

  const handleSubmit = async () => {
    if (!formData.item_id || !formData.change_qty || !formData.reason) return
    try {
      await createAdjustment.mutateAsync({
        item_id: Number(formData.item_id),
        change_qty: Number(formData.change_qty), // usually negative for damage
        reason: formData.reason,
        note: formData.note
      })
      setOpen(false)
      setFormData({})
      toast({ title: 'Success', description: 'Adjustment recorded successfully' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to record adjustment', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-muted-foreground mt-1">Record damages, theft, or manual stock corrections.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Adjustment
        </Button>
      </div>

      <div className="rounded-xl border bg-surface shadow-sm overflow-hidden flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Adjustment</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adjustments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <PackageMinus className="w-8 h-8 mb-2 opacity-50" />
                    No stock adjustments recorded.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              adjustments.map((adj: any) => (
                <TableRow key={adj.id} className="text-sm">
                  <TableCell className="font-mono text-xs">{new Date(adj.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{adj.item_name}</TableCell>
                  <TableCell className="font-mono font-bold">
                    <span className={adj.change_qty > 0 ? 'text-success' : 'text-destructive'}>
                      {adj.change_qty > 0 ? '+' : ''}{adj.change_qty}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize px-2 py-1 bg-muted rounded-md text-xs">{adj.reason}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{adj.note || '-'}</TableCell>
                  <TableCell className="text-xs">{adj.created_by_name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Inventory Stock</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Item</label>
              <Select value={formData.item_id} onValueChange={(v) => setFormData({...formData, item_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i: any) => (
                    <SelectItem key={i.id} value={i.id.toString()}>{i.name} (Stock: {i.current_stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason</label>
                <Select value={formData.reason} onValueChange={(v) => setFormData({...formData, reason: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="expiry">Expiry</SelectItem>
                    <SelectItem value="theft">Theft</SelectItem>
                    <SelectItem value="recount">Recount Correction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Change Qty (+ or -)</label>
                <Input 
                  type="number" 
                  placeholder="-5"
                  value={formData.change_qty || ''}
                  onChange={(e) => setFormData({...formData, change_qty: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note / Description</label>
              <Input 
                value={formData.note || ''}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                placeholder="Optional explanation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createAdjustment.isPending}>Confirm Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
