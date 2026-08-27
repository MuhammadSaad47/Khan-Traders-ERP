import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy } from 'lucide-react'

interface TopPartiesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  parties: { id: number, name: string, total_volume: number }[]
  isLoading: boolean
}

export function TopPartiesDialog({ open, onOpenChange, title, parties, isLoading }: TopPartiesDialogProps) {
  const formatMoney = (paisa: number) => `Rs ${(paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    Loading data...
                  </TableCell>
                </TableRow>
              ) : parties.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                parties.map((p, index) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-center font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold tabular-nums">
                      {formatMoney(p.total_volume)}
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
