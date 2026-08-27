import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BarChart3 } from 'lucide-react'
import { useInventoryAnalytics } from '../../hooks/useCatalog'

interface InventoryAnalyticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryAnalyticsDialog({ open, onOpenChange }: InventoryAnalyticsDialogProps) {
  const { data: analytics = [], isLoading } = useInventoryAnalytics()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Sales Performance (Ctns)
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">This Month</TableHead>
                <TableHead className="text-right">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Loading analytics...
                  </TableCell>
                </TableRow>
              ) : analytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No sales data available.
                  </TableCell>
                </TableRow>
              ) : (
                analytics.map((item: any, index: number) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-semibold">{item.item_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.sold_this_month}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold tabular-nums">
                      {item.sold_overall}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
